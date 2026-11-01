import { randomUUID } from 'node:crypto';
import nextEnv from '@next/env';
import nodemailer from 'nodemailer';
import { v2 as cloudinary } from 'cloudinary';

nextEnv.loadEnvConfig(process.cwd());
const env=process.env;
const result={cloudinary:{configured:false,ping:'skipped',authenticatedUploadDownload:'skipped'},smtp:{configured:false,connection:'skipped'}};
const safeError=error=>({name:error instanceof Error?error.name:'Error',code:error&&typeof error==='object'&&'http_code' in error&&typeof error.http_code==='number'?String(error.http_code):error&&typeof error==='object'&&'code' in error&&typeof error.code==='string'&&/^[A-Z0-9_]+$/.test(error.code)?error.code:'unknown'});
let uploaded;
let cloudTestError;
let cloudStage='configure';
try {
  const {CLOUDINARY_CLOUD_NAME:cloud_name,CLOUDINARY_API_KEY:api_key,CLOUDINARY_API_SECRET:api_secret}=env;
  result.cloudinary.configured=Boolean(cloud_name&&api_key&&api_secret);
  if(result.cloudinary.configured) {
    cloudinary.config({cloud_name,api_key,api_secret,secure:true});
    cloudStage='ping';
    await cloudinary.api.ping(); result.cloudinary.ping='ok';
    const probes=[
      {resourceType:'image',format:'png',bytes:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l2cAAAAASUVORK5CYII=','base64'),signature:[0x89,0x50,0x4e,0x47]},
      {resourceType:'raw',format:'pdf',bytes:Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\n%%EOF\n'),signature:[0x25,0x50,0x44,0x46]},
    ];
    for(const probe of probes) {
      cloudStage=`${probe.resourceType}_authenticated_upload`;
      const publicId=`helpdesk-integration-check/${randomUUID()}${probe.resourceType==='raw'?'.pdf':''}`;
      uploaded=await new Promise((resolve,reject)=>cloudinary.uploader.upload_stream({public_id:publicId,resource_type:probe.resourceType,type:'authenticated',overwrite:false,use_filename:false,unique_filename:false},(error,response)=>error?reject(error):response?resolve(response):reject(new Error('EMPTY_UPLOAD_RESPONSE'))).end(probe.bytes));
      cloudStage=`${probe.resourceType}_signed_download_url`;
      const downloadUrl=cloudinary.utils.private_download_url(uploaded.public_id,probe.format,{resource_type:probe.resourceType,type:'authenticated',expires_at:Math.floor(Date.now()/1000)+60,attachment:true});
      cloudStage=`${probe.resourceType}_download_fetch`;
      const response=await fetch(downloadUrl,{cache:'no-store'});
      if(!response.ok) { cloudTestError={name:'DownloadResponse',code:String(response.status)}; throw new Error('DOWNLOAD_HTTP_FAILURE'); }
      cloudStage=`${probe.resourceType}_download_content`;
      const downloaded=Buffer.from(await response.arrayBuffer());
      if(downloaded.length===0||!probe.signature.every((byte,index)=>downloaded[index]===byte)) throw new Error('DOWNLOAD_CONTENT_INVALID');
      const cleanup=await cloudinary.uploader.destroy(uploaded.public_id,{resource_type:probe.resourceType,type:'authenticated',invalidate:true});
      if(cleanup.result!=='ok'&&cleanup.result!=='not found') throw new Error('CLOUDINARY_CLEANUP_FAILED');
      uploaded=undefined;
    }
    result.cloudinary.authenticatedUploadDownload='ok'; result.cloudinary.cleanup='ok';
  }
} catch(error) { cloudTestError={stage:cloudStage,...safeError(error)}; result.cloudinary.error=cloudTestError; }
finally {
  if(uploaded?.public_id) {
    try { await cloudinary.uploader.destroy(uploaded.public_id,{resource_type:uploaded.resource_type,type:'authenticated',invalidate:true}); result.cloudinary.cleanup='ok'; }
    catch(error) { result.cloudinary.cleanup='failed'; result.cloudinary.cleanupError=safeError(error); }
  }
}
try {
  const host=env.SMTP_HOST; const port=Number(env.SMTP_PORT); const user=env.SMTP_USER; const pass=env.SMTP_PASSWORD; const from=env.SMTP_FROM;
  result.smtp.configured=Boolean(host&&Number.isInteger(port)&&port>0&&port<=65535&&user&&pass&&from);
  if(result.smtp.configured) {
    const transporter=nodemailer.createTransport({host,port,secure:port===465,requireTLS:port!==465,auth:{user,pass},connectionTimeout:8000,greetingTimeout:8000,socketTimeout:12000});
    await transporter.verify(); transporter.close(); result.smtp.connection='ok';
  }
} catch(error) { result.smtp.error=safeError(error); }
process.stdout.write(`${JSON.stringify(result)}\n`);
if((result.cloudinary.configured&&result.cloudinary.authenticatedUploadDownload!=='ok')||(result.smtp.configured&&result.smtp.connection!=='ok')) process.exitCode=1;
