import type { DefaultSession } from 'next-auth';
declare module 'next-auth' {
  interface Session { user: { id: string; role: 'User' | 'Agent' | 'Admin' } & DefaultSession['user'] }
  interface User { role: 'User' | 'Agent' | 'Admin' }
}
declare module 'next-auth/jwt' {
  interface JWT { role?: 'User' | 'Agent' | 'Admin' }
}
