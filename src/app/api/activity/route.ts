import { requireActor } from '@/lib/authorization';
import { apiError } from '@/lib/api-response';
import { connectToDatabase } from '@/lib/db/connect';
import { jsonNoStore } from '@/lib/http';
import { recentActivity } from '@/lib/services/tickets';

export async function GET() {
  try { const actor=await requireActor(); await connectToDatabase(); return jsonNoStore({events:await recentActivity(actor)}); }
  catch(error) { return apiError(error); }
}
