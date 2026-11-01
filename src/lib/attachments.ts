import { randomUUID } from 'node:crypto';
import { ApiError } from '@/lib/api-response';
import { cloudinary, configureCloudinary } from '@/lib/cloudinary';

export type StoredAttachment = {
  attachmentId: string;
  publicId: string;
  name: string;
  format: 'png'|'jpg'|'jpeg'|'pdf';
  mimeType: 'image/png'|'image/jpeg'|'application/pdf';
  size: number;
  resourceType: 'image'|'raw';
};
export type ClientAttachment = Omit<StoredAttachment,'publicId'|'resourceType'|'format'> & { id: string; url: string };

const MAX_FILE_SIZE=5*1024*1024;
const MAX_FILES=3;
const MAX_REQUEST_BYTES=MAX_FILES*MAX_FILE_SIZE+128*1024;
const accepted={
  png:{mime:'image/png',resourceType:'image',signature:[0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]},
  jpg:{mime:'image/jpeg',resourceType:'image',signature:[0xff,0xd8,0xff]},
  jpeg:{mime:'image/jpeg',resourceType:'image',signature:[0xff,0xd8,0xff]},
  pdf:{mime:'application/pdf',resourceType:'raw',signature:[0x25,0x50,0x44,0x46,0x2d]},
} as const;

export async function readAttachmentForm(request:Request) {
  const length=Number(request.headers.get('content-length')??0);
  if(Number.isFinite(length)&&length>MAX_REQUEST_BYTES) throw new ApiError(413,'The attachment request is larger than the allowed limit.');
  let form:FormData;
  try { form=await request.formData(); }
  catch { throw new ApiError(400,'The upload form could not be read.'); }
  const entries=form.getAll('files');
  if(entries.length>MAX_FILES) throw new ApiError(413,'You can attach up to 3 files to a ticket.');
  if(entries.some(entry=>typeof entry==='string')) throw new ApiError(400,'Invalid file upload.');
  return {form,files:entries as File[]};
}

export async function validateFiles(files: File[]) {
  if(files.length>MAX_FILES) throw new ApiError(413,'You can attach up to 3 files to a ticket.');
  const validated=[];
  for(const file of files) {
    if(file.size<1||file.size>MAX_FILE_SIZE) throw new ApiError(413,'Each attachment must be between 1 byte and 5 MB.');
    const format=file.name.split('.').pop()?.toLowerCase() as keyof typeof accepted|undefined;
    const spec=format?accepted[format]:undefined;
    if(!spec||file.type!==spec.mime) throw new ApiError(415,'Only PNG, JPG and PDF attachments are supported.');
    const prefix=new Uint8Array(await file.slice(0,spec.signature.length).arrayBuffer());
    if(!spec.signature.every((byte,index)=>prefix[index]===byte)) throw new ApiError(415,'The file contents do not match the selected file type.');
    const safeName=file.name.replace(/[\\/\u0000-\u001f\u007f]/g,'_').slice(0,255);
    validated.push({file,format:format as NonNullable<typeof format>,mimeType:spec.mime,resourceType:spec.resourceType,name:safeName,size:file.size});
  }
  return validated;
}

export async function uploadAuthenticatedFiles(files: File[], ownerId: string, scopeId: string): Promise<StoredAttachment[]> {
  if(files.length===0) return [];
  configureCloudinary();
  const validated=await validateFiles(files);
  const uploaded:StoredAttachment[]=[];
  try {
    for(const item of validated) {
      const publicId=`helpdesk/${ownerId}/${scopeId}/${randomUUID()}${item.format==='pdf'?'.pdf':''}`;
      const bytes=Buffer.from(await item.file.arrayBuffer());
      const response=await new Promise<{public_id:string;bytes:number;resource_type:string}>((resolve,reject)=>{
        cloudinary.uploader.upload_stream({
          public_id:publicId,
          resource_type:item.resourceType,
          type:'authenticated',
          overwrite:false,
          use_filename:false,
          unique_filename:false,
          filename_override:item.name,
          context:{original_name:item.name,mime_type:item.mimeType},
        },(error,result)=>error?reject(error):result?resolve(result):reject(new Error('CLOUDINARY_EMPTY_UPLOAD_RESPONSE'))).end(bytes);
      });
      uploaded.push({attachmentId:randomUUID(),publicId:response.public_id,name:item.name,format:item.format,mimeType:item.mimeType,size:response.bytes,resourceType:item.resourceType});
    }
    return uploaded;
  } catch(error) {
    await deleteAuthenticatedFiles(uploaded);
    if(error instanceof ApiError) throw error;
    const code=error&&typeof error==='object'&&'http_code' in error&&typeof error.http_code==='number'?String(error.http_code):'unknown';
    console.error('Cloudinary upload failed:',error instanceof Error?error.name:'Error',code);
    throw new ApiError(502,'Secure file storage could not save the attachment. Please retry.');
  }
}

export async function deleteAuthenticatedFiles(files: Pick<StoredAttachment,'publicId'|'resourceType'>[]) {
  if(!files.length) return;
  try {
    configureCloudinary();
    await Promise.all(files.map(file=>cloudinary.uploader.destroy(file.publicId,{resource_type:file.resourceType,type:'authenticated',invalidate:true})));
  } catch(error) {
    const code=error&&typeof error==='object'&&'http_code' in error&&typeof error.http_code==='number'?String(error.http_code):'unknown';
    console.error('Cloudinary cleanup failed:',error instanceof Error?error.name:'Error',code);
  }
}

export async function getAuthenticatedDownloadUrl(file: Pick<StoredAttachment,'publicId'|'resourceType'|'format'>) {
  configureCloudinary();
  return cloudinary.utils.private_download_url(file.publicId,file.format,{resource_type:file.resourceType,type:'authenticated',expires_at:Math.floor(Date.now()/1000)+60,attachment:true});
}

export function clientAttachment(file: StoredAttachment,ticketId: string):ClientAttachment {
  return {id:file.attachmentId,attachmentId:file.attachmentId,name:file.name,size:file.size,mimeType:file.mimeType,url:`/api/tickets/${encodeURIComponent(ticketId)}/attachments/${encodeURIComponent(file.attachmentId)}`};
}
