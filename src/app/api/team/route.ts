import { requireRole } from '@/lib/authorization';
import { apiError } from '@/lib/api-response';
import { connectToDatabase } from '@/lib/db/connect';
import { UserModel } from '@/models';

export async function GET() {
  try {
    await requireRole('Admin');
    await connectToDatabase();
    const agents = await UserModel.find({ role: 'Agent', isActive: true }).select('name email').sort({ name: 1 }).lean();
    return Response.json({ agents: agents.map(agent => ({ id: String(agent._id), name: agent.name, email: agent.email })) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return apiError(error); }
}
