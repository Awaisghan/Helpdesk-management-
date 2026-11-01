export type Status = 'Open' | 'In Progress' | 'Waiting on User' | 'Resolved' | 'Closed';
export type Attachment = { id: string; name: string; size: number; url: string; file?: File; mimeType?: string };
export type PreviewReply = { id: string; body: string; author: string; isInternal: boolean; attachments: Attachment[]; at: number };
export type TicketEvent = { id: string; body: string; at: number };
export type Ticket = { id: string; recordId?: string; title: string; description: string; category: string; priority: 'Low' | 'Medium' | 'High' | 'Urgent'; status: Status; requester: string; agent: string; messages: string[];
  requesterRole?: 'user' | 'agent' | 'admin';
  createdAt?: number; responseDueAt?: number; resolutionDueAt?: number;
  attachmentCount?: number;
  firstRespondedAt?: number; resolvedAt?: number;
  replies?: PreviewReply[]; attachments?: Attachment[]; activity?: TicketEvent[];
};
// UI fixtures only. Replace this boundary with authorized server data in Part 2.
export const previewTickets: Ticket[] = [
  { id: 'TKT-1028', title: 'Unable to access the team workspace', description: 'I receive an access error when opening our shared workspace. Could you help restore access?', category: 'Account & Access', priority: 'High', status: 'Open', requester: 'Olivia Rhye', agent: 'Sarah Ahmed', messages: [] },
  { id: 'TKT-1027', title: 'Export crashes for large projects', description: 'The project export returns an error when it contains a large number of records.', category: 'Bug Report', priority: 'Urgent', status: 'In Progress', requester: 'Phoenix Baker', agent: 'Ali Hassan', messages: ['Thanks for flagging this. We are investigating the export error.'] },
  { id: 'TKT-1026', title: 'Help connecting the workspace API', description: 'Could you help us configure API access for our internal reporting tool?', category: 'Technical Support', priority: 'Medium', status: 'In Progress', requester: 'Lana Steiner', agent: 'Sarah Ahmed', messages: [] },
  { id: 'TKT-1025', title: 'Request a weekly ticket digest', description: 'It would help our team to receive a weekly email summary of ticket activity.', category: 'Feature Request', priority: 'Low', status: 'Waiting on User', requester: 'Demi Wilkinson', agent: 'Ali Hassan', messages: ['Could you share which details you would like included in the digest?'] },
  { id: 'TKT-1024', title: 'Password reset link has expired', description: 'My password reset link no longer works.', category: 'Account & Access', priority: 'Medium', status: 'Resolved', requester: 'Drew Cano', agent: 'Sarah Ahmed', messages: ['A new reset link has been sent. Please try it again.'] },
  { id: 'TKT-1023', title: 'Add bulk export for project reports', description: 'Please consider adding a way to export several project reports together.', category: 'Feature Request', priority: 'Low', status: 'Closed', requester: 'Natali Craig', agent: 'Ali Hassan', messages: ['Thanks for the suggestion. We have added it to the product feedback list.'] },
];
export const categories = ['Account & Access', 'Bug Report', 'Feature Request', 'Technical Support'];
export const volume = [ {day:'Mon',created:24,resolved:18}, {day:'Tue',created:38,resolved:28}, {day:'Wed',created:30,resolved:24}, {day:'Thu',created:49,resolved:36}, {day:'Fri',created:42,resolved:32}, {day:'Sat',created:57,resolved:45}, {day:'Sun',created:48,resolved:39} ];
