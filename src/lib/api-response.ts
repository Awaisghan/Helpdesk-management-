import { ZodError } from 'zod';
export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); this.name = 'ApiError'; }
}
export function apiError(error: unknown) {
  if (error instanceof ApiError) return Response.json({ error: error.message }, { status: error.status });
  if (error instanceof Error && error.message === 'DATABASE_URI_INVALID') return Response.json({ error: 'MONGODB_URI must use mongodb:// or mongodb+srv://. Check .env.local.' }, { status: 503 });
  if (error instanceof ZodError) return Response.json({ error: 'Please check the submitted fields.', issues: error.issues.map(issue => ({ field: issue.path.join('.'), message: issue.message })) }, { status: 422 });
  if (error instanceof Error && error.message === 'DATABASE_NOT_CONFIGURED') return Response.json({ error: 'Database is not configured. Add MONGODB_URI to .env.local and restart the server.' }, { status: 503 });
  if (error && typeof error === 'object' && 'code' in error && error.code === 11000) return Response.json({ error: 'That record already exists.' }, { status: 409 });
  console.error('Request failed:', error instanceof Error ? error.name : 'UnknownError');
  return Response.json({ error: 'The request could not be completed. Please try again.' }, { status: 500 });
}
export function parseJson<T>(schema: { parse: (value: unknown) => T }, input: unknown) { return schema.parse(input); }
