import { model, models, Schema } from 'mongoose';
const logSchema = new Schema({
  ticket: { type: Schema.Types.ObjectId, ref: 'Ticket', required: true, immutable: true, index: true },
  performedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
  action: { type: String, required: true, maxlength: 120 },
  oldValue: { type: Schema.Types.Mixed, default: null }, newValue: { type: Schema.Types.Mixed, default: null },
}, { timestamps: { createdAt: true, updatedAt: false }, strict: 'throw' });
logSchema.index({ ticket: 1, createdAt: -1 });
export const ActivityLogModel = models.ActivityLog ?? model('ActivityLog', logSchema);
