/**
 * Advanced Video Capture Component
 * Professional video recording with AI analysis capabilities
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
  Download,
  Sparkles,
  Loader2,
  TrendingUp,
  Ruler,
  Package,
  Zap
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { VideoAnalysisResult } from '../../lib/services/aiVideoAnalysisService';

interface AdvancedVideoCaptureProps {
  onAnalysisComplete?: (results: VideoAnalysisResult) => void;
  maxDuration?: number; // in seconds
  showAIAnalysis?: boolean;
  onVideoRecorded?: (blob: Blob, url: string) => void;
}

export default function AdvancedVideoCapture({
  onAnalysisComplete,
  maxDuration = 600, // 10 minutes default
  showAIAnalysis = true,
  onVideoRecorded,
}: AdvancedVideoCaptureProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedVideo, setRecordedVideo] = useState<{ blob: Blob; url: string } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  // Request camera permission on mount
  useEffect(() => {
    checkPermission();
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
        video: { 
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }, 
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
    if (recordedVideo) {
      toast.error('Please delete the existing video before recording a new one');
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

        setRecordedVideo({ blob, url });
        if (onVideoRecorded) {
          onVideoRecorded(blob, url);
        }
        
        stopStream();
        setRecordingDuration(0);
        
        toast.success('Video recorded successfully!');

        // Start AI analysis if enabled
        if (showAIAnalysis) {
          startAIAnalysis(blob);
        }
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

  const deleteVideo = () => {
    if (recordedVideo) {
      URL.revokeObjectURL(recordedVideo.url);
      setRecordedVideo(null);
      setPreviewMode(false);
      toast.success('Video deleted');
    }
  };

  const playVideo = () => {
    if (recordedVideo && videoRef.current) {
      setPreviewMode(true);
      videoRef.current.srcObject = null;
      videoRef.current.src = recordedVideo.url;
      videoRef.current.muted = false;
      videoRef.current.play();
    }
  };

  const downloadVideo = () => {
    if (recordedVideo) {
      const a = document.createElement('a');
      a.href = recordedVideo.url;
      a.download = `video-${Date.now()}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success('Video download started');
    }
  };

  const startAIAnalysis = async (videoBlob: Blob) => {
    setIsAnalyzing(true);
    setAnalysisProgress(0);

    // Simulate AI analysis progress
    const progressInterval = setInterval(() => {
      setAnalysisProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + Math.random() * 15;
      });
    }, 500);

    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Mock analysis results
      const mockResults: VideoAnalysisResult = {
        id: `analysis-${Date.now()}`,
        videoId: `video-${Date.now()}`,
        timestamp: new Date().toISOString(),
        
        roomType: 'Kitchen',
        dimensions: {
          length: 12.5,
          width: 10.0,
          height: 9.0,
          squareFootage: 125,
          volume: 1125,
          confidence: 92
        },
        floorPlan: {
          id: `floorplan-${Date.now()}`,
          roomName: 'Main Kitchen',
          roomType: 'kitchen',
          dimensions: {
            length: 12.5,
            width: 10.0,
            height: 9.0,
            squareFootage: 125,
            volume: 1125,
            confidence: 92
          },
          walls: [],
          features: ['Island', 'Pantry', 'Bay Window'],
          svgData: '<svg></svg>',
          scale: '1/4" = 1\'',
          confidence: 88
        },
        materials: [
          {
            location: 'floor',
            material: 'Hardwood',
            color: 'Medium Oak',
            finish: 'Satin',
            condition: 'good',
            estimatedAge: '5-10 years',
            notes: ['Some wear near sink area'],
            confidence: 85
          },
          {
            location: 'countertop',
            material: 'Granite',
            color: 'Black Galaxy',
            finish: 'Polished',
            condition: 'excellent',
            estimatedAge: 'new',
            notes: ['Premium quality'],
            confidence: 90
          },
          {
            location: 'cabinets',
            material: 'Wood',
            color: 'White',
            finish: 'Painted',
            condition: 'good',
            estimatedAge: '5-10 years',
            notes: ['Shaker style'],
            confidence: 88
          }
        ],
        doors: [
          {
            id: 'door-1',
            type: 'interior',
            width: 36,
            height: 80,
            material: 'Wood',
            condition: 'good',
            location: 'North wall',
            features: ['Standard hinge'],
            confidence: 85
          }
        ],
        windows: [
          {
            id: 'window-1',
            type: 'double-hung',
            width: 48,
            height: 60,
            panes: 2,
            material: 'Vinyl',
            condition: 'excellent',
            location: 'East wall',
            features: ['Double-pane', 'Energy efficient'],
            confidence: 90
          }
        ],
        fixtures: [
          { type: 'Sink', brand: 'Kohler', model: 'Farmhouse' },
          { type: 'Faucet', brand: 'Delta' }
        ],
        appliances: [
          { type: 'Refrigerator', brand: 'Samsung', estimatedAge: '2-5 years' },
          { type: 'Stove', brand: 'GE', estimatedAge: '5-10 years' }
        ],
        overallCondition: 'good',
        recommendedWork: [
          'Minor floor refinishing near sink',
          'Cabinet hardware upgrade recommended',
          'Consider backsplash installation'
        ],
        estimatedCosts: {
          low: 8500,
          mid: 12000,
          high: 18500,
          breakdown: [
            { category: 'Flooring', amount: 3500 },
            { category: 'Cabinets', amount: 2000 },
            { category: 'Countertops', amount: 4000 },
            { category: 'Labor', amount: 2500 }
          ]
        },
        analysisConfidence: 87,
        processingTime: 2.8,
        warnings: [],
        suggestions: [
          'Excellent natural lighting through east window',
          'Good space for renovation work',
          'Quality existing materials can be preserved'
        ]
      };

      clearInterval(progressInterval);
      setAnalysisProgress(100);
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setIsAnalyzing(false);
      
      if (onAnalysisComplete) {
        onAnalysisComplete(mockResults);
      }

      toast.success('AI Analysis Complete!', {
        description: `Detected ${mockResults.roomType} with ${mockResults.analysisConfidence}% confidence`
      });

    } catch (error) {
      clearInterval(progressInterval);
      setIsAnalyzing(false);
      setAnalysisProgress(0);
      console.error('Analysis error:', error);
      toast.error('AI analysis failed. Please try again.');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (hasPermission === false) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-red-300 font-medium mb-2">Camera Permission Required</h4>
            <p className="text-sm text-red-400/80 mb-3">
              This feature requires access to your camera and microphone. Please enable permissions in your browser settings.
            </p>
            <button
              onClick={checkPermission}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition"
            >
              Check Permissions Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Video Preview/Recording Area */}
      <div className="relative bg-[#0A0A0A] border border-[#2a2a2a] rounded-xl overflow-hidden aspect-video">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          playsInline
        />
        
        {/* Recording Indicator */}
        {isRecording && (
          <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-full animate-pulse shadow-lg">
            <Circle className="w-3 h-3 fill-current" />
            <span className="text-sm font-bold">RECORDING</span>
            <span className="text-sm font-mono">{formatTime(recordingDuration)}</span>
          </div>
        )}

        {/* Duration Limit Indicator */}
        {isRecording && (
          <div className="absolute top-4 right-4 bg-black/80 backdrop-blur-sm text-white px-4 py-2 rounded-full border border-white/10">
            <span className="text-sm font-medium">Max: {formatTime(maxDuration)}</span>
          </div>
        )}

        {/* AI Analysis Badge */}
        {showAIAnalysis && !isRecording && !recordedVideo && (
          <div className="absolute top-4 left-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-full flex items-center gap-2 shadow-lg">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-bold">AI Analysis Enabled</span>
          </div>
        )}

        {/* Placeholder when not recording */}
        {!isRecording && !previewMode && !recordedVideo && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 bg-gradient-to-br from-[#0A0A0A] to-[#1A1A1A]">
            <VideoOff className="w-20 h-20 mb-4 text-gray-600" />
            <p className="text-lg font-medium">Ready to Record</p>
            <p className="text-sm text-gray-500 mt-2">Record a walkthrough of your space</p>
          </div>
        )}

        {/* Analysis Overlay */}
        {isAnalyzing && (
          <div className="absolute inset-0 bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center">
            <Loader2 className="w-16 h-16 text-[#ea580c] animate-spin mb-4" />
            <p className="text-white text-xl font-bold mb-2">Analyzing Video...</p>
            <p className="text-gray-400 text-sm mb-6">AI is processing your space</p>
            <div className="w-64">
              <div className="bg-[#1a1a1a] rounded-full h-3 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-[#ea580c] to-[#c2410c] h-full transition-all duration-500 rounded-full"
                  style={{ width: `${analysisProgress}%` }}
                />
              </div>
              <p className="text-gray-400 text-xs text-center mt-2">{Math.round(analysisProgress)}%</p>
            </div>
          </div>
        )}
      </div>

      {/* Recording Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        {!isRecording && !recordedVideo ? (
          <button
            onClick={startRecording}
            className="px-8 py-4 bg-gradient-to-r from-[#ea580c] to-[#c2410c] hover:from-[#c2410c] hover:to-[#9a3412] text-white rounded-xl font-bold transition flex items-center gap-3 shadow-lg shadow-[#ea580c]/20"
          >
            <Circle className="w-6 h-6" />
            Start Recording
          </button>
        ) : isRecording ? (
          <button
            onClick={stopRecording}
            className="px-8 py-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition flex items-center gap-3 shadow-lg"
          >
            <Square className="w-6 h-6" />
            Stop Recording
          </button>
        ) : null}

        {recordedVideo && (
          <>
            <button
              onClick={playVideo}
              className="px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition flex items-center gap-2"
            >
              <Play className="w-5 h-5" />
              Play Video
            </button>
            <button
              onClick={downloadVideo}
              className="px-6 py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition flex items-center gap-2"
            >
              <Download className="w-5 h-5" />
              Download
            </button>
            <button
              onClick={deleteVideo}
              className="px-6 py-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition flex items-center gap-2"
            >
              <Trash2 className="w-5 h-5" />
              Delete
            </button>
          </>
        )}
      </div>

      {/* Status Information */}
      {recordedVideo && !isAnalyzing && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-emerald-400" />
            <div className="flex-1">
              <p className="text-emerald-300 font-medium">Video Recorded Successfully</p>
              <p className="text-sm text-emerald-400/70">
                {(recordedVideo.blob.size / (1024 * 1024)).toFixed(2)} MB • Ready for analysis
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Feature Highlights */}
      {showAIAnalysis && !recordedVideo && !isRecording && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
            <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center mb-3">
              <Ruler className="w-5 h-5 text-purple-400" />
            </div>
            <h4 className="text-white font-medium mb-1">Auto Measurements</h4>
            <p className="text-sm text-gray-400">AI detects room dimensions, doors, and windows</p>
          </div>
          
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
            <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center mb-3">
              <Package className="w-5 h-5 text-blue-400" />
            </div>
            <h4 className="text-white font-medium mb-1">Material Detection</h4>
            <p className="text-sm text-gray-400">Identifies flooring, cabinets, and fixtures</p>
          </div>
          
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
            <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center mb-3">
              <TrendingUp className="w-5 h-5 text-green-400" />
            </div>
            <h4 className="text-white font-medium mb-1">Cost Estimates</h4>
            <p className="text-sm text-gray-400">Get instant renovation cost projections</p>
          </div>
        </div>
      )}

      {/* Recording Tips */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-200 space-y-1">
            <p className="font-medium text-blue-300 mb-2">Recording Tips for Best Results:</p>
            <p>• Move slowly and steadily through the space</p>
            <p>• Ensure good lighting conditions</p>
            <p>• Show all walls, corners, and features clearly</p>
            <p>• Focus on fixtures, materials, and conditions</p>
            <p>• Speak to describe what you're showing (optional)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
