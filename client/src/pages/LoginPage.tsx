import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../api';

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!email.trim()) next.email = 'Укажите email';
    if (!password) next.password = 'Укажите пароль';
    setErrors(next);
    setServerError('');
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    try {
      await login(email.trim(), password);
      navigate('/', { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setServerError(err.message);
        if (err.fields) setErrors(err.fields);
      } else {
        setServerError('Не удалось связаться с сервером');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-layout">
      <div className="card auth-card">
        <h1>Вход</h1>
        <p className="muted">Список сотрудников доступен после авторизации</p>
        {serverError && <div className="banner error">{serverError}</div>}
        <form onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
            {errors.email && <span className="field-error">{errors.email}</span>}
          </div>
          <div className="field">
            <label htmlFor="password">Пароль</label>
            <input
              id="password"
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Ваш пароль"
              autoComplete="current-password"
            />
            {errors.password && <span className="field-error">{errors.password}</span>}
          </div>
          <button type="submit" className="button primary full" disabled={submitting}>
            {submitting ? 'Вход…' : 'Войти'}
          </button>
        </form>
        <p className="muted centered">
          Нет аккаунта? <Link to="/register">Зарегистрироваться</Link>
        </p>
      </div>
    </div>
  );
}