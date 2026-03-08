const axios = require('axios');
const vm = require('vm');
const { getOpenAIClient } = require('./openai-client');

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
 * @param {object} options  - e.g. { webhookPayload } injected by the webhook route
 */
async function executeNode(node, input, options = {}) {
  const type = node.type;
  const data = node.data || {};

  switch (type) {
    case 'startNode': {
      return { triggered: true, timestamp: new Date().toISOString() };
    }

    case 'scheduleNode': {
      return { triggered: true, timestamp: new Date().toISOString(), source: 'schedule' };
    }

    case 'webhookNode': {
      // When triggered via POST /webhook/:id the real request body is injected
      return {
        triggered: true,
        timestamp: new Date().toISOString(),
        source: 'webhook',
        payload: options.webhookPayload || {},
      };
    }

    case 'httpNode': {
      const url = resolveVariables(data.url || '', input);
      const method = (data.method || 'GET').toLowerCase();
      const headers = parseJsonSafe(data.headers, {});

      // For JSON bodies: parse the template first, resolve variables inside the
      // object tree, then let axios re-serialise it. This guarantees that
      // multiline strings, quotes, etc. are properly JSON-escaped.
      // For non-JSON bodies (form-encoded, plain text): fall back to simple
      // string replacement.
      const rawBody = data.body || '';
      const parsedBodyTemplate = parseJsonSafe(rawBody, null);
      const body =
        parsedBodyTemplate !== null
          ? resolveVariablesInObject(parsedBodyTemplate, input)
          : rawBody.trim()
          ? resolveVariables(rawBody, input)
          : undefined;

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
      const systemPrompt = data.systemPrompt || 'You are a helpful assistant.';
      const model = data.model || 'gpt-4o-mini';
      const rawPrompt = data.prompt || '';

      const userPrompt = resolveVariables(rawPrompt, input);

      if (!userPrompt.trim()) return { text: '', model };

      const completion = await getOpenAIClient().chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
      });

      const text = completion.choices[0]?.message?.content?.trim() ?? '';
      return { text, model, timestamp: new Date().toISOString() };
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
 * Replace every {{input.path.to.value}} token in `template` with the
 * corresponding value from `inputData`.
 *
 * The expression inside {{ }} must start with "input." — this mirrors how
 * the previous node's output is exposed to the user.
 *
 * Examples:
 *   inputData = { data: { current_weather: { temperature: 15 } } }
 *   "Temp is {{input.data.current_weather.temperature}}°C"
 *     → "Temp is 15°C"
 *
 * Unresolvable references are left unchanged so the user can spot them.
 */
function resolveVariables(template, inputData) {
  if (!template || typeof template !== 'string') return template;
  const context = { input: inputData };
  return template.replace(/\{\{([^}]+)\}\}/g, (match, expr) => {
    const keys = expr.trim().split('.');
    let val = context;
    for (const key of keys) {
      if (val == null) return match;
      val = val[key];
    }
    return val !== undefined && val !== null ? String(val) : match;
  });
}

/**
 * Recursively walk a parsed JSON value (object / array / string / primitive)
 * and call resolveVariables on every string leaf.
 *
 * This is the correct way to substitute variables into a JSON body: operate on
 * the *parsed* object so that the resolved values (e.g. multiline text, strings
 * with quotes) are re-serialised properly by JSON.stringify / axios — instead
 * of doing text substitution on the raw JSON string which breaks escaping.
 *
 * Example:
 *   template object : { "text": "{{input.text}}" }
 *   input.text      : "Hello!\nLine two."
 *   result object   : { "text": "Hello!\nLine two." }   ← valid JS object
 *   axios sends     : {"text":"Hello!\nLine two."}       ← valid JSON
 */
function resolveVariablesInObject(obj, inputData) {
  if (typeof obj === 'string') return resolveVariables(obj, inputData);
  if (Array.isArray(obj)) return obj.map((item) => resolveVariablesInObject(item, inputData));
  if (obj !== null && typeof obj === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] = resolveVariablesInObject(v, inputData);
    }
    return out;
  }
  return obj; // number, boolean, null — leave as-is
}

/**
 * Main entry point: execute the entire workflow graph.
 * Returns an object with per-node results and the final output.
 */
async function runWorkflow(nodes, edges, options = {}) {
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
      const output = await executeNode(node, currentInput, options);
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
