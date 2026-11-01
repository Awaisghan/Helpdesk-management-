import { z } from 'zod';
import { requireRole } from '@/lib/authorization';
import { ApiError, apiError } from '@/lib/api-response';
import { connectToDatabase } from '@/lib/db/connect';
import { UserModel } from '@/models';

const roleSchema = z.object({ role: z.enum(['User','Agent']) }).strict();

export async function GET() {
  try {
    await requireRole('Admin');
    await connectToDatabase();
    const users = await UserModel.find({}).select('name email role isActive createdAt').sort({ createdAt: -1 }).limit(200).lean();
    return Response.json({ users: users.map(user => ({ id: String(user._id), name: user.name, email: user.email, role: user.role, isActive: user.isActive, createdAt: user.createdAt })) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return apiError(error); }
}

export async function PATCH(request: Request) {
  try {
    await requireRole('Admin');
    const userId = new URL(request.url).searchParams.get('userId');
    if (!userId || !/^[a-f\d]{24}$/i.test(userId)) throw new ApiError(404, 'User not found.');
    const input = roleSchema.parse(await request.json());
    await connectToDatabase();
    const target = await UserModel.findById(userId).select('role isActive').lean();
    if (!target) throw new ApiError(404, 'User not found.');
    if (target.role === 'Admin') throw new ApiError(409, 'Admin accounts are protected from promotion changes here.');
    const updated = await UserModel.findByIdAndUpdate(userId, { $set: { role: input.role } }, { new: true, runValidators: true }).select('name email role isActive createdAt').lean();
    if (!updated) throw new ApiError(404, 'User not found.');
    return Response.json({ user: { id: String(updated._id), name: updated.name, email: updated.email, role: updated.role, isActive: updated.isActive, createdAt: updated.createdAt } }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return apiError(error); }
}
