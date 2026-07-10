/**
 * Enterprise Video Capture System - Main Export
 * 
 * Centralized exports for all video capture functionality
 */

// Type exports
export type {
  VideoRecording,
  VideoMetadata,
  VideoQualityPreset,
  VideoQualityConfig,
  VideoCodec,
  AudioCodec,
  VideoFormat,
  CameraFacing,
  RecordingState,
  UploadState,
  ProcessingState,
  RecordingAnalytics,
  RecordingError,
  RecordingWarning,
  UploadStatus,
  UploadConfig,
  UploadError,
  ChunkStatus,
  ProcessingStatus,
  ProcessingStep,
  ProcessingError,
  ProcessedVideoOutput,
  VideoAnalytics,
  WatermarkConfig,
  EncryptionMetadata,
  AccessControl,
  DeviceInfo,
  DeviceCapabilities,
  VideoCategory,
  VideoLibraryItem,
  GeolocationData,
  VideoCaptureConfig,
  StorageConfig,
  VideoEvent,
  VideoEventType,
  BatchOperation,
  BatchOperationResult,
  ExportConfig,
  ExportResult
} from './types';

// Quality presets
export { QUALITY_PRESETS } from './types';

// Device capabilities
export {
  detectDeviceCapabilities,
  getDeviceInfo,
  meetsMinimumRequirements,
  getBestMimeType,
  requestMediaPermissions,
  checkNetworkQuality,
  formatBytes,
  formatDuration,
  estimateFileSize
} from './device-capabilities';

// Upload manager
export {
  VideoUploadManager,
  DEFAULT_UPLOAD_CONFIG
} from './upload-manager';

// Analytics tracker
export {
  VideoAnalyticsTracker,
  VideoAnalyticsAggregator
} from './analytics-tracker';

// Processing utilities
export {
  generateThumbnails,
  extractVideoMetadata,
  analyzeVideoQuality,
  validateVideo,
  formatBytes as formatBytesUtil,
  formatDuration as formatDurationUtil,
  blobToBase64,
  compressVideo,
  createProcessingTracker
} from './processing-utils';
