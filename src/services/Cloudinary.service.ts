// src/lib/cloudinary.ts
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs/promises';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export async function uploadOnCloudinary(localFilePath: string, folder = 'resources') {
  try {
    const res = await cloudinary.uploader.upload(localFilePath, {
      folder,
      resource_type: 'auto', 
      use_filename: true,
      unique_filename: true,
      overwrite: false,
    });
    // remove local temp file
    try { await fs.unlink(localFilePath); } catch (e) {}
    return { url: res.secure_url,
       public_id: res.public_id,
       format: res.format,
       raw: res as any,
       resource_type: res.resource_type 
        };
  } catch (error) {
    // attempt to delete local file on failure
    try { await fs.unlink(localFilePath); } catch (e) {}
    throw error;
  }
}

export async function deleteFromCloudinary(publicId:string){
  if(!publicId) return;
  await cloudinary.uploader.destroy(publicId, { invalidate: true, resource_type: 'image' });
}
