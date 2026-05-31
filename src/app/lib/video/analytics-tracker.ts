/**
 * Enterprise Video Capture System - Analytics Tracker
 * 
 * Comprehensive analytics and monitoring for video recording sessions
 */

import type { 
  RecordingAnalytics, 
  RecordingError, 
  RecordingWarning,
  VideoEvent,
  VideoEventType 
} from './types';

export class VideoAnalyticsTracker {
  private analytics: RecordingAnalytics;
  private frameCountInterval: number | null = null;
  private bitrateCheckInterval: number | null = null;
  private audioLevelInterval: number | null = null;
  private events: VideoEvent[] = [];

  constructor(private sessionId: string) {
    this.analytics = {
      sessionId,
      startTime: new Date(),
      actualDuration: 0,
      recordedDuration: 0,
      pauseCount: 0,
      totalPauseDuration: 0,
      averageFps: 0,
      droppedFrames: 0,
      averageBitrate: 0,
      peakBitrate: 0,
      audioLevel: {
        average: 0,
        peak: 0
      },
      errors: [],
      warnings: []
    };
  }

  /**
   * Start tracking recording session
   */
  startTracking(stream: MediaStream, mediaRecorder: MediaRecorder): void {
    this.analytics.startTime = new Date();
    
    // Track frame rate
    this.trackFrameRate(stream);
    
    // Track bitrate
    this.trackBitrate(mediaRecorder);
    
    // Track audio levels
    this.trackAudioLevel(stream);
  }

  /**
   * Stop tracking
   */
  stopTracking(): RecordingAnalytics {
    this.analytics.endTime = new Date();
    this.analytics.actualDuration = (this.analytics.endTime.getTime() - this.analytics.startTime.getTime()) / 1000;

    if (this.frameCountInterval) clearInterval(this.frameCountInterval);
    if (this.bitrateCheckInterval) clearInterval(this.bitrateCheckInterval);
    if (this.audioLevelInterval) clearInterval(this.audioLevelInterval);

    return this.analytics;
  }

  /**
   * Track frame rate and dropped frames
   */
  private trackFrameRate(stream: MediaStream): void {
    const videoTrack = stream.getVideoTracks()[0];
    if (!videoTrack) return;

    let lastFrameCount = 0;
    let totalFps = 0;
    let fpsChecks = 0;

    this.frameCountInterval = window.setInterval(async () => {
      try {
        // @ts-ignore - getStats is experimental but widely supported
        if (videoTrack.getStats) {
          // @ts-ignore
          const stats = await videoTrack.getStats();
          const frameCount = stats.framesReceived || stats.framesDecoded || 0;
          
          const fps = frameCount - lastFrameCount;
          lastFrameCount = frameCount;

          totalFps += fps;
          fpsChecks++;
          this.analytics.averageFps = Math.round(totalFps / fpsChecks);

          // Check for dropped frames (if FPS drops below 24)
          if (fps < 24) {
            this.analytics.droppedFrames += (30 - fps); // Assuming 30 FPS target
            
            this.addWarning({
              code: 'LOW_FPS',
              message: `Frame rate dropped to ${fps} FPS`,
              timestamp: new Date(),
              impact: 'quality'
            });
          }
        }
      } catch (error) {
        console.warn('Failed to get video track stats:', error);
      }
    }, 1000);
  }

  /**
   * Track bitrate
   */
  private trackBitrate(mediaRecorder: MediaRecorder): void {
    let totalBitrate = 0;
    let bitrateChecks = 0;
    let lastSize = 0;

    this.bitrateCheckInterval = window.setInterval(() => {
      // Estimate bitrate from data received
      // Note: This is an approximation as MediaRecorder doesn't expose real-time bitrate
      const currentBitrate = this.estimateBitrate(lastSize);
      
      if (currentBitrate > 0) {
        totalBitrate += currentBitrate;
        bitrateChecks++;
        this.analytics.averageBitrate = Math.round(totalBitrate / bitrateChecks);
        
        if (currentBitrate > this.analytics.peakBitrate) {
          this.analytics.peakBitrate = currentBitrate;
        }
      }
    }, 1000);
  }

  /**
   * Estimate bitrate (simplified)
   */
  private estimateBitrate(lastSize: number): number {
    // This would need to be connected to actual data size
    // For now, returning 0 as placeholder
    return 0;
  }

  /**
   * Track audio levels
   */
  private trackAudioLevel(stream: MediaStream): void {
    const audioTrack = stream.getAudioTracks()[0];
    if (!audioTrack) return;

    try {
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      let totalLevel = 0;
      let levelChecks = 0;

      this.audioLevelInterval = window.setInterval(() => {
        analyser.getByteFrequencyData(dataArray);
        
        // Calculate average audio level
        const sum = dataArray.reduce((a, b) => a + b, 0);
        const average = sum / dataArray.length;
        const level = Math.round((average / 255) * 100);

        totalLevel += level;
        levelChecks++;
        this.analytics.audioLevel.average = Math.round(totalLevel / levelChecks);
        
        if (level > this.analytics.audioLevel.peak) {
          this.analytics.audioLevel.peak = level;
        }

        // Warn if audio is too quiet
        if (level < 5 && levelChecks > 3) {
          this.addWarning({
            code: 'LOW_AUDIO',
            message: 'Audio level is very low. Check microphone.',
            timestamp: new Date(),
            impact: 'quality'
          });
        }
      }, 500);
    } catch (error) {
      console.warn('Failed to track audio levels:', error);
    }
  }

  /**
   * Record pause event
   */
  recordPause(): void {
    this.analytics.pauseCount++;
  }

