import mongoose, { Types, type SortOrder } from 'mongoose';
import { ActivityLogModel, CategoryModel, MessageModel, TicketModel, UserModel } from '@/models';
import type { Role } from '@/lib/preview-workspace';
import { ApiError } from '@/lib/api-response';
import { slaDeadlines, nextTicketNumber } from '@/lib/sla';
import { pagination } from '@/lib/pagination';
import type { z } from 'zod';
import type { createTicketSchema, replySchema, statusSchema, assignmentSchema, querySchema } from '@/lib/validation/tickets';
import { clientAttachment, type StoredAttachment } from '@/lib/attachments';
import { sendTicketEmail } from '@/lib/email';

export type Actor = { id: string; name: string; email: string; role: Role };
type TicketInput = z.infer<typeof createTicketSchema>;
type ReplyInput = z.infer<typeof replySchema>;
type StatusInput = z.infer<typeof statusSchema>;
type AssignmentInput = z.infer<typeof assignmentSchema>;
type QueryInput = z.infer<typeof querySchema>;
function oid(value: string) { return new Types.ObjectId(value); }
function publicAttachments(files: StoredAttachment[]|undefined,ticketId:string) { return (files??[]).map(file=>clientAttachment(file,ticketId)); }
function escapeRegex(value: string) { let output=''; const slash=String.fromCharCode(92); for (const char of value) { if(char===slash) output+=slash+slash; else if('.^$*+?()[]{}|'.includes(char)) output+=slash; output+=char; } return output; }
function scope(actor: Actor) { return actor.role === 'admin' ? {} : actor.role === 'agent' ? { assignedAgent: oid(actor.id) } : { createdBy: oid(actor.id) }; }
async function visibleTicket(actor: Actor, ticketId: string) {
  if (!mongoose.isValidObjectId(ticketId)) throw new ApiError(404,'Ticket not found.');
  const ticket=await TicketModel.findOne({_id:ticketId,...scope(actor)}).populate('category','name').populate('createdBy','name email').populate('assignedAgent','name email').lean();
  if(!ticket) throw new ApiError(404,'Ticket not found.');
  return ticket;
}
async function log(ticket: Types.ObjectId, actor: Actor, action: string, oldValue?: unknown, newValue?: unknown) {
  await ActivityLogModel.create({ticket,performedBy:oid(actor.id),action,oldValue:oldValue ?? null,newValue:newValue ?? null});
}
export async function listTickets(actor: Actor, input: QueryInput) {
  const {skip,limit}=pagination(input.page,input.limit);
  const filter: Record<string,unknown>={...scope(actor)};
  if(input.status) filter.status=input.status;
  if(input.priority) filter.priority=input.priority;
  if(input.category) filter.category=oid(input.category);
  if(input.search) { const search=escapeRegex(input.search); filter.$or=[{ticketNumber:{$regex:search,$options:'i'}},{title:{$regex:search,$options:'i'}}]; }
  const sort:Record<string,SortOrder>=input.sort==='newest'?{createdAt:-1}:input.sort==='oldest'?{createdAt:1}:{updatedAt:-1};
  const [tickets,total]=await Promise.all([TicketModel.find(filter).select('-__v').populate('category','name').populate('createdBy','name').populate('assignedAgent','name').sort(sort).skip(skip).limit(limit).lean(),TicketModel.countDocuments(filter)]);
  return {tickets:await Promise.all(tickets.map(async ticket=>{
    const messageFilter={ticket:ticket._id,...(actor.role==='user'?{isInternal:false}:{})};
    const messages=await MessageModel.find(messageFilter).select('author body attachments isInternal createdAt').populate('author','name role').sort({createdAt:1}).lean();
    return { ...ticket, attachments:publicAttachments(ticket.attachments as StoredAttachment[],String(ticket._id)), id:String(ticket._id), ticketNumber:ticket.ticketNumber, category:ticket.category, createdBy:ticket.createdBy, assignedAgent:ticket.assignedAgent, messages:messages.map(m=>({...m,attachments:publicAttachments(m.attachments as StoredAttachment[],String(ticket._id)),id:String(m._id),author:m.author})) };
  })),pagination:{page:input.page,limit,total,pages:Math.ceil(total/limit)}};
}
export async function createTicket(actor: Actor,input: TicketInput,attachments:StoredAttachment[] = []) {
  if(actor.role==='agent') throw new ApiError(403,'Agents cannot create customer tickets.');
  const category=await CategoryModel.findOne({_id:input.category,isActive:true}).lean();
  if(!category) throw new ApiError(422,'Choose an active ticket category.');
  const priority=input.priority ?? category.defaultPriority;
  const now=new Date(); const deadlines=await slaDeadlines(priority,now); const ticketNumber=await nextTicketNumber();
  const ticket=await TicketModel.create({ticketNumber,title:input.title,description:input.description,category:category._id,priority,status:'Open',createdBy:oid(actor.id),assignedAgent:null,attachments,attachmentCount:attachments.length,...deadlines});
  try { await log(ticket._id,actor,'ticket.created',null,{ticketNumber,priority,category:String(category._id)}); }
  catch(error) { await TicketModel.deleteOne({_id:ticket._id}); throw error; }
  await sendTicketEmail(actor.email,'created',{ticketNumber,title:ticket.title,actorName:actor.name});
  return {id:String(ticket._id),ticketNumber,title:ticket.title,description:ticket.description,category:{id:String(category._id),name:category.name},priority:ticket.priority,status:ticket.status,createdBy:actor.name,assignedAgent:null,attachments:publicAttachments(attachments,String(ticket._id)),attachmentCount:ticket.attachmentCount,responseDueAt:ticket.responseDueAt,resolutionDueAt:ticket.resolutionDueAt,createdAt:ticket.createdAt,updatedAt:ticket.updatedAt};
}
export async function getTicket(actor:Actor,ticketId:string) {
  const ticket=await visibleTicket(actor,ticketId);
  const messages=await MessageModel.find({ticket:ticket._id,...(actor.role==='user'?{isInternal:false}:{})}).populate('author','name role').sort({createdAt:1}).lean();
  const activity=actor.role==='user'?[]:await ActivityLogModel.find({ticket:ticket._id}).populate('performedBy','name').sort({createdAt:-1}).limit(100).lean();
  return {...ticket,attachments:publicAttachments(ticket.attachments as StoredAttachment[],String(ticket._id)),id:String(ticket._id),messages:messages.map(m=>({...m,attachments:publicAttachments(m.attachments as StoredAttachment[],String(ticket._id)),id:String(m._id)})),activity};
}
export async function createReply(actor:Actor,ticketId:string,input:ReplyInput,attachments:StoredAttachment[] = []) {
  const ticket=await visibleTicket(actor,ticketId);
  if(ticket.status==='Closed') throw new ApiError(409,'This ticket is closed.');
  const isInternal=actor.role!=='user' && input.isInternal===true;
  if(actor.role==='user' && input.isInternal) throw new ApiError(403,'Customers cannot create internal notes.');
  const message=await MessageModel.create({ticket:ticket._id,author:oid(actor.id),body:input.body,attachments,isInternal});
  const update:Record<string,unknown>={updatedAt:new Date()};
  if(actor.role!=='user' && !isInternal && !ticket.firstRespondedAt) update.firstRespondedAt=new Date();
  if(actor.role==='user' && ['Resolved','Waiting on User'].includes(ticket.status)) { update.status='Open'; update.resolvedAt=null; }
  try {
    const result=await TicketModel.updateOne({_id:ticket._id},{$set:update});
    if(result.matchedCount!==1) throw new ApiError(404,'Ticket not found.');
    if(!isInternal) await log(ticket._id,actor,'message.created',null,{messageId:String(message._id)});
  } catch(error) {
    await MessageModel.deleteOne({_id:message._id});
    await TicketModel.updateOne({_id:ticket._id},{$set:{status:ticket.status,resolvedAt:ticket.resolvedAt??null,firstRespondedAt:ticket.firstRespondedAt??null,updatedAt:ticket.updatedAt}});
    throw error;
  }
  if(!isInternal) {
    const createdBy=ticket.createdBy as unknown as {email?:string;name?:string};
    const assigned=ticket.assignedAgent as unknown as {email?:string;name?:string}|null;
    const targets=actor.role==='user'?(assigned?.email?[assigned.email]:await UserModel.find({role:'Admin',isActive:true,_id:{$ne:actor.id}}).distinct('email')):[createdBy.email];
    for(const recipient of new Set(targets.filter((value):value is string=>Boolean(value)))) await sendTicketEmail(recipient,'replied',{ticketNumber:ticket.ticketNumber,title:ticket.title,actorName:actor.name,message:input.body});
  }
  return {id:String(message._id),body:message.body,author:{id:actor.id,name:actor.name,role:actor.role},attachments:publicAttachments(attachments,String(ticket._id)),isInternal:message.isInternal,createdAt:message.createdAt};
}
export async function updateTicketStatus(actor:Actor,ticketId:string,input:StatusInput) {
  if(actor.role==='user' && !['Closed'].includes(input.status)) throw new ApiError(403,'Customers may close tickets only.');
  if(actor.role==='agent' && !['Open','In Progress','Waiting on User','Resolved','Closed'].includes(input.status)) throw new ApiError(403,'You cannot set that ticket status.');
  const ticket=await visibleTicket(actor,ticketId);
  if(ticket.status==='Closed') throw new ApiError(409,'Closed tickets cannot be changed.');
  if(ticket.status===input.status) return {id:String(ticket._id),status:ticket.status};
  const now=new Date();
  const set:Record<string,unknown>={status:input.status};
  if(input.status==='Resolved') set.resolvedAt=now;
  if(input.status==='Closed') set.closedAt=now;
  if(input.status==='Open') set.resolvedAt=null;
  await TicketModel.updateOne({_id:ticket._id},{$set:set});
  await log(ticket._id,actor,'ticket.status.changed',ticket.status,input.status);
  if(input.status==='Resolved') { const requester=ticket.createdBy as unknown as {email?:string}; await sendTicketEmail(requester.email,'resolved',{ticketNumber:ticket.ticketNumber,title:ticket.title,actorName:actor.name}); }
  return {id:String(ticket._id),status:input.status};
}
export async function assignTicket(actor:Actor,ticketId:string,input:AssignmentInput) {
  if(actor.role!=='admin') throw new ApiError(403,'Only admins can assign tickets.');
  const ticket=await visibleTicket(actor,ticketId);
  if(ticket.status==='Closed') throw new ApiError(409,'Closed tickets cannot be reassigned.');
  if(input.assignedAgent) { const agent=await UserModel.exists({_id:input.assignedAgent,role:'Agent',isActive:true}); if(!agent) throw new ApiError(422,'Choose an active agent.'); }
  const before=ticket.assignedAgent?String(ticket.assignedAgent):null;
  await TicketModel.updateOne({_id:ticket._id},{$set:{assignedAgent:input.assignedAgent?oid(input.assignedAgent):null}});
  await log(ticket._id,actor,'ticket.assigned',before,input.assignedAgent);
  if(input.assignedAgent) {
    const [agent]=await UserModel.find({_id:input.assignedAgent,role:'Agent',isActive:true}).select('name email').limit(1).lean();
    const requester=ticket.createdBy as unknown as {email?:string};
    if(agent) await sendTicketEmail(agent.email,'assigned',{ticketNumber:ticket.ticketNumber,title:ticket.title,actorName:actor.name});
    await sendTicketEmail(requester.email,'assigned',{ticketNumber:ticket.ticketNumber,title:ticket.title,actorName:agent?.name??'A support teammate'});
  }
  return {id:String(ticket._id),assignedAgent:input.assignedAgent};
}
export async function dashboardSummary(actor:Actor) {
  const pipeline=[{$match:scope(actor)},{$facet:{total:[{$count:'count'}],byStatus:[{$group:{_id:'$status',count:{$sum:1}}}],byPriority:[{$group:{_id:'$priority',count:{$sum:1}}}],breaches:[{$match:{$or:[{$and:[{firstRespondedAt:null},{responseDueAt:{$lt:new Date()}}]},{$and:[{resolvedAt:null},{status:{$nin:['Resolved','Closed']}},{resolutionDueAt:{$lt:new Date()}}]}]}},{$count:'count'}]}}];
  const [result]=await TicketModel.aggregate(pipeline);
  return {total:result?.total?.[0]?.count??0,byStatus:result?.byStatus??[],byPriority:result?.byPriority??[],slaBreaches:result?.breaches?.[0]?.count??0};
}
export async function recentActivity(actor:Actor) {
  const scopedTickets=await TicketModel.find(scope(actor)).select('_id ticketNumber title').lean();
  if(!scopedTickets.length) return [];
  const events=await ActivityLogModel.find({ticket:{$in:scopedTickets.map(ticket=>ticket._id)}}).populate('performedBy','name').populate('ticket','ticketNumber title').sort({createdAt:-1}).limit(100).lean();
  return events.map(event=>({id:String(event._id),action:event.action,createdAt:event.createdAt,performedBy:event.performedBy,ticket:event.ticket}));
}

