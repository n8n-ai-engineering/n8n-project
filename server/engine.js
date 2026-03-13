const axios = require('axios');
const vm = require('vm');
const OpenAI = require('openai').default;
const { getOpenAIClient } = require('./openai-client');
const db = require('./db');

function buildGraph(edges) {
  const graph = {};
  for (const edge of edges) {
    if (!graph[edge.source]) graph[edge.source] = [];
    graph[edge.source].push(edge.target);
  }
  return graph;
}

function findStartNodes(nodes, edges) {
  const hasIncoming = new Set(edges.map((e) => e.target));
  const starters = nodes.filter((n) => !hasIncoming.has(n.id));
  if (starters.length > 0) return starters;
  return [nodes[0]];
}

function getExecutionOrder(startNodeId, graph, nodes) {
  const order = [];
  const visited = new Set();
  const nodeMap = {};
  for (const n of nodes) nodeMap[n.id] = n;

  function dfs(nodeId) {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    order.push(nodeId);
    for (const child of graph[nodeId] || []) dfs(child);
  }

  dfs(startNodeId);
  return order.map((id) => nodeMap[id]).filter(Boolean);
}

// ─── AI helpers ──────────────────────────────────────────────────────────────

/**
 * Returns an OpenAI-compatible client.
 * If the model name starts with "ollama/" we route to the local Ollama server
 * (which exposes an OpenAI-compatible API at http://localhost:11434/v1).
 */
function getClientForModel(model) {
  if (typeof model === 'string' && model.startsWith('ollama/')) {
    return new OpenAI({ baseURL: 'http://localhost:11434/v1', apiKey: 'ollama' });
  }
  return getOpenAIClient();
}

/**
 * Strip the "ollama/" prefix to get the raw model name Ollama expects.
 */
function resolveModelName(model) {
  if (typeof model === 'string' && model.startsWith('ollama/')) {
    return model.slice('ollama/'.length);
  }
  return model;
}

// ─── Memory helpers ───────────────────────────────────────────────────────────

const MAX_HISTORY_ENTRIES = 20; // 10 exchanges (user + assistant each)

function getMemory(sessionId) {
  const mem = db.get('memory').value() || {};
  return Array.isArray(mem[sessionId]) ? mem[sessionId] : [];
}

function saveMemory(sessionId, history) {
  const mem = db.get('memory').value() || {};
  mem[sessionId] = history.slice(-MAX_HISTORY_ENTRIES);
  db.set('memory', mem).write();
}

// ─── Node executor ────────────────────────────────────────────────────────────

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
      return {
        triggered: true,
        timestamp: new Date().toISOString(),
        source: 'webhook',
        payload: options.webhookPayload || {},
      };
    }

    // ── Telegram Trigger ────────────────────────────────────────────────────
    case 'telegramTriggerNode': {
      const payload = options.telegramPayload || {};
      return {
        triggered: true,
        timestamp: new Date().toISOString(),
        source: 'telegram',
        text: payload.text || '',
        chat_id: payload.chat_id || '',
        from: payload.from || {},
        message_id: payload.message_id || null,
      };
    }

    // ── Telegram Action (send message) ──────────────────────────────────────
    case 'telegramActionNode': {
      const token = (data.token || '').trim();
      const chatId = resolveVariables(data.chatId || '', input);
      const message = resolveVariables(data.message || '', input);

      if (!token) throw new Error('Telegram Action: Bot Token is required');
      if (!chatId) throw new Error('Telegram Action: Chat ID is required');
      if (!message.trim()) throw new Error('Telegram Action: Message is empty');

      const response = await axios.post(
        `https://api.telegram.org/bot${token}/sendMessage`,
        { chat_id: chatId, text: message },
        { timeout: 10000 }
      );

      return {
        sent: true,
        chat_id: chatId,
        message_id: response.data?.result?.message_id || null,
      };
    }

    // ── HTTP Request ────────────────────────────────────────────────────────
    case 'httpNode': {
      const url = resolveVariables(data.url || '', input);
      const method = (data.method || 'GET').toLowerCase();
      const headers = parseJsonSafe(data.headers, {});

      const rawBody = data.body || '';
      const parsedBodyTemplate = parseJsonSafe(rawBody, null);
      const body =
        parsedBodyTemplate !== null
          ? resolveVariablesInObject(parsedBodyTemplate, input)
          : rawBody.trim()
          ? resolveVariables(rawBody, input)
          : undefined;

      if (!url) throw new Error('HTTP Node: URL is required');

      const response = await axios({ method, url, headers, data: body, timeout: 15000 });
      return { data: response.data, status: response.status, headers: response.headers };
    }

    // ── Code (JS sandbox) ───────────────────────────────────────────────────
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

      const script = new vm.Script(`(function() { ${code} })()`);
      const context = vm.createContext(sandbox);
      const output = script.runInContext(context, { timeout: 5000 });
      return output !== undefined ? output : { logs };
    }

    // ── AI Agent ─────────────────────────────────────────────────────────────
    case 'aiTextNode': {
      const systemPrompt = data.systemPrompt || 'You are a helpful assistant.';
      const model = data.model || 'gpt-4o-mini';
      const userPrompt = resolveVariables(data.prompt || '', input);

      if (!userPrompt.trim()) return { text: '', model };

      // Resolve sessionId — supports {{input.chat_id}} interpolation
      const sessionId = resolveVariables(data.sessionId || '', input).trim();

      // Build messages: system + conversation history + current user message
      const history = sessionId ? getMemory(sessionId) : [];
      const messages = [
        { role: 'system', content: systemPrompt },
        ...history,
        { role: 'user', content: userPrompt },
      ];

      const client = getClientForModel(model);
      const completion = await client.chat.completions.create({
        model: resolveModelName(model),
        messages,
        temperature: 0.7,
      });

      const text = completion.choices[0]?.message?.content?.trim() ?? '';

      // Persist conversation history
      if (sessionId) {
        const updated = [
          ...history,
          { role: 'user', content: userPrompt },
          { role: 'assistant', content: text },
        ];
        saveMemory(sessionId, updated);
      }

      return { ...input, text, model, timestamp: new Date().toISOString() };
    }

    // ── Storage (key-value) ──────────────────────────────────────────────────
    case 'storageNode': {
      const operation = (data.operation || 'GET').toUpperCase();
      const key = resolveVariables(data.key || '', input).trim();
      const value = resolveVariables(data.value || '', input);

      if (!key) throw new Error('Storage Node: Key is required');

      const storage = db.get('storage').value() || {};

      if (operation === 'SET') {
        storage[key] = value;
        db.set('storage', storage).write();
        return { operation: 'SET', key, value };
      } else {
        return { operation: 'GET', key, value: storage[key] ?? null };
      }
    }

    default:
      return { skipped: true, nodeType: type };
  }
}

// ─── Variable resolution ──────────────────────────────────────────────────────

function parseJsonSafe(str, fallback) {
  if (!str || typeof str !== 'string') return fallback;
  try { return JSON.parse(str); } catch { return fallback; }
}

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

function resolveVariablesInObject(obj, inputData) {
  if (typeof obj === 'string') return resolveVariables(obj, inputData);
  if (Array.isArray(obj)) return obj.map((item) => resolveVariablesInObject(item, inputData));
  if (obj !== null && typeof obj === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(obj)) out[k] = resolveVariablesInObject(v, inputData);
    return out;
  }
  return obj;
}

// ─── Main entry point ─────────────────────────────────────────────────────────

async function runWorkflow(nodes, edges, options = {}) {
  if (!nodes || nodes.length === 0) throw new Error('No nodes in workflow');

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
