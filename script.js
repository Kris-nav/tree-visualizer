const codeBox = document.getElementById("code");
const message = document.getElementById("message");
const visual = document.getElementById("visual");
const status = visual.previousElementSibling;
const speed = document.querySelector('input[type="range"]');
const runButton = document.getElementById("run");
const resetButton = document.getElementById("reset");
const [, back, play, pause, next] = document.querySelectorAll(".controls button");

// A copy of the code that can highlight one line
const codeView = document.createElement("div");
codeView.id = "codeView";
codeView.hidden = true;
codeBox.after(codeView);

// Menu for choosing the function and the starting tree
const options = document.createElement("div");
options.style.marginBottom = "12px";
options.innerHTML = `
  <label>Function:
    <select id="function">
      <option>addRoot</option><option>addLeft</option><option>addRight</option>
      <option>depth</option><option>height</option>
    </select>
  </label>
  <label id="takenLabel"><input type="checkbox" id="taken">
    Test when the spot is already taken</label>`;
document.querySelector(".controls").before(options);
const functionMenu = document.getElementById("function");
const takenBox = document.getElementById("taken");
const heading = status.previousElementSibling;

// depth and height use the 6-node practice tree
const startNode = { depth: 4, height: 1 };
const isRecursive = () => functionMenu.value in startNode;
let busy = false;
let run = null;  // the recording of the latest depth or height run

const callsBox = document.createElement("div");
callsBox.id = "calls";
visual.after(callsBox);

function selectedCall() {
  const name = functionMenu.value;
  if (isRecursive()) return `${name}() starting at node ${startNode[name]}`;
  if (name === "addRoot") return "addRoot(1)";
  if (takenBox.checked) return `${name}(root, 4)`;
  return name === "addLeft" ? "addLeft(root, 2)" : "addRight(root, 3)";
}

// Picture of the starting tree (matches prepare() in main.cpp)
function startingTree() {
  const name = functionMenu.value;
  const state = { line: 0, root: null, size: 0, variables: {}, nodes: {} };
  if (name === "addRoot") return state;
  const node = (elem, parent) => ({ elem, left: null, right: null, parent });
  if (isRecursive()) {
    for (let i = 1; i <= 6; i++) state.nodes[i] = node(i, null);
    for (const [parent, side, child] of [[1, "left", "2"], [1, "right", "3"],
        [2, "left", "4"], [3, "right", "5"], [5, "right", "6"]]) {
      state.nodes[parent][side] = child;
      state.nodes[child].parent = String(parent);
    }
    state.root = "1";
    state.size = 6;
    return state;
  }
  state.root = "a";
  state.nodes.a = node(1, null);
  const children = [];
  if (name === "addRight" || takenBox.checked) children.push(["left", "b", 2]);
  if (name === "addRight" && takenBox.checked) children.push(["right", "c", 3]);
  for (const [side, key, elem] of children) {
    state.nodes.a[side] = key;
    state.nodes[key] = node(elem, "a");
  }
  state.size = Object.keys(state.nodes).length;
  return state;
}

let steps = [startingTree()];
let current = 0;
let timer = null;
let finalMessage = "";

function svg(tag, attributes, text) {
  const element = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [name, value] of Object.entries(attributes)) {
    element.setAttribute(name, value);
  }
  if (text !== undefined) element.textContent = text;
  return element;
}

// Decide where each circle goes
function layout(state) {
  const positions = {};
  let column = 0;

  function place(key, depth) {
    const node = state.nodes[key];
    if (!node || positions[key]) return;
    positions[key] = {};
    place(node.left, depth + 1);
    positions[key].x = 70 + column++ * 90;
    positions[key].y = 80 + depth * 85;
    place(node.right, depth + 1);
  }

  place(state.root, 0);
  // Nodes that are not connected to root yet
  for (const key of Object.keys(state.nodes)) {
    if (!positions[key]) {
      column++;
      place(key, 0);
    }
  }
  return positions;
}

