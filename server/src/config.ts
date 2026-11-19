import path from 'node:path';

export const DEPARTMENTS = ['Разработка', 'QA', 'Дизайн', 'HR', 'Продажи'] as const;

export const PORT = Number(process.env.PORT) || 3000;
export const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'emplist.db');
export const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

// Fallback keeps sessions valid across restarts in dev; set SESSION_SECRET in production.
export const SESSION_SECRET = process.env.SESSION_SECRET || 'emplist-dev-secret';