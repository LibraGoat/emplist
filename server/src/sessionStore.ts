import session from 'express-session';
import type { Db } from './db';

const CLEANUP_INTERVAL_MS = 15 * 60 * 1000;

export class SqliteSessionStore extends session.Store {
  private readonly db: Db;
  private readonly defaultMaxAgeMs: number;

  constructor(db: Db, defaultMaxAgeMs: number) {
    super();
    this.db = db;
    this.defaultMaxAgeMs = defaultMaxAgeMs;
    const timer = setInterval(() => this.clearExpired(), CLEANUP_INTERVAL_MS);
    timer.unref();
  }

  private expiry(sess: session.SessionData): number {
    const expires = sess.cookie?.expires;
    const time = expires ? Date.parse(String(expires)) : NaN;
    return Number.isNaN(time) ? Date.now() + this.defaultMaxAgeMs : time;
  }

  get(sid: string, callback: (err: unknown, sess?: session.SessionData | null) => void): void {
    try {
      const row = this.db.prepare('SELECT sess, expire FROM sessions WHERE sid = ?').get(sid) as
        | { sess: string; expire: number }
        | undefined;
      if (!row) {
        callback(null, null);
        return;
      }
      if (row.expire <= Date.now()) {
        this.db.prepare('DELETE FROM sessions WHERE sid = ?').run(sid);
        callback(null, null);
        return;
      }
      callback(null, JSON.parse(row.sess) as session.SessionData);
    } catch (err) {
      callback(err);
    }
  }

  set(sid: string, sess: session.SessionData, callback?: (err?: unknown) => void): void {
    try {
      this.db
        .prepare(
          'INSERT INTO sessions (sid, sess, expire) VALUES (?, ?, ?) ON CONFLICT(sid) DO UPDATE SET sess = excluded.sess, expire = excluded.expire',
        )
        .run(sid, JSON.stringify(sess), this.expiry(sess));
      callback?.();
    } catch (err) {
      callback?.(err);
    }
  }

  destroy(sid: string, callback?: (err?: unknown) => void): void {
    try {
      this.db.prepare('DELETE FROM sessions WHERE sid = ?').run(sid);
      callback?.();
    } catch (err) {
      callback?.(err);
    }
  }

  touch(sid: string, sess: session.SessionData, callback?: (err?: unknown) => void): void {
    try {
      this.db.prepare('UPDATE sessions SET expire = ? WHERE sid = ?').run(this.expiry(sess), sid);
      callback?.();
    } catch (err) {
      callback?.(err);
    }
  }

  private clearExpired(): void {
    this.db.prepare('DELETE FROM sessions WHERE expire <= ?').run(Date.now());
  }
}