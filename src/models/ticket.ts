import { model, models, Schema } from 'mongoose';
const priorityValues = ['Low', 'Medium', 'High', 'Urgent'] as const;
const statusValues = ['Open', 'In Progress', 'Waiting on User', 'Resolved', 'Closed'] as const;
const attachmentSchema = new Schema({
  attachmentId: { type: String, required: true, maxlength: 64 },
  publicId: { type: String, required: true, maxlength: 255 },
  name: { type: String, required: true, maxlength: 255 },
  format: { type: String, enum: ['png','jpg','jpeg','pdf'], required: true },
  mimeType: { type: String, required: true, maxlength: 100 },
  size: { type: Number, required: true, min: 1, max: 5 * 1024 * 1024 },
  resourceType: { type: String, enum: ['image', 'raw'], required: true },
}, { _id: false, strict: 'throw' });
const ticketSchema = new Schema({
  ticketNumber: { type: String, required: true, unique: true, immutable: true, index: true },
  title: { type: String, required: true, trim: true, minlength: 5, maxlength: 140 },
  description: { type: String, required: true, trim: true, minlength: 10, maxlength: 5000 },
  category: { type: Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
  priority: { type: String, enum: priorityValues, required: true, index: true },
  status: { type: String, enum: statusValues, default: 'Open', required: true, index: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true, immutable: true },
  assignedAgent: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  attachments: { type: [attachmentSchema], default: [], validate: { validator: (files: unknown[]) => files.length <= 3, message: 'A ticket can contain at most 3 attachments.' } },
  attachmentCount: { type: Number, default: 0, min: 0, max: 3, required: true },
  responseDueAt: { type: Date, required: true, index: true }, resolutionDueAt: { type: Date, required: true, index: true },
  firstRespondedAt: { type: Date, default: null }, resolvedAt: { type: Date, default: null }, closedAt: { type: Date, default: null },
}, { timestamps: true, strict: 'throw' });
ticketSchema.index({ createdBy: 1, updatedAt: -1 });
ticketSchema.index({ assignedAgent: 1, status: 1, updatedAt: -1 });
ticketSchema.index({ status: 1, priority: -1, createdAt: -1 });
export const TicketModel = models.Ticket ?? model('Ticket', ticketSchema);
export const PRIORITIES = priorityValues;
export const STATUSES = statusValues;
