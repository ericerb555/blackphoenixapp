/**
 * Enterprise Video Capture System - Type Definitions
 * 
 * Comprehensive type system for professional video capture, processing, and management
 */

// ============================================================================
// Core Video Types
// ============================================================================

export type VideoQualityPreset = '4k' | '1080p' | '720p' | '480p' | '360p' | 'auto';
export type VideoCodec = 'vp9' | 'vp8' | 'h264' | 'av1';
export type AudioCodec = 'opus' | 'aac' | 'vorbis';
export type VideoFormat = 'webm' | 'mp4' | 'mkv';
export type CameraFacing = 'user' | 'environment';
export type RecordingState = 'idle' | 'preparing' | 'recording' | 'paused' | 'stopping' | 'processing';
export type UploadState = 'idle' | 'queued' | 'uploading' | 'paused' | 'completed' | 'failed' | 'cancelled';
export type ProcessingState = 'pending' | 'transcoding' | 'thumbnail_generation' | 'validation' | 'completed' | 'failed';

export interface VideoQualityConfig {
  preset: VideoQualityPreset;
  width: number;
  height: number;
  frameRate: number;
  videoBitrate: number; // kbps
  audioBitrate: number; // kbps
  videoCodec: VideoCodec;
  audioCodec: AudioCodec;
}

export const QUALITY_PRESETS: Record<VideoQualityPreset, Omit<VideoQualityConfig, 'preset'>> = {
  '4k': {
    width: 3840,
    height: 2160,
    frameRate: 30,
    videoBitrate: 20000,
    audioBitrate: 192,
    videoCodec: 'vp9',
    audioCodec: 'opus'
  },
  '1080p': {
    width: 1920,
    height: 1080,
    frameRate: 30,
    videoBitrate: 8000,
    audioBitrate: 128,
    videoCodec: 'vp9',
    audioCodec: 'opus'
  },
  '720p': {
    width: 1280,
    height: 720,
    frameRate: 30,
    videoBitrate: 5000,
    audioBitrate: 128,
    videoCodec: 'vp9',
    audioCodec: 'opus'
  },
  '480p': {
    width: 854,
    height: 480,
    frameRate: 30,
    videoBitrate: 2500,
    audioBitrate: 96,
    videoCodec: 'vp9',
    audioCodec: 'opus'
  },
  '360p': {
    width: 640,
    height: 360,
    frameRate: 30,
    videoBitrate: 1000,
    audioBitrate: 64,
    videoCodec: 'vp9',
    audioCodec: 'opus'
  },
  'auto': {
    width: 1920,
    height: 1080,
    frameRate: 30,
    videoBitrate: 5000,
    audioBitrate: 128,
    videoCodec: 'vp9',
    audioCodec: 'opus'
  }
};

// ============================================================================
// Recording Types
// ============================================================================

export interface VideoRecording {
  id: string;
  blob: Blob;
  url: string;
  duration: number;
  timestamp: Date;
  size: number;
  thumbnail?: string;
  thumbnails?: string[]; // Multiple thumbnails at different timestamps
  metadata: VideoMetadata;
  quality: VideoQualityConfig;
  analytics: RecordingAnalytics;
  uploadStatus?: UploadStatus;
  processingStatus?: ProcessingStatus;
  watermark?: WatermarkConfig;
  encryption?: EncryptionMetadata;
}

export interface VideoMetadata {
  title: string;
  description: string;
  category: VideoCategory;
  tags: string[];
  location?: GeolocationData;
  projectId?: string;
  customerId?: string;
  workOrderId?: string;
  uploadedBy: string;
  deviceInfo: DeviceInfo;
  resolution: {
    width: number;
    height: number;
  };
  codec: string;
  format: string;
  hasAudio: boolean;
  audioTracks: number;
  fps: number;
  bitrate: number;
}

export interface RecordingAnalytics {
  sessionId: string;
  startTime: Date;
  endTime?: Date;
  actualDuration: number;
  recordedDuration: number;
  pauseCount: number;
  totalPauseDuration: number;
  averageFps: number;
  droppedFrames: number;
  averageBitrate: number;
  peakBitrate: number;
  audioLevel: {
    average: number;
    peak: number;
  };
  errors: RecordingError[];
  warnings: RecordingWarning[];
}

