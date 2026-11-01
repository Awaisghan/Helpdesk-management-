import { auth } from '@/lib/auth';
import { connection } from 'next/server';
import { redirect } from 'next/navigation';

export default async function Home() {
  await connection();
  const session = await auth();
  const rolePath = session?.user?.role === 'Admin' ? 'admin' : session?.user?.role === 'Agent' ? 'agent' : session?.user?.role === 'User' ? 'user' : null;
  redirect(rolePath ? `/dashboard/${rolePath}` : '/login');
}
