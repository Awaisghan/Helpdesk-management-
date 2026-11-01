import { model, models, Schema, type InferSchemaType } from 'mongoose';

const userSchema = new Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254, index: true },
  hashedPassword: { type: String, required: true, select: false },
  role: { type: String, enum: ['User', 'Agent', 'Admin'], default: 'User', required: true, index: true },
  isActive: { type: Boolean, default: true, required: true },
}, { timestamps: true, strict: 'throw' });
export type UserRecord = InferSchemaType<typeof userSchema>;
export const UserModel = models.User ?? model('User', userSchema);
