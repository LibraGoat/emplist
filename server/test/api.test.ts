import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { Express } from 'express';
import { createApp } from '../src/app';
import { openDb, seedEmployees, type Db } from '../src/db';

const TEST_USER = { email: 'test@example.com', password: 'password123' };

describe('API авторизации и сотрудников', () => {
  let db: Db;
  let app: Express;

  beforeEach(() => {
    db = openDb(':memory:');
    seedEmployees(db);
    app = createApp(db);
  });

  afterEach(() => {
    db.close();
  });

  async function registerAgent() {
    const agent = request.agent(app);
    const res = await agent.post('/api/auth/register').send(TEST_USER);
    expect(res.status).toBe(201);
    return agent;
  }

  it('без авторизации список сотрудников недоступен (401)', async () => {
    const res = await request(app).get('/api/employees');
    expect(res.status).toBe(401);
  });

  it('регистрация создаёт пользователя и сессию', async () => {
    const agent = await registerAgent();
    const me = await agent.get('/api/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe(TEST_USER.email);
  });

  it('повторная регистрация с тем же email — 409', async () => {
    await registerAgent();
    const res = await request(app).post('/api/auth/register').send(TEST_USER);
    expect(res.status).toBe(409);
  });

  it('регистрация с невалидными данными — 400 и ошибки полей', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'not-an-email', password: '123' });
    expect(res.status).toBe(400);
    expect(res.body.fields.email).toBeDefined();
    expect(res.body.fields.password).toBeDefined();
  });

  it('вход с верным паролем, затем выход завершает сессию', async () => {
    await registerAgent();
    const agent = request.agent(app);
    const login = await agent.post('/api/auth/login').send(TEST_USER);
    expect(login.status).toBe(200);
    const logout = await agent.post('/api/auth/logout');
    expect(logout.status).toBe(200);
    const me = await agent.get('/api/auth/me');
    expect(me.status).toBe(401);
  });

  it('вход с неверным паролем — 401', async () => {
    await registerAgent();
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: TEST_USER.email, password: 'wrong-password' });
    expect(res.status).toBe(401);
  });

  it('авторизованный список содержит 5 демо-сотрудников', async () => {
    const agent = await registerAgent();
    const res = await agent.get('/api/employees');
    expect(res.status).toBe(200);
    expect(res.body.employees).toHaveLength(5);
  });

  it('поиск по ФИО регистронезависим (кириллица)', async () => {
    const agent = await registerAgent();
    const res = await agent.get('/api/employees').query({ search: 'иванова' });
    expect(res.status).toBe(200);
    expect(res.body.employees).toHaveLength(1);
    expect(res.body.employees[0].fullName).toBe('Иванова Анна Сергеевна');
  });

  it('фильтр по отделу', async () => {
    const agent = await registerAgent();
    const res = await agent.get('/api/employees').query({ department: 'QA' });
    expect(res.body.employees).toHaveLength(1);
    expect(res.body.employees[0].department).toBe('QA');
  });

  it('поиск и фильтр работают одновременно', async () => {
    const agent = await registerAgent();
    const res = await agent.get('/api/employees').query({ search: 'петров', department: 'Разработка' });
    expect(res.body.employees).toHaveLength(1);
    expect(res.body.employees[0].fullName).toBe('Петров Дмитрий Алексеевич');
  });

  it('добавление сотрудника: валидация обязательных полей и успешное создание', async () => {
    const agent = await registerAgent();
    const bad = await agent.post('/api/employees').send({ fullName: '', position: '', department: 'Неизвестный' });
    expect(bad.status).toBe(400);
    expect(bad.body.fields.fullName).toBeDefined();
    expect(bad.body.fields.position).toBeDefined();
    expect(bad.body.fields.department).toBeDefined();

    const good = await agent
      .post('/api/employees')
      .send({ fullName: 'Новиков Игорь Олегович', position: 'Аналитик', department: 'Продажи' });
    expect(good.status).toBe(201);
    expect(good.body.employee.id).toBeGreaterThan(0);

    const list = await agent.get('/api/employees');
    expect(list.body.employees).toHaveLength(6);
  });

  it('добавление сотрудника без авторизации — 401', async () => {
    const res = await request(app)
      .post('/api/employees')
      .send({ fullName: 'Тестов Тест Тестович', position: 'Тестировщик', department: 'QA' });
    expect(res.status).toBe(401);
  });

  it('список отделов доступен после авторизации', async () => {
    const agent = await registerAgent();
    const res = await agent.get('/api/employees/departments');
    expect(res.status).toBe(200);
    expect(res.body.departments).toContain('Разработка');
  });
});

describe('Сохранность данных', () => {
  it('данные переживают закрытие и повторное открытие БД, повторный сид не дублирует', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'emplist-test-'));
    const file = path.join(dir, 'test.db');
    try {
      const db1 = openDb(file);
      seedEmployees(db1);
      db1
        .prepare('INSERT INTO employees (full_name, full_name_lower, position, department) VALUES (?, ?, ?, ?)')
        .run('Тестов Тест Тестович', 'тестов тест тестович', 'Тестировщик', 'QA');
      db1.close();

      const db2 = openDb(file);
      const { count } = db2.prepare('SELECT COUNT(*) AS count FROM employees').get() as { count: number };
      expect(count).toBe(6);
      seedEmployees(db2);
      const after = db2.prepare('SELECT COUNT(*) AS count FROM employees').get() as { count: number };
      expect(after.count).toBe(6);
      db2.close();
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});