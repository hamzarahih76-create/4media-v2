import { supabase } from '@/integrations/supabase/client';
import * as tus from 'tus-js-client';

export interface CloudflareUploadResult {
  success: boolean;
  uploadURL?: string;
  tusUploadURL?: string;
  uid?: string;
  error?: string;
}

export interface CloudflareVideoInfo {
  success: boolean;
  video?: {
    uid: string;
    status: { state: string };
    duration: number;
    thumbnail: string;
    preview: string;
    playback: { hls: string; dash: string };
    meta: Record<string, any>;
    created: string;
    modified: string;
    readyToStream: boolean;
  };
  error?: string;
}

export interface CloudflarePlaybackUrls {
  success: boolean;
  playbackUrl?: string;
  iframeUrl?: string;
  downloadUrl?: string;
  thumbnail?: string;
  duration?: number;
  readyToStream?: boolean;
  error?: string;
}

/**
 * Get a direct upload URL for uploading videos to Cloudflare Stream (< 200MB)
 */
export async function getUploadUrl(videoTitle?: string): Promise<CloudflareUploadResult> {
  const { data, error } = await supabase.functions.invoke('cloudflare-stream-upload', {
    body: {
      action: 'get-upload-url',
      videoTitle,
      requireSignedURLs: true,
    },
  });

  if (error) {
    console.error('Error getting upload URL:', error);
    return { success: false, error: error.message };
  }

  return data;
}

/**
 * Get a TUS upload URL for resumable uploads (supports large files > 200MB)
 */
export async function getTusUploadUrl(videoTitle: string, fileSize: number): Promise<CloudflareUploadResult> {
  const { data, error } = await supabase.functions.invoke('cloudflare-stream-upload', {
    body: {
      action: 'get-tus-url',
      videoTitle,
      fileSize,
      requireSignedURLs: true,
    },
  });

  if (error) {
    console.error('Error getting TUS upload URL:', error);
    return { success: false, error: error.message };
  }

  return data;
}

/**
 * Get video information from Cloudflare Stream
 */
export async function getVideoInfo(cloudflareVideoId: string): Promise<CloudflareVideoInfo> {
  const { data, error } = await supabase.functions.invoke('cloudflare-stream-upload', {
    body: {
      action: 'get-video',
      videoId: cloudflareVideoId,
    },
  });

  if (error) {
    console.error('Error getting video info:', error);
    return { success: false, error: error.message };
  }

  return data;
}

/**
 * Delete a video from Cloudflare Stream
 */
export async function deleteVideo(cloudflareVideoId: string): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabase.functions.invoke('cloudflare-stream-upload', {
    body: {
      action: 'delete-video',
      videoId: cloudflareVideoId,
    },
  });

  if (error) {
    console.error('Error deleting video:', error);
    return { success: false, error: error.message };
  }

  return data;
}

/**
 * Get signed playback URLs for a Cloudflare Stream video
 */
export async function getPlaybackUrls(
  cloudflareVideoId: string,
  action: 'preview' | 'download' = 'preview',
  expiresIn?: number
): Promise<CloudflarePlaybackUrls> {
  const { data, error } = await supabase.functions.invoke('cloudflare-stream-signed-url', {
    body: {
      cloudflareVideoId,
      action,
      expiresIn,
    },
  });

  if (error) {
    console.error('Error getting playback URLs:', error);
    return { success: false, error: error.message };
  }

  return data;
}

/**
 * Get download URL for a validated video
 * Only works for videos with status 'completed'
 */
export async function getDownloadUrl(
  videoId: string,
  token?: string
): Promise<{ success: boolean; downloadUrl?: string; fileName?: string; error?: string; message?: string }> {
  const { data, error } = await supabase.functions.invoke('cloudflare-stream-download', {
    body: {
      videoId,
      token,
    },
  });

  if (error) {
    console.error('Error getting download URL:', error);
    return { success: false, error: error.message };
  }

  return data;
}

/**
 * Upload a file directly to Cloudflare Stream using the direct upload URL
 */
export async function uploadToCloudflare(
  file: File,
  videoTitle?: string,
  onProgress?: (progress: number) => void
): Promise<{ success: boolean; cloudflareVideoId?: string; error?: string }> {
  const TUS_THRESHOLD = 50 * 1024 * 1024; // 50MB - use TUS for files above this for reliability

  try {
    if (file.size > TUS_THRESHOLD) {
      // Use TUS resumable upload for large files
      return await uploadViaTus(file, videoTitle || file.name, onProgress);
    }

    // Use direct upload for small files
    const uploadResult = await getUploadUrl(videoTitle || file.name);
    
    if (!uploadResult.success || !uploadResult.uploadURL) {
      return { success: false, error: uploadResult.error || 'Failed to get upload URL' };
    }

    const formData = new FormData();
    formData.append('file', file);

    const xhr = new XMLHttpRequest();
    
    return new Promise((resolve) => {
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          const progress = Math.round((event.loaded / event.total) * 100);
          onProgress(progress);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve({ success: true, cloudflareVideoId: uploadResult.uid });
        } else {
          resolve({ success: false, error: `Upload failed with status ${xhr.status}` });
        }
      });

      xhr.addEventListener('error', () => {
        resolve({ success: false, error: 'Network error during upload' });
      });

      xhr.open('POST', uploadResult.uploadURL);
      xhr.send(formData);
    });
  } catch (error) {
    console.error('Upload error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Upload failed' 
    };
  }
}

/**
 * Upload via TUS protocol (resumable, supports large files up to 2GB)
 */
async function uploadViaTus(
  file: File,
  videoTitle: string,
  onProgress?: (progress: number) => void
): Promise<{ success: boolean; cloudflareVideoId?: string; error?: string }> {
  // Step 1: Get TUS endpoint from our edge function
  const tusResult = await getTusUploadUrl(videoTitle, file.size);

  if (!tusResult.success || !tusResult.tusUploadURL) {
    return { success: false, error: tusResult.error || 'Failed to get TUS upload URL' };
  }

  const cloudflareVideoId = tusResult.uid;

  // Step 2: Upload via TUS client
  return new Promise((resolve) => {
    const upload = new tus.Upload(file, {
      endpoint: tusResult.tusUploadURL!,
      // Upload directly to the URL returned by Cloudflare (it's the full URL)
      uploadUrl: tusResult.tusUploadURL!,
      retryDelays: [0, 1000, 3000, 5000],
      chunkSize: 50 * 1024 * 1024, // 50MB chunks
      metadata: {
        filename: file.name,
        filetype: file.type,
      },
      onError: (error) => {
        console.error('TUS upload error:', error);
        resolve({ success: false, error: `TUS upload failed: ${error.message}` });
      },
      onProgress: (bytesUploaded, bytesTotal) => {
        const percentage = Math.round((bytesUploaded / bytesTotal) * 100);
        onProgress?.(percentage);
      },
      onSuccess: () => {
        resolve({ success: true, cloudflareVideoId: cloudflareVideoId || undefined });
      },
    });

    upload.start();
  });
}
