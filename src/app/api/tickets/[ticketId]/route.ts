import { requireActor } from '@/lib/authorization';
import { apiError } from '@/lib/api-response';
import { connectToDatabase } from '@/lib/db/connect';
import { jsonNoStore } from '@/lib/http';
import { getTicket } from '@/lib/services/tickets';
export async function GET(_request:Request,{params}:{params:Promise<{ticketId:string}>}) {
  try { const actor=await requireActor(); const {ticketId}=await params; await connectToDatabase(); return jsonNoStore({ticket:await getTicket(actor,ticketId)}); }
  catch(error) { return apiError(error); }
}