  /**
   * Update recorded duration
   */
  updateRecordedDuration(duration: number): void {
    this.analytics.recordedDuration = duration;
  }

  /**
   * Update pause duration
   */
  updatePauseDuration(duration: number): void {
    this.analytics.totalPauseDuration = duration;
  }

  /**
   * Add error
   */
  addError(error: RecordingError): void {
    this.analytics.errors.push(error);
    
    this.trackEvent({
      type: 'recording_error',
      timestamp: new Date(),
      data: error,
      sessionId: this.sessionId
    });
  }

  /**
   * Add warning
   */
  addWarning(warning: RecordingWarning): void {
    // Deduplicate warnings (don't add same warning within 10 seconds)
    const recentWarning = this.analytics.warnings.find(w => 
      w.code === warning.code && 
      (new Date().getTime() - w.timestamp.getTime()) < 10000
    );

    if (!recentWarning) {
      this.analytics.warnings.push(warning);
    }
  }

  /**
   * Track event
   */
  trackEvent(event: VideoEvent): void {
    this.events.push(event);
    
    // In a real app, this would send to analytics service
    console.debug('[Video Analytics]', event.type, event.data);
  }

  /**
   * Get current analytics
   */
  getAnalytics(): RecordingAnalytics {
    return { ...this.analytics };
  }

  /**
   * Get all events
   */
  getEvents(): VideoEvent[] {
    return [...this.events];
  }

  /**
   * Generate session report
   */
  generateReport(): {
    analytics: RecordingAnalytics;
    events: VideoEvent[];
    summary: {
      quality: 'excellent' | 'good' | 'fair' | 'poor';
      issues: string[];
      recommendations: string[];
    };
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];
    let quality: 'excellent' | 'good' | 'fair' | 'poor' = 'excellent';

    // Analyze FPS
    if (this.analytics.averageFps < 24) {
      quality = 'poor';
      issues.push(`Low frame rate: ${this.analytics.averageFps} FPS`);
      recommendations.push('Close other applications to improve performance');
    } else if (this.analytics.averageFps < 28) {
      quality = quality === 'excellent' ? 'good' : quality;
      issues.push(`Below optimal frame rate: ${this.analytics.averageFps} FPS`);
    }

    // Analyze dropped frames
    if (this.analytics.droppedFrames > 100) {
      quality = quality === 'excellent' ? 'fair' : 'poor';
      issues.push(`High number of dropped frames: ${this.analytics.droppedFrames}`);
      recommendations.push('Reduce video quality or close background applications');
    }

    // Analyze audio
    if (this.analytics.audioLevel.average < 10) {
      quality = quality === 'excellent' ? 'good' : quality;
      issues.push('Low audio levels detected');
      recommendations.push('Increase microphone volume or move closer to the mic');
    }

    // Analyze errors
    const criticalErrors = this.analytics.errors.filter(e => e.severity === 'critical');
    if (criticalErrors.length > 0) {
      quality = 'poor';
      issues.push(`${criticalErrors.length} critical error(s) occurred`);
      recommendations.push('Review error log and retry recording');
    }

    // Analyze pauses
    if (this.analytics.pauseCount > 5) {
      issues.push(`Recording paused ${this.analytics.pauseCount} times`);
      recommendations.push('Try to record in one continuous take for better quality');
    }

    return {
      analytics: this.analytics,
      events: this.events,
      summary: {
        quality,
        issues,
        recommendations
      }
    };
  }
}

/**
 * Global analytics aggregator
 */
export class VideoAnalyticsAggregator {
  private sessions: Map<string, RecordingAnalytics> = new Map();

  /**
   * Add session analytics
   */
  addSession(analytics: RecordingAnalytics): void {
    this.sessions.set(analytics.sessionId, analytics);
  }

  /**
   * Get aggregate statistics
   */
  getAggregateStats(): {
    totalSessions: number;
    totalDuration: number;
    averageDuration: number;
    totalErrors: number;
    totalWarnings: number;
    averageFps: number;
    qualityDistribution: {
      excellent: number;
      good: number;
      fair: number;
      poor: number;
    };
  } {
    const sessions = Array.from(this.sessions.values());
    
    let totalDuration = 0;
    let totalFps = 0;
    let totalErrors = 0;
    let totalWarnings = 0;
    
    const qualityDistribution = {
      excellent: 0,
      good: 0,
      fair: 0,
      poor: 0
    };

    sessions.forEach(session => {
      totalDuration += session.recordedDuration;
      totalFps += session.averageFps;
      totalErrors += session.errors.length;
      totalWarnings += session.warnings.length;

      // Determine quality
      if (session.averageFps >= 28 && session.droppedFrames < 50 && session.errors.length === 0) {
        qualityDistribution.excellent++;
      } else if (session.averageFps >= 24 && session.droppedFrames < 100) {
        qualityDistribution.good++;
      } else if (session.averageFps >= 20) {
        qualityDistribution.fair++;
      } else {
        qualityDistribution.poor++;
      }
    });

    return {
      totalSessions: sessions.length,
      totalDuration,
      averageDuration: sessions.length > 0 ? totalDuration / sessions.length : 0,
      totalErrors,
      totalWarnings,
      averageFps: sessions.length > 0 ? totalFps / sessions.length : 0,
      qualityDistribution
    };
  }

  /**
   * Export analytics data
   */
  exportData(): string {
    const data = {
      exportedAt: new Date().toISOString(),
      sessions: Array.from(this.sessions.values()),
      aggregateStats: this.getAggregateStats()
    };

    return JSON.stringify(data, null, 2);
  }
}
