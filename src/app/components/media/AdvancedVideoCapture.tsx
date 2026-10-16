/**
 * Recording a walkthrough. Just that.
 *
 * WHAT THIS USED TO CLAIM, AND WHY IT IS GONE
 *
 * It advertised "AI Analysis Enabled", ran a fake progress bar to 90% in
 * random increments, waited three seconds, and emitted `mockResults` written
 * inline: a Kitchen, a Kohler farmhouse sink, a Samsung refrigerator, costs of
 * $8,500 / $12,000 / $18,500, and a toast reading "Detected Kitchen with 87%
 * confidence". Underneath it were three feature cards promising automatic room
 * measurements, material detection and instant cost estimates.
 *
 * None of it was real. It never called the analysis service — and that service
 * was itself invention (Math.random() dimensions, five hardcoded materials) in
 * front of a server endpoint that returned 501 Not Implemented. The whole lot
 * is deleted rather than refactored, because an honest estimator standing next
 * to a convincing fake is indistinguishable from it to anybody using the app.
 *
 * See `tasks/trash-removal-estimator.md`. Reading the footage is a real piece
 * of work with a real design — frames extracted in the browser, a model asked
 * for observations and never for prices, quantities computed by tested code.
 * This component's job is to get a usable clip, and that is now all it does.
 *
 * THE BUG THAT MATTERED MORE THAN THE FICTION
 *
 * It could not record on an iPhone at all. See `videoCapture.ts` — the format
 * negotiation is there, tested, and shared with `InlineVideoCapture`, which
 * had the same bug.
 */

import { useState, useRef, useEffect } from 'react';
import {
  Video, VideoOff, Circle, Square, Play, Trash2, AlertCircle,
  CheckCircle, Clock, Download,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  pickRecorderMimeType, extensionForMimeType, canRecordInPage, NO_RECORDER_MESSAGE,
} from '../../lib/videoCapture';

interface AdvancedVideoCaptureProps {
  /**
   * Called with the finished clip.
   *
   * ONE ARGUMENT, DELIBERATELY. It used to be `(blob, url)`, and
   * `ClientWorkRequestForm` passed a handler taking a single `videoFile` — so
   * it stored the Blob where a `{ blob, url, duration }` was expected, and the
   * upload then read `video.blob` as undefined and failed into
   * `uploadFailures`. **Every video recorded through that modal was lost**, and
   * nothing said so. A shape, not a positional pair, so the two cannot drift
   * apart again.
   */
  onVideoRecorded?: (video: { blob: Blob; url: string; duration: number; mimeType: string }) => void;
  /** Seconds. Short on purpose — see the note in the plan on upload ceilings. */
  maxDuration?: number;
}

