import { requireUser } from '@/lib/authorization';
import { connectToDatabase } from '@/lib/db/connect';
import { apiError, ApiError } from '@/lib/api-response';
import { safeUser } from '@/lib/format';
import { profileSchema } from '@/lib/validation/tickets';
import { UserModel } from '@/models';
export async function GET() {
  try { const actor = await requireUser(); await connectToDatabase(); const user = await UserModel.findById(actor.id).lean(); if (!user?.isActive) throw new ApiError(401,'Please sign in to continue.'); return Response.json({user:safeUser(user)}); }
  catch(error) { return apiError(error); }
}
export async function PATCH(request: Request) {
  try { const actor = await requireUser(); const input = profileSchema.parse(await request.json()); await connectToDatabase(); const user = await UserModel.findOneAndUpdate({_id:actor.id,isActive:true},{$set:{name:input.name,email:input.email}},{new:true,runValidators:true}).lean(); if(!user) throw new ApiError(404,'Account not found.'); return Response.json({user:safeUser(user)}); }
  catch(error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 11000) return Response.json({error:'That email address is already in use.'},{status:409});
    return apiError(error);
  }
}
