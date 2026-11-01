import { TicketModel, UserModel } from '@/models';
import { sendTicketEmail } from '@/lib/email';

const ACTIVE_STATUSES = ['Open', 'In Progress', 'Waiting on User'];
const REMINDER_WINDOW = 24 * 60 * 60 * 1000;
const MIN_REMINDER_LEAD = 15 * 60 * 1000;
const AUTO_CLOSE_AFTER = 7 * 24 * 60 * 60 * 1000;
const BATCH_SIZE = 500;

type ReminderKind = 'response' | 'resolution';
type TicketForReminder = {
  _id: unknown;
  ticketNumber: string;
  title: string;
  createdBy: unknown;
  assignedAgent: unknown;
  createdAt: Date;
  responseDueAt: Date;
  resolutionDueAt: Date;
};

function reminderLead(dueAt: Date, createdAt: Date) {
  const slaDuration = Math.max(0, dueAt.getTime() - createdAt.getTime());
  return Math.min(REMINDER_WINDOW, Math.max(MIN_REMINDER_LEAD, slaDuration * 0.25));
}

async function reminderRecipient(ticket: TicketForReminder) {
  if (ticket.assignedAgent) {
    const agent = await UserModel.findOne({ _id: ticket.assignedAgent, role: 'Agent', isActive: true }).select('email').lean();
    if (agent?.email) return agent.email;
  }
  const admin = await UserModel.findOne({ role: 'Admin', isActive: true }).sort({ createdAt: 1 }).select('email').lean();
  return admin?.email ?? null;
}

async function sendSlaReminders(kind: ReminderKind, now: Date) {
  const isResponse = kind === 'response';
  const dueField = isResponse ? 'responseDueAt' : 'resolutionDueAt';
  const completionField = isResponse ? 'firstRespondedAt' : 'resolvedAt';
  const sentField = isResponse ? 'responseReminderSentAt' : 'resolutionReminderSentAt';
  const event = isResponse ? 'sla-response-reminder' : 'sla-resolution-reminder';
  const candidates = await TicketModel.find({
    status: { $in: ACTIVE_STATUSES },
    [completionField]: null,
    [sentField]: null,
    [dueField]: { $lte: new Date(now.getTime() + REMINDER_WINDOW) },
  }).select(`ticketNumber title createdBy assignedAgent createdAt ${dueField}`).sort({ [dueField]: 1 }).limit(BATCH_SIZE).lean() as unknown as TicketForReminder[];
  let sent = 0;
  let failed = 0;

  for (const ticket of candidates) {
    const dueAt = ticket[dueField];
    if (dueAt.getTime() > now.getTime() + reminderLead(dueAt, ticket.createdAt)) continue;
    const to = await reminderRecipient(ticket);
    if (!to) continue;

    const claim = await TicketModel.updateOne({
      _id: ticket._id,
      status: { $in: ACTIVE_STATUSES },
      [completionField]: null,
      [sentField]: null,
    }, { $set: { [sentField]: now } });
    if (claim.modifiedCount !== 1) continue;

    const delivered = await sendTicketEmail(to, event, {
      ticketNumber: ticket.ticketNumber,
      title: ticket.title,
      dueAt,
      overdue: dueAt.getTime() <= now.getTime(),
    });
    if (delivered) sent++;
    else {
      failed++;
      await TicketModel.updateOne({ _id: ticket._id, [sentField]: now }, { $set: { [sentField]: null } });
    }
  }
  return { sent, failed, examined: candidates.length };
}

export async function runSlaAutomation(now = new Date()) {
  const responseReminders = await sendSlaReminders('response', now);
  const resolutionReminders = await sendSlaReminders('resolution', now);
  const cutoff = new Date(now.getTime() - AUTO_CLOSE_AFTER);
  const eligible = await TicketModel.find({ status: 'Resolved', resolvedAt: { $lte: cutoff } }).select('_id resolvedAt').sort({ resolvedAt: 1 }).limit(BATCH_SIZE).lean();
  let autoClosed = 0;
  for (const ticket of eligible) {
    const result = await TicketModel.updateOne(
      { _id: ticket._id, status: 'Resolved', resolvedAt: { $lte: cutoff } },
      { $set: { status: 'Closed', closedAt: now } },
    );
    autoClosed += result.modifiedCount;
  }
  return {
    responseReminders,
    resolutionReminders,
    autoClosed,
    autoCloseDays: 7,
  };
}
