import { notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import ProfileScreen from '@/components/profile-screen';
import { isRole, roles } from '@/lib/preview-workspace';
export function generateStaticParams() { return roles.map(role => ({role})); }
export default async function ProfilePage({ params }: { params: Promise<{role: string}> }) {
  const {role} = await params;
  if (!isRole(role)) notFound();
  await connection();
  const session = await auth();
  const actualRole = session?.user?.role === 'Admin' ? 'admin' : session?.user?.role === 'Agent' ? 'agent' : session?.user?.role === 'User' ? 'user' : null;
  if (!actualRole) redirect('/login');
  if (actualRole !== role) redirect(`/dashboard/${actualRole}/profile`);
  return <ProfileScreen key={role} role={role}/>;
}
