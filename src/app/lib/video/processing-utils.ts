/**
 * Enterprise Video Capture System - Processing Utilities
 * 
 * Video processing, validation, thumbnail generation, and quality analysis
 */

import type { VideoMetadata, VideoAnalytics, ProcessingStatus, ProcessingStep } from './types';

/**
 * Generate multiple thumbnails at different timestamps
 */
export async function generateThumbnails(
  videoUrl: string,
  count: number = 5,
  width: number = 320,
  height: number = 180
): Promise<{ url: string; timestamp: number; width: number; height: number }[]> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.src = videoUrl;
    video.crossOrigin = 'anonymous';

    video.onloadedmetadata = async () => {
      const duration = video.duration;
      const thumbnails: { url: string; timestamp: number; width: number; height: number }[] = [];

      // Generate thumbnails at evenly spaced intervals
      for (let i = 0; i < count; i++) {
        const timestamp = (duration / (count + 1)) * (i + 1);
        
        try {
          const thumbnailUrl = await captureFrame(video, timestamp, width, height);
          thumbnails.push({ url: thumbnailUrl, timestamp, width, height });
        } catch (error) {
          console.error(`Failed to generate thumbnail at ${timestamp}s:`, error);
        }
      }

      resolve(thumbnails);
    };

    video.onerror = () => {
      reject(new Error('Failed to load video for thumbnail generation'));
    };
  });
}

/**
 * Capture single frame from video
 */
function captureFrame(
  video: HTMLVideoElement,
  timestamp: number,
  width: number,
  height: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    video.currentTime = timestamp;

    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        ctx.drawImage(video, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        resolve(dataUrl);
      } catch (error) {
        reject(error);
      }
    };
  });
}

/**
 * Extract comprehensive video metadata
 */
export async function extractVideoMetadata(
  blob: Blob,
  videoUrl: string
): Promise<Partial<VideoMetadata>> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.src = videoUrl;
    video.crossOrigin = 'anonymous';

    video.onloadedmetadata = () => {
      const metadata: Partial<VideoMetadata> = {
        resolution: {
          width: video.videoWidth,
          height: video.videoHeight
        },
        format: blob.type.split('/')[1] || 'unknown',
        codec: blob.type.includes('codecs=') 
          ? blob.type.split('codecs=')[1].replace(/[")]/g, '') 
          : 'unknown',
        hasAudio: video.mozHasAudio || Boolean(video.webkitAudioDecodedByteCount) || false,
        audioTracks: 0 // Would need MediaSource API for accurate count
      };

      // Try to detect FPS (limited browser support)
      // @ts-ignore
      if (video.getVideoPlaybackQuality) {
        // @ts-ignore
        const quality = video.getVideoPlaybackQuality();
        const fps = quality.totalVideoFrames / video.duration;
        metadata.fps = Math.round(fps);
      } else {
        metadata.fps = 30; // Default assumption
      }

      // Estimate bitrate
      const bitrate = (blob.size * 8) / video.duration; // bits per second
      metadata.bitrate = Math.round(bitrate / 1000); // Convert to kbps

      resolve(metadata);
    };

    video.onerror = () => {
      reject(new Error('Failed to load video for metadata extraction'));
    };
  });
}

/**
 * Analyze video quality
 */
export async function analyzeVideoQuality(
  blob: Blob,
  videoUrl: string
): Promise<VideoAnalytics> {
  const metadata = await extractVideoMetadata(blob, videoUrl);
  
  const analytics: VideoAnalytics = {
    duration: 0,
    fileSize: blob.size,
    resolution: metadata.resolution || { width: 0, height: 0 },
    bitrate: metadata.bitrate || 0,
    fps: metadata.fps || 30,
    codec: metadata.codec || 'unknown',
    audioCodec: metadata.hasAudio ? 'opus' : undefined,
    quality: 'good',
    recommendations: []
  };

  // Load video to get duration
  await new Promise<void>((resolve) => {
    const video = document.createElement('video');
    video.src = videoUrl;
    video.onloadedmetadata = () => {
      analytics.duration = video.duration;
      resolve();
    };
  });

  // Analyze and rate quality
  const { quality, recommendations } = rateVideoQuality(analytics);
  analytics.quality = quality;
  analytics.recommendations = recommendations;

  return analytics;
}

