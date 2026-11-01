import { model, models, Schema } from 'mongoose';
const ruleSchema = new Schema({
  priority: { type: String, enum: ['Low', 'Medium', 'High', 'Urgent'], unique: true, required: true },
  firstResponseHours: { type: Number, required: true, min: 1, max: 720 },
  resolutionHours: { type: Number, required: true, min: 1, max: 2160 },
}, { timestamps: true, strict: 'throw' });
export const SlaRuleModel = models.SlaRule ?? model('SlaRule', ruleSchema);