function draw(state) {
  status.textContent = isRecursive()
    ? "Click a node to start there. Yellow = running, purple = waiting, green = returned."
    : `root = ${state.root ? "points to a node" : "NULL"}  |  size = ${state.size}`;
  visual.replaceChildren();
  const positions = layout(state);
  const keys = Object.keys(positions);
  if (keys.length === 0) {
    visual.textContent = "Empty tree";
    return;
  }

  const width = Math.max(500, ...keys.map(k => positions[k].x + 70));
  const height = Math.max(260, ...keys.map(k => positions[k].y + 70));
  const picture = svg("svg", { viewBox: `0 0 ${width} ${height}`,
                               width: "100%", height: "100%" });

  const defs = svg("defs", {});
  const marker = svg("marker", { id: "arrow", viewBox: "0 0 10 10", refX: 9, refY: 5,
    markerWidth: 7, markerHeight: 7, orient: "auto" });
  marker.append(svg("path", { d: "M0 0L10 5L0 10z", fill: "#e3b341" }));
  defs.append(marker);
  picture.append(defs);

  function link(from, to, isParent) {
    const a = positions[from];
    const b = positions[to];
    if (!a || !b) return;
    const shift = 7;  // opposite directions land on opposite sides
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const length = Math.hypot(dx, dy);
    if (length === 0) {  // a node pointing to itself
      picture.append(svg("text", { x: a.x + 30, y: a.y + 5, fill: "#f85149" },
        "points to itself"));
      return;
    }
    const ux = dx / length;
    const uy = dy / length;
    picture.append(svg("line", {
      x1: a.x + ux * 28 - uy * shift, y1: a.y + uy * 28 + ux * shift,
      x2: b.x - ux * 28 - uy * shift, y2: b.y - uy * 28 + ux * shift,
      stroke: isParent ? "#e3b341" : "#8b949e", "stroke-width": 2,
      "stroke-dasharray": isParent ? "5 4" : "none",
      ...(isParent ? { "marker-end": "url(#arrow)" } : {})
    }));
  }

  for (const key of keys) {
    const node = state.nodes[key];
    link(key, node.left, false);
    link(key, node.right, false);
    link(key, node.parent, true);
  }

  // The longest path, shown when height() finishes correctly
  for (const [from, to] of state.path || []) {
    picture.append(svg("line", { x1: positions[from].x, y1: positions[from].y,
      x2: positions[to].x, y2: positions[to].y, stroke: "#3fb950",
      "stroke-width": 7 }));
  }

  for (const key of keys) {
    const { x, y } = positions[key];
    const node = state.nodes[key];
    const colors = { running: "#d29922", waiting: "#8957e5", done: "#238636" };
    const circle = svg("circle", { cx: x, cy: y, r: 26,
      fill: colors[state.marks?.[key]] || "#1f6feb",
      stroke: "#e6edf3", "stroke-width": 2 });
    const label = svg("text", { x, y: y + 6, fill: "white", "text-anchor": "middle",
      "font-size": 18 }, node.invalid ? "?" : node.elem);
    if (isRecursive()) {
      for (const part of [circle, label]) {
        part.style.cursor = "pointer";
        part.addEventListener("click", () => {
          if (busy) return;
          startNode[functionMenu.value] = Number(key);
          reset();
        });
      }
    }
    picture.append(circle, label);
    if (state.values && key in state.values) {
      picture.append(svg("text", { x: x + 34, y: y + 5, fill: "#3fb950",
        "font-size": 16, "font-weight": "bold" }, `= ${state.values[key]}`));
    }

    const names = Object.keys(state.variables).filter(v => state.variables[v] === key);
    if (state.root === key) names.unshift("root");
    if (names.length) {
      picture.append(svg("text", { x, y: y - 50, fill: "#3fb950",
        "text-anchor": "middle", "font-size": 15 }, names.join(", ")));
      picture.append(svg("text", { x, y: y - 32, fill: "#3fb950",
        "text-anchor": "middle" }, "↓"));
    }
  }
  visual.append(picture);
}

