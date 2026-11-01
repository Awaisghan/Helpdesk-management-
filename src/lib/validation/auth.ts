import { z } from 'zod';
export const emailSchema = z.string().trim().toLowerCase().email().max(254);
export const registrationSchema = z.object({
  name: z.string().trim().min(2).max(80), email: emailSchema,
  password: z.string().min(12).max(128),
}).strict();
// Auth.js appends csrfToken and callbackUrl to the provider form. Ignore those
// transport fields while validating the credentials we actually consume.
export const loginSchema = z.object({ email: emailSchema, password: z.string().min(1).max(128) });
