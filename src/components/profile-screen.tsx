'use client';
import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, Code2, LogOut, Save, ShieldCheck, UserRound } from 'lucide-react';
import { roleNames, type Role } from '@/lib/preview-workspace';
import { usePreview } from './preview-provider';
import { LoadError, ProfileSkeleton } from './ui/loading-states';

export default function ProfileScreen({ role }: { role: Role }) {
  const workspace = usePreview();
  const router = useRouter();
  const profile = workspace.profiles[role];
  const [notice, setNotice] = useState('');
  const [errors, setErrors] = useState<Record<string,string>>({});
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget);
    const name = String(data.get('name')).trim(); const email = String(data.get('email')).trim();
    const next: Record<string,string> = {};
    if (name.length < 2) next.name = 'Enter a name with at least 2 characters.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = 'Enter a valid email address.';
    setErrors(next); setNotice(''); if (Object.keys(next).length) return;
    if (workspace.mode === 'live') {
      try {
        const response = await fetch('/api/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
        const result = await response.json() as { user?: { name: string }; error?: string };
        if (!response.ok || !result.user) throw new Error(result.error ?? 'Profile could not be updated.');
        workspace.setProfile(role,{ ...profile, name: result.user.name });
        setNotice('Your profile has been saved.');
      } catch (error) { setNotice(error instanceof Error ? error.message : 'Profile could not be updated.'); }
    } else {
      workspace.setProfile(role,{ name, email, title: String(data.get('title')).trim(), notifications: data.get('notifications') === 'on' });
      setNotice('Profile updated for this preview session. Changes reset on refresh.');
    }
  }
  async function exitWorkspace() { if (workspace.mode === 'live') await signOut({ redirect: false }); workspace.reset(); router.push('/login'); }
  return <div className="profile-page"><header className="profile-header"><Link className="brand" href={`/dashboard/${role}`}><span className="brand-mark"><Code2 size={23}/></span>CodxPy</Link><span className="preview-tag"><span/>{workspace.mode === 'live' ? roleNames[role] : `${roleNames[role]} preview`}</span></header><main><Link className="back-link" href={`/dashboard/${role}`}><ArrowLeft size={16}/>Back to workspace</Link><div className="page-heading"><div><span className="eyebrow">YOUR LITTLE CORNER</span><h1>A profile that feels like you.</h1><p>Manage your details and how you stay in the loop.</p></div></div><div className="profile-grid"><aside className="panel profile-summary"><span className="avatar large">{profile.name.split(' ').map(word => word[0]).join('').slice(0,2)}</span><h2>{profile.name}</h2><p>{workspace.mode === 'live' ? profile.email : profile.title}</p><span className="status resolved"><ShieldCheck size={12}/>{roleNames[role]}</span><div className="profile-security"><ShieldCheck size={20}/><h3>Your role is managed by your workspace.</h3><p>Your role is protected by your workspace. Contact an admin if your access needs to change.</p></div><button className="secondary-button" onClick={exitWorkspace}><LogOut size={15}/>{workspace.mode === 'live' ? 'Sign out' : 'Exit preview'}</button></aside>
      {workspace.state === 'loading' ? <ProfileSkeleton/> : workspace.state === 'error' ? <LoadError retry={() => workspace.reload()}/> : <section className="panel profile-editor"><div className="section-title"><UserRound size={19}/><h2>Personal information</h2></div><p>{workspace.mode === 'live' ? 'Your name is saved to your account. Email and role are managed by the workspace.' : 'These changes are local to this preview session.'}</p><form className="standard-form" onSubmit={save} noValidate><div className="form-row"><label>Full name<input name="name" defaultValue={profile.name} maxLength={80} aria-invalid={!!errors.name}/>{errors.name && <span className="field-error">{errors.name}</span>}</label><label>Email address<input name="email" type="email" defaultValue={profile.email} maxLength={254} readOnly={workspace.mode === 'live'} aria-invalid={!!errors.email}/>{errors.email && <span className="field-error">{errors.email}</span>}</label></div>{workspace.mode !== 'live' && <><label>Job title<input name="title" defaultValue={profile.title} maxLength={100}/></label><div className="preference-row"><div><h3>Email notifications</h3><p>Ticket updates, replies and resolutions.</p></div><label className="switch"><input type="checkbox" name="notifications" defaultChecked={profile.notifications} aria-label="Email notifications"/><span/></label></div></>}<div className="profile-save"><span>{workspace.mode === 'live' ? 'Role: ' + roleNames[role] : 'Preview changes only'}</span><button className="primary-button" type="submit"><Save size={16}/>Save changes</button></div>{Object.keys(errors).length > 0 && <p role="alert" className="field-error">Please correct the highlighted fields.</p>}{notice && <p className="inline-success" role="status"><Check size={16}/>{notice}</p>}</form></section>}
    </div></main></div>;
}
