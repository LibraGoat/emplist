import { z } from 'zod';
import { DEPARTMENTS } from './config';

export const credentialsSchema = z.object({
  email: z.email('Некорректный email').max(254, 'Слишком длинный email'),
  password: z
    .string()
    .min(8, 'Пароль должен быть не короче 8 символов')
    .max(72, 'Пароль должен быть не длиннее 72 символов'),
});

export const employeeSchema = z.object({
  fullName: z.string().trim().min(1, 'Укажите ФИО').max(200, 'ФИО слишком длинное'),
  position: z.string().trim().min(1, 'Укажите должность').max(100, 'Название должности слишком длинное'),
  department: z.enum(DEPARTMENTS, { message: 'Выберите отдел из списка' }),
});

export function fieldErrors(error: z.ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_';
    if (!(key in fields)) fields[key] = issue.message;
  }
  return fields;
}