/**
 * Rate video quality based on metrics
 */
function rateVideoQuality(analytics: VideoAnalytics): {
  quality: 'excellent' | 'good' | 'fair' | 'poor';
  recommendations: string[];
} {
  const recommendations: string[] = [];
  let qualityScore = 100;

  // Check resolution
  const pixels = analytics.resolution.width * analytics.resolution.height;
  if (pixels < 640 * 480) {
    qualityScore -= 30;
    recommendations.push('Resolution is low. Consider recording at 720p or higher.');
  } else if (pixels < 1280 * 720) {
    qualityScore -= 15;
    recommendations.push('Consider recording at 1080p for better quality.');
  }

  // Check FPS
  if (analytics.fps < 24) {
    qualityScore -= 25;
    recommendations.push('Frame rate is low. Close background applications.');
  } else if (analytics.fps < 30) {
    qualityScore -= 10;
    recommendations.push('Frame rate could be improved.');
  }

  // Check bitrate (relative to resolution)
  const expectedBitrate = calculateExpectedBitrate(analytics.resolution);
  const bitrateRatio = analytics.bitrate / expectedBitrate;
  
  if (bitrateRatio < 0.5) {
    qualityScore -= 20;
    recommendations.push('Bitrate is low. Video may appear blocky or pixelated.');
  } else if (bitrateRatio < 0.75) {
    qualityScore -= 10;
  }

  // Check file size (should be reasonable for duration)
  const expectedSize = (analytics.bitrate * 1000 * analytics.duration) / 8;
  const sizeRatio = analytics.fileSize / expectedSize;
  
  if (sizeRatio < 0.7) {
    qualityScore -= 15;
    recommendations.push('File size is smaller than expected. Quality may be compromised.');
  }

  // Determine quality rating
  let quality: 'excellent' | 'good' | 'fair' | 'poor';
  if (qualityScore >= 90) {
    quality = 'excellent';
  } else if (qualityScore >= 70) {
    quality = 'good';
  } else if (qualityScore >= 50) {
    quality = 'fair';
  } else {
    quality = 'poor';
  }

  if (recommendations.length === 0) {
    recommendations.push('Video quality is optimal.');
  }

  return { quality, recommendations };
}

/**
 * Calculate expected bitrate for resolution
 */
function calculateExpectedBitrate(resolution: { width: number; height: number }): number {
  const pixels = resolution.width * resolution.height;
  
  // Rough estimates (kbps)
  if (pixels >= 3840 * 2160) return 20000; // 4K
  if (pixels >= 1920 * 1080) return 8000;  // 1080p
  if (pixels >= 1280 * 720) return 5000;   // 720p
  if (pixels >= 854 * 480) return 2500;    // 480p
  return 1000; // 360p or lower
}

/**
 * Validate video file
 */
