const axios = require('axios');
const vm = require('vm');

/**
 * Build an adjacency map: sourceNodeId -> [targetNodeId, ...]
 */
function buildGraph(edges) {
  const graph = {};
  for (const edge of edges) {
    if (!graph[edge.source]) graph[edge.source] = [];
    graph[edge.source].push(edge.target);
  }
  return graph;
}

/**
 * Find the start node (node with no incoming edges, or type === 'startNode' / 'webhookNode')
 */
function findStartNodes(nodes, edges) {
  const hasIncoming = new Set(edges.map((e) => e.target));
  const starters = nodes.filter((n) => !hasIncoming.has(n.id));
  if (starters.length > 0) return starters;
  // Fallback: return first node
  return [nodes[0]];
}

/**
 * Topological traversal starting from startNode
 */
function getExecutionOrder(startNodeId, graph, nodes) {
  const order = [];
  const visited = new Set();
  const nodeMap = {};
  for (const n of nodes) nodeMap[n.id] = n;

  function dfs(nodeId) {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    order.push(nodeId);
    const children = graph[nodeId] || [];
    for (const child of children) {
      dfs(child);
    }
  }

  dfs(startNodeId);
  return order.map((id) => nodeMap[id]).filter(Boolean);
}

/**
 * Execute a single node given input from the previous node.
 */
async function executeNode(node, input) {
  const type = node.type;
  const data = node.data || {};

  switch (type) {
    case 'startNode': {
      return { triggered: true, timestamp: new Date().toISOString() };
    }

    case 'webhookNode': {
      return {
        triggered: true,
        timestamp: new Date().toISOString(),
        source: 'webhook',
        payload: data.webhookPayload || {},
      };
    }

    case 'httpNode': {
      const url = data.url || '';
      const method = (data.method || 'GET').toLowerCase();
      const headers = parseJsonSafe(data.headers, {});
      const body = parseJsonSafe(data.body, undefined);

      if (!url) throw new Error('HTTP Node: URL is required');

      const response = await axios({
        method,
        url,
        headers,
        data: body,
        timeout: 15000,
      });

      return {
        data: response.data,
        status: response.status,
        headers: response.headers,
      };
    }

    case 'codeNode': {
      const code = data.code || '';
      if (!code.trim()) return { result: null };

      const logs = [];
      const sandbox = {
        input,
        axios,
        console: {
          log: (...args) => logs.push(args.map(String).join(' ')),
          error: (...args) => logs.push('[ERROR] ' + args.map(String).join(' ')),
          warn: (...args) => logs.push('[WARN] ' + args.map(String).join(' ')),
        },
        result: undefined,
      };

      // Wrap code so `return` works at top level
      const wrappedCode = `(function() { ${code} })()`;

      const script = new vm.Script(wrappedCode);
      const context = vm.createContext(sandbox);
      const output = script.runInContext(context, { timeout: 5000 });

      return output !== undefined ? output : { logs };
    }

    case 'aiTextNode': {
      const prompt = data.prompt || '';
      // Mock AI response — swap this out for a real OpenAI call later
      return {
        generatedText: `[AI Mock] Processed prompt: "${prompt.slice(0, 80)}..."`,
        model: 'mock-gpt',
        timestamp: new Date().toISOString(),
      };
    }

    default:
      return { skipped: true, nodeType: type };
  }
}

function parseJsonSafe(str, fallback) {
  if (!str || typeof str !== 'string') return fallback;
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

/**
 * Main entry point: execute the entire workflow graph.
 * Returns an object with per-node results and the final output.
 */
async function runWorkflow(nodes, edges) {
  if (!nodes || nodes.length === 0) {
    throw new Error('No nodes in workflow');
  }

  const graph = buildGraph(edges || []);
  const startNodes = findStartNodes(nodes, edges || []);
  const executionOrder = getExecutionOrder(startNodes[0].id, graph, nodes);

  const nodeResults = {};
  let lastOutput = null;
  let currentInput = null;

  for (const node of executionOrder) {
    try {
      const output = await executeNode(node, currentInput);
      nodeResults[node.id] = {
        nodeId: node.id,
        nodeType: node.type,
        label: node.data?.label || node.type,
        status: 'success',
        output,
      };
      lastOutput = output;
      currentInput = output;
    } catch (err) {
      nodeResults[node.id] = {
        nodeId: node.id,
        nodeType: node.type,
        label: node.data?.label || node.type,
        status: 'error',
        error: err.message,
      };
      // Stop chain on error
      break;
    }
  }

  return {
    executionOrder: executionOrder.map((n) => n.id),
    nodeResults,
    finalOutput: lastOutput,
  };
}

module.exports = { runWorkflow };
