/**
 * Enterprise Video Capture System - Upload Manager
 * 
 * Chunked upload with retry logic, progress tracking, and bandwidth optimization
 */

import type { UploadStatus, UploadConfig, UploadError, ChunkStatus } from './types';

export class VideoUploadManager {
  private uploadQueue: Map<string, VideoUpload> = new Map();
  private activeUploads: Set<string> = new Set();
  private maxConcurrentUploads = 3;

  /**
   * Add video to upload queue
   */
  async queueUpload(
    videoId: string,
    blob: Blob,
    metadata: any,
    config: UploadConfig,
    onProgress?: (status: UploadStatus) => void
  ): Promise<void> {
    const upload = new VideoUpload(videoId, blob, metadata, config, onProgress);
    this.uploadQueue.set(videoId, upload);
    
    // Start upload if under concurrent limit
    if (this.activeUploads.size < this.maxConcurrentUploads) {
      this.processNextUpload();
    }
  }

  /**
   * Process next upload in queue
   */
  private async processNextUpload(): Promise<void> {
    if (this.activeUploads.size >= this.maxConcurrentUploads) {
      return;
    }

    for (const [videoId, upload] of this.uploadQueue.entries()) {
      if (upload.status.state === 'queued' && !this.activeUploads.has(videoId)) {
        this.activeUploads.add(videoId);
        
        try {
          await upload.start();
        } catch (error) {
          console.error(`Upload failed for ${videoId}:`, error);
        } finally {
          this.activeUploads.delete(videoId);
          this.uploadQueue.delete(videoId);
          
          // Process next in queue
          this.processNextUpload();
        }
        
        break;
      }
    }
  }

  /**
   * Pause upload
   */
  pauseUpload(videoId: string): void {
    const upload = this.uploadQueue.get(videoId);
    if (upload) {
      upload.pause();
    }
  }

  /**
   * Resume upload
   */
  async resumeUpload(videoId: string): Promise<void> {
    const upload = this.uploadQueue.get(videoId);
    if (upload) {
      await upload.resume();
    }
  }

  /**
   * Cancel upload
   */
  cancelUpload(videoId: string): void {
    const upload = this.uploadQueue.get(videoId);
    if (upload) {
      upload.cancel();
      this.uploadQueue.delete(videoId);
      this.activeUploads.delete(videoId);
      
      // Process next in queue
      this.processNextUpload();
    }
  }

  /**
   * Retry failed upload
   */
  async retryUpload(videoId: string): Promise<void> {
    const upload = this.uploadQueue.get(videoId);
    if (upload && upload.status.state === 'failed') {
      await upload.retry();
    }
  }

  /**
   * Get upload status
   */
  getStatus(videoId: string): UploadStatus | undefined {
    return this.uploadQueue.get(videoId)?.status;
  }

  /**
   * Get all upload statuses
   */
  getAllStatuses(): Map<string, UploadStatus> {
    const statuses = new Map<string, UploadStatus>();
    for (const [videoId, upload] of this.uploadQueue.entries()) {
      statuses.set(videoId, upload.status);
    }
    return statuses;
  }
}

/**
 * Individual video upload handler
 */
class VideoUpload {
  status: UploadStatus;
  private chunks: Blob[] = [];
  private abortController: AbortController | null = null;
  private retryTimeouts: NodeJS.Timeout[] = [];

  constructor(
    private videoId: string,
    private blob: Blob,
    private metadata: any,
    private config: UploadConfig,
    private onProgress?: (status: UploadStatus) => void
  ) {
    this.status = {
      state: 'queued',
      progress: 0,
      uploadedBytes: 0,
      totalBytes: blob.size,
      speed: 0,
      chunks: [],
      retryCount: 0
    };

    this.prepareChunks();
  }

  /**
   * Split blob into chunks
   */
  private prepareChunks(): void {
    const chunkSize = this.config.chunkSize;
    const totalChunks = Math.ceil(this.blob.size / chunkSize);

    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, this.blob.size);
      const chunk = this.blob.slice(start, end);
      this.chunks.push(chunk);

