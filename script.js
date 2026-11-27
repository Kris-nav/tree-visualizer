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
      <option>sibling</option>
      <option>addRoot</option><option>addLeft</option><option>addRight</option>
      <option>depth</option><option>height</option><option>remove</option>
      <option>preorder</option><option>inorder</option>
      <option>postorder</option><option>breadthfirst</option>
      <option value="bstSearch">BST search (explore)</option>
      <option value="bstInsert">BST insert (explore)</option>
      <option value="bstDelete">BST delete (explore)</option>
    </select>
  </label>
  <label id="versionLabel">Code:
    <select id="codeVersion">
      <option value="full">Full code</option>
      <option value="case">Case code only</option>
    </select>
  </label>
  <label id="caseLabel">Test tree:
    <select id="removeCase">
      <option value="1">Case 1: Removing a leaf (remove 7)</option>
      <option value="2">Case 2: One child moves up (remove 3)</option>
      <option value="3">Case 2 at the root (remove 1)</option>
      <option value="4">Case 3: Two children (remove 2)</option>
    </select>
  </label>
  <label id="takenLabel"><input type="checkbox" id="taken">
    Test when the spot is already taken</label>`;
document.querySelector(".controls").before(options);
const functionMenu = document.getElementById("function");
const takenBox = document.getElementById("taken");
const heading = status.previousElementSibling;
const caseMenu = document.getElementById("removeCase");
const isRemove = () => functionMenu.value === "remove";
const versionMenu = document.getElementById("codeVersion");

// [parent, side, child] for each practice tree on the remove slides
const removeCases = {
  1: { target: 7, links: [[1,"left",2], [1,"right",3], [2,"left",4],
       [2,"right",5], [5,"left",7]] },
  2: { target: 3, links: [[1,"left",2], [1,"right",3], [2,"left",4],
       [2,"right",5], [3,"right",6]] },
  3: { target: 1, links: [[1,"left",2], [2,"left",4], [2,"right",5]] },
  4: { target: 2, links: [[1,"left",2], [1,"right",3], [2,"left",4],
       [2,"right",5], [3,"right",6], [5,"left",7]] }
};

// If only a case snippet is typed, these lines are added around it
function completeCode(code) {
  const plain = { text: code, provided: new Set() };
  if (!isRemove() || versionMenu.value === "full") return plain;
  const before = ["int remove(node* n) {", "  int res = n->elem;"];
  if (caseMenu.value === "3") {
    before.push("  node* child = left(n) ? left(n) : right(n);");
  }
  const after = caseMenu.value === "4" ? ["  return res;", "}"]
    : ["  size--;", "  free(n);", "  return res;", "}"];
  const middle = code.replace(/\s+$/, "").split("\n");
  const lines = [...before, ...middle, ...after];
  const provided = new Set(lines.map((_, i) => i).filter(i =>
    i < before.length || i >= before.length + middle.length));
  return { text: lines.join("\n"), provided };
}

// depth and height use the 6-node practice tree
const startNode = { depth: 4, height: 1 };
const isRecursive = () => functionMenu.value in startNode;
let busy = false;
let run = null;  // the recording of the latest depth or height run

const callsBox = document.createElement("div");
callsBox.id = "calls";
visual.after(callsBox);

// ---- Binary search tree: Explore mode (no student code, no C++) ----
const bstSteps = {
  bstSearch: [
    "Start at the root.",
    "Compare the key with the current node.",
    "Smaller: go left.",
    "Greater: go right.",
    "Equal: the key is found.",
    "No child there: the key is not found."
  ],
  bstInsert: [
    "Start at the root.",
    "Compare the new key with the current node.",
    "Smaller: go left.",
    "Greater: go right.",
    "Equal: the key already exists, so only its value is reassigned.",
    "No child there: add the new node here as a leaf."
  ],
  bstDelete: [
    "Search for the key, starting at the root.",
    "Smaller: go left.",
    "Greater: go right.",
    "No child there: the key is not found, so nothing changes.",
    "Found, no children: remove the node.",
    "Found, one child: the child moves up.",
    "Found, two children: find the successor. Go right once.",
    "Keep going left until there is no left child.",
    "Copy the successor's key into the found node.",
    "Remove the successor's old node."
  ]
};
const isBst = () => functionMenu.value in bstSteps;
let bstTree = null;  // keeps your inserts and deletes until Reset

const bstOptions = document.createElement("span");
bstOptions.innerHTML = `
  <label>Key: <input type="number" id="bstKey" value="32" min="0" max="999"
    style="width:80px"></label>
  <label>Starting tree:
    <select id="bstStart">
      <option value="basic">Search and insert slides</option>
      <option value="delete">Delete slides (adds 15 and 87)</option>
    </select>
  </label>`;
options.append(bstOptions);
const keyInput = document.getElementById("bstKey");
const bstStart = document.getElementById("bstStart");
const codeTitle = codeBox.closest(".panel").querySelector("h2");
const codeTitleText = codeTitle?.textContent;

function addLeaf(tree, parent, side, key) {
  const id = `b${tree.nextId++}`;
  tree.nodes[id] = { elem: key, left: null, right: null, parent };
  if (parent === null) tree.root = id;
  else tree.nodes[parent][side] = id;
  tree.size++;
  return id;
}

function newBst() {
  const tree = { root: null, size: 0, nodes: {}, nextId: 1 };
  const keys = [55, 21, 82, 11, 45, 67, 94, 7, 32, 48, 89];
  if (bstStart.value === "delete") keys.push(15, 87);
  for (const key of keys) {
    let parent = null;
    let side = null;
    let at = tree.root;
    while (at !== null) {
      parent = at;
      side = key < tree.nodes[at].elem ? "left" : "right";
      at = tree.nodes[at][side];
    }
    addLeaf(tree, parent, side, key);
  }
  return tree;
}

function subtree(tree, id) {
  if (id === null) return [];
  const node = tree.nodes[id];
  return [id, ...subtree(tree, node.left), ...subtree(tree, node.right)];
}

// Runs one operation and returns a picture for every step
function bstRun(operation, key) {
  const tree = bstTree;
  const states = [];
  const path = new Set();
  const faded = new Set();  // parts that the search has ruled out
  const lineOf = start => bstSteps[operation].findIndex(t => t.startsWith(start)) + 1;

  function record(start, text, labels = {}) {
    const marks = {};
    for (const id of path) marks[id] = "waiting";
    if (labels.p) marks[labels.p] = "running";
    if (labels.r) marks[labels.r] = "done";
    states.push(JSON.parse(JSON.stringify({
      root: tree.root, size: tree.size, nodes: tree.nodes, variables: labels,
      marks, faded: [...faded], line: start ? lineOf(start) : 0, text
    })));
  }

  // Takes out a node that has at most one child
  function unlink(id) {
    const { left, right, parent } = tree.nodes[id];
    const child = left ?? right;
    if (parent === null) tree.root = child;
    else {
      const side = tree.nodes[parent].left === id ? "left" : "right";
      tree.nodes[parent][side] = child;
    }
    if (child !== null) tree.nodes[child].parent = parent;
    delete tree.nodes[id];
    path.delete(id);
    tree.size--;
  }

  record(null, "This is the tree before the operation.");
  let p = tree.root;
  if (p === null) {
    if (operation === "bstInsert") {
      p = addLeaf(tree, null, null, key);
      record("No child", `The tree is empty, so ${key} becomes the root.`, { p });
    } else {
      record(operation === "bstSearch" ? "No child" : "No child",
        `The tree is empty, so ${key} is not found.`);
    }
    return states;
  }
  record(operation === "bstDelete" ? "Search" : "Start",
    `Start at the root, ${tree.nodes[p].elem}.`, { p });

  while (tree.nodes[p].elem !== key) {
    const here = tree.nodes[p].elem;
    if (operation !== "bstDelete") {
      record("Compare", `Compare ${key} with ${here}.`, { p });
    }
    const side = key < here ? "left" : "right";
    const other = side === "left" ? "right" : "left";
    for (const id of subtree(tree, tree.nodes[p][other])) faded.add(id);
    const sign = key < here ? "<" : ">";
    record(key < here ? "Smaller" : "Greater",
      `${key} ${sign} ${here}, so go ${side.toUpperCase()}.`, { p });
    path.add(p);
    if (tree.nodes[p][side] === null) {
      if (operation === "bstInsert") {
        const added = addLeaf(tree, p, side, key);
        record("No child", `${here} has no ${side} child, so ${key} becomes ` +
          `its ${side} child.`, { p: added });
      } else {
        record("No child", `${here} has no ${side} child. ${key} is not found.` +
          (operation === "bstDelete" ? " Nothing changes." : ""), { p });
      }
      return states;
    }
    p = tree.nodes[p][side];
  }

  if (operation === "bstSearch") {
    record("Equal", `${key} = ${key}. Found it!`, { p });
    return states;
  }
  if (operation === "bstInsert") {
    record("Equal", `${key} is already in the tree. No new node is added; ` +
      "its value would be reassigned.", { p });
    return states;
  }

  const { left, right } = tree.nodes[p];
  if (left === null || right === null) {
    const start = left === null && right === null ? "Found, no" : "Found, one";
    const childId = left ?? right;
    record(start, childId === null
      ? `Found ${key}. It is a leaf.`
      : `Found ${key}. Its only child, ${tree.nodes[childId].elem}, will move up.`,
      { p });
    unlink(p);
    record(start, childId === null
      ? `${key} has been removed.`
      : `${tree.nodes[childId].elem} took the place of ${key}.`);
    return states;
  }

  let r = right;
  record("Found, two", `${key} has two children. To find the successor, go ` +
    `right once to ${tree.nodes[r].elem}.`, { p, r });
  while (tree.nodes[r].left !== null) {
    r = tree.nodes[r].left;
    record("Keep going", `Go left to ${tree.nodes[r].elem}.`, { p, r });
  }
  const successor = tree.nodes[r].elem;
  record("Keep going", `${successor} has no left child, so it is the successor.`,
    { p, r });
  tree.nodes[p].elem = successor;
  record("Copy", `Copy ${successor} into the node that held ${key}. For a ` +
    `moment, ${successor} appears twice.`, { p, r });
  unlink(r);
  record("Remove the successor", `The old ${successor} node is removed. ` +
    "Delete is finished.", { p });
  return states;
}

function showSteps(lines) {
  codeView.replaceChildren(...lines.map((text, i) => {
    const row = document.createElement("div");
    row.textContent = `${String(i + 1).padStart(3)}  ${text}`;
    row.style.whiteSpace = "pre-wrap";
    return row;
  }));
  codeBox.hidden = true;
  codeView.hidden = false;
}

function runBst() {
  const key = Number(keyInput.value);
  if (keyInput.value === "" || !Number.isInteger(key) || key < 0 || key > 999) {
    message.textContent = "Type a whole number from 0 to 999 as the key.";
    return;
  }
  reset();
  if (functionMenu.value === "bstInsert" && bstTree.size >= 20) {
    message.textContent = "The practice tree is full (20 nodes). Click Reset.";
    return;
  }
  steps = bstRun(functionMenu.value, key);
  start();
}

// What each traversal should print for the sample tree
const traversalAnswers = {
  preorder: "1 2 4 5 7 3 6",
  inorder: "4 2 7 5 1 3 6",
  postorder: "4 7 5 2 6 3 1",
  breadthfirst: "1 2 3 4 5 6 7"
};
const isTraversal = () => functionMenu.value in traversalAnswers;
const words = text => text.trim().split(/\s+/).filter(Boolean);

// sibling(n) uses the tree on its slide. 0 means the answer is NULL.
const siblingStart = { sibling: 4 };
const siblingAnswers = { 1: 0, 2: 3, 3: 2, 4: 5, 5: 4, 6: 0, 7: 0 };
const isSibling = () => functionMenu.value === "sibling";

function selectedCall() {
  const name = functionMenu.value;
  if (isSibling()) return `sibling(node ${siblingStart.sibling})`;
  if (isBst()) {
    return `BST ${name.slice(3).toLowerCase()} (explore mode)`;
  }
  if (isTraversal()) return `${name}()`;
  if (isRemove()) return `remove(node ${removeCases[caseMenu.value].target})`;
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
  if (isBst()) {
    bstTree ??= newBst();
    return { ...JSON.parse(JSON.stringify(bstTree)), line: 0, variables: {} };
  }
  const node = (elem, parent) => ({ elem, left: null, right: null, parent });
  if (isTraversal() || isSibling()) {
    state.nodes[1] = node(1, null);
    for (const [parent, side, child] of removeCases[4].links) {
      state.nodes[parent][side] = String(child);
      state.nodes[child] = node(child, String(parent));
    }
    state.root = "1";
    state.size = 7;
    if (isSibling()) state.variables = { n: String(siblingStart.sibling) };
    return state;
  }
  if (isRemove()) {
    state.nodes[1] = node(1, null);
    for (const [parent, side, child] of removeCases[caseMenu.value].links) {
      state.nodes[parent][side] = String(child);
      state.nodes[child] = node(child, String(parent));
    }
    state.root = "1";
    state.size = Object.keys(state.nodes).length;
    state.variables = { n: String(removeCases[caseMenu.value].target) };
    return state;
  }
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
  status.textContent = isSibling()
    ? "Click a node to use it as n. Green circle = the node that was returned."
    : isBst()
    ? `size = ${state.size}  |  yellow = current (p), purple = path, ` +
      "green = successor (r), faded = ruled out"
    : isTraversal()
    ? (functionMenu.value === "breadthfirst"
      ? "Gray = not queued, purple = in the queue, yellow = n, green = finished."
      : "Blue = not reached, yellow = current, purple = waiting, green = printed.") +
      " #1 means printed first."
    : isRecursive()
    ? "Click a node to start there. Yellow = running, purple = waiting, green = returned."
    : `root = ${state.root ? "points to a node" : "NULL"}  |  size = ${state.size}` +
      Object.entries(state.numbers || {})
        .map(([name, value]) => `  |  ${name} = ${value}`).join("");
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
    const colors = { running: "#d29922", waiting: "#8957e5", done: "#238636",
                     unseen: "#484f58" };
    const circle = svg("circle", { cx: x, cy: y, r: 26,
      fill: colors[state.marks?.[key]] || "#1f6feb",
      stroke: "#e6edf3", "stroke-width": 2 });
    const label = svg("text", { x, y: y + 6, fill: "white", "text-anchor": "middle",
      "font-size": 18 }, node.invalid ? "?" : node.elem);
    if (node.freed) {
      circle.setAttribute("fill", "#3d1d1f");
      circle.setAttribute("stroke", "#f85149");
      circle.setAttribute("stroke-dasharray", "5 4");
      picture.append(svg("text", { x, y: y + 46, fill: "#f85149",
        "text-anchor": "middle", "font-size": 14 }, "freed"));
    }
    if (isRecursive() || isSibling()) {
      const choices = isSibling() ? siblingStart : startNode;
      for (const part of [circle, label]) {
        part.style.cursor = "pointer";
        part.addEventListener("click", () => {
          if (busy) return;
          choices[functionMenu.value] = node.elem;  // the number in the circle
          reset();
        });
      }
    }
    if (state.faded?.includes(key)) {
      circle.setAttribute("opacity", 0.3);
      label.setAttribute("opacity", 0.4);
    }
    picture.append(circle, label);
    if (state.order && key in state.order) {
      picture.append(svg("text", { x: x + 32, y: y + 5, fill: "#3fb950",
        "font-size": 15, "font-weight": "bold" }, `#${state.order[key]}`));
    }
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

