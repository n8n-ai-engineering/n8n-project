const OpenAI = require('openai').default;
const db = require('./db');

/**
 * Returns a fresh OpenAI client that reads credentials from:
 *   1. db.json settings (set via the in-app Settings UI)
 *   2. .env fallback (OPENAI_API_KEY / OPENAI_BASE_URL)
 *
 * A new instance is created on every call so settings changes take effect
 * immediately without restarting the server.
 */
function getOpenAIClient() {
  const settings = db.get('settings').value() || {};
  const apiKey = settings.apiKey || process.env.OPENAI_API_KEY || '';
  const baseURL = settings.baseUrl || process.env.OPENAI_BASE_URL || '';
  return new OpenAI({ apiKey, baseURL });
}

module.exports = { getOpenAIClient };