export interface RecordingError {
  code: string;
  message: string;
  timestamp: Date;
  severity: 'critical' | 'high' | 'medium' | 'low';
  recovered: boolean;
  recoveryAction?: string;
}

export interface RecordingWarning {
  code: string;
  message: string;
  timestamp: Date;
  impact: 'quality' | 'performance' | 'storage' | 'compatibility';
}

// ============================================================================
// Upload Types
// ============================================================================

export interface UploadStatus {
  state: UploadState;
  progress: number; // 0-100
  uploadedBytes: number;
  totalBytes: number;
  speed: number; // bytes per second
  remainingTime?: number; // seconds
  chunks: ChunkStatus[];
  retryCount: number;
  error?: UploadError;
  startTime?: Date;
  completedTime?: Date;
}

export interface ChunkStatus {
  index: number;
  size: number;
  uploaded: boolean;
  retries: number;
  error?: string;
}

export interface UploadError {
  code: string;
  message: string;
  timestamp: Date;
  retryable: boolean;
  nextRetryIn?: number;
}

export interface UploadConfig {
  chunkSize: number; // bytes
  maxRetries: number;
  retryDelay: number; // ms
  timeout: number; // ms
  parallelChunks: number;
  useCompression: boolean;
  endpoint: string;
  headers?: Record<string, string>;
}

// ============================================================================
// Processing Types
// ============================================================================

export interface ProcessingStatus {
  state: ProcessingState;
  progress: number;
  steps: ProcessingStep[];
  currentStep?: ProcessingStep;
  error?: ProcessingError;
  output?: ProcessedVideoOutput;
}

export interface ProcessingStep {
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  startTime?: Date;
  endTime?: Date;
  error?: string;
}

export interface ProcessingError {
  step: string;
  code: string;
  message: string;
  timestamp: Date;
  recoverable: boolean;
}

export interface ProcessedVideoOutput {
  formats: {
    format: VideoFormat;
    url: string;
    size: number;
    quality: VideoQualityPreset;
  }[];
  thumbnails: {
    url: string;
    timestamp: number;
    width: number;
    height: number;
  }[];
  metadata: VideoMetadata;
  analytics: VideoAnalytics;
}

export interface VideoAnalytics {
  duration: number;
  fileSize: number;
  resolution: { width: number; height: number };
  bitrate: number;
  fps: number;
  codec: string;
  audioCodec?: string;
  quality: 'excellent' | 'good' | 'fair' | 'poor';
  recommendations: string[];
}

// ============================================================================
// Security Types
// ============================================================================

export interface WatermarkConfig {
  enabled: boolean;
  text?: string;
  image?: string;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  opacity: number;
  size: number;
}

export interface EncryptionMetadata {
  algorithm: 'AES-256-GCM' | 'AES-128-GCM';
  keyId: string;
  iv: string;
  encrypted: boolean;
  encryptedAt: Date;
}

export interface AccessControl {
  visibility: 'public' | 'private' | 'restricted';
  allowedUsers?: string[];
  allowedRoles?: string[];
  expiresAt?: Date;
  requiresAuthentication: boolean;
  downloadable: boolean;
}

// ============================================================================
// Device & Capability Types
// ============================================================================

export interface DeviceInfo {
  userAgent: string;
  platform: string;
  browser: string;
  browserVersion: string;
  os: string;
  osVersion: string;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  screenResolution: { width: number; height: number };
  availableMemory?: number;
  connectionType?: string;
  connectionSpeed?: 'slow-2g' | '2g' | '3g' | '4g' | 'wifi';
}

export interface DeviceCapabilities {
  supportsMediaRecorder: boolean;
  supportedMimeTypes: string[];
  supportedCodecs: {
    video: VideoCodec[];
    audio: AudioCodec[];
  };
  maxResolution: { width: number; height: number };
  cameras: MediaDeviceInfo[];
  microphones: MediaDeviceInfo[];
  speakers: MediaDeviceInfo[];
  supportsScreenCapture: boolean;
  supportsAudioWorklet: boolean;
  storageQuota?: {
    usage: number;
    quota: number;
  };
}

