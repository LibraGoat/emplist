import { Router, type Request, type Response, type NextFunction } from 'express';
import bcrypt from 'bcrypt';
import type { Db } from './db';
import { credentialsSchema, fieldErrors } from './validation';

declare module 'express-session' {
  interface SessionData {
    userId: number;
  }
}

interface UserRow {
  id: number;
  email: string;
  password_hash: string;
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (req.session.userId === undefined) {
    res.status(401).json({ error: 'Требуется авторизация' });
    return;
  }
  next();
}

function regenerate(req: Request): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.regenerate((err) => (err ? reject(err) : resolve()));
  });
}

export function authRouter(db: Db): Router {
  const router = Router();
  const findByEmail = db.prepare('SELECT id, email, password_hash FROM users WHERE email = ?');
  const findById = db.prepare('SELECT id, email FROM users WHERE id = ?');
  const insertUser = db.prepare('INSERT INTO users (email, password_hash) VALUES (?, ?)');

  router.post('/register', async (req, res) => {
    const parsed = credentialsSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Ошибка валидации', fields: fieldErrors(parsed.error) });
      return;
    }
    const email = parsed.data.email.toLowerCase();
    const passwordHash = await bcrypt.hash(parsed.data.password, 10);
    let userId: number;
    try {
      userId = Number(insertUser.run(email, passwordHash).lastInsertRowid);
    } catch (err) {
      if ((err as { code?: string }).code === 'SQLITE_CONSTRAINT_UNIQUE') {
        res.status(409).json({ error: 'Пользователь с таким email уже зарегистрирован' });
        return;
      }
      throw err;
    }
    await regenerate(req);
    req.session.userId = userId;
    res.status(201).json({ user: { id: userId, email } });
  });

  router.post('/login', async (req, res) => {
    const parsed = credentialsSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Ошибка валидации', fields: fieldErrors(parsed.error) });
      return;
    }
    const user = findByEmail.get(parsed.data.email.toLowerCase()) as UserRow | undefined;
    if (!user || !(await bcrypt.compare(parsed.data.password, user.password_hash))) {
      res.status(401).json({ error: 'Неверный email или пароль' });
      return;
    }
    await regenerate(req);
    req.session.userId = user.id;
    res.json({ user: { id: user.id, email: user.email } });
  });

  router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        res.status(500).json({ error: 'Не удалось завершить сессию' });
        return;
      }
      res.clearCookie('connect.sid');
      res.json({ ok: true });
    });
  });

  router.get('/me', (req, res) => {
    if (req.session.userId === undefined) {
      res.status(401).json({ error: 'Требуется авторизация' });
      return;
    }
    const user = findById.get(req.session.userId) as { id: number; email: string } | undefined;
    if (!user) {
      res.status(401).json({ error: 'Требуется авторизация' });
      return;
    }
    res.json({ user });
  });

  return router;
}