import mongoose from 'mongoose';
import nextEnv from '@next/env';

nextEnv.loadEnvConfig(process.cwd());

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('Set MONGODB_URI in your local environment first.');
  process.exit(1);
}

const categorySchema = new mongoose.Schema({
  name: { type: String, unique: true },
  description: String,
  defaultPriority: { type: String, enum: ['Low', 'Medium', 'High', 'Urgent'] },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });
const Category = mongoose.models.Category ?? mongoose.model('Category', categorySchema);
const oldNames = ['Account access', 'Billing', 'Technical support', 'General inquiry'];
const newCategories = [
  ['Bug Report', 'Unexpected behavior, errors, crashes, or broken features.', 'High'],
  ['Feature Request', 'Ideas for new capabilities or improvements to the software.', 'Low'],
  ['Technical Support', 'Setup, integrations, configuration, and troubleshooting help.', 'Medium'],
  ['Account & Access', 'Login, permissions, invitations, and workspace access.', 'High'],
];

try {
  await mongoose.connect(uri, { dbName: 'helpdesk_db', serverSelectionTimeoutMS: 10_000, bufferCommands: false });
  const retired = await Category.updateMany({ name: { $in: oldNames } }, { $set: { isActive: false } });
  for (const [name, description, defaultPriority] of newCategories) {
    await Category.updateOne(
      { name },
      { $set: { description, defaultPriority, isActive: true }, $setOnInsert: { name } },
      { upsert: true },
    );
  }
  console.log(`CodxPy categories are active. Retired ${retired.modifiedCount} starter categories; ticket history remains linked.`);
} catch (error) {
  const code = error && typeof error === 'object' && 'code' in error && /^[A-Z0-9_]+$/.test(String(error.code)) ? ` (${error.code})` : '';
  console.error(`Category update failed${code}. Check the local MongoDB connection and retry.`);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
