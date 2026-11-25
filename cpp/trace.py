import json
import os
import subprocess
import gdb

# Which function to record: addRoot, addLeft or addRight
FUNCTION = os.environ.get("TRACE_FUNCTION", "addRoot")

steps = []
crash = None


def on_stop(event):
    global crash
    if isinstance(event, gdb.SignalEvent):
        crash = event.stop_signal


def address(pointer):
    value = int(pointer)
    return hex(value) if value else None


def snapshot(frame, line, executed):
    root = gdb.parse_and_eval("this->root")
    variables = {}
    to_visit = [root]

    block = frame.block()
    while block:
        for symbol in block:
            # Show a local only after its declaration line has run
            if symbol.is_argument or (symbol.is_variable and symbol.line in executed):
                value = symbol.value(frame)
                if str(value.type) == "node *":
                    variables[symbol.name] = address(value)
                    to_visit.append(value)
        if block.function:
            break
        block = block.superblock

    nodes = {}
    while to_visit:
        pointer = to_visit.pop()
        key = address(pointer)
        if key is None or key in nodes:
            continue
        try:
            data = pointer.dereference()
            info = {"elem": int(data["elem"])}
            for link in ("left", "right", "parent"):
                info[link] = address(data[link])
            nodes[key] = info
            to_visit += [data["left"], data["right"], data["parent"]]
        except gdb.MemoryError:
            nodes[key] = {"invalid": True}

    return {
        "line": line,
        "root": address(root),
        "size": int(gdb.parse_and_eval("this->size")),
        "variables": variables,
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

watchdog.kill()

with open("cpp/trace.json", "w") as output:
    json.dump({"start": start, "steps": steps, "crash": crash}, output, indent=2)

print("Recorded", len(steps), "steps")