/**
 * Inline Video Capture Component
 * Simple, streamlined video recording interface for work request forms
 */

import { useState, useRef, useEffect } from 'react';
import {
  Video,
  VideoOff,
  Circle,
  Square,
  Play,
  Trash2,
  AlertCircle,
  CheckCircle,
  Camera,
  Clock,
  Download
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface VideoFile {
  blob: Blob;
  url: string;
  duration: number;
}

interface InlineVideoCaptureProps {
  label?: string;
  description?: string;
  maxVideos?: number;
  maxDuration?: number; // in seconds
  onVideosChanged: (videos: VideoFile[]) => void;
}

export function InlineVideoCapture({
  label = 'Video Capture',
  description,
  maxVideos = 5,
  maxDuration = 300, // 5 minutes default
  onVideosChanged,
}: InlineVideoCaptureProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedVideos, setRecordedVideos] = useState<VideoFile[]>([]);
  const [previewMode, setPreviewMode] = useState(false);
  const [currentVideoIndex, setCurrentVideoIndex] = useState<number | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  // Don't auto-request on mount — wait for user to click so the browser
  // shows the permission prompt with context rather than a cold popup
  useEffect(() => {
    // Only pre-check if permission was already granted (non-blocking)
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'camera' as PermissionName }).then(result => {
        if (result.state === 'granted') checkPermission();
      }).catch(() => {});
    }
    return () => {
      stopStream();
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, []);

  const checkPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' }, 
        audio: true 
      });
      stream.getTracks().forEach(track => track.stop());
      setHasPermission(true);
    } catch (error) {
      setHasPermission(false);
      console.error('Camera permission denied:', error);
    }
  };

  const startRecording = async () => {
    if (recordedVideos.length >= maxVideos) {
      toast.error(`Maximum of ${maxVideos} videos allowed`);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: true,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        videoRef.current.play();
      }

      const options = { mimeType: 'video/webm;codecs=vp9' };
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options.mimeType = 'video/webm';
      }

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);

        const newVideo: VideoFile = { blob, url, duration };
        const updatedVideos = [...recordedVideos, newVideo];
        
        setRecordedVideos(updatedVideos);
        onVideosChanged(updatedVideos);
        
        stopStream();
        setRecordingDuration(0);
        
        toast.success('Video recorded successfully!');
      };

      mediaRecorder.start();
      setIsRecording(true);
      startTimeRef.current = Date.now();
      
      // Start duration timer
      timerIntervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setRecordingDuration(elapsed);
        
        // Auto-stop at max duration
        if (elapsed >= maxDuration) {
          stopRecording();
          toast.warning(`Maximum recording duration of ${maxDuration} seconds reached`);
        }
      }, 1000);

    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Failed to access camera. Please check permissions.');
      setHasPermission(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }
  };

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const deleteVideo = (index: number) => {
    const videoToDelete = recordedVideos[index];
    URL.revokeObjectURL(videoToDelete.url);
    
    const updatedVideos = recordedVideos.filter((_, i) => i !== index);
    setRecordedVideos(updatedVideos);
    onVideosChanged(updatedVideos);
    
    toast.success('Video deleted');
  };

  const playVideo = (index: number) => {
    setCurrentVideoIndex(index);
    setPreviewMode(true);
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.src = recordedVideos[index].url;
      videoRef.current.muted = false;
      videoRef.current.play();
    }
  };

  const closePreview = () => {
    setPreviewMode(false);
    setCurrentVideoIndex(null);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.src = '';
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const downloadVideo = (video: VideoFile, index: number) => {
    const a = document.createElement('a');
    a.href = video.url;
    a.download = `video-${index + 1}-${Date.now()}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success('Video download started');
  };

  if (hasPermission === false) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-5 space-y-3">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-red-300 font-semibold mb-1">Camera Access Blocked</h4>
            <p className="text-sm text-red-400/80">Your browser needs permission to use the camera. Follow the steps for your device:</p>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-3 text-xs text-gray-300">
          <div className="bg-black/30 rounded-lg p-3">
            <p className="font-bold text-white mb-1">📱 iPhone / Safari</p>
            <ol className="list-decimal list-inside space-y-0.5 text-gray-400">
              <li>Open <strong>Settings</strong></li>
              <li>Scroll to <strong>Safari</strong></li>
              <li>Tap <strong>Camera → Allow</strong></li>
              <li>Return here and tap Try Again</li>
            </ol>
          </div>
          <div className="bg-black/30 rounded-lg p-3">
            <p className="font-bold text-white mb-1">🤖 Android / Chrome</p>
            <ol className="list-decimal list-inside space-y-0.5 text-gray-400">
              <li>Tap the <strong>lock icon</strong> in the address bar</li>
              <li>Tap <strong>Permissions</strong></li>
              <li>Set <strong>Camera → Allow</strong></li>
              <li>Refresh the page and tap Try Again</li>
            </ol>
          </div>
        </div>
        <button
          onClick={checkPermission}
          className="w-full px-4 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-sm font-semibold transition"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (hasPermission === null) {
    return (
      <button
        onClick={checkPermission}
        className="w-full px-6 py-4 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition"
      >
        <span>🎥</span> Allow Camera & Start Recording
      </button>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      {(label || description) && (
        <div>
          {label && <h3 className="text-lg font-semibold text-white mb-1">{label}</h3>}
          {description && <p className="text-sm text-gray-400">{description}</p>}
        </div>
      )}

      {/* Video Preview/Recording Area */}
      <div className="relative bg-[#0A0A0A] border border-[#2a2a2a] rounded-lg overflow-hidden aspect-video">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          playsInline
        />
        
        {/* Recording Indicator */}
        {isRecording && (
          <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-600 text-white px-3 py-1.5 rounded-full animate-pulse">
            <Circle className="w-3 h-3 fill-current" />
            <span className="text-sm font-medium">Recording</span>
            <span className="text-sm font-mono">{formatTime(recordingDuration)}</span>
          </div>
        )}

        {/* Duration Limit Indicator */}
        {isRecording && (
          <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-sm text-white px-3 py-1.5 rounded-full">
            <span className="text-xs">Max: {formatTime(maxDuration)}</span>
          </div>
        )}

        {/* Placeholder when not recording */}
        {!isRecording && !previewMode && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
            <VideoOff className="w-16 h-16 mb-3" />
            <p className="text-sm">Camera ready</p>
          </div>
        )}

        {/* Preview Mode Overlay */}
        {previewMode && currentVideoIndex !== null && (
          <div className="absolute bottom-4 right-4">
            <button
              onClick={closePreview}
              className="px-4 py-2 bg-[#ea580c] hover:bg-[#ea580c]/90 text-white rounded-lg text-sm font-medium transition"
            >
              Close Preview
            </button>
          </div>
        )}
      </div>

      {/* Recording Controls */}
      <div className="flex items-center gap-3">
        {!isRecording ? (
          <button
            onClick={startRecording}
            disabled={recordedVideos.length >= maxVideos}
            className="px-6 py-3 bg-[#ea580c] hover:bg-[#ea580c]/90 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition flex items-center gap-2"
          >
            <Circle className="w-5 h-5" />
            Start Recording
          </button>
        ) : (
          <button
            onClick={stopRecording}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition flex items-center gap-2"
          >
            <Square className="w-5 h-5" />
            Stop Recording
          </button>
        )}

        <div className="text-sm text-gray-400">
          {recordedVideos.length} / {maxVideos} videos
        </div>
      </div>

      {/* Recorded Videos List */}
      {recordedVideos.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-white">Recorded Videos</h4>
          <div className="space-y-2">
            {recordedVideos.map((video, index) => (
              <div
                key={index}
                className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#ea580c]/10 rounded-lg flex items-center justify-center">
                    <Video className="w-5 h-5 text-[#ea580c]" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white">
                      Video {index + 1}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <Clock className="w-3 h-3" />
                      {formatTime(video.duration)}
                      <span className="text-gray-600">•</span>
                      <span>{(video.blob.size / (1024 * 1024)).toFixed(2)} MB</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => playVideo(index)}
                    className="p-2 hover:bg-[#2a2a2a] rounded-lg transition text-blue-400"
                    title="Play video"
                  >
                    <Play className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => downloadVideo(video, index)}
                    className="p-2 hover:bg-[#2a2a2a] rounded-lg transition text-green-400"
                    title="Download video"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteVideo(index)}
                    className="p-2 hover:bg-[#2a2a2a] rounded-lg transition text-red-400"
                    title="Delete video"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info Notice */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-200 space-y-1">
            <p>• Maximum {maxVideos} videos allowed</p>
            <p>• Maximum duration: {formatTime(maxDuration)} per video</p>
            <p>• Videos are recorded locally and not uploaded until form submission</p>
          </div>
        </div>
      </div>
    </div>
  );
}
