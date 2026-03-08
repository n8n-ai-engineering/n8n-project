const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const path = require('path');

const adapter = new FileSync(path.join(__dirname, 'db.json'));
const db = low(adapter);

// Initialise schema — safe to call multiple times (lowdb skips existing keys)
db.defaults({
  workflows: [],
  settings: { apiKey: '', baseUrl: '' },
}).write();

module.exports = db;
