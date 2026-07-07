import { supabase } from '../supabase';

export interface FileUploadOptions {
  file: File;
  bucket: string;
  path?: string;
  relatedToType: 'customer' | 'project' | 'invoice' | 'payment';
  relatedToId: string;
  description?: string;
  onProgress?: (progress: number) => void;
}

export interface FileAttachment {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  storage_bucket: string;
  related_to_type: string;
  related_to_id: string;
  description?: string;
  uploaded_by?: string;
  uploaded_at: string;
  company_id?: string;
  signed_url?: string;
}

/**
 * Upload a file to Supabase Storage and track it in database
 */
export async function uploadFile(options: FileUploadOptions): Promise<FileAttachment> {
  const { file, bucket, path, relatedToType, relatedToId, description } = options;

  try {
    // Generate unique file name
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = path ? `${path}/${fileName}` : fileName;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('Error uploading file:', uploadError);
      throw uploadError;
    }

    // Save file metadata to database
    const fileData = {
      file_name: file.name,
      file_path: uploadData.path,
      file_size: file.size,
      file_type: file.type,
      storage_bucket: bucket,
      related_to_type: relatedToType,
      related_to_id: relatedToId,
      description: description || null,
    };

    const { data: attachment, error: dbError } = await supabase
      .from('file_attachments')
      .insert([fileData])
      .select()
      .single();

    if (dbError) {
      // Cleanup uploaded file if database insert fails
      await supabase.storage.from(bucket).remove([uploadData.path]);
      console.error('Error saving file metadata:', dbError);
      throw dbError;
    }

    return attachment as FileAttachment;
  } catch (error) {
    console.error('Error in uploadFile:', error);
    throw error;
  }
}

/**
 * Upload multiple files
 */
export async function uploadFiles(
  files: File[],
  bucket: string,
  relatedToType: 'customer' | 'project' | 'invoice' | 'payment',
  relatedToId: string,
  path?: string
): Promise<FileAttachment[]> {
  const uploadPromises = files.map(file =>
    uploadFile({
      file,
      bucket,
      path,
      relatedToType,
      relatedToId,
    })
  );

  try {
    const results = await Promise.all(uploadPromises);
    return results;
  } catch (error) {
    console.error('Error uploading multiple files:', error);
    throw error;
  }
}

/**
 * Get files for a specific entity
 */
export async function getFilesByEntity(
  relatedToType: string,
  relatedToId: string
): Promise<FileAttachment[]> {
  try {
    const { data, error } = await supabase
      .from('file_attachments')
      .select('*')
      .eq('related_to_type', relatedToType)
      .eq('related_to_id', relatedToId)
      .order('uploaded_at', { ascending: false });

    if (error) {
      console.error('Error fetching files:', error);
      throw error;
    }

    // Get signed URLs for each file
    const filesWithUrls = await Promise.all(
      (data || []).map(async (file) => {
        const signedUrl = await getSignedUrl(file.storage_bucket, file.file_path);
        return {
          ...file,
          signed_url: signedUrl,
        };
      })
    );

    return filesWithUrls as FileAttachment[];
  } catch (error) {
    console.error('Error in getFilesByEntity:', error);
    throw error;
  }
}

/**
 * Get a signed URL for a file
 */
export async function getSignedUrl(
  bucket: string,
  path: string,
  expiresIn: number = 3600
): Promise<string> {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);

    if (error) {
      console.error('Error creating signed URL:', error);
      throw error;
    }

    return data.signedUrl;
  } catch (error) {
    console.error('Error in getSignedUrl:', error);
    throw error;
  }
}

/**
 * Delete a file from storage and database
 */
export async function deleteFile(fileId: string): Promise<boolean> {
  try {
    // Get file info
    const { data: file, error: fetchError } = await supabase
      .from('file_attachments')
      .select('*')
      .eq('id', fileId)
      .single();

    if (fetchError) {
      console.error('Error fetching file:', fetchError);
      throw fetchError;
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from(file.storage_bucket)
      .remove([file.file_path]);

    if (storageError) {
      console.error('Error deleting from storage:', storageError);
      // Continue to delete from database even if storage delete fails
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from('file_attachments')
      .delete()
      .eq('id', fileId);

    if (dbError) {
      console.error('Error deleting file record:', dbError);
      throw dbError;
    }

    return true;
  } catch (error) {
    console.error('Error in deleteFile:', error);
    throw error;
  }
}

/**
 * Get public URL for a file (if bucket is public)
 */
export function getPublicUrl(bucket: string, path: string): string {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Download a file
 */
export async function downloadFile(bucket: string, path: string, fileName: string): Promise<void> {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .download(path);

    if (error) {
      console.error('Error downloading file:', error);
      throw error;
    }

    // Create download link
    const url = URL.createObjectURL(data);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error in downloadFile:', error);
    throw error;
  }
}

/**
 * Get file size in human readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Validate file type
 */
export function validateFileType(file: File, allowedTypes: string[]): boolean {
  return allowedTypes.includes(file.type) || 
         allowedTypes.some(type => {
           if (type.endsWith('/*')) {
             return file.type.startsWith(type.replace('/*', ''));
           }
           return false;
         });
}

/**
 * Validate file size
 */
export function validateFileSize(file: File, maxSizeMB: number): boolean {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxSizeBytes;
}

/**
 * Create storage bucket if it doesn't exist (admin only)
 */
export async function ensureBucketExists(bucketName: string, isPublic: boolean = false): Promise<void> {
  try {
    // List all buckets
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();

    if (listError) {
      console.error('Error listing buckets:', listError);
      throw listError;
    }

    // Check if bucket exists
    const bucketExists = buckets?.some(b => b.name === bucketName);

    if (!bucketExists) {
      // Create bucket
      const { error: createError } = await supabase.storage.createBucket(bucketName, {
        public: isPublic,
        fileSizeLimit: 52428800, // 50MB
        allowedMimeTypes: [
          'image/png',
          'image/jpeg',
          'image/jpg',
          'image/gif',
          'image/webp',
          'video/mp4',
          'video/quicktime',
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ],
      });

      if (createError) {
        console.error('Error creating bucket:', createError);
        throw createError;
      }

      console.log(`Bucket '${bucketName}' created successfully`);
    }
  } catch (error) {
    console.error('Error in ensureBucketExists:', error);
    throw error;
  }
}

export default {
  uploadFile,
  uploadFiles,
  getFilesByEntity,
  getSignedUrl,
  deleteFile,
  getPublicUrl,
  downloadFile,
  formatFileSize,
  validateFileType,
  validateFileSize,
  ensureBucketExists,
};
