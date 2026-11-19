import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../api';

const EMAIL_RE = /^\S+@\S+\.\S+$/;

export default function RegisterPage() {
  const { user, register } = useAuth();
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
    else if (!EMAIL_RE.test(email.trim())) next.email = 'Некорректный email';
    if (!password) next.password = 'Укажите пароль';
    else if (password.length < 8) next.password = 'Пароль должен быть не короче 8 символов';
    setErrors(next);
    setServerError('');
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    try {
      await register(email.trim(), password);
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
        <h1>Регистрация</h1>
        <p className="muted">Создайте аккаунт, чтобы открыть список сотрудников</p>
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
              placeholder="Минимум 8 символов"
              autoComplete="new-password"
            />
            {errors.password && <span className="field-error">{errors.password}</span>}
          </div>
          <button type="submit" className="button primary full" disabled={submitting}>
            {submitting ? 'Создание аккаунта…' : 'Зарегистрироваться'}
          </button>
        </form>
        <p className="muted centered">
          Уже есть аккаунт? <Link to="/login">Войти</Link>
        </p>
      </div>
    </div>
  );
}