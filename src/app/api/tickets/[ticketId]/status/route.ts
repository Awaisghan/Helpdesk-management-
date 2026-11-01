import { requireActor } from '@/lib/authorization';
import { apiError } from '@/lib/api-response';
import { connectToDatabase } from '@/lib/db/connect';
import { jsonNoStore } from '@/lib/http';
import { updateTicketStatus } from '@/lib/services/tickets';
import { statusSchema } from '@/lib/validation/tickets';
export async function PATCH(request:Request,{params}:{params:Promise<{ticketId:string}>}) {
  try { const actor=await requireActor(); const {ticketId}=await params; const body=statusSchema.parse(await request.json()); await connectToDatabase(); return jsonNoStore({ticket:await updateTicketStatus(actor,ticketId,body)}); }
  catch(error) { return apiError(error); }
}
