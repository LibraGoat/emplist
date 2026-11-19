import { Router } from 'express';
import type { Db } from './db';
import { DEPARTMENTS } from './config';
import { employeeSchema, fieldErrors } from './validation';
import { requireAuth } from './auth';

export interface EmployeeRow {
  id: number;
  fullName: string;
  position: string;
  department: string;
  createdAt: string;
}

const SELECT_EMPLOYEES =
  'SELECT id, full_name AS fullName, position, department, created_at AS createdAt FROM employees';

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

export function employeesRouter(db: Db): Router {
  const router = Router();
  router.use(requireAuth);

  const insert = db.prepare(
    'INSERT INTO employees (full_name, full_name_lower, position, department) VALUES (?, ?, ?, ?)',
  );
  const findById = db.prepare(`${SELECT_EMPLOYEES} WHERE id = ?`);

  router.get('/departments', (_req, res) => {
    res.json({ departments: DEPARTMENTS });
  });

  router.get('/', (req, res) => {
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const department = typeof req.query.department === 'string' ? req.query.department.trim() : '';
    const conditions: string[] = [];
    const params: Record<string, string> = {};
    if (search) {
      conditions.push("full_name_lower LIKE @search ESCAPE '\\'");
      params.search = `%${escapeLike(search.toLowerCase())}%`;
    }
    if (department) {
      conditions.push('department = @department');
      params.department = department;
    }
    const where = conditions.length ? ` WHERE ${conditions.join(' AND ')}` : '';
    const employees = db.prepare(`${SELECT_EMPLOYEES}${where} ORDER BY full_name`).all(params) as EmployeeRow[];
    res.json({ employees });
  });

  router.post('/', (req, res) => {
    const parsed = employeeSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Ошибка валидации', fields: fieldErrors(parsed.error) });
      return;
    }
    const { fullName, position, department } = parsed.data;
    const info = insert.run(fullName, fullName.toLowerCase(), position, department);
    const employee = findById.get(info.lastInsertRowid) as EmployeeRow;
    res.status(201).json({ employee });
  });

  return router;
}