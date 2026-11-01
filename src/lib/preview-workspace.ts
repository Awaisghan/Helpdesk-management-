import { previewTickets, type Ticket } from './preview-data';

export const roles = ['user', 'agent', 'admin'] as const;
export type Role = (typeof roles)[number];
export type Profile = { name: string; email: string; title: string; notifications: boolean };
export const profiles: Record<Role, Profile> = {
  user: { name: 'Olivia Rhye', email: 'olivia@example.com', title: 'Product designer', notifications: true },
  agent: { name: 'Sarah Ahmed', email: 'sarah@example.com', title: 'Customer support specialist', notifications: true },
  admin: { name: 'Alex Morgan', email: 'alex@example.com', title: 'Support operations lead', notifications: true },
};
export const roleNames: Record<Role, string> = { user: 'User', agent: 'Agent', admin: 'Admin' };
export function isRole(value: string): value is Role { return roles.some(role => role === value); }
export const slaHours = { Low: [24, 72], Medium: [8, 48], High: [4, 24], Urgent: [1, 8] } as const;
export function deadlines(priority: Ticket['priority'], now: number) {
  const [response, resolution] = slaHours[priority];
  return { responseDueAt: now + response * 3_600_000, resolutionDueAt: now + resolution * 3_600_000 };
}
export function makePreviewTickets(now: number): Ticket[] {
  return previewTickets.map((ticket, index) => {
    const createdAt = now - (index === 0 ? 5 : index === 1 ? 2 : 1) * 3_600_000;
    return {
      ...ticket, ...deadlines(ticket.priority, createdAt), createdAt,
      firstRespondedAt: ticket.messages.length ? createdAt + 25 * 60_000 : undefined,
      resolvedAt: ['Resolved', 'Closed'].includes(ticket.status) ? now - 20 * 60_000 : undefined,
      replies: [], attachments: [],
      activity: [{ id: `created-${ticket.id}`, body: `${ticket.requester} created this ticket`, at: createdAt }],
    };
  });
}
// Presentation scoping only. Part 2 must enforce permissions in server APIs.
export function visibleTickets(tickets: Ticket[], role: Role) {
  if (role === 'user') return tickets.filter(t => (t.requesterRole === 'user') || t.requester === profiles.user.name);
  if (role === 'agent') return tickets.filter(t => t.agent === profiles.agent.name);
  return tickets;
}
