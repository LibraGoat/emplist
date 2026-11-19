import { useState, type FormEvent } from 'react';
import { api, ApiError } from '../api';

interface EmployeeFormProps {
  departments: string[];
  onSuccess: () => void;
  onCancel: () => void;
}

export default function EmployeeForm({ departments, onSuccess, onCancel }: EmployeeFormProps) {
  const [fullName, setFullName] = useState('');
  const [position, setPosition] = useState('');
  const [department, setDepartment] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!fullName.trim()) next.fullName = 'Укажите ФИО';
    if (!position.trim()) next.position = 'Укажите должность';
    if (!department) next.department = 'Выберите отдел';
    setErrors(next);
    setServerError('');
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    try {
      await api.addEmployee({ fullName: fullName.trim(), position: position.trim(), department });
      onSuccess();
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
    <form onSubmit={handleSubmit} noValidate>
      {serverError && <div className="banner error">{serverError}</div>}
      <div className="field">
        <label htmlFor="fullName">ФИО *</label>
        <input
          id="fullName"
          className="input"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Иванов Иван Иванович"
          maxLength={200}
        />
        {errors.fullName && <span className="field-error">{errors.fullName}</span>}
      </div>
      <div className="field">
        <label htmlFor="position">Должность *</label>
        <input
          id="position"
          className="input"
          value={position}
          onChange={(e) => setPosition(e.target.value)}
          placeholder="Например: Frontend-разработчик"
          maxLength={100}
        />
        {errors.position && <span className="field-error">{errors.position}</span>}
      </div>
      <div className="field">
        <label htmlFor="department">Отдел *</label>
        <select
          id="department"
          className="input"
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
        >
          <option value="">Выберите отдел</option>
          {departments.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        {errors.department && <span className="field-error">{errors.department}</span>}
      </div>
      <div className="form-actions">
        <button type="button" className="button secondary" onClick={onCancel} disabled={submitting}>
          Отмена
        </button>
        <button type="submit" className="button primary" disabled={submitting}>
          {submitting ? 'Сохранение…' : 'Добавить'}
        </button>
      </div>
    </form>
  );
}