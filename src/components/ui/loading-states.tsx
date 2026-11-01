import { Code2, RefreshCw, CloudOff } from 'lucide-react';

export function Skeleton({ className = '' }: { className?: string }) {
  return <span aria-hidden="true" className={`skeleton ${className}`} />;
}
export function DashboardSkeleton({ fullPage = false, compact = false, variant = 'admin' }: { fullPage?: boolean; compact?: boolean; variant?: 'admin' | 'user' | 'agent' }) {
  const content = <div className="dashboard-skeleton" role="status" aria-live="polite" aria-busy="true">
    <span className="sr-only">Loading your workspace. Your tickets are on their way.</span>
    <div className="skeleton-heading"><div><Skeleton className="sk-eyebrow"/><Skeleton className="sk-heading"/><Skeleton className="sk-description"/></div><Skeleton className="sk-button"/></div>
    {!compact && <><div className="stats-grid">{[1,2,3,4].map(i => <div className="stat-card sk-card" key={i}><Skeleton className="sk-label"/><Skeleton className="sk-number"/><Skeleton className="sk-description"/></div>)}</div>{variant === 'admin' ? <div className="analytics-grid"><div className="panel sk-chart"><Skeleton className="sk-label"/><div className="sk-bars">{[40,65,50,80,60,90,75].map((height,i) => <span key={i} style={{height:`${height}%`}}><Skeleton/></span>)}</div></div><div className="panel sk-chart health-panel"><Skeleton className="sk-label"/><Skeleton className="sk-circle"/></div></div> : <div className="panel sk-spotlight"><Skeleton className="sk-eyebrow"/><Skeleton className="sk-heading"/><Skeleton className="sk-description"/></div>}</>}
    <div className="panel sk-table"><Skeleton className="sk-label"/>{[1,2,3,4,5].map(i => <div className="sk-row" key={i}><Skeleton className="sk-avatar"/><Skeleton className="sk-subject"/><Skeleton className="sk-badge"/><Skeleton className="sk-badge"/></div>)}</div>
  </div>;
  return fullPage ? <div className="route-skeleton"><div className="route-skeleton-brand"><Code2/> CodxPy</div>{content}</div> : content;
}
export function ProfileSkeleton() {
  return <div className="panel profile-editor" role="status" aria-busy="true"><span className="sr-only">Loading your profile</span><Skeleton className="sk-circle"/>{[1,2,3].map(i => <div className="sk-field" key={i}><Skeleton className="sk-label"/><Skeleton className="sk-input"/></div>)}</div>;
}
export function LoadError({ retry, title = 'Your workspace needs a moment.', message = 'We couldn’t load the tickets. Try again to pick up where you left off.' }: { retry: () => void; title?: string; message?: string }) {
  return <section className="panel load-error" role="alert"><span className="error-symbol"><CloudOff size={30}/></span><span className="eyebrow">LET’S TRY THAT AGAIN</span><h2>{title}</h2><p>{message}</p><button className="primary-button" onClick={retry}><RefreshCw size={16}/>Try again</button><small>Your unsaved preview session is still here.</small></section>;
}