export async function validateVideo(blob: Blob, constraints: {
  maxSize?: number;
  maxDuration?: number;
  minDuration?: number;
  allowedFormats?: string[];
  minResolution?: { width: number; height: number };
}): Promise<{
  valid: boolean;
  errors: string[];
  warnings: string[];
}> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check file size
  if (constraints.maxSize && blob.size > constraints.maxSize) {
    errors.push(`File size (${formatBytes(blob.size)}) exceeds maximum (${formatBytes(constraints.maxSize)})`);
  }

  // Check format
  const format = blob.type.split('/')[1];
  if (constraints.allowedFormats && !constraints.allowedFormats.includes(format)) {
    errors.push(`Format '${format}' is not allowed. Allowed formats: ${constraints.allowedFormats.join(', ')}`);
  }

  // Load video to check duration and resolution
  try {
    const videoUrl = URL.createObjectURL(blob);
    const metadata = await extractVideoMetadata(blob, videoUrl);
    URL.revokeObjectURL(videoUrl);

    // Get duration
    const duration = await getVideoDuration(blob);

    // Check duration
    if (constraints.maxDuration && duration > constraints.maxDuration) {
      errors.push(`Duration (${formatDuration(duration)}) exceeds maximum (${formatDuration(constraints.maxDuration)})`);
    }

    if (constraints.minDuration && duration < constraints.minDuration) {
      errors.push(`Duration (${formatDuration(duration)}) is below minimum (${formatDuration(constraints.minDuration)})`);
    }

    // Check resolution
    if (constraints.minResolution && metadata.resolution) {
      if (metadata.resolution.width < constraints.minResolution.width ||
          metadata.resolution.height < constraints.minResolution.height) {
        warnings.push(`Resolution (${metadata.resolution.width}x${metadata.resolution.height}) is below recommended (${constraints.minResolution.width}x${constraints.minResolution.height})`);
      }
    }

    // Additional quality checks
    if (metadata.bitrate && metadata.bitrate < 1000) {
      warnings.push('Bitrate is very low. Video quality may be poor.');
    }

    if (metadata.fps && metadata.fps < 24) {
      warnings.push('Frame rate is low. Video may appear choppy.');
    }

  } catch (error) {
    errors.push('Failed to validate video: ' + (error as Error).message);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Get video duration
 */
function getVideoDuration(blob: Blob): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.src = URL.createObjectURL(blob);
    
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      resolve(video.duration);
    };
    
    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error('Failed to load video'));
    };
  });
}

/**
 * Format bytes to human readable
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Format duration to human readable
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Convert blob to base64
 */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert blob to base64'));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Compress video blob (client-side reduction)
 */
export async function compressVideo(
  blob: Blob,
  quality: 'low' | 'medium' | 'high' = 'medium'
): Promise<Blob> {
  // Note: True video compression requires server-side processing
  // This is a placeholder that could implement client-side optimization
  // such as reducing resolution or adjusting quality parameters
  
  console.warn('Client-side video compression is limited. Consider server-side transcoding.');
  return blob;
}

/**
 * Create processing status tracker
 */
export function createProcessingTracker(steps: string[]): {
  status: ProcessingStatus;
  startStep: (stepName: string) => void;
  completeStep: (stepName: string) => void;
  failStep: (stepName: string, error: string) => void;
  updateProgress: (stepName: string, progress: number) => void;
} {
  const processingSteps: ProcessingStep[] = steps.map(name => ({
    name,
    status: 'pending',
    progress: 0
  }));

  const status: ProcessingStatus = {
    state: 'pending',
    progress: 0,
    steps: processingSteps
  };

  return {
    status,
    startStep: (stepName: string) => {
      const step = processingSteps.find(s => s.name === stepName);
      if (step) {
        step.status = 'running';
        step.startTime = new Date();
        status.currentStep = step;
        status.state = 'transcoding';
      }
    },
    completeStep: (stepName: string) => {
      const step = processingSteps.find(s => s.name === stepName);
      if (step) {
        step.status = 'completed';
        step.endTime = new Date();
        step.progress = 100;
        
        // Update overall progress
        const completed = processingSteps.filter(s => s.status === 'completed').length;
        status.progress = (completed / processingSteps.length) * 100;
        
        // Check if all steps completed
        if (completed === processingSteps.length) {
          status.state = 'completed';
        }
      }
    },
    failStep: (stepName: string, error: string) => {
      const step = processingSteps.find(s => s.name === stepName);
      if (step) {
        step.status = 'failed';
        step.endTime = new Date();
        step.error = error;
        status.state = 'failed';
        status.error = {
          step: stepName,
          code: 'PROCESSING_ERROR',
          message: error,
          timestamp: new Date(),
          recoverable: false
        };
      }
    },
    updateProgress: (stepName: string, progress: number) => {
      const step = processingSteps.find(s => s.name === stepName);
      if (step) {
        step.progress = progress;
      }
    }
  };
}
