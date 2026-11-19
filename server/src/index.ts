import { createApp } from './app';
import { openDb, seedEmployees } from './db';
import { DB_PATH, PORT } from './config';

const db = openDb(DB_PATH);
seedEmployees(db);
const app = createApp(db);

const server = app.listen(PORT, () => {
  console.log(`Сервер запущен: http://localhost:${PORT}`);
});

function shutdown(): void {
  server.close(() => {
    db.close();
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);