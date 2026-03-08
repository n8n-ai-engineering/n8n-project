const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const path = require('path');

// In Docker, DATA_DIR is set to a named-volume path (e.g. /data) so that
// db.json persists across container restarts. In development it falls back
// to the server directory itself.
const dataDir = process.env.DATA_DIR || __dirname;
const adapter = new FileSync(path.join(dataDir, 'db.json'));
const db = low(adapter);

db.defaults({
  workflows: [],
  settings: { apiKey: '', baseUrl: '' },
}).write();

module.exports = db;
