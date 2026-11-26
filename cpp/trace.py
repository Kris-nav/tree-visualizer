import json
import os
import subprocess
import gdb

# Which function to record: addRoot, addLeft or addRight
FUNCTION = os.environ.get("TRACE_FUNCTION", "addRoot")

steps = []
crash = None
known = {}     # the last information seen for each node
freed = set()  # nodes that have been given to free()


class FreeWatcher(gdb.Breakpoint):
    """Notes which nodes are freed, without pausing."""

    def __init__(self):
        super().__init__("free", internal=True)
        self.silent = True

    def stop(self):
        # On 64-bit Intel/AMD Linux, free's argument is in the rdi register
        key = hex(int(gdb.parse_and_eval("(unsigned long) $rdi")))
        if key in known:
            freed.add(key)
        return False


def on_stop(event):
    global crash
    if isinstance(event, gdb.SignalEvent):
        crash = event.stop_signal


def address(pointer):
    value = int(pointer)
    return hex(value) if value else None


def line_now(frame):
    return frame.find_sal().line


def snapshot(frame, line, executed):
    root = gdb.parse_and_eval("this->root")
    variables = {}
    numbers = {}
    to_visit = [root]

    block = frame.block()
    while block:
        for symbol in block:
            # Show a local only after its declaration line has run
            if not (symbol.is_argument or symbol.is_variable):
                continue
            ready = symbol.is_argument or symbol.line in executed
            value = symbol.value(frame)
            if str(value.type) == "node *":
                # "node* child;" runs no code, so show it once it holds a node
                if ready or (symbol.line < line_now(frame)
                             and address(value) in known):
                    variables[symbol.name] = address(value)
                    to_visit.append(value)
            elif ready and str(value.type) == "int" and symbol.is_variable \
                    and not symbol.is_argument:
                numbers[symbol.name] = int(value)
        if block.function:
            break
        block = block.superblock

    nodes = {}
    while to_visit:
        pointer = to_visit.pop()
        key = address(pointer)
        if key is None or key in nodes:
            continue
        if key in freed:
            # Its memory is gone: keep only its old value, with no links
            nodes[key] = {"elem": known[key]["elem"], "left": None,
                          "right": None, "parent": None, "freed": True}
            continue
        try:
            data = pointer.dereference()
            info = {"elem": int(data["elem"])}
            for link in ("left", "right", "parent"):
                info[link] = address(data[link])
            nodes[key] = known[key] = info
            to_visit += [data["left"], data["right"], data["parent"]]
        except gdb.MemoryError:
            nodes[key] = {"invalid": True}

    return {
        "line": line,
        "root": address(root),
        "size": int(gdb.parse_and_eval("this->size")),
        "variables": variables,
        "numbers": numbers,
        "nodes": nodes,
    }


def in_student_function():
    if gdb.selected_inferior().pid == 0:  # the program was ended
        return False
    frame = gdb.selected_frame()
    name = frame.name() or ""
    return name.split("(")[0] == f"MyBinaryTree::{FUNCTION}"


gdb.events.stop.connect(on_stop)
gdb.execute("set pagination off")
gdb.Breakpoint(f"MyBinaryTree::{FUNCTION}")
gdb.execute("run")

# The tree as it was before the first line runs
start = snapshot(gdb.selected_frame(), 0, set())

if FUNCTION == "remove":
    FreeWatcher()

# After 5 seconds, interrupt the program (this catches endless loops)
watchdog = subprocess.Popen(
    ["sh", "-c", f"sleep 5; kill -INT {gdb.selected_inferior().pid}"])

executed = set()
# The step limit stops endless loops that cover several lines
while len(steps) < 200 and crash is None and in_student_function():
    frame = gdb.selected_frame()
    line = frame.find_sal().line
    gdb.execute("next")
    executed.add(line)
    if crash is not None:
        state = dict(steps[-1] if steps else start)
        state["line"] = line
        steps.append(state)
        break
    if in_student_function():
        steps.append(snapshot(gdb.selected_frame(), line, executed))
    else:
        # The function has ended: keep the last state, marked on its last line
        last = dict(steps[-1] if steps else start)
        last["line"] = line
        steps.append(last)

# Let main() finish, so that it can save what remove() returned
if FUNCTION in ("remove", "sibling") and crash is None and gdb.selected_inferior().pid != 0 \
        and not in_student_function():
    gdb.execute("continue")

watchdog.kill()

with open("cpp/trace.json", "w") as output:
    json.dump({"start": start, "steps": steps, "crash": crash}, output, indent=2)

print("Recorded", len(steps), "steps")