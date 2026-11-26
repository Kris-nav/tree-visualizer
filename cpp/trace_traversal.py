# Records preorder, inorder, postorder and breadthfirst
import json
import os
import subprocess
import gdb

FUNCTION = os.environ.get("TRACE_FUNCTION", "preorder")
LIMIT = 300

steps = []
crash = None


def on_stop(event):
    global crash
    if isinstance(event, gdb.SignalEvent):
        crash = event.stop_signal


def our_frames():
    """Unfinished calls of the student's functions, from first to newest."""
    if gdb.selected_inferior().pid == 0:
        return []
    frames = []
    frame = gdb.newest_frame()
    while frame is not None:
        if (frame.name() or "").startswith("MyBinaryTree::"):
            frames.append(frame)
        frame = frame.older()
    return frames[::-1]


def number(pointer):
    """The value stored in a node, or None for NULL or a bad pointer."""
    if int(pointer) == 0:
        return None
    try:
        return int(pointer.dereference()["elem"])
    except gdb.MemoryError:
        return None


def look_inside(frame):
    """The node a call is working on, and its queue if it has one."""
    current = None
    queue = None
    line = frame.find_sal().line
    block = frame.block()
    while block:
        for symbol in block:
            if not (symbol.is_argument or symbol.is_variable):
                continue
            # A local is ready only after the line that declares it
            if not symbol.is_argument and line <= symbol.line:
                continue
            value = symbol.value(frame)
            kind = str(value.type)
            if kind == "node *" and current is None:
                current = number(value)
            elif kind in ("Queue *", "ArrayQueue *") and int(value) != 0:
                data = value.cast(
                    gdb.lookup_type("ArrayQueue").pointer()).dereference()
                head, tail = int(data["head"]), int(data["tail"])
                if 0 <= head <= tail <= 100:
                    queue = [number(data["items"][i]) for i in range(head, tail)]
        if block.function:
            break
        block = block.superblock
    return current, queue


def printed():
    try:
        with open("cpp/output.txt") as file:
            return file.read()[:2000]
    except FileNotFoundError:
        return ""


def record(frames, line):
    stack = []
    queue = None
    for frame in frames:
        current, found = look_inside(frame)
        if found is not None:
            queue = found
        name = frame.name().split("(")[0].split("::")[-1]
        stack.append({"name": name, "node": current})
    if queue is None and steps and frames:
        queue = steps[-1]["queue"]
    steps.append({"line": line, "stack": stack, "queue": queue,
                  "output": printed()})


gdb.events.stop.connect(on_stop)
gdb.execute("set pagination off")
for skipped in ("^std::", "^ArrayQueue::", "^Queue::",
                "^MyBinaryTree::(left|right)"):
    gdb.execute(f"skip -rfunction {skipped}")
first = gdb.Breakpoint(f"MyBinaryTree::{FUNCTION}")
gdb.execute("run")
first.delete()

watchdog = subprocess.Popen(
    ["sh", "-c", f"sleep 8; kill -INT {gdb.selected_inferior().pid}"])

limit_reached = False
line = 0
while True:
    frames = our_frames()
    if not frames:
        # Finished: keep the final output
        steps.append({"line": line, "stack": [], "queue": steps[-1]["queue"],
                      "output": printed()})
        break
    line = frames[-1].find_sal().line
    record(frames, line)
    if len(steps) >= LIMIT:
        limit_reached = True
        break
    gdb.execute("step")
    if crash is not None:
        newest = our_frames()
        line = newest[-1].find_sal().line if newest else line
        crashed = dict(steps[-1])
        crashed["line"] = line
        steps.append(crashed)
        break

watchdog.kill()

with open("cpp/trace.json", "w") as output:
    json.dump({"steps": steps, "crash": crash, "limit": limit_reached}, output)

print("Recorded", len(steps), "steps")