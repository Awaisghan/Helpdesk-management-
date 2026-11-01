'use client';
import { useId, useState, type ChangeEvent } from 'react';
import { Download, FileText, Paperclip, X } from 'lucide-react';
import type { Attachment } from '@/lib/preview-data';
import { usePreview } from '../preview-provider';

export function AttachmentPicker({ value, onChange, maxFiles = 3 }: { value: Attachment[]; onChange: (value: Attachment[]) => void; maxFiles?: number }) {
  const { createAttachment, releaseAttachment } = usePreview();
  const [error, setError] = useState('');
  const id = useId();
  function choose(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []); event.target.value = '';
    if (value.length + files.length > maxFiles) { setError(`Choose up to ${maxFiles} more file${maxFiles===1?'':'s'} for this ticket.`); return; }
    if (files.some(file => file.size === 0 || file.size > 5 * 1024 * 1024)) { setError('Each file must be non-empty and no larger than 5 MB.'); return; }
    const validTypes: Record<string, string[]> = { 'image/png': ['png'], 'image/jpeg': ['jpg', 'jpeg'], 'application/pdf': ['pdf'] };
    if (files.some(file => !validTypes[file.type]?.includes(file.name.split('.').pop()?.toLowerCase() ?? ''))) { setError('Only PNG, JPG and PDF files are supported.'); return; }
    setError(''); onChange([...value, ...files.map(createAttachment)]);
  }
  return <div className="attachment-picker"><label className="upload-zone" htmlFor={id}><Paperclip size={20}/><strong>Add supporting files</strong><span>PNG, JPG or PDF · up to {maxFiles} files · 5 MB each</span><input id={id} type="file" multiple accept="image/png,image/jpeg,application/pdf" aria-describedby={`${id}-help`} disabled={maxFiles===0} onChange={choose}/></label><p id={`${id}-help`} className="field-hint">Files upload securely and remain private to authorized ticket participants.</p>{error && <p className="field-error" role="alert">{error}</p>}<div className="attachment-list">{value.map(file => <div className="attachment-chip" key={file.id}><FileText size={16}/><span>{file.name}<small>{Math.ceil(file.size / 1024)} KB</small></span><button type="button" className="icon-button" aria-label={`Remove ${file.name}`} onClick={() => { releaseAttachment(file.url); onChange(value.filter(item => item.id !== file.id)); setError(''); }}><X size={15}/></button></div>)}</div></div>;
}
export function AttachmentList({ files = [] }: { files?: Attachment[] }) {
  return <div className="attachment-list">{files.map(file => <a className="attachment-chip" key={file.id} href={file.url} download={file.name}><FileText size={16}/><span>{file.name}<small>{Math.ceil(file.size / 1024)} KB · private attachment</small></span><Download size={15}/></a>)}</div>;
}
