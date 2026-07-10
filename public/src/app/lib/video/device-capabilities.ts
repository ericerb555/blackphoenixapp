/**
 * Enterprise Video Capture System - Device Capabilities Detection
 * 
 * Comprehensive device capability detection and validation
 */

import type { DeviceCapabilities, DeviceInfo, VideoCodec, AudioCodec } from './types';

/**
 * Detect comprehensive device capabilities
 */
export async function detectDeviceCapabilities(): Promise<DeviceCapabilities> {
  const capabilities: DeviceCapabilities = {
    supportsMediaRecorder: typeof MediaRecorder !== 'undefined',
    supportedMimeTypes: [],
    supportedCodecs: {
      video: [],
      audio: []
    },
    maxResolution: { width: 1920, height: 1080 },
    cameras: [],
    microphones: [],
    speakers: [],
    supportsScreenCapture: typeof navigator.mediaDevices?.getDisplayMedia !== 'undefined',
    supportsAudioWorklet: typeof AudioWorklet !== 'undefined',
  };

  // Check supported MIME types
  const mimeTypes = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=h264,opus',
    'video/webm;codecs=av1,opus',
    'video/webm',
    'video/mp4',
  ];

  capabilities.supportedMimeTypes = mimeTypes.filter(type => 
    MediaRecorder.isTypeSupported?.(type)
  );

  // Detect supported video codecs
  const videoCodecs: VideoCodec[] = ['vp9', 'vp8', 'h264', 'av1'];
  capabilities.supportedCodecs.video = videoCodecs.filter(codec =>
    capabilities.supportedMimeTypes.some(mime => mime.includes(codec))
  );

  // Detect supported audio codecs
  const audioCodecs: AudioCodec[] = ['opus', 'aac', 'vorbis'];
  capabilities.supportedCodecs.audio = audioCodecs.filter(codec =>
    capabilities.supportedMimeTypes.some(mime => mime.includes(codec))
  );

  // Enumerate media devices
  if (navigator.mediaDevices?.enumerateDevices) {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      capabilities.cameras = devices.filter(d => d.kind === 'videoinput');
      capabilities.microphones = devices.filter(d => d.kind === 'audioinput');
      capabilities.speakers = devices.filter(d => d.kind === 'audiooutput');
    } catch (error) {
      console.warn('Failed to enumerate devices:', error);
    }
  }

  // Check storage quota
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    try {
      const estimate = await navigator.storage.estimate();
      capabilities.storageQuota = {
        usage: estimate.usage || 0,
        quota: estimate.quota || 0
      };
    } catch (error) {
      console.warn('Failed to get storage estimate:', error);
    }
  }

  return capabilities;
}

/**
 * Get device information
 */
export function getDeviceInfo(): DeviceInfo {
  const ua = navigator.userAgent;
  
  // Parse browser
  let browser = 'Unknown';
  let browserVersion = 'Unknown';
  
  if (ua.includes('Chrome') && !ua.includes('Edg')) {
    browser = 'Chrome';
    browserVersion = ua.match(/Chrome\/(\d+)/)?.[1] || 'Unknown';
  } else if (ua.includes('Firefox')) {
    browser = 'Firefox';
    browserVersion = ua.match(/Firefox\/(\d+)/)?.[1] || 'Unknown';
  } else if (ua.includes('Safari') && !ua.includes('Chrome')) {
    browser = 'Safari';
    browserVersion = ua.match(/Version\/(\d+)/)?.[1] || 'Unknown';
  } else if (ua.includes('Edg')) {
    browser = 'Edge';
    browserVersion = ua.match(/Edg\/(\d+)/)?.[1] || 'Unknown';
  }

  // Parse OS
  let os = 'Unknown';
  let osVersion = 'Unknown';
  
  if (ua.includes('Windows NT')) {
    os = 'Windows';
    osVersion = ua.match(/Windows NT (\d+\.\d+)/)?.[1] || 'Unknown';
  } else if (ua.includes('Mac OS X')) {
    os = 'macOS';
    osVersion = ua.match(/Mac OS X (\d+[._]\d+)/)?.[1]?.replace('_', '.') || 'Unknown';
  } else if (ua.includes('Linux')) {
    os = 'Linux';
  } else if (ua.includes('Android')) {
    os = 'Android';
    osVersion = ua.match(/Android (\d+)/)?.[1] || 'Unknown';
  } else if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) {
    os = 'iOS';
    osVersion = ua.match(/OS (\d+[._]\d+)/)?.[1]?.replace('_', '.') || 'Unknown';
  }

  // Detect device type
  let deviceType: 'mobile' | 'tablet' | 'desktop' = 'desktop';
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    deviceType = 'tablet';
  } else if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
    deviceType = 'mobile';
  }

  // Get connection info
  const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
  const connectionType = connection?.effectiveType;
  const connectionSpeed = connection?.effectiveType as DeviceInfo['connectionSpeed'];

  return {
    userAgent: ua,
    platform: navigator.platform,
    browser,
    browserVersion,
    os,
    osVersion,
    deviceType,
    screenResolution: {
      width: screen.width,
      height: screen.height
    },
    availableMemory: (navigator as any).deviceMemory,
    connectionType: connection?.type,
    connectionSpeed
  };
}

