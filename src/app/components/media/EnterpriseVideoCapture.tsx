/**
 * Enterprise Video Capture Component
 * 
 * Professional-grade video recording with advanced features:
 * - Quality presets (4K, 1080p, 720p, 480p, 360p)
 * - Real-time analytics and monitoring
 * - Chunked upload with retry logic
 * - Audio level visualization
 * - Device capability detection
 * - Comprehensive error handling
 * - Accessibility compliant
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Video, VideoOff, Circle, Square, Play, Pause, Download,
  Trash2, Camera, RotateCcw, Settings, AlertCircle, CheckCircle2,
  Maximize2, Minimize2, Monitor, User, Activity, Wifi, WifiOff,
  HardDrive, Clock, Zap, Info, ChevronDown, Upload, XCircle
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { toast } from 'sonner@2.0.3';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';
import { Alert, AlertDescription } from '../ui/alert';

import type { 
  VideoRecording, 
  VideoQualityPreset, 
  DeviceCapabilities,
  RecordingState,
  UploadStatus
} from '../../lib/video/types';
import { QUALITY_PRESETS } from '../../lib/video/types';
import { 
  detectDeviceCapabilities, 
  getDeviceInfo,
  meetsMinimumRequirements,
  getBestMimeType,
  requestMediaPermissions,
  checkNetworkQuality,
  formatBytes,
  formatDuration,
  estimateFileSize
} from '../../lib/video/device-capabilities';
import { VideoAnalyticsTracker } from '../../lib/video/analytics-tracker';
import { 
  generateThumbnails, 
  extractVideoMetadata, 
  analyzeVideoQuality,
  validateVideo 
} from '../../lib/video/processing-utils';
import { VideoUploadManager, DEFAULT_UPLOAD_CONFIG } from '../../lib/video/upload-manager';

interface EnterpriseVideoCaptureProps {
  onVideoRecorded?: (recording: VideoRecording) => void;
  onVideosChanged?: (recordings: VideoRecording[]) => void;
  maxDuration?: number;
  maxFileSize?: number;
  showThumbnails?: boolean;
  allowMultiple?: boolean;
  enableUpload?: boolean;
  enableAnalytics?: boolean;
  defaultQuality?: VideoQualityPreset;
}

export function EnterpriseVideoCapture({
  onVideoRecorded,
  onVideosChanged,
  maxDuration = 600,
  maxFileSize = 500,
  showThumbnails = true,
  allowMultiple = true,
  enableUpload = false,
  enableAnalytics = true,
  defaultQuality = '1080p'
}: EnterpriseVideoCaptureProps) {
  // State
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [isPaused, setIsPaused] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordings, setRecordings] = useState<VideoRecording[]>([]);
  const [selectedRecording, setSelectedRecording] = useState<VideoRecording | null>(null);
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('user');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [quality, setQuality] = useState<VideoQualityPreset>(defaultQuality);
  const [capabilities, setCapabilities] = useState<DeviceCapabilities | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [networkQuality, setNetworkQuality] = useState<any>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [selectedMicrophone, setSelectedMicrophone] = useState<string>('');
  const [uploadStatuses, setUploadStatuses] = useState<Map<string, UploadStatus>>(new Map());
  const [storageUsage, setStorageUsage] = useState<{ usage: number; quota: number } | null>(null);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const recordingStartTimeRef = useRef<number>(0);
  const pausedTimeRef = useRef<number>(0);
  const analyticsTrackerRef = useRef<VideoAnalyticsTracker | null>(null);
  const uploadManagerRef = useRef<VideoUploadManager>(new VideoUploadManager());
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioAnalyserRef = useRef<AnalyserNode | null>(null);

  // Initialize capabilities
  useEffect(() => {
    initializeCapabilities();
    return () => {
      cleanup();
    };
  }, []);

  // Initialize device capabilities
  const initializeCapabilities = async () => {
    try {
      const caps = await detectDeviceCapabilities();
      setCapabilities(caps);

      const check = meetsMinimumRequirements(caps);
      if (!check.meets) {
        toast.error('Device requirements not met', {
          description: check.issues.join('. ')
        });
      }

      // Check network quality
      const network = await checkNetworkQuality();
      setNetworkQuality(network);

      if (network.quality === 'poor') {
        toast.warning('Poor network connection', {
          description: network.recommendation
        });
      }

      // Get available devices
      if (caps.cameras.length > 0) {
        setAvailableDevices(caps.cameras);
        setSelectedCamera(caps.cameras[0].deviceId);
      }

      // Check storage
      if (caps.storageQuota) {
        setStorageUsage(caps.storageQuota);
        const availableSpace = caps.storageQuota.quota - caps.storageQuota.usage;
        const minRequired = 500 * 1024 * 1024; // 500MB

        if (availableSpace < minRequired) {
          toast.warning('Low storage space', {
            description: `Only ${formatBytes(availableSpace)} available`
          });
        }
      }
    } catch (error) {
      console.error('Failed to initialize capabilities:', error);
      toast.error('Failed to detect device capabilities');
    }
  };

  // Start camera
  const startCamera = async () => {
    try {
      if (!capabilities) {
        toast.error('Device capabilities not initialized');
        return;
      }

      setRecordingState('preparing');

      const qualityConfig = QUALITY_PRESETS[quality];
      const constraints: MediaStreamConstraints = {
        video: {
          width: { ideal: qualityConfig.width },
          height: { ideal: qualityConfig.height },
          frameRate: { ideal: qualityConfig.frameRate },
          facingMode: cameraFacing,
          ...(selectedCamera && { deviceId: { exact: selectedCamera } })
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          ...(selectedMicrophone && { deviceId: { exact: selectedMicrophone } })
        }
      };

      const result = await requestMediaPermissions({ video: true, audio: true });

      if (!result.granted || !result.stream) {
        toast.error('Camera access denied', {
          description: result.error || 'Please allow camera and microphone access'
        });
        setRecordingState('idle');
        return;
      }

      streamRef.current = result.stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = result.stream;
      }

      // Setup audio level monitoring
      setupAudioMonitoring(result.stream);

      setIsCameraOn(true);
      setRecordingState('idle');
      
      toast.success('Camera started', {
        description: `Recording at ${qualityConfig.width}x${qualityConfig.height} ${qualityConfig.frameRate}fps`
      });
    } catch (error: any) {
      console.error('Error accessing camera:', error);
      toast.error('Failed to access camera', {
        description: error.message
      });
      setRecordingState('idle');
    }
  };

  // Setup audio level monitoring
  const setupAudioMonitoring = (stream: MediaStream) => {
    try {
      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      const analyser = audioContextRef.current.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      audioAnalyserRef.current = analyser;

      // Monitor audio level
      const updateAudioLevel = () => {
        if (!audioAnalyserRef.current) return;

        const dataArray = new Uint8Array(audioAnalyserRef.current.frequencyBinCount);
        audioAnalyserRef.current.getByteFrequencyData(dataArray);
        
        const sum = dataArray.reduce((a, b) => a + b, 0);
        const average = sum / dataArray.length;
        const level = Math.round((average / 255) * 100);
        
        setAudioLevel(level);
      };

      const intervalId = setInterval(updateAudioLevel, 100);

      // Store interval ID for cleanup
      return () => clearInterval(intervalId);
    } catch (error) {
      console.warn('Failed to setup audio monitoring:', error);
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setIsCameraOn(false);
    setAudioLevel(0);
    setRecordingState('idle');
  };

  // Start recording
  const startRecording = async () => {
    if (!streamRef.current || !capabilities) {
      toast.error('Please start the camera first');
      return;
    }

    try {
      setRecordingState('preparing');

      // Estimate file size
      const qualityConfig = QUALITY_PRESETS[quality];
      const estimatedSize = estimateFileSize(
        maxDuration,
        qualityConfig.videoBitrate,
        qualityConfig.audioBitrate
      );

      if (estimatedSize > maxFileSize * 1024 * 1024) {
        toast.warning('Estimated file size may exceed limit', {
          description: `Expected: ${formatBytes(estimatedSize)}, Limit: ${formatBytes(maxFileSize * 1024 * 1024)}`
        });
      }

      chunksRef.current = [];
      
      const mimeType = getBestMimeType(capabilities, qualityConfig.videoCodec);
      const mediaRecorder = new MediaRecorder(streamRef.current, {
        mimeType,
        videoBitsPerSecond: qualityConfig.videoBitrate * 1000,
        audioBitsPerSecond: qualityConfig.audioBitrate * 1000
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        await handleRecordingComplete();
      };

      mediaRecorder.onerror = (event: any) => {
        console.error('MediaRecorder error:', event);
        toast.error('Recording error occurred');
        setRecordingState('idle');
      };

      // Initialize analytics tracker
      if (enableAnalytics) {
        const sessionId = `session_${Date.now()}`;
        analyticsTrackerRef.current = new VideoAnalyticsTracker(sessionId);
        analyticsTrackerRef.current.startTracking(streamRef.current, mediaRecorder);
      }

      mediaRecorder.start(100); // Collect data every 100ms
      mediaRecorderRef.current = mediaRecorder;
      setRecordingState('recording');
      setIsPaused(false);
      recordingStartTimeRef.current = Date.now();
      pausedTimeRef.current = 0;

      // Start timer
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - recordingStartTimeRef.current - pausedTimeRef.current) / 1000);
        setRecordingTime(elapsed);

        if (analyticsTrackerRef.current) {
          analyticsTrackerRef.current.updateRecordedDuration(elapsed);
        }

        // Auto-stop if max duration reached
        if (elapsed >= maxDuration) {
          stopRecording();
          toast.warning('Maximum recording duration reached');
        }
      }, 100);

      toast.success('Recording started');
    } catch (error: any) {
      console.error('Error starting recording:', error);
      toast.error('Failed to start recording', {
        description: error.message
      });
      setRecordingState('idle');
    }
  };

  // Pause/Resume recording
  const togglePause = () => {
    if (!mediaRecorderRef.current) return;

    if (isPaused) {
      mediaRecorderRef.current.resume();
      recordingStartTimeRef.current += Date.now() - (recordingStartTimeRef.current + pausedTimeRef.current + recordingTime * 1000);
      setIsPaused(false);
      
      if (analyticsTrackerRef.current) {
        analyticsTrackerRef.current.trackEvent({
          type: 'recording_resumed',
          timestamp: new Date(),
          sessionId: analyticsTrackerRef.current.getAnalytics().sessionId
        });
      }
      
      toast.success('Recording resumed');
    } else {
      mediaRecorderRef.current.pause();
      const pauseStart = Date.now();
      pausedTimeRef.current = pauseStart - recordingStartTimeRef.current - recordingTime * 1000;
      setIsPaused(true);
      
      if (analyticsTrackerRef.current) {
        analyticsTrackerRef.current.recordPause();
        analyticsTrackerRef.current.trackEvent({
          type: 'recording_paused',
          timestamp: new Date(),
          sessionId: analyticsTrackerRef.current.getAnalytics().sessionId
        });
      }
      
      toast.success('Recording paused');
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && recordingState === 'recording') {
      setRecordingState('stopping');
      
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
      setIsPaused(false);

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      if (analyticsTrackerRef.current) {
        analyticsTrackerRef.current.trackEvent({
          type: 'recording_stopped',
          timestamp: new Date(),
          sessionId: analyticsTrackerRef.current.getAnalytics().sessionId
        });
      }
    }
  };

  // Handle recording complete
  const handleRecordingComplete = async () => {
    try {
      setRecordingState('processing');

      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      const fileSizeMB = blob.size / (1024 * 1024);

      // Validate file size
      if (fileSizeMB > maxFileSize) {
        toast.error(`Video size (${fileSizeMB.toFixed(2)}MB) exceeds maximum (${maxFileSize}MB)`);
        setRecordingState('idle');
        setRecordingTime(0);
        return;
      }

      const url = URL.createObjectURL(blob);

      // Generate thumbnails
      let thumbnails: string[] = [];
      if (showThumbnails) {
        try {
          const thumbData = await generateThumbnails(url, 5);
          thumbnails = thumbData.map(t => t.url);
        } catch (error) {
          console.error('Failed to generate thumbnails:', error);
        }
      }

      // Extract metadata
      const metadata = await extractVideoMetadata(blob, url);

      // Analyze quality
      const analytics = await analyzeVideoQuality(blob, url);

      // Get recording analytics
      let recordingAnalytics = analyticsTrackerRef.current?.stopTracking();

      // Validate video
      const validation = await validateVideo(blob, {
        maxSize: maxFileSize * 1024 * 1024,
        maxDuration,
        minDuration: 1
      });

      if (!validation.valid) {
        toast.error('Video validation failed', {
          description: validation.errors.join('. ')
        });
      }

      if (validation.warnings.length > 0) {
        toast.warning('Video quality warnings', {
          description: validation.warnings.join('. ')
        });
      }

      // Create recording object
      const recording: VideoRecording = {
        id: Date.now().toString(),
        blob,
        url,
        duration: recordingTime,
        timestamp: new Date(),
        size: blob.size,
        thumbnail: thumbnails[0],
        thumbnails,
        metadata: {
          title: `Video ${new Date().toLocaleString()}`,
          description: '',
          category: 'other',
          tags: [],
          uploadedBy: 'Current User',
          deviceInfo: getDeviceInfo(),
          resolution: metadata.resolution || { width: 0, height: 0 },
          codec: metadata.codec || 'unknown',
          format: metadata.format || 'webm',
          hasAudio: metadata.hasAudio || true,
          audioTracks: metadata.audioTracks || 1,
          fps: metadata.fps || 30,
          bitrate: metadata.bitrate || 0
        },
        quality: QUALITY_PRESETS[quality],
        analytics: recordingAnalytics || {
          sessionId: `session_${Date.now()}`,
          startTime: new Date(),
          actualDuration: recordingTime,
          recordedDuration: recordingTime,
          pauseCount: 0,
          totalPauseDuration: 0,
          averageFps: 30,
          droppedFrames: 0,
          averageBitrate: metadata.bitrate || 0,
          peakBitrate: metadata.bitrate || 0,
          audioLevel: { average: 0, peak: 0 },
          errors: [],
          warnings: []
        }
      };

      const newRecordings = allowMultiple ? [...recordings, recording] : [recording];
      setRecordings(newRecordings);
      setSelectedRecording(recording);
      onVideoRecorded?.(recording);
      onVideosChanged?.(newRecordings);

      // Show quality report
      if (analytics.quality === 'poor' || analytics.quality === 'fair') {
        toast.warning(`Video quality: ${analytics.quality}`, {
          description: analytics.recommendations[0]
        });
      } else {
        toast.success('Video recorded successfully', {
          description: `Quality: ${analytics.quality}, Size: ${formatBytes(blob.size)}`
        });
      }

      // Upload if enabled
      if (enableUpload) {
        handleUpload(recording);
      }

      setRecordingState('idle');
      setRecordingTime(0);
    } catch (error) {
      console.error('Error processing recording:', error);
      toast.error('Failed to process recording');
      setRecordingState('idle');
      setRecordingTime(0);
    }
  };

  // Handle upload
  const handleUpload = async (recording: VideoRecording) => {
    try {
      toast.info('Starting upload...', {
        description: `Uploading ${formatBytes(recording.size)}`
      });

      await uploadManagerRef.current.queueUpload(
        recording.id,
        recording.blob,
        recording.metadata,
        DEFAULT_UPLOAD_CONFIG,
        (status) => {
          setUploadStatuses(new Map(uploadStatuses.set(recording.id, status)));

          if (status.state === 'completed') {
            toast.success('Upload completed', {
              description: `${recording.metadata.title} uploaded successfully`
            });
          } else if (status.state === 'failed') {
            toast.error('Upload failed', {
              description: status.error?.message
            });
          }
        }
      );
    } catch (error) {
      console.log('📴 Upload service temporarily unavailable (offline mode)');
      toast.info('Recording saved locally', {
        description: 'Upload available when server is running'
      });
    }
  };

  // Switch camera
  const switchCamera = async () => {
    const newFacing = cameraFacing === 'user' ? 'environment' : 'user';
    setCameraFacing(newFacing);

    if (isCameraOn) {
      stopCamera();
      setTimeout(startCamera, 100);
    }
  };

  // Download video
  const downloadVideo = (recording: VideoRecording) => {
    const a = document.createElement('a');
    a.href = recording.url;
    a.download = `video-${recording.timestamp.toISOString()}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success('Video downloaded');
  };

  // Delete recording
  const deleteRecording = (id: string) => {
    const recording = recordings.find(r => r.id === id);
    if (recording) {
      URL.revokeObjectURL(recording.url);
      const newRecordings = recordings.filter(r => r.id !== id);
      setRecordings(newRecordings);
      if (selectedRecording?.id === id) {
        setSelectedRecording(null);
      }
      onVideosChanged?.(newRecordings);
      toast.success('Video deleted');
    }
  };

  // Cleanup
  const cleanup = () => {
    stopCamera();
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    recordings.forEach(rec => URL.revokeObjectURL(rec.url));
  };

  // Render quality indicator
  const renderQualityIndicator = () => {
    const qualityConfig = QUALITY_PRESETS[quality];
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="secondary" className="cursor-help">
              <Zap className="w-3 h-3 mr-1" />
              {quality}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-xs space-y-1">
              <div>{qualityConfig.width}x{qualityConfig.height} @ {qualityConfig.frameRate}fps</div>
              <div>Video: {qualityConfig.videoBitrate}kbps</div>
              <div>Audio: {qualityConfig.audioBitrate}kbps</div>
              <div>Codec: {qualityConfig.videoCodec}/{qualityConfig.audioCodec}</div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  // Render audio level meter
  const renderAudioLevelMeter = () => {
    const level = Math.min(audioLevel, 100);
    const color = level < 5 ? 'bg-red-500' : level < 30 ? 'bg-yellow-500' : 'bg-green-500';

    return (
      <div className="flex items-center gap-2">
        <Activity className="w-4 h-4 text-slate-400" />
        <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
          <div 
            className={`h-full ${color} transition-all duration-100`}
            style={{ width: `${level}%` }}
          />
        </div>
        <span className="text-xs text-slate-400 w-8">{level}%</span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* System Status Bar */}
      <Card className="p-4 bg-slate-50 border-slate-200">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4 flex-wrap">
            {renderQualityIndicator()}
            
            {networkQuality && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge 
                      variant={networkQuality.quality === 'excellent' || networkQuality.quality === 'good' ? 'default' : 'destructive'}
                      className="cursor-help"
                    >
                      {networkQuality.quality === 'excellent' || networkQuality.quality === 'good' ? (
                        <Wifi className="w-3 h-3 mr-1" />
                      ) : (
                        <WifiOff className="w-3 h-3 mr-1" />
                      )}
                      {networkQuality.quality}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-xs">{networkQuality.recommendation}</div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {storageUsage && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="secondary" className="cursor-help">
                      <HardDrive className="w-3 h-3 mr-1" />
                      {formatBytes(storageUsage.quota - storageUsage.usage)} free
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-xs">
                      <div>Used: {formatBytes(storageUsage.usage)}</div>
                      <div>Total: {formatBytes(storageUsage.quota)}</div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSettings(true)}
          >
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
        </div>
      </Card>

      {/* Camera Preview */}
      <Card className={`overflow-hidden ${isFullscreen ? 'fixed inset-0 z-50 rounded-none' : ''}`}>
        <div className="bg-slate-900 relative">
          {/* Video Preview */}
          <div className="relative aspect-video bg-black">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />

            {/* Recording indicator */}
            {recordingState === 'recording' && (
              <div className="absolute top-4 left-4 flex items-center gap-3">
                <div className={`w-4 h-4 rounded-full ${isPaused ? 'bg-yellow-500' : 'bg-red-500 animate-pulse'}`} />
                <div className="bg-black/70 px-4 py-2 rounded-lg backdrop-blur-sm">
                  <div className="flex items-center gap-3">
                    <Clock className="w-4 h-4 text-white" />
                    <span className="text-white font-mono text-lg font-semibold">
                      {formatDuration(recordingTime)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Recording progress */}
            {recordingState === 'recording' && (
              <div className="absolute top-4 right-4 min-w-[200px]">
                <div className="bg-black/70 px-4 py-3 rounded-lg backdrop-blur-sm space-y-2">
                  <Progress
                    value={(recordingTime / maxDuration) * 100}
                    className="h-1.5"
                  />
                  <div className="text-white text-xs flex items-center justify-between">
                    <span>{formatDuration(recordingTime)} / {formatDuration(maxDuration)}</span>
                    <span className="text-slate-300">{Math.round((recordingTime / maxDuration) * 100)}%</span>
                  </div>
                </div>
              </div>
            )}

            {/* Audio level meter (when recording) */}
            {recordingState === 'recording' && (
              <div className="absolute bottom-20 left-4 right-4">
                <div className="bg-black/70 px-4 py-3 rounded-lg backdrop-blur-sm">
                  {renderAudioLevelMeter()}
                </div>
              </div>
            )}

            {/* Status overlay */}
            {!isCameraOn && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
                <div className="text-center">
                  <VideoOff className="w-20 h-20 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-300 text-lg font-medium">Camera is off</p>
                  <p className="text-slate-500 text-sm mt-2">Click "Start Camera" to begin</p>
                </div>
              </div>
            )}

            {/* Processing overlay */}
            {recordingState === 'processing' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                <div className="text-center">
                  <div className="w-16 h-16 border-4 border-slate-600 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-white text-lg font-medium">Processing video...</p>
                  <p className="text-slate-400 text-sm mt-2">This may take a moment</p>
                </div>
              </div>
            )}

            {/* Fullscreen toggle */}
            <Button
              size="sm"
              variant="ghost"
              className="absolute bottom-4 right-4 bg-black/50 hover:bg-black/70 text-white"
              onClick={() => setIsFullscreen(!isFullscreen)}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </Button>
          </div>

          {/* Controls */}
          <div className="bg-slate-800 p-6">
            <div className="flex items-center justify-center gap-3 flex-wrap mb-4">
              {/* Camera control */}
              {recordingState === 'idle' && (
                <Button
                  onClick={isCameraOn ? stopCamera : startCamera}
                  variant={isCameraOn ? 'destructive' : 'default'}
                  size="lg"
                  disabled={recordingState === 'preparing'}
                >
                  {recordingState === 'preparing' ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Preparing...
                    </>
                  ) : isCameraOn ? (
                    <>
                      <VideoOff className="w-5 h-5 mr-2" />
                      Stop Camera
                    </>
                  ) : (
                    <>
                      <Video className="w-5 h-5 mr-2" />
                      Start Camera
                    </>
                  )}
                </Button>
              )}

              {/* Switch camera */}
              {isCameraOn && recordingState === 'idle' && availableDevices.length > 1 && (
                <Button
                  onClick={switchCamera}
                  variant="outline"
                  size="lg"
                  className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
                >
                  <RotateCcw className="w-5 h-5 mr-2" />
                  Switch Camera
                </Button>
              )}

              {/* Recording controls */}
              {isCameraOn && recordingState === 'idle' && (
                <Button
                  onClick={startRecording}
                  className="bg-red-600 hover:bg-red-700 text-white"
                  size="lg"
                >
                  <Circle className="w-5 h-5 mr-2" />
                  Start Recording
                </Button>
              )}

              {recordingState === 'recording' && (
                <>
                  <Button
                    onClick={togglePause}
                    variant="outline"
                    size="lg"
                    className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
                  >
                    {isPaused ? (
                      <>
                        <Play className="w-5 h-5 mr-2" />
                        Resume
                      </>
                    ) : (
                      <>
                        <Pause className="w-5 h-5 mr-2" />
                        Pause
                      </>
                    )}
                  </Button>

                  <Button
                    onClick={stopRecording}
                    variant="destructive"
                    size="lg"
                  >
                    <Square className="w-5 h-5 mr-2" />
                    Stop Recording
                  </Button>
                </>
              )}
            </div>

            {/* Info */}
            <div className="flex items-center justify-center gap-4 text-sm text-slate-400 flex-wrap">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4" />
                <span>{cameraFacing === 'user' ? 'Front' : 'Back'} Camera</span>
              </div>
              <div>•</div>
              <div>Max: {formatDuration(maxDuration)}</div>
              <div>•</div>
              <div>Limit: {maxFileSize}MB</div>
              <div>•</div>
              <div>{recordings.length} recorded</div>
            </div>
          </div>
        </div>
      </Card>

      {/* Recorded Videos */}
      {recordings.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">
              Recorded Videos ({recordings.length})
            </h3>
            <Badge variant="secondary" className="text-base px-3 py-1">
              Total: {formatBytes(recordings.reduce((sum, r) => sum + r.size, 0))}
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recordings.map((recording) => {
              const uploadStatus = uploadStatuses.get(recording.id);
              
              return (
                <Card key={recording.id} className="overflow-hidden">
                  {/* Thumbnail */}
                  {showThumbnails && recording.thumbnail ? (
                    <div
                      className="relative aspect-video bg-slate-900 cursor-pointer group"
                      onClick={() => setSelectedRecording(recording)}
                    >
                      <img
                        src={recording.thumbnail}
                        alt="Video thumbnail"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="bg-white/90 rounded-full p-4">
                          <Play className="w-8 h-8 text-black" />
                        </div>
                      </div>
                      <Badge className="absolute bottom-2 right-2 bg-black/70">
                        {formatDuration(recording.duration)}
                      </Badge>
                      <Badge
                        className={`absolute top-2 right-2 ${
                          recording.analytics.averageFps >= 28
                            ? 'bg-green-600'
                            : recording.analytics.averageFps >= 24
                            ? 'bg-yellow-600'
                            : 'bg-red-600'
                        }`}
                      >
                        {recording.analytics.averageFps} FPS
                      </Badge>
                    </div>
                  ) : (
                    <div
                      className="aspect-video bg-slate-900 flex items-center justify-center cursor-pointer"
                      onClick={() => setSelectedRecording(recording)}
                    >
                      <Video className="w-12 h-12 text-slate-400" />
                    </div>
                  )}

                  {/* Info & Actions */}
                  <div className="p-4 space-y-3">
                    <div className="text-sm text-slate-600">
                      <div className="font-medium text-slate-900">{recording.metadata.title}</div>
                      <div className="flex items-center gap-2 mt-1 text-xs">
                        <span>{recording.metadata.resolution.width}x{recording.metadata.resolution.height}</span>
                        <span>•</span>
                        <span>{formatBytes(recording.size)}</span>
                        <span>•</span>
                        <span>{recording.quality.preset}</span>
                      </div>
                    </div>

                    {/* Upload status */}
                    {uploadStatus && uploadStatus.state !== 'idle' && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-600">
                            {uploadStatus.state === 'uploading' && 'Uploading...'}
                            {uploadStatus.state === 'completed' && 'Upload complete'}
                            {uploadStatus.state === 'failed' && 'Upload failed'}
                          </span>
                          <span className="text-slate-500">{Math.round(uploadStatus.progress)}%</span>
                        </div>
                        <Progress value={uploadStatus.progress} className="h-1" />
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        onClick={() => setSelectedRecording(recording)}
                        size="sm"
                        variant="outline"
                        className="flex-1"
                      >
                        <Play className="w-4 h-4 mr-1" />
                        Play
                      </Button>
                      <Button
                        onClick={() => downloadVideo(recording)}
                        size="sm"
                        variant="outline"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => deleteRecording(recording.id)}
                        size="sm"
                        variant="destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Video Playback Modal */}
      {selectedRecording && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setSelectedRecording(null)}
        >
          <Card
            className="max-w-5xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-slate-900">
              <video
                ref={previewRef}
                src={selectedRecording.url}
                controls
                autoPlay
                className="w-full aspect-video bg-black"
              />

              <div className="p-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="text-white space-y-2 flex-1">
                    <div className="font-semibold text-lg">
                      {selectedRecording.metadata.title}
                    </div>
                    <div className="text-sm text-slate-400 space-y-1">
                      <div>
                        {selectedRecording.timestamp.toLocaleString()} • {formatDuration(selectedRecording.duration)} • {formatBytes(selectedRecording.size)}
                      </div>
                      <div>
                        {selectedRecording.metadata.resolution.width}x{selectedRecording.metadata.resolution.height} @ {selectedRecording.metadata.fps}fps
                      </div>
                      <div>
                        Codec: {selectedRecording.metadata.codec} • Bitrate: {selectedRecording.metadata.bitrate}kbps
                      </div>
                    </div>

                    {/* Analytics */}
                    {enableAnalytics && (
                      <div className="flex gap-2 flex-wrap mt-3">
                        <Badge variant="secondary">
                          Avg FPS: {selectedRecording.analytics.averageFps}
                        </Badge>
                        <Badge variant="secondary">
                          Dropped: {selectedRecording.analytics.droppedFrames}
                        </Badge>
                        {selectedRecording.analytics.pauseCount > 0 && (
                          <Badge variant="secondary">
                            Paused: {selectedRecording.analytics.pauseCount}x
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>

                  <Button
                    onClick={() => setSelectedRecording(null)}
                    variant="ghost"
                    className="text-white hover:bg-white/10"
                  >
                    <XCircle className="w-5 h-5" />
                  </Button>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => downloadVideo(selectedRecording)}
                    className="flex-1"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                  {enableUpload && (
                    <Button
                      onClick={() => handleUpload(selectedRecording)}
                      variant="outline"
                      className="flex-1"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload
                    </Button>
                  )}
                  <Button
                    onClick={() => {
                      deleteRecording(selectedRecording.id);
                      setSelectedRecording(null);
                    }}
                    variant="destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Video Recording Settings</DialogTitle>
            <DialogDescription>
              Configure quality, devices, and recording preferences
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Quality Selection */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Video Quality</label>
              <Select value={quality} onValueChange={(v) => setQuality(v as VideoQualityPreset)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="4k">4K (3840x2160)</SelectItem>
                  <SelectItem value="1080p">1080p (1920x1080) - Recommended</SelectItem>
                  <SelectItem value="720p">720p (1280x720)</SelectItem>
                  <SelectItem value="480p">480p (854x480)</SelectItem>
                  <SelectItem value="360p">360p (640x360)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-600">
                Higher quality produces better videos but larger file sizes
              </p>
            </div>

            {/* Device Capabilities */}
            {capabilities && (
              <div className="space-y-3">
                <label className="text-sm font-medium">Device Capabilities</label>
                <div className="bg-slate-50 rounded-lg p-4 space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Cameras</span>
                    <span className="font-medium">{capabilities.cameras.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Microphones</span>
                    <span className="font-medium">{capabilities.microphones.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Supported Codecs</span>
                    <span className="font-medium">{capabilities.supportedCodecs.video.join(', ')}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Screen Capture</span>
                    <span className="font-medium">{capabilities.supportsScreenCapture ? 'Yes' : 'No'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Network Status */}
            {networkQuality && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Network quality: <strong>{networkQuality.quality}</strong>. {networkQuality.recommendation}
                </AlertDescription>
              </Alert>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
