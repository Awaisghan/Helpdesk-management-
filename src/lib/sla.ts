import { CounterModel, SlaRuleModel } from '@/models';
import { ApiError } from './api-response';
const fallback = { Low: [24,72], Medium: [8,48], High: [4,24], Urgent: [1,8] } as const;
export async function slaDeadlines(priority: keyof typeof fallback, createdAt = new Date()) {
  const rules = await SlaRuleModel.findOne({ priority }).lean();
  const [responseHours,resolutionHours] = rules ? [rules.firstResponseHours, rules.resolutionHours] : fallback[priority];
  return { responseDueAt: new Date(createdAt.getTime() + responseHours * 3_600_000), resolutionDueAt: new Date(createdAt.getTime() + resolutionHours * 3_600_000) };
}
export async function nextTicketNumber() {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const counter = await CounterModel.findOneAndUpdate({ name: 'ticket' }, { $inc: { value: 1 } }, { upsert: true, new: true, setDefaultsOnInsert: true });
      if (!counter) throw new Error('Ticket counter did not return a value.');
      return `TKT-${String(counter.value).padStart(4,'0')}`;
    } catch (error) {
      if (attempt === 4) throw error;
    }
  }
  throw new ApiError(500, 'A ticket number could not be generated.');
}
