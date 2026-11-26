# Records a recursive function inside node, such as depth() or height()
import json
import os
import subprocess
import gdb

FUNCTION = os.environ.get("TRACE_FUNCTION", "depth")
LIMIT = 200

steps = []
crash = None
returned = []  # values returned since the last recorded step


def on_stop(event):
    global crash
    if isinstance(event, gdb.SignalEvent):
        crash = event.stop_signal


class ReturnWatcher(gdb.FinishBreakpoint):
    """Notes the value that one call returns, without pausing."""

    def __init__(self, frame, call):
        super().__init__(frame, internal=True)
        self.silent = True
        self.call = call

    def stop(self):
        value = self.return_value
        self.call["value"] = None if value is None else int(value)
        returned.append(self.call)
        return False


def is_ours(frame):
    return (frame.name() or "").split("(")[0] == f"node::{FUNCTION}"


def our_frames():
    """All unfinished calls of the function, from first to newest."""
    if gdb.selected_inferior().pid == 0:
        return []
    frames = []
    frame = gdb.newest_frame()
    while frame is not None:
        if is_ours(frame):
            frames.append(frame)
        frame = frame.older()
    return frames[::-1]


def node_number(frame):
    pointer = frame.read_var("this")
    if int(pointer) == 0:
        return None  # called on NULL
    try:
        return int(pointer.dereference()["elem"])
    except gdb.MemoryError:
        return None


calls = []  # one record for each unfinished call


def record(kind, frames, line, finished=None):
    stack = []
    for call, frame in zip(calls, frames):
        stack.append({"id": call["id"], "node": call["node"],
                      "answers": list(call["answers"])})
    steps.append({"type": kind, "line": line, "stack": stack,
                  "finished": finished})


gdb.events.stop.connect(on_stop)
gdb.execute("set pagination off")
gdb.execute(r"skip -rfunction ^std::")  # do not step inside max()
first = gdb.Breakpoint(f"node::{FUNCTION}")
gdb.execute("run")
first.delete()

watchdog = subprocess.Popen(
    ["sh", "-c", f"sleep 8; kill -INT {gdb.selected_inferior().pid}"])

next_id = 0
result = None
limit_reached = False

while True:
    frames = our_frames()

    # Calls that have finished since the last step
    for done in returned:
        if done in calls:
            calls.remove(done)
        if calls:
            calls[-1]["answers"].append(
                {"node": done["node"], "value": done["value"]})
        else:
            result = done["value"]
        line = frames[-1].find_sal().line if frames else 0
        record("return", frames, line,
               {"id": done["id"], "node": done["node"], "value": done["value"]})
    just_returned = bool(returned)
    returned.clear()

    if not frames:
        break

    line = frames[-1].find_sal().line
    if len(frames) > len(calls):
        next_id += 1
        call = {"id": next_id, "node": node_number(frames[-1]), "answers": []}
        calls.append(call)
        ReturnWatcher(frames[-1], call)
        record("call", frames, line)
    elif not just_returned:
        record("line", frames, line)

    if len(steps) >= LIMIT:
        limit_reached = True
        break

    gdb.execute("step")

    if crash is not None:
        newest = our_frames()
        line = newest[-1].find_sal().line if newest else line
        record("crash", newest, line)
        break

watchdog.kill()

with open("cpp/trace.json", "w") as output:
    json.dump({"steps": steps, "crash": crash, "result": result,
               "limit": limit_reached}, output)

print("Recorded", len(steps), "steps")