      this.status.chunks.push({
        index: i,
        size: chunk.size,
        uploaded: false,
        retries: 0
      });
    }
  }

  /**
   * Start upload
   */
  async start(): Promise<void> {
    this.status.state = 'uploading';
    this.status.startTime = new Date();
    this.abortController = new AbortController();

    try {
      // Upload chunks in parallel (up to config.parallelChunks)
      await this.uploadChunks();
      
      // Finalize upload
      await this.finalizeUpload();
      
      this.status.state = 'completed';
      this.status.completedTime = new Date();
      this.status.progress = 100;
      
      this.onProgress?.(this.status);
    } catch (error: any) {
      await this.handleError(error);
    }
  }

  /**
   * Upload chunks
   */
  private async uploadChunks(): Promise<void> {
    const parallelChunks = this.config.parallelChunks || 3;
    const uploadPromises: Promise<void>[] = [];

    for (let i = 0; i < this.chunks.length; i++) {
      const chunkStatus = this.status.chunks[i];
      
      if (chunkStatus.uploaded) {
        continue;
      }

      // Wait if we've hit parallel limit
      if (uploadPromises.length >= parallelChunks) {
        await Promise.race(uploadPromises);
      }

      const promise = this.uploadChunk(i)
        .then(() => {
          const index = uploadPromises.indexOf(promise);
          if (index > -1) {
            uploadPromises.splice(index, 1);
          }
        })
        .catch(error => {
          throw error;
        });

      uploadPromises.push(promise);
    }

    // Wait for all remaining uploads
    await Promise.all(uploadPromises);
  }

  /**
   * Upload single chunk
   */
  private async uploadChunk(index: number): Promise<void> {
    const chunk = this.chunks[index];
    const chunkStatus = this.status.chunks[index];
    const startTime = Date.now();

    let retries = 0;
    const maxRetries = this.config.maxRetries;

    while (retries <= maxRetries) {
      try {
        const formData = new FormData();
        formData.append('chunk', chunk);
        formData.append('videoId', this.videoId);
        formData.append('chunkIndex', index.toString());
        formData.append('totalChunks', this.chunks.length.toString());
        
        if (index === 0) {
          formData.append('metadata', JSON.stringify(this.metadata));
        }

        const response = await fetch(this.config.endpoint, {
          method: 'POST',
          body: formData,
          headers: this.config.headers,
          signal: this.abortController?.signal,
        });

        if (!response.ok) {
          throw new Error(`Upload failed: ${response.statusText}`);
        }

        // Mark chunk as uploaded
        chunkStatus.uploaded = true;
        chunkStatus.retries = retries;

        // Update progress
        this.updateProgress(chunk.size, Date.now() - startTime);

        return;
      } catch (error: any) {
        if (error.name === 'AbortError') {
          throw error;
        }

        retries++;
        chunkStatus.retries = retries;

        if (retries > maxRetries) {
          chunkStatus.error = error.message;
          throw new Error(`Chunk ${index} failed after ${maxRetries} retries: ${error.message}`);
        }

        // Exponential backoff
        const delay = this.config.retryDelay * Math.pow(2, retries - 1);
        await this.sleep(delay);
      }
    }
  }

  /**
   * Update progress
   */
  private updateProgress(bytesUploaded: number, timeTaken: number): void {
    this.status.uploadedBytes += bytesUploaded;
    this.status.progress = (this.status.uploadedBytes / this.status.totalBytes) * 100;
    
    // Calculate upload speed (bytes per second)
    this.status.speed = bytesUploaded / (timeTaken / 1000);
    
    // Estimate remaining time
    const remainingBytes = this.status.totalBytes - this.status.uploadedBytes;
    this.status.remainingTime = Math.round(remainingBytes / this.status.speed);

    this.onProgress?.(this.status);
  }

  /**
   * Finalize upload
   */
  private async finalizeUpload(): Promise<void> {
    const response = await fetch(`${this.config.endpoint}/finalize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.config.headers
      },
      body: JSON.stringify({
        videoId: this.videoId,
        totalChunks: this.chunks.length,
        totalSize: this.blob.size,
        metadata: this.metadata
      })
    });

    if (!response.ok) {
      throw new Error(`Finalization failed: ${response.statusText}`);
    }
  }

  /**
   * Pause upload
   */
  pause(): void {
    if (this.status.state === 'uploading') {
      this.abortController?.abort();
      this.status.state = 'paused';
      this.onProgress?.(this.status);
    }
  }

  /**
   * Resume upload
   */
  async resume(): Promise<void> {
    if (this.status.state === 'paused') {
      this.abortController = new AbortController();
      await this.start();
    }
  }

  /**
   * Cancel upload
   */
  cancel(): void {
    this.abortController?.abort();
    this.retryTimeouts.forEach(timeout => clearTimeout(timeout));
    this.status.state = 'cancelled';
    this.onProgress?.(this.status);
  }

  /**
   * Retry failed upload
   */
  async retry(): Promise<void> {
    this.status.retryCount++;
    
    // Reset chunk statuses
    this.status.chunks.forEach(chunk => {
      if (chunk.error) {
        chunk.uploaded = false;
        chunk.error = undefined;
      }
    });

    await this.start();
  }

  /**
   * Handle upload error
   */
  private async handleError(error: any): Promise<void> {
    const uploadError: UploadError = {
      code: error.code || 'UPLOAD_ERROR',
      message: error.message,
      timestamp: new Date(),
      retryable: this.isRetryableError(error)
    };

    this.status.state = 'failed';
    this.status.error = uploadError;

    // Auto-retry if error is retryable and we haven't exceeded max retries
    if (uploadError.retryable && this.status.retryCount < this.config.maxRetries) {
      const delay = this.config.retryDelay * Math.pow(2, this.status.retryCount);
      uploadError.nextRetryIn = delay;
      
      this.onProgress?.(this.status);

      const timeout = setTimeout(() => {
        this.retry();
      }, delay);
      
      this.retryTimeouts.push(timeout);
    } else {
      this.onProgress?.(this.status);
    }
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: any): boolean {
    // Network errors are typically retryable
    if (error.name === 'NetworkError' || error.message.includes('network')) {
      return true;
    }

    // Timeout errors are retryable
    if (error.name === 'TimeoutError' || error.message.includes('timeout')) {
      return true;
    }

    // 5xx server errors are retryable
    if (error.status >= 500 && error.status < 600) {
      return true;
    }

    // 429 (rate limit) is retryable
    if (error.status === 429) {
      return true;
    }

    return false;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Default upload configuration
export const DEFAULT_UPLOAD_CONFIG: UploadConfig = {
  chunkSize: 5 * 1024 * 1024, // 5MB chunks
  maxRetries: 3,
  retryDelay: 1000, // 1 second base delay
  timeout: 30000, // 30 seconds
  parallelChunks: 3,
  useCompression: false,
  endpoint: '/api/video/upload'
};
