import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import Database from 'better-sqlite3';
import { DEFAULT_PERSONA, DEFAULT_SETTINGS, SCHEMA_SQL } from './schema.js';

export type Db = Database.Database;

/**
 * Membuka database, membuat skema, dan mengisi data awal.
 * Gunakan ":memory:" untuk pengujian.
 */
export function openDatabase(file: string): Db {
  if (file !== ':memory:') {
    mkdirSync(dirname(file), { recursive: true });
  }

  const db = new Database(file);
  db.pragma('foreign_keys = ON');
  if (file !== ':memory:') {
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = NORMAL');
  }
  db.exec(SCHEMA_SQL);
  seed(db);
  return db;
}

function seed(db: Db): void {
  const timestamp = Date.now();
  const existing = db.prepare('SELECT id FROM personas WHERE id = ?').get(DEFAULT_PERSONA.id);
  if (!existing) {
    db.prepare(
      `INSERT INTO personas (id, name, config, is_active, created_at, updated_at)
       VALUES (?, ?, ?, 1, ?, ?)`,
    ).run(DEFAULT_PERSONA.id, DEFAULT_PERSONA.name, JSON.stringify(DEFAULT_PERSONA), timestamp, timestamp);
  }

  const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    insertSetting.run(key, value);
  }
}
