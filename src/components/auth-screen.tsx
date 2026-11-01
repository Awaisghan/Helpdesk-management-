'use client';
import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { ArrowRight, Check, Code2, Eye, EyeOff, Leaf, ShieldCheck, Ticket } from 'lucide-react';

export default function AuthScreen({ mode }: { mode: 'login' | 'register' }) {
  const router=useRouter();
  const register = mode === 'register';
  const [visible, setVisible] = useState(false);
  const [errors, setErrors] = useState<Record<string,string>>({});
  const [success, setSuccess] = useState(false);
  const [working, setWorking] = useState(false);
  const [formError, setFormError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const next: Record<string,string> = {};
    const name=String(data.get('name')??'').trim();
    const email=String(data.get('email')??'').trim();
    const password=String(data.get('password')??'');
    if(register && name.length<2) next.name='Enter at least 2 characters for your name.';
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email='Enter a valid email address.';
    if(password.length<(register?12:1)) next.password=register?'Use at least 12 characters.':'Enter your password.';
    if(register && password!==data.get('confirm')) next.confirm='Passwords do not match.';
    setErrors(next); if(Object.keys(next).length) return;
    setWorking(true); setFormError('');
    if(register) {
      try { const response=await fetch('/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,email,password})}); const result=await response.json() as {error?:string}; if(!response.ok) throw new Error(result.error??'Registration could not be completed.'); form.reset(); setSuccess(true); }
      catch(error) { setFormError(error instanceof Error?error.message:'Registration could not be completed.'); }
      finally { setWorking(false); }
      return;
    }
    try {
      const result=await signIn('credentials',{email,password,redirect:false});
      if(!result||result.error) { setFormError(result?.error==='CredentialsSignin'?'The email or password is incorrect, or the account is inactive.':'Could not sign in. Check the database connection and try again.'); return; }
      const response=await fetch('/api/auth/session',{cache:'no-store'});
      const session=await response.json() as {user?:{role?:'User'|'Agent'|'Admin'}};
      const path={User:'user',Agent:'agent',Admin:'admin'}[session.user?.role??'User'];
      router.push(`/dashboard/${path}`);
    } catch { setFormError('Sign-in is unavailable. Check MONGODB_URI in .env.local and retry.'); }
    finally { setWorking(false); }
  }
  return <div className="auth-page"><aside className="auth-story"><Link className="brand" href="/"><span className="brand-mark"><Code2 size={24}/></span>CodxPy</Link><div className="auth-story-content"><span className="eyebrow">SOFTWARE SUPPORT, MADE SIMPLE</span><h1>Great support.<br/>A calmer day.</h1><p>Give every software question a place to land, and every conversation the care it deserves.</p><div className="auth-illustration" aria-hidden="true"><div className="auth-orbit"><Leaf size={50}/></div><div className="floating-ticket"><span className="stat-icon"><Ticket size={20}/></span><div><strong>One less thing to worry about.</strong><span>Ticket resolved. Day made.</span></div><span className="floating-check"><Check size={16}/></span></div><div className="auth-mini-card"><span className="live-dot"/>A thoughtful reply goes a long way.</div></div></div><div className="auth-story-footer"><ShieldCheck size={17}/>Built around people, designed for clarity.</div></aside>
  <main className="auth-main"><div className="auth-top"><span className="preview-tag"><span/>{register?'Secure registration':'Secure sign in'}</span><Link href={register?'/login':'/register'}>{register?'Already have an account?':'New around here?'} <strong>{register?'Sign in':'Create account'} <ArrowRight size={14}/></strong></Link></div>
  <div className="auth-form-wrap"><span className="eyebrow">{register?'A FRESH START':'YOUR WORKSPACE AWAITS'}</span><h2>{register?'Good support starts here.':'Welcome back.'}</h2><p>{register?'Create your space for simpler, better conversations.':'A little clarity, a little progress. Let’s get started.'}</p>
  <div className="preview-disclosure"><ShieldCheck size={17}/><p>{register?'Your password is hashed before storage. Public registration creates a User account only.':'Your account role is assigned by the workspace. After sign-in, the app opens the dashboard for your role.'}</p></div>
  {success?<div className="auth-success" role="status"><span className="success-mark"><Check size={28}/></span><h3>Your account is ready.</h3><p>Sign in using the email and password you just registered. New public accounts have the User role.</p><Link className="primary-button" href="/login">Go to sign in<ArrowRight size={16}/></Link></div>:<form onSubmit={submit} noValidate className="standard-form">
    {register&&<label>Full name<input name="name" autoComplete="name" maxLength={80} placeholder="Your full name" aria-invalid={!!errors.name}/>{errors.name&&<span className="field-error">{errors.name}</span>}</label>}
    <label>Email address<input name="email" type="email" autoComplete="email" placeholder="you@example.com" maxLength={254} aria-invalid={!!errors.email}/>{errors.email&&<span className="field-error">{errors.email}</span>}</label>
    <label>Password<div className="password-field"><input name="password" type={visible?'text':'password'} autoComplete={register?'new-password':'current-password'} maxLength={128} placeholder={register?'At least 12 characters':'Your password'} aria-invalid={!!errors.password}/><button type="button" className="icon-button" aria-label={visible?'Hide password':'Show password'} onClick={()=>setVisible(!visible)}>{visible?<EyeOff size={18}/>:<Eye size={18}/>}</button></div>{errors.password&&<span className="field-error">{errors.password}</span>}</label>
    {register&&<label>Confirm password<input name="confirm" type={visible?'text':'password'} autoComplete="new-password" maxLength={128} placeholder="Re-enter your password" aria-invalid={!!errors.confirm}/>{errors.confirm&&<span className="field-error">{errors.confirm}</span>}</label>}
    {formError&&<p className="field-error" role="alert">{formError}</p>}
    <button className="primary-button auth-submit" type="submit" disabled={working}>{working?'Please wait…':register?'Create account':'Sign in'}<ArrowRight size={17}/></button>
    {register&&<p className="field-hint">Agent and Admin accounts are provisioned by an existing administrator.</p>}
  </form>}
  <div className="auth-bottom-note"><Leaf size={14}/>A little more human. A lot more helpful.</div></div></main></div>;
}
