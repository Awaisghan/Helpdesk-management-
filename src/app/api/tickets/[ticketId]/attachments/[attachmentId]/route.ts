import { requireActor } from '@/lib/authorization';
import { apiError, ApiError } from '@/lib/api-response';
import { connectToDatabase } from '@/lib/db/connect';
import { getAuthenticatedDownloadUrl } from '@/lib/attachments';
import { getAuthorizedAttachment } from '@/lib/services/tickets';

function contentDisposition(name:string) {
  const fallback=name.replace(/[^\x20-\x7e]/g,'_').replace(/["\\]/g,'_').slice(0,180)||'attachment';
  const encoded=encodeURIComponent(name).replace(/[!'()*]/g,char=>`%${char.charCodeAt(0).toString(16).toUpperCase()}`);
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}

export async function GET(_request:Request,{params}:{params:Promise<{ticketId:string;attachmentId:string}>}) {
  try {
    const actor=await requireActor(); const {ticketId,attachmentId}=await params;
    await connectToDatabase();
    const file=await getAuthorizedAttachment(actor,ticketId,attachmentId);
    const downloadUrl=await getAuthenticatedDownloadUrl(file);
    const upstream=await fetch(downloadUrl,{cache:'no-store',redirect:'follow'});
    if(!upstream.ok||!upstream.body) throw new ApiError(502,'The attachment could not be retrieved. Please try again.');
    return new Response(upstream.body,{status:200,headers:{
      'Content-Type':file.mimeType,
      'Content-Disposition':contentDisposition(file.name),
      'Content-Length':String(file.size),
      'Cache-Control':'private, no-store, max-age=0',
      'X-Content-Type-Options':'nosniff',
    }});
  } catch(error) { return apiError(error); }
}
