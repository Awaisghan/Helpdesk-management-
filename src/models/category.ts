import { model, models, Schema } from 'mongoose';
const categorySchema = new Schema({
  name: { type: String, required: true, unique: true, trim: true, minlength: 2, maxlength: 60 },
  description: { type: String, default: '', maxlength: 500 },
  defaultPriority: { type: String, enum: ['Low', 'Medium', 'High', 'Urgent'], default: 'Medium' },
  isActive: { type: Boolean, default: true },
}, { timestamps: true, strict: 'throw' });
export const CategoryModel = models.Category ?? model('Category', categorySchema);
