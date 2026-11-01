import nodemailer, { type Transporter } from 'nodemailer';

type MailEvent='created'|'assigned'|'replied'|'resolved';
type MailContext={ticketNumber:string;title:string;actorName?:string;message?:string};
type MailGlobals=typeof globalThis&{codxpyMailer?:Transporter};
const globalMail=globalThis as MailGlobals;

function transporter() {
  if(globalMail.codxpyMailer) return globalMail.codxpyMailer;
  const host=process.env.SMTP_HOST;
  const port=Number(process.env.SMTP_PORT);
  const user=process.env.SMTP_USER;
  const pass=process.env.SMTP_PASSWORD;
  const from=process.env.SMTP_FROM;
  if(!host||!Number.isInteger(port)||port<1||port>65535||!user||!pass||!from) return null;
  globalMail.codxpyMailer=nodemailer.createTransport({
    host,port,secure:port===465,requireTLS:port!==465,auth:{user,pass},
    connectionTimeout:8000,greetingTimeout:8000,socketTimeout:12000,
    pool:true,maxConnections:2,maxMessages:100,
  });
  return globalMail.codxpyMailer;
}

function escapeHtml(value:string) {
  return value.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]??char));
}

function template(event:MailEvent,context:MailContext) {
  const title=escapeHtml(context.title);
  const ticket=escapeHtml(context.ticketNumber);
  const actor=escapeHtml(context.actorName??'The CodxPy support team');
  const message=context.message?`<div style="margin:20px 0;padding:16px;background:#f4f7f3;border:1px solid #e0e9df;border-radius:8px;color:#536658;white-space:pre-wrap">${escapeHtml(context.message)}</div>`:'';
  const copy:Record<MailEvent,{subject:string;heading:string;intro:string}>= {
    created:{subject:`We received ${context.ticketNumber}`,heading:'Your request is in good hands.',intro:'We have received your support request and will keep the conversation together in your helpdesk account.'},
    assigned:{subject:`${context.ticketNumber} has been assigned`,heading:'A teammate is on it.',intro:`${actor} has been assigned to this support request.`},
    replied:{subject:`A new reply on ${context.ticketNumber}`,heading:'There is an update for you.',intro:`${actor} replied to the support request.`},
    resolved:{subject:`${context.ticketNumber} has been resolved`,heading:'Your request is marked resolved.',intro:'If you still need help, sign in and reply to reopen the conversation.'},
  };
  const item=copy[event];
  const html=`<!doctype html><html><body style="margin:0;padding:28px 12px;background:#f3f6f2;font-family:Arial,Helvetica,sans-serif;color:#405347"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center"><table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;background:#fff;border:1px solid #e2e9e1;border-radius:14px;overflow:hidden"><tr><td style="padding:22px 30px;background:#edf5eb;color:#39734d;font-size:20px;font-weight:700">CodxPy<span style="color:#78a66f">.</span></td></tr><tr><td style="padding:34px 30px 38px"><p style="margin:0 0 8px;color:#7b917e;font-size:11px;letter-spacing:1.5px;text-transform:uppercase">TICKET ${ticket}</p><h1 style="margin:0 0 12px;color:#385641;font-size:25px;font-weight:600;line-height:1.35">${item.heading}</h1><p style="margin:0;color:#718175;font-size:15px;line-height:1.7">${item.intro}</p><div style="margin:22px 0;padding:16px;background:#f7f9f6;border:1px solid #e7ece5;border-radius:8px"><strong style="display:block;color:#4e6553;font-size:14px">${title}</strong></div>${message}<p style="margin:26px 0 0;color:#7b897f;font-size:12px;line-height:1.65">You can view and continue this conversation after signing in to CodxPy.</p></td></tr><tr><td style="padding:16px 30px;border-top:1px solid #edf0ec;color:#829087;font-size:11px">Software support, clearly managed.</td></tr></table></td></tr></table></body></html>`;
  const text=`${item.heading}\n${item.intro}\n\nTicket: ${context.ticketNumber}\nSubject: ${context.title}${context.message?`\n\n${context.message}`:''}\n\nSign in to CodxPy to continue this conversation.`;
  return {subject:item.subject.replace(/[\r\n]/g,' ').slice(0,180),html,text};
}

export async function sendTicketEmail(to:string|undefined|null,event:MailEvent,context:MailContext) {
  if(!to||!to.includes('@')) return false;
  const mailer=transporter();
  if(!mailer) {
    if(process.env.NODE_ENV!=='production') console.info('SMTP is not configured; ticket email skipped.');
    return false;
  }
  const content=template(event,context);
  try { await mailer.sendMail({from:process.env.SMTP_FROM,to,subject:content.subject,text:content.text,html:content.html}); return true; }
  catch(error) {
    const code=error&&typeof error==='object'&&'code' in error&&typeof error.code==='string'&&/^[A-Z0-9_]+$/.test(error.code)?error.code:'unknown';
    console.error('SMTP notification failed:',error instanceof Error?error.name:'Error',code);
    return false;
  }
}

export async function verifySmtpConnection() {
  const mailer=transporter();
  if(!mailer) return {configured:false,connected:false};
  try { await mailer.verify(); return {configured:true,connected:true}; }
  catch(error) { return {configured:true,connected:false,errorName:error instanceof Error?error.name:'Error'}; }
}
