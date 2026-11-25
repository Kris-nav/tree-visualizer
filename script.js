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
    </select>
  </label>
  <label id="takenLabel"><input type="checkbox" id="taken">
    Test when the spot is already taken</label>`;
document.querySelector(".controls").before(options);
const functionMenu = document.getElementById("function");
const takenBox = document.getElementById("taken");
const heading = status.previousElementSibling;

function selectedCall() {
  const name = functionMenu.value;
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
  status.textContent =
    `root = ${state.root ? "points to a node" : "NULL"}  |  size = ${state.size}`;
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

  for (const key of keys) {
    const { x, y } = positions[key];
    const node = state.nodes[key];
    picture.append(svg("circle", { cx: x, cy: y, r: 26, fill: "#1f6feb",
      stroke: "#e6edf3", "stroke-width": 2 }));
    picture.append(svg("text", { x, y: y + 6, fill: "white", "text-anchor": "middle",
      "font-size": 18 }, node.invalid ? "?" : node.elem));

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

function show(index) {
  current = index;
  const state = steps[current];
  draw(state);
  [...codeView.children].forEach((row, i) =>
    row.classList.toggle("active", i + 1 === state.line));
  back.disabled = current === 0;
  next.disabled = current === steps.length - 1;
  play.disabled = steps.length < 2 || timer !== null;
  pause.disabled = timer === null;
  message.textContent = current === steps.length - 1 && finalMessage
    ? finalMessage
    : `Step ${current} of ${steps.length - 1}. The highlighted line has just run.`;
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
  runButton.disabled = resetButton.disabled = codeBox.disabled = true;
  functionMenu.disabled = takenBox.disabled = true;
  message.textContent = "Compiling and running...";
  try {
    const response = await fetch("/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: codeBox.value, function: functionMenu.value,
                             taken: takenBox.checked })
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
      steps = [result.start, ...result.steps];
      finalMessage = findHints(result);
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
});

resetButton.addEventListener("click", reset);
back.addEventListener("click", () => { stop(); show(current - 1); });
next.addEventListener("click", () => { stop(); show(current + 1); });
play.addEventListener("click", start);
pause.addEventListener("click", () => { stop(); show(current); });
speed.addEventListener("input", () => { if (timer !== null) start(); });
speed.disabled = false;

function changeOptions() {
  document.getElementById("takenLabel").hidden = functionMenu.value === "addRoot";
  reset();
}
functionMenu.addEventListener("change", changeOptions);
takenBox.addEventListener("change", reset);
changeOptions();