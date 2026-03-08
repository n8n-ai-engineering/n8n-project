require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');
const { randomUUID } = require('crypto');

const db = require('./db');
const { getOpenAIClient } = require('./openai-client');
const { runWorkflow } = require('./engine');
const { initAllJobs, registerWorkflowJobs, cancelWorkflowJobs } = require('./scheduler');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ─────────────────────────────────────────────
// Settings
// ─────────────────────────────────────────────

app.get('/api/settings', (req, res) => {
  const settings = db.get('settings').value() || {};
  res.json({
    apiKey: settings.apiKey || '',
    baseUrl: settings.baseUrl || '',
  });
});

app.post('/api/settings', (req, res) => {
  const { apiKey, baseUrl } = req.body;
  const patch = {};
  if (apiKey !== undefined) patch.apiKey = apiKey;
  if (baseUrl !== undefined) patch.baseUrl = baseUrl;
  db.set('settings', { ...db.get('settings').value(), ...patch }).write();
  res.json({ success: true });
});

// ─────────────────────────────────────────────
// Workflow CRUD
// ─────────────────────────────────────────────

app.get('/api/workflows', (req, res) => {
  const list = db
    .get('workflows')
    .map(({ id, name, createdAt, updatedAt, nodes, edges }) => ({
      id,
      name,
      createdAt,
      updatedAt,
      nodeCount: (nodes || []).length,
      edgeCount: (edges || []).length,
    }))
    .value();
  res.json(list);
});

app.post('/api/workflows', (req, res) => {
  const { name } = req.body;
  const now = new Date().toISOString();
  const workflow = {
    id: randomUUID(),
    name: name || 'Untitled Workflow',
    nodes: [],
    edges: [],
    createdAt: now,
    updatedAt: now,
  };
  db.get('workflows').push(workflow).write();
  res.status(201).json(workflow);
});

app.get('/api/workflows/:id', (req, res) => {
  const wf = db.get('workflows').find({ id: req.params.id }).value();
  if (!wf) return res.status(404).json({ error: 'Workflow not found' });
  res.json(wf);
});

app.put('/api/workflows/:id', (req, res) => {
  const wf = db.get('workflows').find({ id: req.params.id }).value();
  if (!wf) return res.status(404).json({ error: 'Workflow not found' });

  const { name, nodes, edges } = req.body;
  const patch = { updatedAt: new Date().toISOString() };
  if (name !== undefined) patch.name = name;
  if (nodes !== undefined) patch.nodes = nodes;
  if (edges !== undefined) patch.edges = edges;

  db.get('workflows').find({ id: req.params.id }).assign(patch).write();

  // Re-register cron jobs in case schedule nodes changed
  registerWorkflowJobs(req.params.id);

  res.json(db.get('workflows').find({ id: req.params.id }).value());
});

app.delete('/api/workflows/:id', (req, res) => {
  const wf = db.get('workflows').find({ id: req.params.id }).value();
  if (!wf) return res.status(404).json({ error: 'Workflow not found' });

  cancelWorkflowJobs(req.params.id);
  db.get('workflows').remove({ id: req.params.id }).write();
  res.json({ success: true });
});

// ─────────────────────────────────────────────
// Webhook trigger  POST /webhook/:workflowId
// ─────────────────────────────────────────────

app.post('/webhook/:workflowId', async (req, res) => {
  const { workflowId } = req.params;
  const wf = db.get('workflows').find({ id: workflowId }).value();
  if (!wf) return res.status(404).json({ error: 'Workflow not found' });

  const hasWebhook = (wf.nodes || []).some((n) => n.type === 'webhookNode');
  if (!hasWebhook) {
    return res.status(400).json({ error: 'Workflow has no Webhook node' });
  }

  try {
    const result = await runWorkflow(wf.nodes, wf.edges, { webhookPayload: req.body });
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// Run workflow (from UI)
// ─────────────────────────────────────────────

app.post('/api/run', async (req, res) => {
  const { nodes, edges } = req.body;
  if (!nodes || nodes.length === 0) {
    return res.status(400).json({ error: 'No nodes provided' });
  }
  try {
    const result = await runWorkflow(nodes, edges || []);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// AI Agent
// ─────────────────────────────────────────────

app.post('/api/ai-agent', async (req, res) => {
  const { prompt = '', model = 'gpt-4o-mini', system = 'You are a helpful assistant.' } = req.body;
  if (!prompt.trim()) return res.status(400).json({ error: 'Prompt is required' });

  try {
    const completion = await getOpenAIClient().chat.completions.create({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
    });
    const output = completion.choices[0]?.message?.content?.trim() ?? '';
    return res.json({ output });
  } catch (err) {
    console.error('[ai-agent]', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// AI Config (HTTP node assistant)
// ─────────────────────────────────────────────

app.post('/api/ai-config', async (req, res) => {
  const { prompt = '' } = req.body;
  if (!prompt.trim()) return res.status(400).json({ error: 'Prompt is required' });

  try {
    const completion = await getOpenAIClient().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are an API expert for a workflow automation tool (n8n alternative).' +
            'Your goal is to generate a precise HTTP configuration JSON based on user intent.' +
            'CRITICAL RULES:' +
            '1. Return ONLY raw JSON. No markdown, no explanations.' +
            '2. Structure: { "url": string, "method": "GET"|"POST"|"PUT"|"DELETE", "headers": string (JSON), "body": string (JSON), "description": string }.' +
            '3. For GET requests, parameters MUST be in the URL query string, NOT in the body. Body must be empty "{}".' +
            'KNOWN APIs:' +
            '- OpenMeteo Weather: https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current_weather=true (GET)' +
            '- CoinGecko Price: https://api.coingecko.com/api/v3/simple/price?ids={coin}&vs_currencies={currency} (GET)' +
            '- Telegram: https://api.telegram.org/bot{token}/sendMessage (POST, body: {"chat_id":"...","text":"..."})' +
            '- VK Wall: https://api.vk.com/method/wall.post?owner_id={id}&message={msg}&access_token={token}&v=5.131 (POST)',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? '';
    let config;
    try {
      config = JSON.parse(raw);
    } catch {
      return res.status(502).json({ error: 'AI returned invalid JSON', raw });
    }

    return res.json({
      url: config.url || '',
      method: (config.method || 'GET').toUpperCase(),
      headers:
        typeof config.headers === 'string' ? config.headers : JSON.stringify(config.headers ?? {}),
      body:
        typeof config.body === 'string' ? config.body : JSON.stringify(config.body ?? ''),
      description: config.description || '',
    });
  } catch (err) {
    console.error('[ai-config]', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// Start
// ─────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  initAllJobs();
});
