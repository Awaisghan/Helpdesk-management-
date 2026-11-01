import { v2 as cloudinary } from 'cloudinary';
import { ApiError } from '@/lib/api-response';

export { cloudinary };

export function cloudinaryConfigured() {
  return Boolean(process.env.CLOUDINARY_CLOUD_NAME&&process.env.CLOUDINARY_API_KEY&&process.env.CLOUDINARY_API_SECRET);
}

export function configureCloudinary() {
  const {CLOUDINARY_CLOUD_NAME:cloud_name,CLOUDINARY_API_KEY:api_key,CLOUDINARY_API_SECRET:api_secret}=process.env;
  if(!cloud_name||!api_key||!api_secret) throw new ApiError(503,'Secure file storage is not configured.');
  cloudinary.config({cloud_name,api_key,api_secret,secure:true});
  return cloudinary;
}