// What depth() and height() should return for each node
const answerKey = {
  depth: { 1: 0, 2: 1, 3: 1, 4: 2, 5: 2, 6: 3 },
  height: { 1: 3, 2: 1, 3: 2, 4: 0, 5: 1, 6: 0 }
};

function shape(key) {
  const node = startingTree().nodes[key];
  if (node.left && node.right) return "both children";
  if (node.left) return "left child only";
  if (node.right) return "right child only";
  return "leaf";
}

function explain(step) {
  const name = functionMenu.value;
  const top = step.stack[step.stack.length - 1];
  if (step.type === "return") {
    const done = step.finished;
    let text = `Node ${done.node} returns ${done.value}.`;
    if (top) text += ` Node ${top.node} receives the answer.`;
    return text;
  }
  if (!top) return "";
  if (top.node === null) return `${name}() was called on NULL.`;
  let text = step.type === "call"
    ? `A new call starts at node ${top.node}.`
    : `Node ${top.node} is about to run the highlighted line.`;
  if (name === "height") text += ` Node ${top.node}: ${shape(top.node)}.`;
  else text += top.node === 1 ? " Node 1 has no parent." :
    ` Node ${top.node} has a parent.`;
  if (top.answers.length) {
    text += " Answers received: " +
      top.answers.map(a => `${a.value} from node ${a.node}`).join(", ") + ".";
  }
  return text;
}

// Turns one recorded step into a picture
function recursiveState(index) {
  const state = startingTree();
  state.marks = {};
  state.values = {};
  state.stack = [];
  if (!run || index === 0) {
    state.marks[startNode[functionMenu.value]] = "running";
    return state;
  }
  for (const step of run.steps.slice(0, index)) {
    if (step.type === "return") state.values[step.finished.node] = step.finished.value;
  }
  const step = run.steps[index - 1];
  for (const key of Object.keys(state.values)) state.marks[key] = "done";
  step.stack.forEach((call, i) => {
    if (call.node !== null) {
      state.marks[call.node] = i === step.stack.length - 1 ? "running" : "waiting";
    }
  });
  state.stack = step.stack;
  state.line = step.line;
  state.text = explain(step);

  // Longest path downward, only when every height was correct
  const start = startNode.height;
  if (functionMenu.value === "height" && index === run.steps.length &&
      run.result === answerKey.height[start]) {
    state.path = [];
    let key = String(start);
    while (state.nodes[key].left || state.nodes[key].right) {
      const { left, right } = state.nodes[key];
      const child = !right || (left &&
        answerKey.height[left] >= answerKey.height[right]) ? left : right;
      state.path.push([key, child]);
      key = child;
    }
  }
  return state;
}

function showCalls(state) {
  callsBox.hidden = !isRecursive();
  callsBox.replaceChildren();
  if (!isRecursive()) return;
  const title = document.createElement("strong");
  title.textContent = "Waiting calls (newest on top)";
  callsBox.append(title);
  const name = functionMenu.value;
  [...(state.stack || [])].reverse().forEach((call, i) => {
    const card = document.createElement("div");
    card.className = i === 0 ? "card running" : "card";
    const answers = call.answers.map(a => `node ${a.node} gave ${a.value}`);
    card.textContent = (i === 0 ? "▶ " : "") +
      `node ${call.node ?? "NULL"}: ${name}()` +
      (i === 0 ? "  running" : "  waiting for an answer") +
      (answers.length ? `  (${answers.join(", ")})` : "");
    callsBox.append(card);
  });
}

function show(index) {
  current = index;
  const state = isRecursive() ? recursiveState(current) : steps[current];
  draw(state);
  showCalls(state);
  [...codeView.children].forEach((row, i) =>
    row.classList.toggle("active", i + 1 === state.line));
  back.disabled = current === 0;
  next.disabled = current === steps.length - 1;
  play.disabled = steps.length < 2 || timer !== null;
  pause.disabled = timer === null;
  message.textContent = current === steps.length - 1 && finalMessage
    ? finalMessage
    : `Step ${current} of ${steps.length - 1}. The highlighted line has just run.`;
  if (isRecursive() && current > 0) {
    message.textContent = `Step ${current} of ${steps.length - 1}. ${state.text}` +
      (current === steps.length - 1 ? "\n\n" + finalMessage : "");
  }
}

