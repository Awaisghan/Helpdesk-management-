import { requireActor } from '@/lib/authorization';
import { apiError } from '@/lib/api-response';
import { connectToDatabase } from '@/lib/db/connect';
import { jsonNoStore } from '@/lib/http';
import { createTicket, listTickets } from '@/lib/services/tickets';
import { createTicketSchema, querySchema } from '@/lib/validation/tickets';
import { uploadAuthenticatedFiles, deleteAuthenticatedFiles, readAttachmentForm } from '@/lib/attachments';
import { ApiError } from '@/lib/api-response';
import { randomUUID } from 'node:crypto';
import type { StoredAttachment } from '@/lib/attachments';
export async function GET(request:Request) {
  try { const actor=await requireActor(); const query=querySchema.parse(Object.fromEntries(new URL(request.url).searchParams)); await connectToDatabase(); return jsonNoStore(await listTickets(actor,query)); }
  catch(error) { return apiError(error); }
}
export async function POST(request:Request) {
  try {
    const actor=await requireActor();
    let input:ReturnType<typeof createTicketSchema.parse>;
    let files:File[]=[];
    if(request.headers.get('content-type')?.includes('multipart/form-data')) {
      const parsed=await readAttachmentForm(request); files=parsed.files;
      const body={title:parsed.form.get('title'),description:parsed.form.get('description'),category:parsed.form.get('category'),...(parsed.form.get('priority')?{priority:parsed.form.get('priority')}: {})};
      input=createTicketSchema.parse(body);
    } else input=createTicketSchema.parse(await request.json());
    if(actor.role==='agent') throw new ApiError(403,'Agents cannot create customer tickets.');
    await connectToDatabase();
    let uploaded:StoredAttachment[]=[];
    try {
      uploaded=await uploadAuthenticatedFiles(files,actor.id,randomUUID());
      return jsonNoStore({ticket:await createTicket(actor,input,uploaded)},{status:201});
    } catch(error) { await deleteAuthenticatedFiles(uploaded); throw error; }
  }
  catch(error) { return apiError(error); }
}
