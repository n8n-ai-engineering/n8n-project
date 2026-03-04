const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { runWorkflow } = require('./engine');

const app = express();
const PORT = process.env.PORT || 3001;

// ---------- Middleware ----------
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ---------- Simple file-based storage ----------
const DATA_FILE = path.join(__dirname, 'workflows.json');

function readWorkflows() {
  if (!fs.existsSync(DATA_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  } catch {
    return {};
  }
}

function writeWorkflows(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// ---------- Routes ----------

// Save workflow
app.post('/api/workflow', (req, res) => {
  const { id, name, nodes, edges } = req.body;
  if (!id) return res.status(400).json({ error: 'id is required' });

  const workflows = readWorkflows();
  workflows[id] = {
    id,
    name: name || 'Untitled',
    nodes: nodes || [],
    edges: edges || [],
    updatedAt: new Date().toISOString(),
  };
  writeWorkflows(workflows);
  res.json({ success: true, workflow: workflows[id] });
});

// Load workflow
app.get('/api/workflow/:id', (req, res) => {
  const workflows = readWorkflows();
  const wf = workflows[req.params.id];
  if (!wf) return res.status(404).json({ error: 'Workflow not found' });
  res.json(wf);
});

// List all workflows
app.get('/api/workflows', (req, res) => {
  const workflows = readWorkflows();
  const list = Object.values(workflows).map(({ id, name, updatedAt }) => ({
    id,
    name,
    updatedAt,
  }));
  res.json(list);
});

// Run workflow
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

// AI Config generator (mock — swap for real OpenAI later)
app.post('/api/ai-config', (req, res) => {
  const { prompt = '' } = req.body;
  const lower = prompt.toLowerCase();

  if (lower.includes('weather') || lower.includes('погод')) {
    return res.json({
      url: 'https://api.open-meteo.com/v1/forecast?latitude=55.75&longitude=37.61&hourly=temperature_2m&forecast_days=1',
      method: 'GET',
      headers: '{}',
      body: '',
      description: 'Получить прогноз погоды для Москвы (Open-Meteo, бесплатно)',
    });
  }

  if (lower.includes('telegram')) {
    return res.json({
      url: 'https://api.telegram.org/bot<YOUR_BOT_TOKEN>/sendMessage',
      method: 'POST',
      headers: '{"Content-Type": "application/json"}',
      body: '{"chat_id": "<CHAT_ID>", "text": "Hello from n8n-alt!"}',
      description: 'Отправить сообщение через Telegram Bot API',
    });
  }

  if (lower.includes('vk') || lower.includes('вконтакте') || lower.includes('вк')) {
    return res.json({
      url: 'https://api.vk.com/method/wall.post',
      method: 'POST',
      headers: '{"Content-Type": "application/x-www-form-urlencoded"}',
      body: 'owner_id=<USER_ID>&message=Hello+from+n8n-alt!&access_token=<ACCESS_TOKEN>&v=5.131',
      description: 'Опубликовать запись на стене ВКонтакте',
    });
  }

  if (lower.includes('github')) {
    return res.json({
      url: 'https://api.github.com/repos/<OWNER>/<REPO>/issues',
      method: 'GET',
      headers: '{"Authorization": "Bearer <YOUR_TOKEN>", "Accept": "application/vnd.github+json"}',
      body: '',
      description: 'Получить список issues из GitHub репозитория',
    });
  }

  // Default fallback
  return res.json({
    url: 'https://jsonplaceholder.typicode.com/posts/1',
    method: 'GET',
    headers: '{}',
    body: '',
    description: 'Тестовый GET-запрос (JSONPlaceholder)',
  });
});

// ---------- Start server ----------
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