function stop() {
  clearInterval(timer);
  timer = null;
}

function start() {
  stop();
  if (current === steps.length - 1) current = 0;
  timer = setInterval(() => {
    if (current < steps.length - 1) show(current + 1);
    if (current === steps.length - 1) {
      stop();
      show(current);
    }
  }, 2400 - speed.value * 400);
  show(current);
}

function recursiveHints(result) {
  const name = functionMenu.value;
  const start = startNode[name];
  if (result.crash === "SIGINT") {
    return "Stopped: it ran too long. Check the highlighted line for an endless loop.";
  }
  if (result.crash) {
    return `Your program stopped (${result.crash}). ` +
      "Check that you only call the function on a node that exists.";
  }
  if (result.limit) {
    return "Stopped after 200 steps. Does your recursion reach a base case?";
  }
  const expected = answerKey[name][start];
  // The first wrong answer is usually where the mistake begins
  const wrong = result.steps.find(s => s.type === "return" &&
    s.finished.value !== answerKey[name][s.finished.node]);
  let text = wrong
    ? `Logic hint: node ${wrong.finished.node} returned ${wrong.finished.value}, ` +
      `but its ${name} is ${answerKey[name][wrong.finished.node]}. ` +
      "Check the branch that node used."
    : `Finished. The ${name} of node ${start} is ${expected}.`;
  if (name === "height" && !wrong) {
    const { left, right } = startingTree().nodes[start];
    if (left && right) {
      const a = answerKey.height[left];
      const b = answerKey.height[right];
      text += `\nAt node ${start}: 1 + max(${a}, ${b}) = ${expected}.`;
    }
    text += "\nThe green line shows a longest path down to a leaf.";
  }
  if (name === "height") {
    text += "\nThe order of the two calls inside max() is chosen by the compiler.";
  }
  if (result.warnings) text += "\n\nCompiler warnings:\n" + result.warnings;
  return text;
}

function findHints(result) {
  if (result.crash === "SIGINT") {
    return "Stopped: it ran too long. Check the highlighted line for an endless loop.";
  }
  if (result.crash) {
    return `Your program stopped (${result.crash}) on the highlighted line. ` +
      "Check for NULL or invalid pointers.";
  }
  const name = functionMenu.value;
  const first = result.start;
  const last = result.steps[result.steps.length - 1];
  const taken = name !== "addRoot" && takenBox.checked;
  const side = name === "addLeft" ? "left" : "right";
  const hints = [];

  if (taken) {
    if (result.thrown === null) {
      hints.push(`The ${side} spot was already taken, so your function should ` +
        "throw an error. Check your if guard.");
    } else if (result.thrown !== `1 already has ${side} child`) {
      hints.push(`The expected message is "1 already has ${side} child".`);
    }
    if (JSON.stringify([last.root, last.size, last.nodes[first.root]]) !==
        JSON.stringify([first.root, first.size, first.nodes[first.root]])) {
      hints.push("The tree should stay unchanged when the spot is taken.");
    }
  } else if (result.thrown !== null) {
    hints.push("Your function threw an error, but it should have added a node. " +
      "Check your if guard.");
  } else if (name === "addRoot") {
    const node = last.nodes[last.root];
    if (!node) {
      hints.push("root does not point to a node. Did you set root to your new node?");
    } else {
      if (node.elem !== 1) hints.push("The root should store the value of e, which is 1.");
      if (node.parent) hints.push("The root's parent should be NULL.");
      if (node.left || node.right) hints.push("A new root should have no children.");
    }
    if (last.size !== 1) hints.push(`size is ${last.size}, but it should be 1.`);
  } else {
    const other = side === "left" ? "right" : "left";
    const value = side === "left" ? 2 : 3;
    const parent = last.nodes[first.root];
    const child = parent && last.nodes[parent[side]];
    if (last.root !== first.root) hints.push("root should still point to node 1.");
    if (!child) {
      hints.push(`p->${side} does not point to a node. ` +
        `Did you link the new node with p->${side} = n?`);
    } else {
      if (parent[side] in first.nodes || child.elem !== value) {
        hints.push(`p->${side} should point to a new node storing ${value}.`);
      }
      if (child.parent !== first.root) {
        hints.push("The new node's parent should be p. Check what you gave create_node.");
      }
      if (child.left || child.right) hints.push("The new node should have no children.");
    }
    if (parent && parent[other] !== first.nodes[first.root][other]) {
      hints.push(`p->${other} should not change.`);
    }
    if (last.size !== first.size + 1) {
      hints.push(`size is ${last.size}, but it should be ${first.size + 1}.`);
    }
  }

  let text = hints.length ? "Logic hint: " + hints.join(" ")
    : `Finished. The result matches what ${selectedCall()} should do.`;
  if (result.thrown !== null) text = `Error thrown: ${result.thrown}\n\n` + text;
  if (result.warnings) text += "\n\nCompiler warnings:\n" + result.warnings;
  return text;
}

