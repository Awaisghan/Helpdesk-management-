import { model, models, Schema } from 'mongoose';
const counterSchema = new Schema({ name: { type: String, required: true }, value: { type: Number, default: 0, required: true } }, { versionKey: false });
counterSchema.index({ name: 1 }, { unique: true });
export const CounterModel = models.Counter ?? model('Counter', counterSchema);
