'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import type { Attachment, Ticket } from '@/lib/preview-data';
import { profiles as initialProfiles, type Profile, type Role } from '@/lib/preview-workspace';

type LoadState = 'loading' | 'ready' | 'error';
type Category = { id: string; name: string; description?: string; defaultPriority?: Ticket['priority'] };
type CurrentUser = { id: string; name: string; email: string; role: 'User' | 'Agent' | 'Admin' };
type Agent = { id: string; name: string; email: string };
type ManagedUser = Agent & { role: 'User'|'Agent'|'Admin'; isActive: boolean; createdAt: string };
type Summary = { total: number; byStatus: Array<{ _id: string; count: number }>; byPriority: Array<{ _id: string; count: number }>; slaBreaches: number };
type ActivityEvent = { id: string; action: string; createdAt: string; performedBy: { name?: string } | string; ticket: { ticketNumber?: string; title?: string } | string };
type Workspace = {
  tickets: Ticket[]; setTickets: Dispatch<SetStateAction<Ticket[]>>;
  profiles: Record<Role, Profile>; setProfile: (role: Role, profile: Profile) => void;
  mode: 'preview' | 'live'; currentUser: CurrentUser | null; categories: Category[]; managedCategories: Array<Category & {isActive:boolean}>; agents: Agent[]; managedUsers: ManagedUser[]; summary: Summary | null; activities: ActivityEvent[];
  state: LoadState; reload: (fail?: boolean) => void; reset: () => void;
  createAttachment: (file: File) => Attachment; releaseAttachment: (url: string) => void;
};
const Context = createContext<Workspace | null>(null);
function mapAttachments(value:unknown):Attachment[] {
  if(!Array.isArray(value)) return [];
  return value.filter((item):item is Record<string,unknown>=>Boolean(item)&&typeof item==='object').map(item=>({id:String(item.id??item.attachmentId??''),name:String(item.name??'Attachment'),size:Number(item.size??0),url:String(item.url??''),mimeType:typeof item.mimeType==='string'?item.mimeType:undefined})).filter(item=>item.id&&item.url);
}

