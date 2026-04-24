const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());

function processData(data) {
  const invalidEntries = [];
  const duplicateEdges = [];
  const validEdges = [];
  const seenEdges = new Set();
  const validPattern = /^[A-Z]->[A-Z]$/;

  for (let raw of data) {
    const entry = raw.trim();
    if (!validPattern.test(entry)) { invalidEntries.push(entry); continue; }
    const [p, c] = entry.split('->');
    if (p === c) { invalidEntries.push(entry); continue; }
    if (seenEdges.has(entry)) { if (!duplicateEdges.includes(entry)) duplicateEdges.push(entry); continue; }
    seenEdges.add(entry);
    validEdges.push([p, c]);
  }

  const allNodes = new Set();
  const childNodes = new Set();
  const childParentMap = {};

  for (const [p, c] of validEdges) {
    allNodes.add(p); allNodes.add(c);
    if (childParentMap[c] === undefined) { childParentMap[c] = p; childNodes.add(c); }
  }

  const adjList = {};
  for (const [p, c] of validEdges) {
    if (!adjList[p]) adjList[p] = [];
    if (childParentMap[c] === p) adjList[p].push(c);
  }

  const roots = [...allNodes].filter(n => !childNodes.has(n)).sort();
  const visited = new Set();

  function hasCycle(node, ancestors) {
    if (ancestors.has(node)) return true;
    ancestors.add(node);
    for (const child of (adjList[node] || [])) {
      if (hasCycle(child, new Set(ancestors))) return true;
    }
    return false;
  }

  function buildTree(node) {
    const children = adjList[node] || [];
    const obj = {};
    for (const c of children) obj[c] = buildTree(c);
    return obj;
  }

  function getDepth(node) {
    const children = adjList[node] || [];
    if (children.length === 0) return 1;
    return 1 + Math.max(...children.map(getDepth));
  }

  const hierarchies = [];

  for (const root of roots) {
    const groupNodes = new Set();
    const stack = [root];
    while (stack.length) {
      const n = stack.pop();
      if (groupNodes.has(n)) continue;
      groupNodes.add(n); visited.add(n);
      for (const c of (adjList[n] || [])) stack.push(c);
    }

    const cycleDetected = hasCycle(root, new Set());
    if (cycleDetected) {
      hierarchies.push({ root, tree: {}, has_cycle: true });
    } else {
      const tree = { [root]: buildTree(root) };
      const depth = getDepth(root);
      hierarchies.push({ root, tree, depth });
    }
  }

  // handle nodes not yet visited (pure cycles with no root)
  const unvisited = [...allNodes].filter(n => !visited.has(n)).sort();
  if (unvisited.length) {
    const root = unvisited[0];
    hierarchies.push({ root, tree: {}, has_cycle: true });
  }

  const nonCyclic = hierarchies.filter(h => !h.has_cycle);
  const cyclic = hierarchies.filter(h => h.has_cycle);

  let largest_tree_root = '';
  if (nonCyclic.length) {
    nonCyclic.sort((a, b) => b.depth - a.depth || a.root.localeCompare(b.root));
    largest_tree_root = nonCyclic[0].root;
  }

  return {
    user_id: "AlokMaiti_21032004",
    email_id: "am9621@srmist.edu.in",
    college_roll_number: "RA2311031010129",
    hierarchies,
    invalid_entries: invalidEntries,
    duplicate_edges: duplicateEdges,
    summary: {
      total_trees: nonCyclic.length,
      total_cycles: cyclic.length,
      largest_tree_root
    }
  };
}

app.post('/bfhl', (req, res) => {
  const { data } = req.body;
  if (!Array.isArray(data)) return res.status(400).json({ error: 'data must be an array' });
  res.json(processData(data));
});

app.listen(process.env.PORT || 3000, () => console.log('running'));