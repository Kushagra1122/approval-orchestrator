import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, '..', 'approvals.db');

export const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to SQLite database');
    initializeDatabase();
  }
});

function initializeDatabase() {
  // Workflows table - UPDATED with rollback columns
  db.run(`CREATE TABLE IF NOT EXISTS workflows (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    status TEXT DEFAULT 'running',
    context TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    rollback_reason TEXT,
    checkpoint_data TEXT,
    can_rollback BOOLEAN DEFAULT false
  )`);

  // Approval steps table
  db.run(`CREATE TABLE IF NOT EXISTS approval_steps (
    id TEXT PRIMARY KEY,
    workflow_id TEXT,
    step_name TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    assigned_to TEXT,
    ui_schema TEXT,
    response_data TEXT,
    requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    responded_at DATETIME,
    timeout_at DATETIME,
    channel TEXT DEFAULT 'web',
    slack_message_ts TEXT,
    slack_channel TEXT,
    FOREIGN KEY (workflow_id) REFERENCES workflows (id)
  )`);

  // NEW: Rollback history table
  db.run(`CREATE TABLE IF NOT EXISTS workflow_rollbacks (
    id TEXT PRIMARY KEY,
    workflow_id TEXT,
    rolled_back_from_step TEXT,
    rolled_back_to_step TEXT,
    reason TEXT,
    rolled_back_by TEXT,
    compensation_actions TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workflow_id) REFERENCES workflows (id)
  )`);

  console.log('Database tables initialized');
}

// Promise-based database methods
export const dbGet = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

export const dbAll = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

export const dbRun = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
};