export function PreviewProvider({ children }: { children: ReactNode }) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [profiles, setProfiles] = useState(initialProfiles);
  const [state, setState] = useState<LoadState>('loading');
  const [mode, setMode] = useState<'preview'|'live'>('preview');
  const [currentUser, setCurrentUser] = useState<CurrentUser|null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [managedCategories, setManagedCategories] = useState<Array<Category & {isActive:boolean}>>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [managedUsers, setManagedUsers] = useState<ManagedUser[]>([]);
  const [summary, setSummary] = useState<Summary|null>(null);
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const urls = useRef(new Set<string>());
  const reload = useCallback((fail = false) => {
    if (timer.current) clearTimeout(timer.current);
    setState('loading');
    timer.current = setTimeout(async () => {
      if (fail) { setState('error'); return; }
      try {
        const sessionResponse = await fetch('/api/auth/session', { cache: 'no-store' });
        const session = await sessionResponse.json() as { user?: { id?: string; name?: string; email?: string; role?: CurrentUser['role'] } };
        if (session.user?.id && session.user.name && session.user.email && session.user.role) {
          const profileResponse = await fetch('/api/profile', { cache: 'no-store' });
          if (!profileResponse.ok) throw new Error('Could not load your profile.');
          const profileJson = await profileResponse.json() as { user: CurrentUser };
          const liveUser = profileJson.user;
          const roleKey: Role = liveUser.role === 'Admin' ? 'admin' : liveUser.role === 'Agent' ? 'agent' : 'user';
          const [ticketResponse, categoryResponse, summaryResponse, activityResponse, teamResponse, usersResponse, adminCategoryResponse] = await Promise.all([
            fetch('/api/tickets?limit=50&sort=updated', { cache: 'no-store' }),
            fetch('/api/categories', { cache: 'no-store' }),
            fetch('/api/dashboard', { cache: 'no-store' }),
            fetch('/api/activity', { cache: 'no-store' }),
            liveUser.role === 'Admin' ? fetch('/api/team', { cache: 'no-store' }) : Promise.resolve(null),
            liveUser.role === 'Admin' ? fetch('/api/admin/users', { cache: 'no-store' }) : Promise.resolve(null),
            liveUser.role === 'Admin' ? fetch('/api/admin/categories', { cache: 'no-store' }) : Promise.resolve(null),
          ]);
          if (!ticketResponse.ok || !categoryResponse.ok || !summaryResponse.ok || !activityResponse.ok || (teamResponse && !teamResponse.ok) || (usersResponse && !usersResponse.ok) || (adminCategoryResponse && !adminCategoryResponse.ok)) throw new Error('Could not load your workspace data.');
          const ticketJson = await ticketResponse.json() as { tickets: Array<Record<string, unknown>> };
          const categoryJson = await categoryResponse.json() as { categories: Category[] };
          const summaryJson = await summaryResponse.json() as Summary;
          const activityJson = await activityResponse.json() as { events: ActivityEvent[] };
          const teamJson = teamResponse ? await teamResponse.json() as { agents: Agent[] } : { agents: [] };
          const usersJson = usersResponse ? await usersResponse.json() as { users: ManagedUser[] } : { users: [] };
          const adminCategoryJson = adminCategoryResponse ? await adminCategoryResponse.json() as { categories: Array<Category & {isActive:boolean}> } : { categories: [] };
          const liveTickets = ticketJson.tickets.map((item): Ticket => {
            const category = item.category as { name?: string } | string;
            const requester = item.createdBy as { name?: string } | string;
            const agent = item.assignedAgent as { name?: string } | string | null;
            const messages = Array.isArray(item.messages) ? item.messages as Array<Record<string, unknown>> : [];
            const ticketAttachments=mapAttachments(item.attachments);
            const replies=messages.map(message => {
              const author = message.author as { name?: string } | string;
              return { id: String(message.id), body: String(message.body), author: typeof author === 'string' ? author : author?.name ?? 'Team', isInternal: message.isInternal === true, attachments: mapAttachments(message.attachments), at: message.createdAt ? new Date(String(message.createdAt)).getTime() : Date.now() };
            });
            return {
              id: String(item.ticketNumber ?? item.id), recordId: String(item.id), title: String(item.title), description: String(item.description),
              category: typeof category === 'string' ? category : category?.name ?? 'Technical Support',
              priority: item.priority as Ticket['priority'], status: item.status as Ticket['status'],
              requester: typeof requester === 'string' ? requester : requester?.name ?? 'Customer',
              agent: !agent ? 'Unassigned' : typeof agent === 'string' ? agent : agent.name ?? 'Assigned agent',
              requesterRole: 'user', messages: [],
              attachmentCount: Number(item.attachmentCount ?? ticketAttachments.length+replies.reduce((count,message)=>count+message.attachments.length,0)),
              createdAt: item.createdAt ? new Date(String(item.createdAt)).getTime() : Date.now(),
              responseDueAt: item.responseDueAt ? new Date(String(item.responseDueAt)).getTime() : undefined,
              resolutionDueAt: item.resolutionDueAt ? new Date(String(item.resolutionDueAt)).getTime() : undefined,
              firstRespondedAt: item.firstRespondedAt ? new Date(String(item.firstRespondedAt)).getTime() : undefined,
              resolvedAt: item.resolvedAt ? new Date(String(item.resolvedAt)).getTime() : undefined,
              attachments: ticketAttachments, replies,
            };
          });
          setMode('live'); setCurrentUser(liveUser); setCategories(categoryJson.categories); setManagedCategories(adminCategoryJson.categories); setAgents(teamJson.agents); setManagedUsers(usersJson.users); setSummary(summaryJson); setActivities(activityJson.events); setTickets(liveTickets);
          setProfiles(current => ({ ...current, [roleKey]: { ...current[roleKey], name: liveUser.name, email: liveUser.email, title: '' } }));
        } else throw new Error('Please sign in to load your workspace.');
        setState('ready');
      } catch { setState('error'); }
    }, 250);
  }, []);
  useEffect(() => {
    const objectUrls = urls.current;
    const start = setTimeout(() => reload(), 0);
    return () => {
      clearTimeout(start);
      if (timer.current) clearTimeout(timer.current);
      objectUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [reload]);
  function reset() {
    urls.current.forEach(url => URL.revokeObjectURL(url)); urls.current.clear();
    setProfiles(initialProfiles); setTickets([]); reload();
  }
  function createAttachment(file: File) {
    const url = URL.createObjectURL(file); urls.current.add(url);
    return { id: crypto.randomUUID(), name: file.name, size: file.size, url, file, mimeType:file.type };
  }
  function releaseAttachment(url: string) { URL.revokeObjectURL(url); urls.current.delete(url); }
  return <Context.Provider value={{ tickets, setTickets, profiles, state, reload, reset, mode, currentUser, categories, managedCategories, agents, managedUsers, summary, activities,
    setProfile: (role, profile) => setProfiles(current => ({ ...current, [role]: profile })),
    createAttachment, releaseAttachment }}>{children}</Context.Provider>;
}
export function usePreview() {
  const value = useContext(Context);
  if (!value) throw new Error('Preview workspace provider is required.');
  return value;
}
