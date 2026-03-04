# FlowForge — Self-Hosted Workflow Automation

A production-ready n8n alternative built with Node.js, React, and React Flow.

## Quick Start

```bash
# 1. Install all dependencies (root + server + client)
npm run install:all

# 2. Start both server and client in dev mode
npm run dev
```

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3001

## Architecture

```
n8n-project/
├── server/
│   ├── index.js        # Express API (save/load workflows, /run, /ai-config)
│   ├── engine.js       # Execution engine (graph traversal + node runners)
│   └── workflows.json  # Local file storage (auto-created)
└── client/
    └── src/
        ├── App.jsx                     # Main editor (React Flow canvas)
        ├── components/Sidebar.jsx      # Draggable node library
        └── nodes/
            ├── StartNode.jsx           # Trigger — source handle only
            ├── WebhookNode.jsx         # Trigger — source handle only
            ├── HttpNode.jsx            # HTTP Request + AI config button
            ├── CodeNode.jsx            # JS sandbox node
            └── AiTextNode.jsx          # AI text generation (mock)
```

## Node Types

| Node | Type | Handles | Description |
|------|------|---------|-------------|
| Start | Trigger | → output | Starts the workflow |
| Webhook | Trigger | → output | Receives external HTTP calls |
| HTTP Request | Action | input ← → output | Makes HTTP requests (GET/POST/PUT/DELETE) |
| Code (JS) | Action | input ← → output | Executes JavaScript via Node.js `vm` |
| AI Text | Action | input ← → output | Generates text (mock, swap for OpenAI) |

## Data Flow

Each node receives the **entire output** of the previous node as `input`.

**HTTP Node output:**
```json
{ "data": {...}, "status": 200, "headers": {...} }
```

**Code Node example:**
```js
// input = output from previous HTTP node
return { temp: input.data.hourly.temperature_2m[0] };
```

## AI Config Feature (HTTP Node)

Type a prompt in the "Ask AI" field inside any HTTP node:
- `"weather"` → fills in Open-Meteo API for Moscow
- `"telegram"` → fills in Telegram Bot API
- `"vk"` → fills in VK API wall.post
- `"github"` → fills in GitHub Issues API

To connect real OpenAI: replace the `/api/ai-config` handler in `server/index.js`.

## Presets (Sidebar)

Drag from the **Presets** section to drop an HTTP node pre-filled with:
- **VK Wall Post** — VK API `wall.post`
- **Telegram Message** — Telegram Bot `sendMessage`
