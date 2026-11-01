'use client';
import { useState, type FormEvent, type RefObject } from 'react';
import { Check, History, LockKeyhole, Send, UserRoundCheck, X } from 'lucide-react';
import type { Attachment, Status, Ticket } from '@/lib/preview-data';
import { profiles, type Role } from '@/lib/preview-workspace';
import { usePreview } from './preview-provider';
import { AttachmentList, AttachmentPicker } from './ui/attachments';
import { SlaCountdown } from './ui/sla-countdown';

export function TicketDetails({ ticket, role, dialog, close }: { ticket: Ticket; role: Role; dialog: RefObject<HTMLDialogElement | null>; close: () => void }) {
  const workspace = usePreview();
  const [internal, setInternal] = useState(false);
  const [files, setFiles] = useState<Attachment[]>([]);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'conversation' | 'history'>('conversation');
  const closed = ticket.status === 'Closed';
  const remainingAttachments = Math.max(0,3-(ticket.attachmentCount??0));
  const author = workspace.profiles[role].name;
  async function apiUpdate(path: string, method: 'POST'|'PATCH', body: Record<string, unknown>) {
    const response = await fetch(path, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const result = await response.json() as { error?: string };
    if (!response.ok) throw new Error(result.error ?? 'The change could not be saved.');
    await workspace.reload();
  }
  function mutate(update: (current: Ticket) => Partial<Ticket>, activity?: string) {
    workspace.setTickets(current => current.map(item => item.id === ticket.id ? {
      ...item, ...update(item), ...(activity ? { activity: [...(item.activity ?? []), { id: crypto.randomUUID(), body: activity, at: Date.now() }] } : {}),
    } : item));
  }
  async function changeStatus(status: Status) {
    if (workspace.mode === 'live') {
      try { if (!ticket.recordId) throw new Error('Ticket identifier is missing.'); await apiUpdate(`/api/tickets/${ticket.recordId}/status`, 'PATCH', { status }); setError(''); }
      catch (cause) { setError(cause instanceof Error ? cause.message : 'Status could not be updated.'); }
      return;
    }
    mutate(current => ({ status, resolvedAt: status === 'Resolved' ? Date.now() : status === 'Closed' ? current.resolvedAt : undefined }), `${author} changed status to ${status}`);
  }
  async function reply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const body = String(new FormData(form).get('reply') ?? '').trim();
    if (!body) { setError('Write a message before sending.'); return; }
    if (closed) { setError('This conversation is closed.'); return; }
    const now = Date.now();
    const isInternal = internal && role !== 'user';
    if (workspace.mode === 'live') {
      try {
        if (!ticket.recordId) throw new Error('Ticket identifier is missing.');
        let response:Response;
        if(files.length) {
          const upload=new FormData(); upload.set('body',body); upload.set('isInternal',String(isInternal));
          for(const file of files) { if(!file.file) throw new Error('A selected file is no longer available. Choose it again.'); upload.append('files',file.file,file.name); }
          response=await fetch(`/api/tickets/${ticket.recordId}/messages`,{method:'POST',body:upload});
        } else response=await fetch(`/api/tickets/${ticket.recordId}/messages`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({body,isInternal})});
        const result=await response.json() as {error?:string}; if(!response.ok) throw new Error(result.error??'Reply could not be sent.');
        files.forEach(file=>workspace.releaseAttachment(file.url));
        await workspace.reload();
        setFiles([]); setError(''); form.reset();
      } catch (cause) { setError(cause instanceof Error ? cause.message : 'Reply could not be sent.'); }
      return;
    }
    mutate(current => ({
      replies: [...(current.replies ?? []), { id: crypto.randomUUID(), body, author, isInternal, attachments: files, at: now }],
      firstRespondedAt: role !== 'user' && !isInternal ? current.firstRespondedAt ?? now : current.firstRespondedAt,
      ...(role === 'user' && ['Resolved', 'Waiting on User'].includes(current.status) ? { status: 'Open', resolvedAt: undefined } : {}),
    }), isInternal ? undefined : `${author} added a reply`);
    setFiles([]); setError(''); form.reset();
  }
  function dismiss() { files.forEach(file => workspace.releaseAttachment(file.url)); close(); }
  return <>
    <div className="modal-heading"><span className="eyebrow">{ticket.id} · {ticket.category}</span><button className="icon-button" aria-label="Close ticket details" onClick={dismiss}><X size={21}/></button></div>
    <h2>{ticket.title}</h2>
    <div className="detail-meta"><span className={`status ${ticket.status.toLowerCase().replaceAll(' ', '-')}`}><i/>{ticket.status}</span><span>{ticket.priority} priority</span><span>{ticket.agent}</span></div>
    <SlaCountdown ticket={ticket}/>
    {role === 'admin' && <label className="assignment-control"><span><UserRoundCheck size={16}/>Assigned agent</span><select value={workspace.mode === 'live' ? (workspace.agents.find(agent => agent.name === ticket.agent)?.id ?? '') : ticket.agent} onChange={async e => {
      const chosen = e.target.value;
      if (workspace.mode === 'live') {
        try { if (!ticket.recordId) throw new Error('Ticket identifier is missing.'); await apiUpdate(`/api/tickets/${ticket.recordId}/assignment`, 'PATCH', { assignedAgent: chosen || null }); setError(''); }
        catch (cause) { setError(cause instanceof Error ? cause.message : 'Assignment could not be saved.'); }
      } else mutate(() => ({agent: chosen}), `${author} assigned ticket to ${chosen}`);
    }}><option value="">Unassigned</option>{workspace.mode === 'live' ? workspace.agents.map(agent => <option key={agent.id} value={agent.id}>{agent.name}</option>) : <><option>{profiles.agent.name}</option><option>Ali Hassan</option></>}</select></label>}
    <div className="detail-tabs" aria-label="Ticket information"><button className={tab === 'conversation' ? 'selected' : ''} onClick={() => setTab('conversation')}>Conversation</button><button className={tab === 'history' ? 'selected' : ''} onClick={() => setTab('history')}><History size={14}/>History</button></div>
    {tab === 'history' ? <div className="ticket-history">{workspace.mode === 'live' ? workspace.activities.filter(event => typeof event.ticket !== 'string' && event.ticket.ticketNumber === ticket.id).map(event => { const actor = typeof event.performedBy === 'string' ? event.performedBy : event.performedBy.name ?? 'Team member'; return <div key={event.id}><span className="live-dot"/><p>{actor} · {event.action.replaceAll('.',' ')}<small>{new Date(event.createdAt).toLocaleString()}</small></p></div>; }) : ticket.activity?.map(event => <div key={event.id}><span className="live-dot"/><p>{event.body}<small>{new Date(event.at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</small></p></div>)}<p className="field-hint">{workspace.mode === 'live' ? 'Recorded ticket changes.' : 'Session-only activity preview.'}</p></div> : <>
      <div className="conversation"><div className="message"><div className="person"><strong>{ticket.requester}</strong><small>Customer</small></div><p>{ticket.description}</p><AttachmentList files={ticket.attachments}/></div>
        {ticket.messages.map((body,i) => <div className="message reply" key={`seed-${i}`}><div className="person"><strong>Support team</strong><small>Sample reply</small></div><p>{body}</p></div>)}
        {ticket.replies?.filter(reply => role !== 'user' || !reply.isInternal).map(reply => <div className={`message reply ${reply.isInternal ? 'internal-message' : ''}`} key={reply.id}><div className="person">{reply.isInternal && <LockKeyhole size={14}/>}<strong>{reply.author}</strong><small>{reply.isInternal ? 'Internal note · team only' : 'Preview reply'}</small></div><p>{reply.body}</p><AttachmentList files={reply.attachments}/></div>)}
      </div>
      {closed ? <div className="closed-message"><Check size={18}/><p>This conversation is closed. Create a new ticket if you need more help.</p></div> : <form onSubmit={reply} className="reply-form">
        {role !== 'user' && <div className="reply-modes"><button type="button" aria-pressed={!internal} className={!internal ? 'selected' : ''} onClick={() => setInternal(false)}>Public reply</button><button type="button" aria-pressed={internal} className={internal ? 'selected' : ''} onClick={() => setInternal(true)}><LockKeyhole size={13}/>Internal note</button></div>}
        <label>{internal && role !== 'user' ? 'Internal note' : 'Reply'}<textarea name="reply" required maxLength={5000} rows={3} placeholder={internal ? 'Only your support team can see this note...' : 'Write a thoughtful reply...'} aria-invalid={!!error} aria-describedby="reply-error"/></label>
        {workspace.mode === 'live' ? remainingAttachments>0 ? <AttachmentPicker value={files} onChange={setFiles} maxFiles={remainingAttachments}/> : <p className="field-hint">This ticket has reached its 3-file attachment limit.</p> : <AttachmentPicker value={files} onChange={setFiles}/>}
        {error && <p id="reply-error" className="field-error" role="alert">{error}</p>}
        <div className="modal-footer">{role !== 'user' && <label className="inline-label">Status<select aria-label="Ticket status" value={ticket.status} onChange={e => { void changeStatus(e.target.value as Status); }}>{(['Open','In Progress','Waiting on User','Resolved','Closed'] as Status[]).map(s => <option key={s}>{s}</option>)}</select></label>}<button className="primary-button" type="submit"><Send size={16}/>{internal && role !== 'user' ? 'Add internal note' : 'Send reply'}</button></div>
      </form>}
    </>}
    {role === 'user' && !closed && <details className="close-ticket-confirm"><summary>Close this ticket</summary><p>Finished here? Closing disables further replies in this preview.</p><button className="secondary-button" onClick={() => changeStatus('Closed')}>Confirm close ticket</button></details>}
    {error && tab !== 'conversation' && <p className="field-error" role="alert">{error}</p>}
    <p className="form-info">{workspace.mode === 'live' ? 'Saved to the helpdesk database. Your role controls which actions are allowed.' : 'UI preview · changes reset on refresh. Sign in to save real ticket updates.'}</p>
    <button className="sr-only" onClick={() => dialog.current?.close()}>Dismiss dialog</button>
  </>;
}