// What changed between the previous step and this one
function traversalChanges(before, step) {
  const changes = [];
  const added = words(step.output).slice(words(before?.output || "").length);
  if (added.length) changes.push(`Printed ${added.join(", ")}.`);
  if (functionMenu.value === "breadthfirst") {
    const old = before?.queue || [];
    const now = step.queue || [];
    let gone = 0;  // how many nodes left from the front
    while (gone < old.length &&
           old.slice(gone).some((value, i) => now[i] !== value)) gone++;
    if (gone) changes.push(`Node ${old.slice(0, gone).join(", ")} left the queue.`);
    const joined = now.slice(old.length - gone);
    if (joined.length) changes.push(`Node ${joined.join(", ")} joined the queue.`);
  } else {
    const oldDepth = before?.stack.length || 0;
    const top = step.stack[step.stack.length - 1];
    if (step.stack.length > oldDepth && top) {
      changes.push(`Started ${top.name}` +
        (top.node === null ? "()." : ` at node ${top.node}.`));
    } else if (step.stack.length < oldDepth) {
      changes.push("A call finished" +
        (top && top.node !== null ? `, so we are back at node ${top.node}.` : "."));
    }
  }
  return changes.join(" ");
}

function traversalState(index) {
  const state = startingTree();
  state.marks = {};
  state.order = {};
  state.stack = [];
  state.queue = null;
  state.output = "";
  const breadth = functionMenu.value === "breadthfirst";
  if (breadth) {
    for (const key of Object.keys(state.nodes)) state.marks[key] = "unseen";
  }
  if (!run || index === 0) return state;

  const step = run.steps[index - 1];
  Object.assign(state, { line: step.line, stack: step.stack,
                         queue: step.queue, output: step.output });
  words(step.output).forEach((value, i) => {
    state.order[value] ??= i + 1;
    state.marks[value] = "done";
  });
  const mark = (value, color) => {
    if (value !== null && value in state.nodes) state.marks[value] = color;
  };
  for (const value of step.queue || []) mark(value, "waiting");
  if (!breadth) step.stack.forEach(call => mark(call.node, "waiting"));
  const top = step.stack[step.stack.length - 1];
  if (top) mark(top.node, "running");

  state.text = traversalChanges(run.steps[index - 2], step) ||
    (top ? "The highlighted line is about to run." : "The function has finished.");
  return state;
}

