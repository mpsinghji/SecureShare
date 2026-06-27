import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path, { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucketName = process.env.SUPABASE_BUCKET || 'secureshare-docs';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
  global: { fetch: fetch },
  realtime: { transport: WebSocket }
});

export const uploadFile = async (fileBuffer, originalName, mimeType) => {
  const fileName = `${Date.now()}-${originalName.replace(/\\s+/g, '_')}`;
  
  let { data, error } = await supabase.storage
    .from(bucketName)
    .upload(fileName, fileBuffer, {
      contentType: mimeType,
      upsert: false
    });

  if (error && error.statusCode === '404') {
    console.log(`Bucket '${bucketName}' not found. Attempting to create it...`);
    const { error: createError } = await supabase.storage.createBucket(bucketName, {
      public: true, // Make it public so getPublicUrl works
      fileSizeLimit: 52428800 // 50MB
    });

    if (createError) {
      console.error("Failed to create bucket:", createError);
      throw createError;
    }

    console.log(`Bucket '${bucketName}' created successfully. Retrying upload...`);
    // Retry the upload
    const retry = await supabase.storage
      .from(bucketName)
      .upload(fileName, fileBuffer, {
        contentType: mimeType,
        upsert: false
      });
      
    data = retry.data;
    error = retry.error;
  }

  if (error) {
    console.error("Supabase Storage Error:", error);
    throw error;
  }

  // Get public URL
  const { data: publicUrlData } = supabase.storage
    .from(bucketName)
    .getPublicUrl(fileName);

  return {
    key: fileName,
    url: publicUrlData.publicUrl
  };
};

export const deleteFile = async (fileName) => {
  const { error } = await supabase.storage
    .from(bucketName)
    .remove([fileName]);

  if (error) {
    console.error('Supabase deleteFile error:', error);
    throw error;
  }
  return true;
};
