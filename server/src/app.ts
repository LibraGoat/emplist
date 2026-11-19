import fs from 'node:fs';
import path from 'node:path';
import express, { type Request, type Response, type NextFunction } from 'express';
import session from 'express-session';
import type { Db } from './db';
import { SESSION_SECRET, SESSION_MAX_AGE_MS } from './config';
import { SqliteSessionStore } from './sessionStore';
import { authRouter } from './auth';
import { employeesRouter } from './employees';

export function createApp(db: Db): express.Express {
  const app = express();
  app.use(express.json());
  app.use(
    session({
      store: new SqliteSessionStore(db, SESSION_MAX_AGE_MS),
      secret: SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: 'lax',
        maxAge: SESSION_MAX_AGE_MS,
      },
    }),
  );

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });
  app.use('/api/auth', authRouter(db));
  app.use('/api/employees', employeesRouter(db));
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Не найдено' });
  });

  const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  }

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const status = typeof (err as { status?: unknown }).status === 'number' ? (err as { status: number }).status : 500;
    if (status >= 500) console.error(err);
    res.status(status).json({ error: status === 400 ? 'Некорректный запрос' : 'Внутренняя ошибка сервера' });
  });

  return app;
}