import AuthScreen from '@/components/auth-screen';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
export default async function RegisterPage() {
  await connection();
  const session=await auth();
  const rolePath=session?.user?.role==='Admin'?'admin':session?.user?.role==='Agent'?'agent':session?.user?.role==='User'?'user':null;
  if(rolePath) redirect(`/dashboard/${rolePath}`);
  return <AuthScreen mode="register"/>;
}
