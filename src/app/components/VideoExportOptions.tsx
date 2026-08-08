/**
 * Video Export Options
 * Resolution, format, quality, watermark settings
 */

import React, { useState } from 'react';
import { Download, Film, Settings, Image as ImageIcon, Zap, Upload, Check, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { PhotoSlide } from './PhotoToVideoConverter';
import { MusicAsset } from '../lib/musicAssetManager';

interface VideoExportOptionsProps {
  slides: PhotoSlide[];
  totalDuration: number;
  music?: MusicAsset;
  onExport: (settings: ExportSettings) => void;
  onClose: () => void;
}

export interface ExportSettings {
  resolution: '720p' | '1080p' | '4k';
  aspectRatio: '16:9' | '9:16' | '1:1' | '4:5';
  format: 'mp4' | 'mov' | 'webm';
  quality: 'low' | 'medium' | 'high' | 'ultra';
  fps: 24 | 30 | 60;
  watermark?: {
    enabled: boolean;
    type: 'text' | 'logo';
    content: string;
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
    opacity: number;
    logoUrl?: string;
  };
  includeBranding: boolean;
}

export default function VideoExportOptions({
  slides,
  totalDuration,
  music,
  onExport,
  onClose,
}: VideoExportOptionsProps) {
  const [settings, setSettings] = useState<ExportSettings>({
    resolution: '1080p',
    aspectRatio: '16:9',
    format: 'mp4',
    quality: 'high',
    fps: 30,
    watermark: {
      enabled: false,
      type: 'text',
      content: '',
      position: 'bottom-right',
      opacity: 70,
    },
    includeBranding: true,
  });

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [rendering, setRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);

  // Load an image URL/dataURL into a decoded HTMLImageElement.
  const loadImage = (src: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load image: ${src.slice(0, 60)}`));
      img.src = src;
    });

  // Draw a single image "cover"-fit onto the canvas (centered, no distortion).
  const drawCover = (ctx: CanvasRenderingContext2D, img: HTMLImageElement, w: number, h: number) => {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);
    const scale = Math.max(w / img.width, h / img.height);
    const dw = img.width * scale;
    const dh = img.height * scale;
    ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
  };

  // Real client-side render: paint each slide to a canvas for its duration,
  // capture the canvas as a MediaStream, and encode to a downloadable WebM via
  // MediaRecorder. Music (if present) is mixed in as an audio track.
  const renderAndDownload = async () => {
    if (typeof MediaRecorder === 'undefined' || !HTMLCanvasElement.prototype.captureStream) {
      toast.error('Your browser does not support in-browser video export. Try Chrome or Edge.');
      // Still hand off to the library save path so the work isn't lost.
      onExport(settings);
      return;
    }

    setRendering(true);
    setRenderProgress(0);
    try {
      const [wStr, hStr] = getResolutionDimensions().split('x');
      const width = parseInt(wStr, 10);
      const height = parseInt(hStr, 10);

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not create a rendering canvas.');

      // Preload all slide images up front.
      const images = await Promise.all(slides.map((s) => loadImage(s.url)));

      const fps = settings.fps;
      const stream = canvas.captureStream(fps);

      // Best-effort audio: attach the music track if a source is available.
      let audioEl: HTMLAudioElement | null = null;
      if (music?.url) {
        try {
          audioEl = new Audio(music.url);
          audioEl.crossOrigin = 'anonymous';
          const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
          const audioCtx = new AudioCtx();
          const srcNode = audioCtx.createMediaElementSource(audioEl);
          const dest = audioCtx.createMediaStreamDestination();
          srcNode.connect(dest);
          srcNode.connect(audioCtx.destination);
          dest.stream.getAudioTracks().forEach((t) => stream.addTrack(t));
        } catch (audioErr) {
          console.warn('Music track could not be added to the export:', audioErr);
        }
      }

      const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm';
      const recorder = new MediaRecorder(stream, { mimeType: mime });
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

      const finished = new Promise<Blob>((resolve) => {
        recorder.onstop = () => resolve(new Blob(chunks, { type: 'video/webm' }));
      });

      recorder.start();
      if (audioEl) audioEl.play().catch(() => {});

      // Timeline: draw each slide for (duration + transitionDuration) seconds.
      const startedAt = performance.now();
      const totalMs = slides.reduce((sum, s) => sum + (s.duration + s.transitionDuration) * 1000, 0);

      await new Promise<void>((resolve) => {
        const boundaries = slides.map((s) => (s.duration + s.transitionDuration) * 1000);
        const tick = () => {
          const elapsed = performance.now() - startedAt;
          setRenderProgress(Math.min(99, Math.round((elapsed / totalMs) * 100)));
          // Find the active slide for the current elapsed time.
          let acc = 0;
          let idx = boundaries.length - 1;
          for (let i = 0; i < boundaries.length; i++) {
            if (elapsed < acc + boundaries[i]) { idx = i; break; }
            acc += boundaries[i];
          }
          drawCover(ctx, images[idx], width, height);

          // Optional text watermark overlay.
          if (settings.watermark?.enabled && settings.watermark.type === 'text' && settings.watermark.content) {
            ctx.globalAlpha = (settings.watermark.opacity ?? 70) / 100;
            ctx.fillStyle = '#fff';
            ctx.font = `${Math.round(height * 0.03)}px sans-serif`;
            ctx.fillText(settings.watermark.content, width * 0.04, height * 0.94);
            ctx.globalAlpha = 1;
          }

          if (elapsed >= totalMs) { resolve(); return; }
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });

      recorder.stop();
      if (audioEl) { audioEl.pause(); }
      const blob = await finished;
      setRenderProgress(100);

      // Trigger download.
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `slideshow-${Date.now()}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 4000);

      toast.success('Video exported and downloaded!');
      // Also persist to the library via the parent handler.
      onExport(settings);
      onClose();
    } catch (err: any) {
      console.error('Video export failed:', err);
      toast.error(`Video export failed: ${err?.message || err}`);
    } finally {
      setRendering(false);
    }
  };

  const updateSettings = (updates: Partial<ExportSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  };

  const updateWatermark = (updates: Partial<ExportSettings['watermark']>) => {
    setSettings(prev => ({
      ...prev,
      watermark: { ...prev.watermark!, ...updates }
    }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setLogoFile(file);
      const url = URL.createObjectURL(file);
      updateWatermark({ logoUrl: url });
    }
  };

  const getResolutionDimensions = () => {
    const ratios = {
      '16:9': { '720p': '1280x720', '1080p': '1920x1080', '4k': '3840x2160' },
      '9:16': { '720p': '720x1280', '1080p': '1080x1920', '4k': '2160x3840' },
      '1:1': { '720p': '720x720', '1080p': '1080x1080', '4k': '2160x2160' },
      '4:5': { '720p': '720x900', '1080p': '1080x1350', '4k': '2160x2700' },
    };
    return ratios[settings.aspectRatio][settings.resolution];
  };

  const getEstimatedFileSize = () => {
    // Rough estimation based on quality and duration
    const qualityMultiplier = {
      low: 2,
      medium: 5,
      high: 10,
      ultra: 20,
    };
    const resolutionMultiplier = {
      '720p': 1,
      '1080p': 2,
      '4k': 8,
    };
    
    const baseMB = totalDuration * qualityMultiplier[settings.quality] * resolutionMultiplier[settings.resolution];
    return Math.round(baseMB);
  };

  const resolutionOptions = [
    { value: '720p', label: '720p HD', description: 'Good for web', color: 'blue' },
    { value: '1080p', label: '1080p Full HD', description: 'Recommended', color: 'green' },
    { value: '4k', label: '4K Ultra HD', description: 'Best quality', color: 'purple' },
  ];

  const aspectRatioOptions = [
    { value: '16:9', label: '16:9', description: 'YouTube, Desktop', icon: '🖥️' },
    { value: '9:16', label: '9:16', description: 'TikTok, Stories', icon: '📱' },
    { value: '1:1', label: '1:1', description: 'Instagram Feed', icon: '🟦' },
    { value: '4:5', label: '4:5', description: 'Instagram Portrait', icon: '🖼️' },
  ];

  const formatOptions = [
    { value: 'mp4', label: 'MP4', description: 'Best compatibility', size: '1x' },
    { value: 'mov', label: 'MOV', description: 'Apple devices', size: '1.2x' },
    { value: 'webm', label: 'WebM', description: 'Web optimized', size: '0.8x' },
  ];

  const qualityOptions = [
    { value: 'low', label: 'Low', bitrate: '2 Mbps', size: 'Smallest' },
    { value: 'medium', label: 'Medium', bitrate: '5 Mbps', size: 'Balanced' },
    { value: 'high', label: 'High', bitrate: '10 Mbps', size: 'Large' },
    { value: 'ultra', label: 'Ultra', bitrate: '20 Mbps', size: 'Largest' },
  ];

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-6">
      <div className="bg-[#0A0A0A] rounded-2xl border border-[#2A2A2A] w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-[#2A2A2A] bg-gradient-to-r from-[#1A1A1A] to-[#0A0A0A]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1 flex items-center gap-3">
                <Download className="w-6 h-6 text-[#ea580c]" />
                Export Video
              </h2>
              <p className="text-sm text-gray-400">
                {slides.length} photos • {totalDuration.toFixed(1)}s duration
                {music && ` • Music: ${music.title}`}
              </p>
            </div>
            
            <button
              onClick={onClose}
              className="p-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] rounded-lg transition text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Resolution */}
          <div>
            <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <Film className="w-5 h-5 text-[#ea580c]" />
              Resolution
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {resolutionOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => updateSettings({ resolution: option.value as any })}
                  className={`p-4 rounded-lg border-2 transition ${
                    settings.resolution === option.value
                      ? 'bg-[#ea580c]/10 border-[#ea580c]'
                      : 'bg-[#1A1A1A] border-[#2A2A2A] hover:border-[#ea580c]/50'
                  }`}
                >
                  <div className="text-lg font-bold text-white mb-1">{option.label}</div>
                  <div className="text-xs text-gray-400">{option.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Aspect Ratio */}
          <div>
            <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-[#ea580c]" />
              Aspect Ratio
            </h3>
            <div className="grid grid-cols-4 gap-3">
              {aspectRatioOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => updateSettings({ aspectRatio: option.value as any })}
                  className={`p-4 rounded-lg border-2 transition ${
                    settings.aspectRatio === option.value
                      ? 'bg-[#ea580c]/10 border-[#ea580c]'
                      : 'bg-[#1A1A1A] border-[#2A2A2A] hover:border-[#ea580c]/50'
                  }`}
                >
                  <div className="text-2xl mb-2">{option.icon}</div>
                  <div className="text-sm font-bold text-white mb-1">{option.label}</div>
                  <div className="text-xs text-gray-400">{option.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Format & Quality */}
          <div className="grid grid-cols-2 gap-6">
            {/* Format */}
            <div>
              <h3 className="text-lg font-bold text-white mb-3">Format</h3>
              <div className="space-y-2">
                {formatOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => updateSettings({ format: option.value as any })}
                    className={`w-full p-3 rounded-lg border-2 transition flex items-center justify-between ${
                      settings.format === option.value
                        ? 'bg-[#ea580c]/10 border-[#ea580c]'
                        : 'bg-[#1A1A1A] border-[#2A2A2A] hover:border-[#ea580c]/50'
                    }`}
                  >
                    <div className="text-left">
                      <div className="font-bold text-white">{option.label}</div>
                      <div className="text-xs text-gray-400">{option.description}</div>
                    </div>
                    <div className="text-xs text-gray-500">{option.size}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Quality */}
            <div>
              <h3 className="text-lg font-bold text-white mb-3">Quality</h3>
              <div className="space-y-2">
                {qualityOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => updateSettings({ quality: option.value as any })}
                    className={`w-full p-3 rounded-lg border-2 transition ${
                      settings.quality === option.value
                        ? 'bg-[#ea580c]/10 border-[#ea580c]'
                        : 'bg-[#1A1A1A] border-[#2A2A2A] hover:border-[#ea580c]/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-white">{option.label}</span>
                      <span className="text-xs text-gray-500">{option.size}</span>
                    </div>
                    <div className="text-xs text-gray-400">{option.bitrate}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* FPS */}
          <div>
            <h3 className="text-lg font-bold text-white mb-3">Frame Rate</h3>
            <div className="grid grid-cols-3 gap-3">
              {[24, 30, 60].map((fps) => (
                <button
                  key={fps}
                  onClick={() => updateSettings({ fps: fps as any })}
                  className={`p-3 rounded-lg border-2 transition ${
                    settings.fps === fps
                      ? 'bg-[#ea580c]/10 border-[#ea580c]'
                      : 'bg-[#1A1A1A] border-[#2A2A2A] hover:border-[#ea580c]/50'
                  }`}
                >
                  <div className="font-bold text-white">{fps} FPS</div>
                  <div className="text-xs text-gray-400">
                    {fps === 24 && 'Cinematic'}
                    {fps === 30 && 'Standard'}
                    {fps === 60 && 'Smooth'}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Watermark */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-[#ea580c]" />
                Watermark
              </h3>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.watermark?.enabled}
                  onChange={(e) => updateWatermark({ enabled: e.target.checked })}
                  className="w-4 h-4 rounded bg-[#2A2A2A] border-[#3A3A3A] text-[#ea580c] focus:ring-[#ea580c] cursor-pointer"
                />
                <span className="text-sm text-gray-400">Enable watermark</span>
              </label>
            </div>

            {settings.watermark?.enabled && (
              <div className="space-y-4 p-4 bg-[#1A1A1A] rounded-lg border border-[#2A2A2A]">
                {/* Type */}
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-2">Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => updateWatermark({ type: 'text' })}
                      className={`px-4 py-2 rounded-lg transition ${
                        settings.watermark?.type === 'text'
                          ? 'bg-[#ea580c] text-white'
                          : 'bg-[#2A2A2A] text-gray-400 hover:text-white'
                      }`}
                    >
                      Text
                    </button>
                    <button
                      onClick={() => updateWatermark({ type: 'logo' })}
                      className={`px-4 py-2 rounded-lg transition ${
                        settings.watermark?.type === 'logo'
                          ? 'bg-[#ea580c] text-white'
                          : 'bg-[#2A2A2A] text-gray-400 hover:text-white'
                      }`}
                    >
                      Logo
                    </button>
                  </div>
                </div>

                {/* Content */}
                {settings.watermark?.type === 'text' ? (
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-2">Text</label>
                    <input
                      type="text"
                      value={settings.watermark?.content || ''}
                      onChange={(e) => updateWatermark({ content: e.target.value })}
                      placeholder="© Your Company Name"
                      className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white text-sm"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-2">Logo Image</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                      id="logo-upload"
                    />
                    <label
                      htmlFor="logo-upload"
                      className="flex items-center justify-center gap-2 px-4 py-3 bg-[#2A2A2A] hover:bg-[#3A3A3A] rounded-lg cursor-pointer transition text-sm text-gray-400"
                    >
                      <Upload className="w-4 h-4" />
                      {logoFile ? logoFile.name : 'Upload Logo'}
                    </label>
                  </div>
                )}

                {/* Position */}
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-2">Position</label>
                  <select
                    value={settings.watermark?.position}
                    onChange={(e) => updateWatermark({ position: e.target.value as any })}
                    className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white text-sm"
                  >
                    <option value="top-left">Top Left</option>
                    <option value="top-right">Top Right</option>
                    <option value="bottom-left">Bottom Left</option>
                    <option value="bottom-right">Bottom Right</option>
                    <option value="center">Center</option>
                  </select>
                </div>

                {/* Opacity */}
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-2">
                    Opacity: {settings.watermark?.opacity}%
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={settings.watermark?.opacity}
                    onChange={(e) => updateWatermark({ opacity: parseInt(e.target.value) })}
                    className="w-full h-2 bg-[#2A2A2A] rounded-lg appearance-none cursor-pointer accent-[#ea580c]"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Export Summary */}
          <div className="p-4 bg-gradient-to-r from-[#ea580c]/10 to-[#dc2626]/10 rounded-lg border border-[#ea580c]/30">
            <h4 className="font-bold text-white mb-3">Export Summary</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-400">Resolution:</span>
                <span className="text-white ml-2">{getResolutionDimensions()}</span>
              </div>
              <div>
                <span className="text-gray-400">Format:</span>
                <span className="text-white ml-2 uppercase">{settings.format}</span>
              </div>
              <div>
                <span className="text-gray-400">Quality:</span>
                <span className="text-white ml-2 capitalize">{settings.quality}</span>
              </div>
              <div>
                <span className="text-gray-400">Frame Rate:</span>
                <span className="text-white ml-2">{settings.fps} FPS</span>
              </div>
              <div>
                <span className="text-gray-400">Duration:</span>
                <span className="text-white ml-2">{totalDuration.toFixed(1)}s</span>
              </div>
              <div>
                <span className="text-gray-400">Est. Size:</span>
                <span className="text-white ml-2">~{getEstimatedFileSize()} MB</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-[#2A2A2A] bg-[#0A0A0A] flex items-center justify-between">
          <div className="text-sm text-gray-400">
            Ready to export {slides.length} photos into a {totalDuration.toFixed(1)}s video
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={rendering}
              className="px-6 py-3 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white rounded-lg transition font-medium disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              onClick={renderAndDownload}
              disabled={rendering || slides.length === 0}
              className="px-8 py-3 bg-gradient-to-r from-[#ea580c] to-[#dc2626] hover:opacity-90 text-white rounded-lg transition font-medium flex items-center gap-2 shadow-lg shadow-[#ea580c]/30 disabled:opacity-60"
            >
              {rendering ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Rendering… {renderProgress}%
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5" />
                  Export Video
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}