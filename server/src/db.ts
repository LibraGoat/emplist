import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

export type Db = Database.Database;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS employees (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name       TEXT NOT NULL,
  -- SQLite LIKE folds case for ASCII only; JS toLowerCase handles Cyrillic.
  full_name_lower TEXT NOT NULL,
  position        TEXT NOT NULL,
  department      TEXT NOT NULL,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_employees_department ON employees (department);
CREATE INDEX IF NOT EXISTS idx_employees_name_lower ON employees (full_name_lower);

CREATE TABLE IF NOT EXISTS sessions (
  sid    TEXT PRIMARY KEY,
  sess   TEXT NOT NULL,
  expire INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_expire ON sessions (expire);
`;

export function openDb(file: string): Db {
  if (file !== ':memory:') {
    fs.mkdirSync(path.dirname(file), { recursive: true });
  }
  const db = new Database(file);
  db.pragma('journal_mode = WAL');
  db.exec(SCHEMA);
  return db;
}

const DEMO_EMPLOYEES = [
  ['Иванова Анна Сергеевна', 'Frontend-разработчик', 'Разработка'],
  ['Петров Дмитрий Алексеевич', 'Backend-разработчик', 'Разработка'],
  ['Сидорова Мария Ивановна', 'QA-инженер', 'QA'],
  ['Кузнецов Олег Викторович', 'UI/UX-дизайнер', 'Дизайн'],
  ['Смирнова Елена Павловна', 'HR-менеджер', 'HR'],
] as const;

export function seedEmployees(db: Db): void {
  const { count } = db.prepare('SELECT COUNT(*) AS count FROM employees').get() as { count: number };
  if (count > 0) return;
  const insert = db.prepare(
    'INSERT INTO employees (full_name, full_name_lower, position, department) VALUES (?, ?, ?, ?)',
  );
  db.transaction(() => {
    for (const [fullName, position, department] of DEMO_EMPLOYEES) {
      insert.run(fullName, fullName.toLowerCase(), position, department);
    }
  })();
}