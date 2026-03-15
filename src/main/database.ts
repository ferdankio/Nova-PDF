import Database from 'better-sqlite3'
import * as path from 'path'
import { app } from 'electron'

let db: Database.Database

export function initDatabase() {
  const dbPath = path.join(app.getPath('userData'), 'novapdf.db')
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.exec(`
    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      path TEXT UNIQUE NOT NULL, name TEXT NOT NULL,
      size INTEGER DEFAULT 0, page_count INTEGER DEFAULT 0,
      has_password INTEGER DEFAULT 0, last_page INTEGER DEFAULT 1,
      date_added TEXT NOT NULL, last_opened TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS annotations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      document_id INTEGER NOT NULL, page INTEGER NOT NULL,
      type TEXT NOT NULL, content TEXT DEFAULT '',
      color TEXT DEFAULT '#FBBF24', rect TEXT DEFAULT '{}',
      created_at TEXT NOT NULL,
      FOREIGN KEY (document_id) REFERENCES documents(id)
    );
    CREATE TABLE IF NOT EXISTS bookmarks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      document_id INTEGER NOT NULL, page INTEGER NOT NULL,
      label TEXT NOT NULL, created_at TEXT NOT NULL,
      FOREIGN KEY (document_id) REFERENCES documents(id)
    );
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY, value TEXT NOT NULL
    );
    INSERT OR IGNORE INTO settings VALUES ('theme','dark');
    INSERT OR IGNORE INTO settings VALUES ('pdfTheme','white');
    INSERT OR IGNORE INTO settings VALUES ('zoom','1.0');
  `)
}

export function getDb(): Database.Database { return db }
