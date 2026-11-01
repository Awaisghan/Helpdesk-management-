import { connectToDatabase } from '@/lib/db/connect';
import { apiError } from '@/lib/api-response';
import { CategoryModel } from '@/models';
export async function GET() {
  try { await connectToDatabase(); const categories=await CategoryModel.find({isActive:true}).select('name description defaultPriority').sort({name:1}).lean(); return Response.json({categories:categories.map(item=>({...item,id:String(item._id)}))}); }
  catch(error) { return apiError(error); }
}