/**
 * Check if device meets minimum requirements
 */
export function meetsMinimumRequirements(capabilities: DeviceCapabilities): {
  meets: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  if (!capabilities.supportsMediaRecorder) {
    issues.push('MediaRecorder API not supported');
  }

  if (capabilities.cameras.length === 0) {
    issues.push('No camera devices detected');
  }

  if (capabilities.microphones.length === 0) {
    issues.push('No microphone devices detected');
  }

  if (capabilities.supportedCodecs.video.length === 0) {
    issues.push('No supported video codecs found');
  }

  if (capabilities.storageQuota) {
    const availableSpace = capabilities.storageQuota.quota - capabilities.storageQuota.usage;
    const minRequired = 500 * 1024 * 1024; // 500MB
    if (availableSpace < minRequired) {
      issues.push(`Insufficient storage space (${Math.round(availableSpace / 1024 / 1024)}MB available, 500MB required)`);
    }
  }

  return {
    meets: issues.length === 0,
    issues
  };
}

/**
 * Get best MIME type for recording
 */
export function getBestMimeType(capabilities: DeviceCapabilities, preferredCodec?: VideoCodec): string {
  const preferredMimeTypes = [
    `video/webm;codecs=${preferredCodec || 'vp9'},opus`,
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=h264,opus',
    'video/webm',
  ];

  for (const mimeType of preferredMimeTypes) {
    if (capabilities.supportedMimeTypes.includes(mimeType)) {
      return mimeType;
    }
  }

  return capabilities.supportedMimeTypes[0] || 'video/webm';
}

/**
 * Request media permissions
 */
export async function requestMediaPermissions(options: {
  video?: boolean;
  audio?: boolean;
  screen?: boolean;
}): Promise<{
  granted: boolean;
  stream?: MediaStream;
  error?: string;
}> {
  try {
    const constraints: MediaStreamConstraints = {};
    
    if (options.video) {
      constraints.video = true;
    }
    
    if (options.audio) {
      constraints.audio = true;
    }

    let stream: MediaStream;

    if (options.screen) {
      if (!navigator.mediaDevices.getDisplayMedia) {
        return {
          granted: false,
          error: 'Screen capture not supported on this device'
        };
      }
      stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: options.audio
      });
    } else {
      stream = await navigator.mediaDevices.getUserMedia(constraints);
    }

    return {
      granted: true,
      stream
    };
  } catch (error: any) {
    let errorMessage = 'Permission denied';
    
    if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
      errorMessage = 'Camera/microphone permission denied. Please allow access in your browser settings.';
    } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
      errorMessage = 'No camera or microphone found on this device.';
    } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
      errorMessage = 'Camera/microphone is already in use by another application.';
    } else if (error.name === 'OverconstrainedError') {
      errorMessage = 'Camera does not support the requested settings.';
    } else if (error.name === 'SecurityError') {
      errorMessage = 'Camera access blocked for security reasons. Please use HTTPS.';
    }

    return {
      granted: false,
      error: errorMessage
    };
  }
}

/**
 * Check network quality
 */
export async function checkNetworkQuality(): Promise<{
  quality: 'excellent' | 'good' | 'fair' | 'poor';
  downloadSpeed?: number; // Mbps
  uploadSpeed?: number; // Mbps
  latency?: number; // ms
  recommendation: string;
}> {
  const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
  
  if (!connection) {
    return {
      quality: 'good',
      recommendation: 'Network quality detection not available'
    };
  }

  const effectiveType = connection.effectiveType;
  const downlink = connection.downlink; // Mbps
  const rtt = connection.rtt; // ms

  let quality: 'excellent' | 'good' | 'fair' | 'poor';
  let recommendation: string;

  if (effectiveType === '4g' && downlink > 10) {
    quality = 'excellent';
    recommendation = 'Network is excellent for HD video recording';
  } else if (effectiveType === '4g' || (effectiveType === 'wifi' && downlink > 5)) {
    quality = 'good';
    recommendation = 'Network is good for standard video recording';
  } else if (effectiveType === '3g' || downlink > 1) {
    quality = 'fair';
    recommendation = 'Network is fair. Consider lower quality settings';
  } else {
    quality = 'poor';
    recommendation = 'Network is poor. Recording may fail. Use WiFi for best results';
  }

  return {
    quality,
    downloadSpeed: downlink,
    latency: rtt,
    recommendation
  };
}

/**
 * Format storage size
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Format duration
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
 * Estimate recording file size
 */
export function estimateFileSize(durationSeconds: number, videoBitrate: number, audioBitrate: number): number {
  // Total bitrate in bits per second
  const totalBitrate = (videoBitrate + audioBitrate) * 1000;
  
  // File size in bytes (with 10% overhead for container format)
  const sizeBytes = (totalBitrate * durationSeconds / 8) * 1.1;
  
  return Math.round(sizeBytes);
}