function reset() {
  stop();
  run = null;
  steps = [startingTree()];
  heading.textContent = "Visual: " + selectedCall();
  finalMessage = "";
  codeBox.hidden = false;
  codeView.hidden = true;
  show(0);
  message.textContent = `Type your ${functionMenu.value} function, then click Run.`;
  codeBox.placeholder = `Type your ${functionMenu.value} function here...`;
}

runButton.addEventListener("click", async () => {
  if (codeBox.value.trim() === "") {
    message.textContent = "Please type your function first.";
    return;
  }
  reset();
  busy = true;
  runButton.disabled = resetButton.disabled = codeBox.disabled = true;
  functionMenu.disabled = takenBox.disabled = true;
  message.textContent = "Compiling and running...";
  try {
    const response = await fetch("/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: codeBox.value, function: functionMenu.value,
                             taken: takenBox.checked,
                             target: startNode[functionMenu.value] || 1 })
    });
    if (!response.ok) throw new Error("server error " + response.status);
    const result = await response.json();

    if (result.error === "compile") {
      message.textContent = "Your code did not compile. The code box should have " +
        `your ${functionMenu.value} function, matching the menu.\n\n` + result.details;
    } else if (result.error === "timeout") {
      message.textContent = "Stopped: it ran too long. Check for an endless loop.";
    } else if (result.error || result.steps.length === 0) {
      message.textContent = "No steps were recorded.\n\n" + (result.details || "");
    } else {
      if (isRecursive()) {
        run = result;
        steps = [null, ...result.steps];
        finalMessage = recursiveHints(result);
      } else {
        steps = [result.start, ...result.steps];
        finalMessage = findHints(result);
      }
      codeView.replaceChildren(...codeBox.value.split("\n").map((text, i) => {
        const row = document.createElement("div");
        row.textContent = `${String(i + 1).padStart(3)}  ${text}`;
        return row;
      }));
      codeBox.hidden = true;
      codeView.hidden = false;
      start();
    }
  } catch (error) {
    message.textContent = "Could not run the code. Is server.py running? " + error.message;
  }
  runButton.disabled = resetButton.disabled = codeBox.disabled = false;
  functionMenu.disabled = takenBox.disabled = false;
  busy = false;
});

resetButton.addEventListener("click", reset);
back.addEventListener("click", () => { stop(); show(current - 1); });
next.addEventListener("click", () => { stop(); show(current + 1); });
play.addEventListener("click", start);
pause.addEventListener("click", () => { stop(); show(current); });
speed.addEventListener("input", () => { if (timer !== null) start(); });
speed.disabled = false;

function changeOptions() {
  document.getElementById("takenLabel").hidden =
    functionMenu.value === "addRoot" || isRecursive();
  reset();
}
functionMenu.addEventListener("change", changeOptions);
takenBox.addEventListener("change", reset);
changeOptions();