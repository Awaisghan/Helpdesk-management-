import { z } from 'zod';
import { requireRole } from '@/lib/authorization';
import { apiError, ApiError } from '@/lib/api-response';
import { connectToDatabase } from '@/lib/db/connect';
import { CategoryModel } from '@/models';
import { priorities } from '@/lib/validation/tickets';

const createSchema = z.object({ name: z.string().trim().min(3).max(60), description: z.string().trim().max(300).default(''), defaultPriority: z.enum(priorities) }).strict();
const activeSchema = z.object({ isActive: z.boolean() }).strict();

export async function GET() {
  try {
    await requireRole('Admin'); await connectToDatabase();
    const categories=await CategoryModel.find({}).select('name description defaultPriority isActive').sort({name:1}).lean();
    return Response.json({categories:categories.map(category=>({...category,id:String(category._id)}))},{headers:{'Cache-Control':'no-store'}});
  } catch(error) { return apiError(error); }
}

export async function POST(request:Request) {
  try {
    await requireRole('Admin'); const input=createSchema.parse(await request.json()); await connectToDatabase();
    const category=await CategoryModel.create({...input,isActive:true});
    return Response.json({category:{id:String(category._id),name:category.name,description:category.description,defaultPriority:category.defaultPriority,isActive:category.isActive}},{status:201,headers:{'Cache-Control':'no-store'}});
  } catch(error) { return apiError(error); }
}

export async function PATCH(request:Request) {
  try {
    await requireRole('Admin'); const id=new URL(request.url).searchParams.get('categoryId');
    if(!id||!/^[a-f\d]{24}$/i.test(id)) throw new ApiError(404,'Category not found.');
    const input=activeSchema.parse(await request.json()); await connectToDatabase();
    const category=await CategoryModel.findByIdAndUpdate(id,{$set:input},{new:true,runValidators:true}).select('name description defaultPriority isActive').lean();
    if(!category) throw new ApiError(404,'Category not found.');
    return Response.json({category:{...category,id:String(category._id)}},{headers:{'Cache-Control':'no-store'}});
  } catch(error) { return apiError(error); }
}
