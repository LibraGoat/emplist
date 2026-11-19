import { useEffect, useState } from 'react';
import { api, ApiError } from '../api';
import { useAuth } from '../auth/AuthContext';
import EmployeeForm from '../components/EmployeeForm';
import Modal from '../components/Modal';
import type { Employee } from '../types';

const DEPT_CLASS: Record<string, string> = {
  Разработка: 'dev',
  QA: 'qa',
  Дизайн: 'design',
  HR: 'hr',
  Продажи: 'sales',
};

export default function EmployeesPage() {
  const { user, logout, clearSession } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    api
      .departments()
      .then((data) => {
        if (!cancelled) setDepartments(data.departments);
      })
      .catch((err: unknown) => {
        if (!cancelled && err instanceof ApiError && err.status === 401) clearSession();
      });
    return () => {
      cancelled = true;
    };
  }, [clearSession]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    api
      .employees(debouncedSearch, department)
      .then((data) => {
        if (!cancelled) setEmployees(data.employees);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          clearSession();
          return;
        }
        setError(err instanceof Error ? err.message : 'Не удалось загрузить список');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, department, reloadKey, clearSession]);

  async function handleLogout() {
    try {
      await logout();
    } catch {
      clearSession();
    }
  }

  const filtered = debouncedSearch !== '' || department !== '';

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1>Список сотрудников</h1>
          <p className="muted">Вы вошли как {user?.email}</p>
        </div>
        <button type="button" className="button secondary" onClick={handleLogout}>
          Выйти
        </button>
      </header>

      <div className="toolbar">
        <input
          className="input"
          type="search"
          placeholder="Поиск по ФИО…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Поиск по ФИО"
        />
        <select
          className="input"
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          aria-label="Фильтр по отделу"
        >
          <option value="">Все отделы</option>
          {departments.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <button type="button" className="button primary" onClick={() => setFormOpen(true)}>
          Добавить сотрудника
        </button>
      </div>

      {error && <div className="banner error">{error}</div>}

      <section className="card">
        {loading ? (
          <p className="muted padded">Загрузка…</p>
        ) : employees.length === 0 ? (
          <p className="muted padded">
            {filtered ? 'Ничего не найдено. Попробуйте изменить запрос или фильтр.' : 'Сотрудников пока нет.'}
          </p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ФИО</th>
                  <th>Должность</th>
                  <th>Отдел</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((e) => (
                  <tr key={e.id}>
                    <td>{e.fullName}</td>
                    <td>{e.position}</td>
                    <td>
                      <span className={`badge badge-${DEPT_CLASS[e.department] ?? 'default'}`}>
                        {e.department}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && <footer className="table-footer muted">Найдено: {employees.length}</footer>}
      </section>

      {formOpen && (
        <Modal title="Новый сотрудник" onClose={() => setFormOpen(false)}>
          <EmployeeForm
            departments={departments}
            onCancel={() => setFormOpen(false)}
            onSuccess={() => {
              setFormOpen(false);
              setReloadKey((k) => k + 1);
            }}
          />
        </Modal>
      )}
    </div>
  );
}