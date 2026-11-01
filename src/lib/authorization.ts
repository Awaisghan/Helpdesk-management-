import { auth } from '@/lib/auth';
import type { Role } from '@/lib/preview-workspace';
import type { Actor } from '@/lib/services/tickets';
import { connectToDatabase } from './db/connect';
import { UserModel } from '@/models';
import { ApiError } from './api-response';
export const roleValue = { User: 'user', Agent: 'agent', Admin: 'admin' } as const;
export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id || !session.user.role) throw new ApiError(401, 'Please sign in to continue.');
  await connectToDatabase();
  const current = await UserModel.findOne({ _id: session.user.id, isActive: true }).select('_id role name email').lean();
  if (!current || current.role !== session.user.role) throw new ApiError(401, 'Your account status changed. Please sign in again.');
  const role = current.role as 'User'|'Agent'|'Admin';
  return { id: String(current._id), email: current.email, name: current.name, role, roleKey: roleValue[role] as Role };
}
export async function requireActor(): Promise<Actor> {
  const user = await requireUser();
  return {id:user.id,name:user.name,email:user.email,role:user.roleKey};
}
export async function requireRole(...roles: Array<'User'|'Agent'|'Admin'>) {
  const user = await requireUser();
  if (!roles.includes(user.role)) throw new ApiError(403, 'You do not have permission to perform this action.');
  return user;
}
