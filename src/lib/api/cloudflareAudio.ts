import { supabase } from '@/integrations/supabase/client';

export interface CloudflareAudioUploadResult {
  success: boolean;
  uploadURL?: string;
  uid?: string;
  error?: string;
}

export interface CloudflareAudioPlaybackResult {
  success: boolean;
  playbackUrl?: string;
  iframeUrl?: string;
  duration?: number;
  readyToStream?: boolean;
  error?: string;
}

/**
 * Get a direct upload URL for uploading audio to Cloudflare Stream
 */
export async function getAudioUploadUrl(audioTitle?: string): Promise<CloudflareAudioUploadResult> {
  const { data, error } = await supabase.functions.invoke('cloudflare-audio-upload', {
    body: {
      action: 'get-upload-url',
      audioTitle,
    },
  });

  if (error) {
    console.error('Error getting audio upload URL:', error);
    return { success: false, error: error.message };
  }

  return data;
}

/**
 * Get signed playback URL for an audio file
 */
export async function getAudioPlaybackUrl(cloudflareAudioId: string): Promise<CloudflareAudioPlaybackResult> {
  try {
    const { data, error } = await supabase.functions.invoke('cloudflare-audio-upload', {
      body: {
        action: 'get-playback-url',
        audioId: cloudflareAudioId,
      },
    });

    if (error) {
      console.error('Error getting audio playback URL:', error);
      return { success: false, error: error.message };
    }

    // Check if audio is ready
    if (data && !data.readyToStream) {
      console.log('Audio not ready yet:', cloudflareAudioId);
      return { 
        success: true, 
        readyToStream: false,
        iframeUrl: data.iframeUrl,
        playbackUrl: data.playbackUrl
      };
    }

    return data;
  } catch (err) {
    console.error('Exception getting audio playback URL:', err);
    return { success: false, error: 'Failed to get playback URL' };
  }
}

/**
 * Delete an audio file from Cloudflare Stream
 */
export async function deleteAudio(cloudflareAudioId: string): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabase.functions.invoke('cloudflare-audio-upload', {
    body: {
      action: 'delete-audio',
      audioId: cloudflareAudioId,
    },
  });

  if (error) {
    console.error('Error deleting audio:', error);
    return { success: false, error: error.message };
  }

  return data;
}

/**
 * Upload an audio blob directly to Cloudflare Stream
 */
export async function uploadAudioToCloudflare(
  audioBlob: Blob,
  audioTitle?: string,
  onProgress?: (progress: number) => void
): Promise<{ success: boolean; cloudflareAudioId?: string; error?: string }> {
  try {
    // Step 1: Get upload URL
    const uploadResult = await getAudioUploadUrl(audioTitle || 'Voice Message');
    
    if (!uploadResult.success || !uploadResult.uploadURL) {
      return { success: false, error: uploadResult.error || 'Failed to get upload URL' };
    }

    // Step 2: Upload audio to Cloudflare
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.webm');

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
          resolve({ success: true, cloudflareAudioId: uploadResult.uid });
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
    console.error('Audio upload error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Upload failed' 
    };
  }
}