export default function AdvancedVideoCapture({
  onVideoRecorded,
  maxDuration = 120,
}: AdvancedVideoCaptureProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedVideo, setRecordedVideo] = useState<
    { blob: Blob; url: string; duration: number; mimeType: string } | null
  >(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [previewMode, setPreviewMode] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);
  const startTimeRef = useRef<number>(0);

  // Don't auto-request — wait for user interaction so the permission prompt has
  // context. The query itself throws on Safari, which is why it is caught.
  useEffect(() => {
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'camera' as PermissionName })
        .then((result) => { if (result.state === 'granted') checkPermission(); })
        .catch(() => {});
    }
    return () => {
      stopStream();
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);

  const checkPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: true,
      });
      stream.getTracks().forEach((track) => track.stop());
      setHasPermission(true);
    } catch (error) {
      setHasPermission(false);
      console.error('Camera permission denied:', error);
    }
  };

  const startRecording = async () => {
    // Asked before the camera, so somebody on a browser that cannot record is
    // told why rather than being walked through a permission prompt for
    // nothing.
    if (!canRecordInPage()) {
      toast.error(NO_RECORDER_MESSAGE, { duration: 10_000 });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          // 1080p rather than whatever the phone can manage. Two minutes of 4K
          // is roughly twice the server's 200MB ceiling.
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: true,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        videoRef.current.play();
      }

      /**
       * A type this browser has CONFIRMED, or none at all.
       *
       * Null is a real answer: `new MediaRecorder(stream)` with no options
       * records in the browser's own default. The old code insisted on
       * `video/webm` after being told it was unsupported, and the constructor
       * threw on every iPhone.
       */
      const mimeType = pickRecorderMimeType(
        typeof MediaRecorder !== 'undefined' ? MediaRecorder : null,
      );
      let mediaRecorder: MediaRecorder;
      try {
        mediaRecorder = mimeType
          ? new MediaRecorder(stream, { mimeType })
          : new MediaRecorder(stream);
      } catch (err) {
        // Last resort: the negotiated type was still refused. Try the default
        // before giving up, and say so plainly if that fails too.
        try {
          mediaRecorder = new MediaRecorder(stream);
        } catch {
          stream.getTracks().forEach((t) => t.stop());
          toast.error(NO_RECORDER_MESSAGE, { duration: 10_000 });
          return;
        }
      }

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        /**
         * The type comes from the RECORDER, not from what we asked for.
         *
         * A browser may honour the request approximately, and both the blob and
         * the eventual filename should describe what is actually in it. This
         * was hard-coded `video/webm` in three places, which mislabelled every
         * Android recording as well as breaking iOS.
         */
        const recorded = mediaRecorder.mimeType || mimeType || 'video/mp4';
        const blob = new Blob(chunksRef.current, { type: recorded });
        const url = URL.createObjectURL(blob);
        const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);

        const video = { blob, url, duration, mimeType: recorded };
        setRecordedVideo(video);
        onVideoRecorded?.(video);

        stopStream();
        setRecordingDuration(0);
        toast.success('Video recorded.');
      };

      mediaRecorder.start();
      setIsRecording(true);
      setHasPermission(true);
      startTimeRef.current = Date.now();

      timerIntervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setRecordingDuration(elapsed);
        if (elapsed >= maxDuration) {
          stopRecording();
          toast.warning(`Stopped at ${maxDuration} seconds — that is long enough for an estimate.`);
        }
      }, 1000);
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Could not use the camera. Check that this site is allowed to use it.');
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
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  const deleteVideo = () => {
    if (!recordedVideo) return;
    URL.revokeObjectURL(recordedVideo.url);
    setRecordedVideo(null);
    setPreviewMode(false);
    toast.success('Video removed.');
  };

  const playVideo = () => {
    if (!recordedVideo || !videoRef.current) return;
    setPreviewMode(true);
    videoRef.current.srcObject = null;
    videoRef.current.src = recordedVideo.url;
    videoRef.current.muted = false;
    videoRef.current.play();
  };

  const downloadVideo = () => {
    if (!recordedVideo) return;
    const a = document.createElement('a');
    a.href = recordedVideo.url;
    // Named after what is in it. This said `.webm` regardless.
    a.download = `walkthrough-${Date.now()}.${extensionForMimeType(recordedVideo.mimeType)}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (hasPermission === null) {
    return (
      <button
        onClick={checkPermission}
        className="w-full px-6 py-4 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition"
      >
        <Video className="w-5 h-5" /> Allow camera and start
      </button>
    );
  }

  return (
    <div className="space-y-6">
      <div className="relative bg-[#0A0A0A] border border-[#2a2a2a] rounded-xl overflow-hidden aspect-video">
        {/* playsInline matters on iOS: without it the preview goes fullscreen
            and takes the stop button with it. */}
        <video ref={videoRef} className="w-full h-full object-cover" playsInline />

        {isRecording && (
          <>
            <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-full animate-pulse shadow-lg">
              <Circle className="w-3 h-3 fill-current" />
              <span className="text-sm font-bold">RECORDING</span>
              <span className="text-sm font-mono">{formatTime(recordingDuration)}</span>
            </div>
            <div className="absolute top-4 right-4 bg-black/80 backdrop-blur-sm text-white px-4 py-2 rounded-full border border-white/10">
              <span className="text-sm font-medium">Max {formatTime(maxDuration)}</span>
            </div>
          </>
        )}

        {!isRecording && !previewMode && !recordedVideo && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 bg-gradient-to-br from-[#0A0A0A] to-[#1A1A1A] px-6 text-center">
            <VideoOff className="w-20 h-20 mb-4 text-gray-600" />
            <p className="text-lg font-medium">Ready to record</p>
            <p className="text-sm text-gray-500 mt-2">
              A slow walk round what needs taking away — about a minute is plenty.
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        {!isRecording && !recordedVideo ? (
          <button
            onClick={startRecording}
            className="px-8 py-4 bg-gradient-to-r from-[#ea580c] to-[#c2410c] hover:from-[#c2410c] hover:to-[#9a3412] text-white rounded-xl font-bold transition flex items-center gap-3 shadow-lg shadow-[#ea580c]/20"
          >
            <Circle className="w-6 h-6" />
            Start recording
          </button>
        ) : isRecording ? (
          <button
            onClick={stopRecording}
            className="px-8 py-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition flex items-center gap-3 shadow-lg"
          >
            <Square className="w-6 h-6" />
            Stop recording
          </button>
        ) : null}

        {recordedVideo && (
          <>
            <button
              onClick={playVideo}
              className="px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition flex items-center gap-2"
            >
              <Play className="w-5 h-5" /> Play
            </button>
            <button
              onClick={downloadVideo}
              className="px-6 py-4 bg-[#1F1F1F] border border-[#2F2F2F] hover:border-orange-500/50 text-zinc-200 rounded-xl font-medium transition flex items-center gap-2"
            >
              <Download className="w-5 h-5" /> Save a copy
            </button>
            <button
              onClick={deleteVideo}
              className="px-6 py-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition flex items-center gap-2"
            >
              <Trash2 className="w-5 h-5" /> Remove
            </button>
          </>
        )}
      </div>

      {recordedVideo && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-emerald-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-emerald-300 font-medium">Recorded</p>
              {/*
                Says what it is and how big, and NOT "ready for analysis",
                which is what it said when nothing was going to analyse it.
              */}
              <p className="text-sm text-emerald-400/70">
                {formatTime(recordedVideo.duration)} ·{' '}
                {(recordedVideo.blob.size / (1024 * 1024)).toFixed(1)} MB ·{' '}
                {extensionForMimeType(recordedVideo.mimeType).toUpperCase()} · it goes
                with your request
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-200 space-y-1">
            <p className="font-medium text-blue-300 mb-2">What makes a clip worth sending:</p>
            <p>• Walk slowly, and get the whole pile in shot before going close</p>
            <p>• Show the way out — doors, hallways, stairs, and where a truck could park</p>
            <p>• Pause on anything heavy, or anything you are unsure we will take</p>
            <p>• Say what you are showing as you go; it helps more than you would think</p>
          </div>
        </div>
      </div>

      <p className="text-xs text-zinc-600 flex items-center gap-2">
        <Clock className="w-3.5 h-3.5 flex-shrink-0" />
        Nothing is read automatically yet — a person watches this when they price your job.
      </p>
    </div>
  );
}
