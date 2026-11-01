'use client';
import { useEffect, useState } from 'react';
import { CheckCircle2, Clock3, TriangleAlert } from 'lucide-react';
import type { Ticket } from '@/lib/preview-data';

export function SlaCountdown({ ticket }: { ticket: Ticket }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  return <section className="sla-panel" aria-label="Service level deadlines"><div className="sla-heading"><Clock3 size={16}/><strong>Service level timeline</strong><small>Preview deadlines</small></div><div className="sla-grid">{[
    { label: 'First response', due: ticket.responseDueAt, completed: ticket.firstRespondedAt },
    { label: 'Resolution', due: ticket.resolutionDueAt, completed: ticket.resolvedAt },
  ].map(({label,due,completed}) => {
    const remaining = due && now ? due - now : null;
    const late = due && completed ? completed > due : remaining !== null && remaining < 0;
    const seconds = Math.floor(Math.abs(remaining ?? 0) / 1000);
    const duration = `${Math.floor(seconds / 3600)}h ${Math.floor(seconds / 60) % 60}m ${seconds % 60}s`;
    const stopped = ticket.status === 'Closed' && !completed;
    const Icon = !stopped && late ? TriangleAlert : completed ? CheckCircle2 : Clock3;
    return <div className={`sla-item ${late && !stopped ? 'sla-breached' : ''}`} key={label}><span>{label}<Icon size={14}/></span><strong>{stopped ? 'Ticket closed' : completed ? late ? 'Completed late' : 'Target met' : remaining === null ? 'Calculating…' : late ? 'SLA breached' : duration}</strong><small>{stopped ? 'Countdown stopped' : completed ? 'Recorded in preview' : remaining === null ? 'Preparing deadline' : late ? `${duration} overdue` : 'remaining'}</small></div>;
  })}</div></section>;
}
