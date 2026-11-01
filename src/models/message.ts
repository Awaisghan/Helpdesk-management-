import { model, models, Schema } from 'mongoose';
const attachmentSchema = new Schema({
  attachmentId: { type: String, required: true, maxlength: 64 }, publicId: { type: String, required: true, maxlength: 255 }, name: { type: String, required: true, maxlength: 255 },
  format: { type: String, enum: ['png','jpg','jpeg','pdf'], required: true },
  mimeType: { type: String, required: true, maxlength: 100 }, size: { type: Number, required: true, min: 1, max: 5 * 1024 * 1024 },
  resourceType: { type: String, enum: ['image', 'raw'], required: true },
}, { _id: false, strict: 'throw' });
const messageSchema = new Schema({
  ticket: { type: Schema.Types.ObjectId, ref: 'Ticket', required: true, immutable: true, index: true },
  author: { type: Schema.Types.ObjectId, ref: 'User', required: true, immutable: true, index: true },
  body: { type: String, required: true, trim: true, minlength: 1, maxlength: 5000 },
  attachments: { type: [attachmentSchema], default: [], validate: { validator: (files: unknown[]) => files.length <= 3, message: 'A reply can contain at most 3 attachments.' } },
  isInternal: { type: Boolean, default: false, required: true, index: true },
}, { timestamps: true, strict: 'throw' });
messageSchema.index({ ticket: 1, isInternal: 1, createdAt: 1 });
export const MessageModel = models.Message ?? model('Message', messageSchema);