function showTraversal(state) {
  const add = (text, className) => {
    const box = document.createElement("div");
    box.className = className;
    box.textContent = text;
    callsBox.append(box);
    return box;
  };
  add(`Output: ${state.output || "(nothing yet)"}`, "card");
  if (functionMenu.value === "breadthfirst") {
    const title = add("Queue (front on the left, back on the right)", "");
    title.style.cssText = "margin-top:8px;font-weight:bold";
    const row = add("", "");
    row.style.cssText = "display:flex;gap:6px;flex-wrap:wrap";
    for (const value of state.queue || []) {
      const item = document.createElement("div");
      item.className = "card";
      item.style.cssText = "min-width:40px;text-align:center";
      item.textContent = value ?? "NULL";
      row.append(item);
    }
    if (!state.queue?.length) row.textContent = "(empty)";
    return;
  }
  const title = add("Waiting calls (newest on top)", "");
  title.style.cssText = "margin-top:8px;font-weight:bold";
  [...state.stack].reverse().forEach((call, i) => {
    add((i === 0 ? "▶ " : "") + call.name +
      (call.node === null ? "()" : `(node ${call.node})`) +
      (i === 0 ? "  running" : "  waiting"), i === 0 ? "card running" : "card");
  });
}

function showCalls(state) {
  callsBox.hidden = !isRecursive() && !isTraversal();
  callsBox.replaceChildren();
  if (isTraversal()) return showTraversal(state);
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
  const state = isTraversal() ? traversalState(current)
    : isRecursive() ? recursiveState(current) : steps[current];
  draw(state);
  showCalls(state);
  [...codeView.children].forEach((row, i) =>
    row.classList.toggle("active", i + 1 === state.line));
  const activeRow = codeView.querySelector(".active");
  if (activeRow) {
    const top = activeRow.offsetTop - codeView.offsetTop;
    if (top < codeView.scrollTop ||
        top + activeRow.offsetHeight > codeView.scrollTop + codeView.clientHeight) {
      codeView.scrollTop = top - codeView.clientHeight / 2;
    }
  }
  back.disabled = current === 0;
  next.disabled = current === steps.length - 1;
  play.disabled = steps.length < 2 || timer !== null;
  pause.disabled = timer === null;
  message.textContent = current === steps.length - 1 && finalMessage
    ? finalMessage
    : `Step ${current} of ${steps.length - 1}. The highlighted line has just run.`;
  if (isBst()) {
    message.textContent = steps.length < 2
      ? "Choose a key, then click Run. Explore mode does not run or check code."
      : `Step ${current} of ${steps.length - 1}. ${state.text}`;
  }
  if ((isRecursive() || isTraversal()) && current > 0) {
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

function removeHints(result) {
  if (result.crash === "SIGINT") {
    return "Stopped: it ran too long. Check the highlighted line for an endless loop.";
  }
  if (result.crash) {
    return `Your program stopped (${result.crash}) on the highlighted line. ` +
      "Check for NULL pointers, or a node freed twice.";
  }
  const choice = caseMenu.value;
  const target = removeCases[choice].target;
  const first = result.start;
  const last = result.steps[result.steps.length - 1];

  // Nodes are matched by their values, using the starting tree
  const addressOf = {};
  const valueAt = {};
  for (const [key, node] of Object.entries(first.nodes)) {
    addressOf[node.elem] = key;
    valueAt[key] = node.elem;
  }
  const nameOf = key => key === null ? "NULL" : `node ${valueAt[key] ?? "?"}`;

  const expected = JSON.parse(JSON.stringify(first.nodes));
  let root = first.root;
  const twoChildren = choice === "4";
  if (!twoChildren) {
    const key = addressOf[target];
    const old = expected[key];
    const child = old.left || old.right;
    if (old.parent) {
      const parent = expected[old.parent];
      parent[parent.left === key ? "left" : "right"] = child;
    } else {
      root = child;
    }
    if (child) expected[child].parent = old.parent;
    delete expected[key];
  }
  const size = Object.keys(expected).length;
  const answer = twoChildren ? -1 : target;

  const hints = [];
  if (last.root !== root) {
    hints.push(`root should point to ${nameOf(root)}.`);
  }
  for (const [key, node] of Object.entries(expected)) {
    const actual = last.nodes[key];
    if (!actual) continue;  // no longer reachable: its link is reported already
    if (actual.freed) {
      hints.push(`${nameOf(key)} was freed, but it should stay in the tree.`);
      continue;
    }
    for (const link of ["left", "right", "parent"]) {
      if (actual[link] !== node[link]) {
        hints.push(`${nameOf(key)}'s ${link} should be ${nameOf(node[link])}.`);
      }
    }
  }
  if (last.size !== size) hints.push(`size is ${last.size}, but it should be ${size}.`);
  if (result.returned !== answer) {
    hints.push(`remove should return ${answer}, but it returned ${result.returned}.`);
  }
  const gone = last.nodes[addressOf[target]];
  if (!twoChildren && !(gone && gone.freed)) {
    hints.push(`Node ${target} was not seen being freed. Did you call free(n)?`);
  }

  let text = hints.length ? "Logic hint: " + hints.join(" ")
    : twoChildren
      ? "Finished. Node 2 has two children, so remove returned -1 and changed nothing."
      : `Finished. Node ${target} was removed correctly and remove returned ${target}.`;
  if (result.warnings) text += "\n\nCompiler warnings:\n" + result.warnings;
  return text;
}

function traversalHints(result) {
  if (result.crash === "SIGINT") {
    return "Stopped: it ran too long. Check the highlighted line for an endless loop.";
  }
  if (result.crash) {
    return `Your program stopped (${result.crash}) on the highlighted line. ` +
      "Check that you never use a NULL node, and that every recursion stops.";
  }
  if (result.limit) {
    return "Stopped after 300 steps. Check that your loop or recursion ends.";
  }
  const name = functionMenu.value;
  const output = result.steps[result.steps.length - 1].output;
  const got = words(output).join(" ");
  const expected = traversalAnswers[name];
  let text;
  if (got !== expected) {
    const other = Object.keys(traversalAnswers)
      .find(key => traversalAnswers[key] === got);
    text = `Logic hint: expected ${expected} but your output is ` +
      `${got || "empty"}.` +
      (other ? ` That is the ${other} order. Check where you visit the node.` : "");
  } else if (output !== expected + " ") {
    text = "The order is correct, but the slides print each number followed " +
      "by one space.";
  } else {
    text = `Finished. Your ${name} output is correct: ${expected}`;
  }
  if (result.warnings) text += "\n\nCompiler warnings:\n" + result.warnings;
  return text;
}

function siblingHints(result) {
  if (result.crash === "SIGINT") {
    return "Stopped: it ran too long. Check the highlighted line for an endless loop.";
  }
  if (result.crash) {
    return `Your program stopped (${result.crash}) on the highlighted line. ` +
      "The root has no parent, so check for that before using n->parent.";
  }
  const target = siblingStart.sibling;
  const expected = siblingAnswers[target];
  const name = value => value === 0 ? "NULL" : `node ${value}`;
  const last = result.steps[result.steps.length - 1];
  const hints = [];
  if (result.returned !== expected) {
    hints.push(`sibling(node ${target}) should return ${name(expected)}, ` +
      `but your function returned ${name(result.returned)}.`);
  }
  // Compare node by node, because the nodes may be listed in a different order
  const picture = tree => JSON.stringify([tree.root, tree.size,
    Object.keys(tree.nodes).sort().map(key => [key, tree.nodes[key]])]);
  if (picture(last) !== picture(result.start)) {
    hints.push("sibling should only look at the tree, not change it.");
  }
  let text;
  if (hints.length) {
    text = "Logic hint: " + hints.join(" ");
  } else {
    const why = target === 1 ? " The root has no parent."
      : expected === 0 ? " Its parent has no other child." : "";
    text = `Finished. sibling(node ${target}) returned ${name(expected)}.` + why;
  }
  // Turn the returned node green on the last step
  if (result.returned > 0) {
    const key = Object.keys(last.nodes)
      .find(k => last.nodes[k].elem === result.returned);
    result.steps[result.steps.length - 1] =
      { ...last, marks: { [key]: "done" } };
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
  if (codeTitle) {
    codeTitle.textContent = isBst() ? "Algorithm steps (not C++)" : codeTitleText;
  }
  if (isBst()) showSteps(bstSteps[functionMenu.value]);
  show(0);
  message.textContent = isBst()
    ? "Choose a key, then click Run. Reset restores the starting tree."
    : `Type your ${functionMenu.value} function, then click Run.`;
  codeBox.placeholder = `Type your ${functionMenu.value} function here...`;
}

runButton.addEventListener("click", async () => {
  if (isBst()) {
    runBst();
    return;
  }
  if (codeBox.value.trim() === "") {
    message.textContent = "Please type your function first.";
    return;
  }
  if (isRemove()) {
    // Check that the code matches the chosen version
    const isFull = /\bint\s+remove\s*\(/.test(codeBox.value);
    if (versionMenu.value === "full" && !isFull) {
      message.textContent = "Full code must start with int remove(node* n). " +
        'To run only part of it, choose "Case code only" in the Code menu.';
      return;
    }
    if (versionMenu.value === "case" && isFull) {
      message.textContent = 'This is the full function. Choose "Full code" ' +
        "in the Code menu.";
      return;
    }
  }
  reset();
  busy = true;
  runButton.disabled = resetButton.disabled = codeBox.disabled = true;
  functionMenu.disabled = takenBox.disabled = caseMenu.disabled = true;
  versionMenu.disabled = true;
  message.textContent = "Compiling and running...";
  const complete = completeCode(codeBox.value);
  try {
    const response = await fetch("/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: complete.text, function: functionMenu.value,
                             taken: takenBox.checked,
                             target: isRemove() ? Number(caseMenu.value)
                               : siblingStart[functionMenu.value] ||
                                 startNode[functionMenu.value] || 1 })
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
      if (isRecursive() || isTraversal()) {
        run = result;
        steps = [null, ...result.steps];
        finalMessage = isTraversal() ? traversalHints(result)
          : recursiveHints(result);
      } else {
        finalMessage = isSibling() ? siblingHints(result)
          : isRemove() ? removeHints(result) : findHints(result);
        steps = [result.start, ...result.steps];
      }
      codeView.replaceChildren(...complete.text.split("\n").map((text, i) => {
        const row = document.createElement("div");
        if (complete.provided.has(i)) row.className = "provided";
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
  functionMenu.disabled = takenBox.disabled = caseMenu.disabled = false;
  versionMenu.disabled = false;
  busy = false;
});

resetButton.addEventListener("click", () => {
  bstTree = null;
  reset();
});
bstStart.addEventListener("change", () => {
  bstTree = null;
  reset();
});
back.addEventListener("click", () => { stop(); show(current - 1); });
next.addEventListener("click", () => { stop(); show(current + 1); });
play.addEventListener("click", start);
pause.addEventListener("click", () => { stop(); show(current); });
speed.addEventListener("input", () => { if (timer !== null) start(); });
speed.disabled = false;

function changeOptions() {
  document.getElementById("takenLabel").hidden =
    functionMenu.value === "addRoot" || isRecursive() || isRemove() ||
    isTraversal() || isBst() || isSibling();
  bstOptions.hidden = !isBst();
  document.getElementById("caseLabel").hidden = !isRemove();
  document.getElementById("versionLabel").hidden = !isRemove();
  reset();
}
functionMenu.addEventListener("change", changeOptions);
takenBox.addEventListener("change", reset);
caseMenu.addEventListener("change", reset);
versionMenu.addEventListener("change", reset);
changeOptions();

// ---- Appearance only: line numbers and C++ colors ----
const gutter = document.getElementById("gutter");

function updateLineNumbers() {
  const count = codeBox.value.split("\n").length;
  gutter.textContent = Array.from({ length: count }, (_, i) => i + 1).join("\n");
  gutter.scrollTop = codeBox.scrollTop;
}

codeBox.addEventListener("input", updateLineNumbers);
codeBox.addEventListener("scroll", () => { gutter.scrollTop = codeBox.scrollTop; });
updateLineNumbers();

const tokenPattern = new RegExp([
  /(\/\/.*|\/\*.*?(?:\*\/|$))/,                       // comment
  /("(?:\\.|[^"\\])*"?|'(?:\\.|[^'\\])*'?)/,          // text in quotes
  /\b(if|else|while|for|return|throw|new|delete|class|struct|public|private|virtual|override|const|using|namespace|break|continue|this|true|false|NULL|nullptr)\b/,
  /\b(int|void|bool|char|string|node|Queue|ArrayQueue)\b/,
  /\b(\d+)\b/
].map(part => part.source).join("|"), "g");
const tokenNames = ["comment", "string", "keyword", "type", "number"];

function span(text, className) {
  const element = document.createElement("span");
  element.textContent = text;
  element.className = className;
  return element;
}

// Each time the code view is filled, style its numbers and color the C++
new MutationObserver(() => {
  for (const row of codeView.children) {
    if (row.querySelector(".num")) continue;
    const found = row.textContent.match(/^(\s*\d+)  (.*)$/s);
    if (!found) continue;
    const [, number, code] = found;
    const parts = [span(number.trim(), "num")];
    let end = 0;
    // BST explore mode shows plain English, so it gets no C++ colors
    for (const match of isBst() ? [] : code.matchAll(tokenPattern)) {
      const kind = tokenNames[match.slice(1).findIndex(group => group !== undefined)];
      parts.push(code.slice(end, match.index), span(match[0], `tok-${kind}`));
      end = match.index + match[0].length;
    }
    parts.push(code.slice(end));
    row.replaceChildren(...parts);
  }
}).observe(codeView, { childList: true });

// Stops small trees from being stretched to fill a large screen
new MutationObserver(() => {
  const picture = visual.querySelector("svg");
  if (!picture) return;
  const [, , width, height] = picture.getAttribute("viewBox").split(" ").map(Number);
  picture.style.maxWidth = `${width * 1.15}px`;
  picture.style.maxHeight = `${height * 1.15}px`;
}).observe(visual, { childList: true });
show(current);