export async function reserveTicketAttachmentSlots(actor:Actor,ticketId:string,count:number) {
  if(!mongoose.isValidObjectId(ticketId)) throw new ApiError(404,'Ticket not found.');
  if(!Number.isInteger(count)||count<1||count>3) throw new ApiError(413,'You can attach up to 3 files to a ticket.');
  const ticket=await TicketModel.findOneAndUpdate({_id:ticketId,...scope(actor),status:{$ne:'Closed'},$or:[{attachmentCount:{$lte:3-count}},{attachmentCount:{$exists:false}}]},{$inc:{attachmentCount:count}},{new:true}).lean();
  if(ticket) return;
  const current=await visibleTicket(actor,ticketId);
  if(current.status==='Closed') throw new ApiError(409,'This ticket is closed.');
  throw new ApiError(409,'This ticket already has the maximum of 3 attachments.');
}

export async function releaseTicketAttachmentSlots(actor:Actor,ticketId:string,count:number) {
  if(!mongoose.isValidObjectId(ticketId)||count<1) return;
  await TicketModel.updateOne({_id:ticketId,...scope(actor)},{$inc:{attachmentCount:-count}});
}

export async function getAuthorizedAttachment(actor:Actor,ticketId:string,attachmentId:string):Promise<StoredAttachment> {
  if(!mongoose.isValidObjectId(ticketId)) throw new ApiError(404,'Attachment not found.');
  const ticket=await TicketModel.findOne({_id:ticketId,...scope(actor)}).select('attachments').lean();
  if(!ticket) throw new ApiError(404,'Attachment not found.');
  const ticketFile=(ticket.attachments as StoredAttachment[]).find(file=>file.attachmentId===attachmentId);
  if(ticketFile) return ticketFile;
  const message=await MessageModel.findOne({ticket:ticket._id,'attachments.attachmentId':attachmentId,...(actor.role==='user'?{isInternal:false}:{})}).select('attachments').lean();
  const file=(message?.attachments as StoredAttachment[]|undefined)?.find(item=>item.attachmentId===attachmentId);
  if(!file) throw new ApiError(404,'Attachment not found.');
  return file;
}
