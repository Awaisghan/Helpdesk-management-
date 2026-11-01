import { requireActor } from '@/lib/authorization';
import { apiError } from '@/lib/api-response';
import { connectToDatabase } from '@/lib/db/connect';
import { jsonNoStore } from '@/lib/http';
import { createReply } from '@/lib/services/tickets';
import { replySchema } from '@/lib/validation/tickets';
import { uploadAuthenticatedFiles, deleteAuthenticatedFiles, readAttachmentForm } from '@/lib/attachments';
import { reserveTicketAttachmentSlots, releaseTicketAttachmentSlots } from '@/lib/services/tickets';
import { ApiError } from '@/lib/api-response';
import type { StoredAttachment } from '@/lib/attachments';
export async function POST(request:Request,{params}:{params:Promise<{ticketId:string}>}) {
  try {
    const actor=await requireActor(); const {ticketId}=await params;
    let input:ReturnType<typeof replySchema.parse>; let files:File[]=[];
    if(request.headers.get('content-type')?.includes('multipart/form-data')) {
      const parsed=await readAttachmentForm(request); files=parsed.files;
      const internal=parsed.form.get('isInternal');
      input=replySchema.parse({body:parsed.form.get('body'),...(internal!==null?{isInternal:internal==='true'?true:internal==='false'?false:internal}:{})});
    } else input=replySchema.parse(await request.json());
    if(actor.role==='user'&&input.isInternal) throw new ApiError(403,'Customers cannot create internal notes.');
    await connectToDatabase();
    let reserved=false; let uploaded:StoredAttachment[]=[];
    try {
      if(files.length) { await reserveTicketAttachmentSlots(actor,ticketId,files.length); reserved=true; }
      uploaded=await uploadAuthenticatedFiles(files,actor.id,ticketId);
      return jsonNoStore({message:await createReply(actor,ticketId,input,uploaded)},{status:201});
    } catch(error) {
      await deleteAuthenticatedFiles(uploaded);
      if(reserved) await releaseTicketAttachmentSlots(actor,ticketId,files.length);
      throw error;
    }
  }
  catch(error) { return apiError(error); }
}
