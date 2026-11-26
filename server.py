import json
import os
import re
import resource
import shutil
import subprocess
import tempfile
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

PROJECT = Path(__file__).resolve().parent
PORT = 8000
FUNCTIONS = ("sibling", "addRoot", "addLeft", "addRight", "depth", "height",
             "remove", "preorder", "inorder", "postorder", "breadthfirst")
TRAVERSALS = ("preorder", "inorder", "postorder", "breadthfirst")
RECURSIVE = ("depth", "height")
ALLOWED_HOSTS = {f"127.0.0.1:{PORT}", f"localhost:{PORT}"}


def limit_cpu():
    # Ends a program stuck in an endless loop, even if gdb was stopped first
    resource.setrlimit(resource.RLIMIT_CPU, (10, 12))


def run(command, folder, function):
    return subprocess.run(command, cwd=folder, env={**os.environ, "TRACE_FUNCTION": function}, capture_output=True, text=True,
                          errors="replace", timeout=20, preexec_fn=limit_cpu)


def only_function(code, name):
    """Lets students paste the whole struct: keeps only int name() { ... }.
    Other lines become empty, so line numbers stay the same."""
    # Hide comments and text in quotes, so their braces are not counted
    hidden = re.sub(r'//[^\n]*|/\*.*?\*/|"(?:\\.|[^"\\\n])*"',
                    lambda m: re.sub(r"[^\n]", " ", m.group()), code, flags=re.S)
    found = re.search(rf"\bint\s+{name}\s*\(\s*\)\s*\{{", hidden)
    if not found:
        return code
    level = 0
    end = len(code)
    for i in range(found.end() - 1, len(code)):
        level += {"{": 1, "}": -1}.get(hidden[i], 0)
        if level == 0:
            end = i + 1
            break
    return "\n" * code[:found.start()].count("\n") + code[found.start():end]


def run_student_code(code, function="addRoot", taken=False, target=1):
    # Work in a temporary copy, so your own project files are not changed
    with tempfile.TemporaryDirectory() as temp:
        cpp = Path(temp) / "cpp"
        cpp.mkdir()
        if function in RECURSIVE:
            script = "trace_recursive.py"
        elif function in TRAVERSALS:
            script = "trace_traversal.py"
        else:
            script = "trace.py"
        for name in ("node.h", "mybinarytree.h", "arrayqueue.h", "main.cpp",
                     script):
            shutil.copy(PROJECT / "cpp" / name, cpp / name)
        if function in RECURSIVE:
            code = only_function(code, function)
            argument = str(target)
        elif function == "sibling":
            argument = str(target)
        elif function == "remove":
            argument = str(target if target in range(1, 5) else 1)
        else:
            argument = "taken" if taken else "free"
        (cpp / "student.inc").write_text(code + "\n")

        try:
            build = run(["g++", "-g", "-O0", "-Wall", "-Werror=return-type",
                         "-std=c++17", f"-DTEST_{function.upper()}",
                         "cpp/main.cpp", "-o", "cpp/program"], temp, function)
            if build.returncode != 0:
                return {"error": "compile", "details": build.stderr}

            traced = run(["gdb", "-q", "-batch", "-x", f"cpp/{script}", "--args",
                          "cpp/program", argument],
                         temp, function)
        except subprocess.TimeoutExpired:
            return {"error": "timeout"}

        result_file = cpp / "trace.json"
        if not result_file.exists():
            return {"error": "trace", "details": traced.stdout + traced.stderr}

        result = json.loads(result_file.read_text())
        result["warnings"] = build.stderr
        thrown = cpp / "thrown.txt"
        result["thrown"] = thrown.read_text() if thrown.exists() else None
        returned = cpp / "result.txt"
        result["returned"] = int(returned.read_text()) if returned.exists() else None
        return result


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(PROJECT), **kwargs)

    def do_POST(self):
        # Only accept requests sent by this page, not by other websites
        host = self.headers.get("Host")
        if (self.path != "/run" or host not in ALLOWED_HOSTS
                or self.headers.get("Origin") != f"http://{host}"
                or self.headers.get("Content-Type") != "application/json"):
            self.send_error(403)
            return

        length = int(self.headers.get("Content-Length", 0))
        if length > 20000:
            self.send_error(413)
            return

        data = json.loads(self.rfile.read(length))
        if data.get("function") not in FUNCTIONS:
            self.send_error(400)
            return
        target = data.get("target")
        if target not in range(1, 8):
            target = 1
        result = run_student_code(data["code"], data["function"],
                                  data.get("taken") is True, target)
        body = json.dumps(result).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


if __name__ == "__main__":
    print(f"Open http://127.0.0.1:{PORT}   (press Ctrl+C to stop)")
    ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()