// ============================================================================
// Library & Category Types
// ============================================================================

export type VideoCategory = 
  | 'site_walkthrough' 
  | 'damage_documentation' 
  | 'progress_update' 
  | 'customer_request'
  | 'inspection'
  | 'training'
  | 'marketing'
  | 'testimony'
  | 'before_after'
  | 'time_lapse'
  | 'other';

export interface VideoLibraryItem extends VideoRecording {
  libraryMetadata: {
    views: number;
    downloads: number;
    shares: number;
    lastViewed?: Date;
    addedToLibraryAt: Date;
    starred: boolean;
    archived: boolean;
    version: number;
    previousVersions?: string[];
  };
  accessControl: AccessControl;
  searchMetadata: {
    indexedAt: Date;
    keywords: string[];
    transcription?: string;
    objects?: string[]; // AI-detected objects
    scenes?: string[]; // AI-detected scenes
  };
}

// ============================================================================
// Geolocation Types
// ============================================================================

export interface GeolocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude?: number;
  altitudeAccuracy?: number;
  heading?: number;
  speed?: number;
  timestamp: Date;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
  };
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface VideoCaptureConfig {
  quality: VideoQualityPreset;
  maxDuration: number; // seconds
  maxFileSize: number; // MB
  enableAudio: boolean;
  enableVideoEffects: boolean;
  cameraFacing: CameraFacing;
  autoStart: boolean;
  showPreview: boolean;
  generateThumbnails: boolean;
  thumbnailCount: number;
  enableWatermark: boolean;
  watermark?: WatermarkConfig;
  enableAnalytics: boolean;
  enableGeolocation: boolean;
  uploadConfig?: UploadConfig;
  storageConfig?: StorageConfig;
  accessControl?: AccessControl;
  allowedFormats: VideoFormat[];
  compressionEnabled: boolean;
}

export interface StorageConfig {
  provider: 'supabase' | 's3' | 'azure' | 'gcs' | 'local';
  bucket: string;
  path: string;
  cdnEnabled: boolean;
  cdnUrl?: string;
  retentionDays?: number;
  autoArchive: boolean;
}

// ============================================================================
// Event Types
// ============================================================================

export interface VideoEvent {
  type: VideoEventType;
  timestamp: Date;
  data?: any;
  recordingId?: string;
  sessionId?: string;
}

export type VideoEventType =
  | 'recording_started'
  | 'recording_paused'
  | 'recording_resumed'
  | 'recording_stopped'
  | 'recording_error'
  | 'upload_started'
  | 'upload_progress'
  | 'upload_completed'
  | 'upload_failed'
  | 'upload_cancelled'
  | 'processing_started'
  | 'processing_completed'
  | 'processing_failed'
  | 'thumbnail_generated'
  | 'quality_changed'
  | 'device_changed'
  | 'permission_denied'
  | 'storage_warning'
  | 'network_error';

// ============================================================================
// Batch Operations
// ============================================================================

export interface BatchOperation {
  id: string;
  type: 'delete' | 'archive' | 'export' | 'transcode' | 'tag' | 'move';
  items: string[]; // video IDs
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  startTime: Date;
  endTime?: Date;
  results: BatchOperationResult[];
  error?: string;
}

export interface BatchOperationResult {
  videoId: string;
  success: boolean;
  error?: string;
}

// ============================================================================
// Export Types
// ============================================================================

export interface ExportConfig {
  format: VideoFormat;
  quality: VideoQualityPreset;
  includeMetadata: boolean;
  includeThumbnails: boolean;
  watermark?: WatermarkConfig;
  compressionLevel: 'none' | 'low' | 'medium' | 'high';
  destination: 'download' | 'cloud' | 'email';
}

export interface ExportResult {
  success: boolean;
  url?: string;
  size?: number;
  format?: VideoFormat;
  error?: string;
  exportedAt: Date;
}
