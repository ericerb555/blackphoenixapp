// Advanced Render Engine - Photorealistic Visualization Generator
import { useEffect, useRef, useState } from 'react';
import { X, Download, Maximize2, Minimize2, RefreshCw } from 'lucide-react';
import type { RenderSettings, Material } from './RenderingPanel';

interface RenderEngineProps {
  elements: any[];
  settings: RenderSettings;
  onClose: () => void;
  // Optional: attach the finished render to a quote as a buildable deliverable.
  onSaveToQuote?: (dataUrl: string) => void | Promise<void>;
  savingToQuote?: boolean;
}

interface Light {
  position: { x: number; y: number; z: number };
  color: string;
  intensity: number;
  type: 'sun' | 'ambient' | 'point';
}

export default function RenderEngine({ elements, settings, onClose, onSaveToQuote, savingToQuote }: RenderEngineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isRendering, setIsRendering] = useState(true);
  const [progress, setProgress] = useState(0);
  const [renderTime, setRenderTime] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [renderComplete, setRenderComplete] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;

    const startTime = Date.now();
    renderScene();

    function renderScene() {
      const canvas = canvasRef.current!;
      const ctx = canvas.getContext('2d')!;
      
      // Set canvas size
      canvas.width = settings.resolution.width;
      canvas.height = settings.resolution.height;

      // Calculate scene bounds
      const bounds = calculateSceneBounds();
      const scale = calculateScale(bounds);
      const offset = calculateCenterOffset(bounds, scale);

      // Progressive rendering simulation
      let currentSample = 0;
      const samplesPerFrame = Math.max(1, Math.floor(settings.samples / 20));

      const renderFrame = () => {
        if (currentSample >= settings.samples) {
          setIsRendering(false);
          setRenderComplete(true);
          setRenderTime(Date.now() - startTime);
          return;
        }

        // Clear with background
        ctx.fillStyle = getBackgroundColor();
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Apply progressive anti-aliasing noise
        const jitter = currentSample / settings.samples;
        
        // Render environment/background
        renderEnvironment(ctx, canvas.width, canvas.height);

        // Calculate lighting
        const lights = calculateLighting();

        // Render elements with lighting
        renderElements(ctx, scale, offset, lights, jitter);

        // Apply post-processing
        applyPostProcessing(ctx, canvas.width, canvas.height, jitter);

        currentSample += samplesPerFrame;
        const newProgress = Math.min(100, (currentSample / settings.samples) * 100);
        setProgress(newProgress);

        requestAnimationFrame(renderFrame);
      };

      renderFrame();
    }

    function calculateSceneBounds() {
      if (elements.length === 0) {
        return { minX: 0, minY: 0, maxX: 800, maxY: 600 };
      }

      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

      elements.forEach(el => {
        minX = Math.min(minX, el.x);
        minY = Math.min(minY, el.y);
        maxX = Math.max(maxX, el.x + el.width);
        maxY = Math.max(maxY, el.y + el.height);
      });

      return { minX, minY, maxX, maxY };
    }

    function calculateScale(bounds: any) {
      const sceneWidth = bounds.maxX - bounds.minX;
      const sceneHeight = bounds.maxY - bounds.minY;
      const padding = 50;
      
      const scaleX = (settings.resolution.width - padding * 2) / sceneWidth;
      const scaleY = (settings.resolution.height - padding * 2) / sceneHeight;
      
      return Math.min(scaleX, scaleY, 2); // Max 2x zoom
    }

    function calculateCenterOffset(bounds: any, scale: number) {
      const sceneWidth = bounds.maxX - bounds.minX;
      const sceneHeight = bounds.maxY - bounds.minY;
      
      return {
        x: (settings.resolution.width - sceneWidth * scale) / 2 - bounds.minX * scale,
        y: (settings.resolution.height - sceneHeight * scale) / 2 - bounds.minY * scale
      };
    }

    function getBackgroundColor(): string {
      const timeColors = {
        dawn: '#4A5568',
        morning: '#87CEEB',
        noon: '#87CEEB',
        afternoon: '#FFB347',
        sunset: '#FF6B6B',
        night: '#1A1A2E'
      };
      return timeColors[settings.timeOfDay] || '#87CEEB';
    }

    function renderEnvironment(ctx: CanvasRenderingContext2D, width: number, height: number) {
      // Create gradient sky
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      
      switch (settings.timeOfDay) {
        case 'dawn':
          gradient.addColorStop(0, '#FFA500');
          gradient.addColorStop(0.3, '#FFB347');
          gradient.addColorStop(1, '#4A5568');
          break;
        case 'morning':
          gradient.addColorStop(0, '#87CEEB');
          gradient.addColorStop(1, '#B0E0E6');
          break;
        case 'noon':
          gradient.addColorStop(0, '#4A90E2');
          gradient.addColorStop(1, '#87CEEB');
          break;
        case 'afternoon':
          gradient.addColorStop(0, '#FFD700');
          gradient.addColorStop(1, '#FFA500');
          break;
        case 'sunset':
          gradient.addColorStop(0, '#FF4500');
          gradient.addColorStop(0.5, '#FF6347');
          gradient.addColorStop(1, '#4A5568');
          break;
        case 'night':
          gradient.addColorStop(0, '#000428');
          gradient.addColorStop(1, '#004e92');
          break;
      }

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Add sun/moon
      if (settings.timeOfDay !== 'night') {
        const sunY = height * 0.2;
        const sunX = width * 0.8;
        const sunRadius = 40;

        // Sun glow
        const sunGlow = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunRadius * 3);
        sunGlow.addColorStop(0, 'rgba(255, 255, 200, 0.3)');
        sunGlow.addColorStop(1, 'rgba(255, 255, 200, 0)');
        ctx.fillStyle = sunGlow;
        ctx.fillRect(sunX - sunRadius * 3, sunY - sunRadius * 3, sunRadius * 6, sunRadius * 6);

        // Sun body
        ctx.fillStyle = settings.timeOfDay === 'sunset' ? '#FF6347' : '#FDB813';
        ctx.beginPath();
        ctx.arc(sunX, sunY, sunRadius, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Moon
        const moonY = height * 0.2;
        const moonX = width * 0.8;
        const moonRadius = 35;

        ctx.fillStyle = '#F0F0F0';
        ctx.beginPath();
        ctx.arc(moonX, moonY, moonRadius, 0, Math.PI * 2);
        ctx.fill();

        // Moon craters
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.beginPath();
        ctx.arc(moonX - 10, moonY - 5, 8, 0, Math.PI * 2);
        ctx.arc(moonX + 8, moonY + 5, 5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Add ground plane
      const groundY = height * 0.75;
      const groundGradient = ctx.createLinearGradient(0, groundY, 0, height);
      groundGradient.addColorStop(0, '#8B7355');
      groundGradient.addColorStop(1, '#6B5345');
      ctx.fillStyle = groundGradient;
      ctx.fillRect(0, groundY, width, height - groundY);
    }

    function calculateLighting(): Light[] {
      const lights: Light[] = [];

      // Sun light
      if (settings.timeOfDay !== 'night') {
        const sunAngleRad = (settings.sunAngle * Math.PI) / 180;
        lights.push({
          position: {
            x: Math.cos(sunAngleRad) * 1000,
            y: -Math.sin(sunAngleRad) * 1000,
            z: 500
          },
          color: getSunColor(),
          intensity: settings.sunIntensity,
          type: 'sun'
        });
      }

      // Ambient light
      lights.push({
        position: { x: 0, y: 0, z: 1000 },
        color: '#FFFFFF',
        intensity: 0.3,
        type: 'ambient'
      });

      return lights;
    }

    function getSunColor(): string {
      const colors = {
        dawn: '#FFA500',
        morning: '#FFFACD',
        noon: '#FFFFFF',
        afternoon: '#FFD700',
        sunset: '#FF6347',
        night: '#4169E1'
      };
      return colors[settings.timeOfDay];
    }

    function renderElements(
      ctx: CanvasRenderingContext2D,
      scale: number,
      offset: { x: number; y: number },
      lights: Light[],
      jitter: number
    ) {
      // Sort elements by depth (y position for pseudo-3D)
      const sortedElements = [...elements].sort((a, b) => a.y - b.y);

      sortedElements.forEach(element => {
        ctx.save();

        const x = element.x * scale + offset.x;
        const y = element.y * scale + offset.y;
        const width = element.width * scale;
        const height = element.height * scale;

        ctx.translate(x + width / 2, y + height / 2);
        ctx.rotate((element.rotation * Math.PI) / 180);
        ctx.translate(-width / 2, -height / 2);

        // Calculate lighting intensity
        const lightIntensity = calculateLightIntensity(element, lights);
        
        // Get element color
        let baseColor = element.color || '#4A4A4A';
        
        // Apply lighting to color
        const litColor = applyLighting(baseColor, lightIntensity);

        // Render based on element type
        switch (element.type) {
          case 'wall':
            renderWall(ctx, width, height, litColor, lightIntensity);
            break;
          case 'door':
            renderDoor(ctx, width, height, litColor, lightIntensity);
            break;
          case 'window':
            renderWindow(ctx, width, height, litColor, lightIntensity);
            break;
          case 'furniture':
            renderFurniture(ctx, width, height, litColor, lightIntensity, element.subtype);
            break;
          case 'room':
            renderRoom(ctx, width, height, litColor, lightIntensity);
            break;
          default:
            renderGeneric(ctx, width, height, litColor, lightIntensity);
        }

        // Render shadows if enabled
        if (settings.enableShadows) {
          renderShadow(ctx, width, height, lightIntensity, lights);
        }

        ctx.restore();
      });
    }

    function calculateLightIntensity(element: any, lights: Light[]): number {
      let totalIntensity = 0;

      lights.forEach(light => {
        if (light.type === 'ambient') {
          totalIntensity += light.intensity;
        } else {
          // Calculate distance-based intensity
          const dx = element.x - light.position.x;
          const dy = element.y - light.position.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const attenuation = Math.max(0, 1 - distance / 2000);
          totalIntensity += light.intensity * attenuation;
        }
      });

      return Math.min(1, totalIntensity);
    }

    function applyLighting(color: string, intensity: number): string {
      // Parse hex color
      const hex = color.replace('#', '');
      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);

      // Apply intensity
      const newR = Math.round(r * intensity);
      const newG = Math.round(g * intensity);
      const newB = Math.round(b * intensity);

      return `rgb(${newR}, ${newG}, ${newB})`;
    }

    function renderWall(ctx: CanvasRenderingContext2D, w: number, h: number, color: string, intensity: number) {
      // Main wall body
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, w, h);

      // Add texture
      if (settings.enableReflections) {
        const gradient = ctx.createLinearGradient(0, 0, w, 0);
        gradient.addColorStop(0, `rgba(255, 255, 255, ${0.1 * intensity})`);
        gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
        gradient.addColorStop(1, `rgba(0, 0, 0, ${0.1 * intensity})`);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, w, h);
      }

      // Border
      ctx.strokeStyle = applyLighting('#2A2A2A', intensity);
      ctx.lineWidth = 2;
      ctx.strokeRect(0, 0, w, h);
    }

    function renderDoor(ctx: CanvasRenderingContext2D, w: number, h: number, color: string, intensity: number) {
      // Door panel
      ctx.fillStyle = applyLighting('#8B4513', intensity);
      ctx.fillRect(0, 0, w, h);

      // Door handle
      const handleY = h / 2;
      const handleX = w * 0.85;
      ctx.fillStyle = applyLighting('#FFD700', intensity);
      ctx.beginPath();
      ctx.arc(handleX, handleY, 3, 0, Math.PI * 2);
      ctx.fill();

      // Wood grain effect
      ctx.strokeStyle = applyLighting('#654321', intensity * 0.8);
      ctx.lineWidth = 1;
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.moveTo(5, (h / 5) * i);
        ctx.lineTo(w - 5, (h / 5) * i);
        ctx.stroke();
      }
    }

    function renderWindow(ctx: CanvasRenderingContext2D, w: number, h: number, color: string, intensity: number) {
      // Window frame
      ctx.fillStyle = applyLighting('#654321', intensity);
      ctx.fillRect(0, 0, w, h);

      // Glass panes
      const paneMargin = w * 0.1;
      ctx.fillStyle = `rgba(135, 206, 250, ${0.6 * intensity})`;
      ctx.fillRect(paneMargin, paneMargin, w - paneMargin * 2, h - paneMargin * 2);

      // Glass reflection
      if (settings.enableReflections) {
        const glassGradient = ctx.createLinearGradient(paneMargin, paneMargin, w - paneMargin, h - paneMargin);
        glassGradient.addColorStop(0, 'rgba(255, 255, 255, 0.5)');
        glassGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = glassGradient;
        ctx.fillRect(paneMargin, paneMargin, w - paneMargin * 2, h - paneMargin * 2);
      }

      // Window dividers
      ctx.strokeStyle = applyLighting('#8B7355', intensity);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(w / 2, paneMargin);
      ctx.lineTo(w / 2, h - paneMargin);
      ctx.moveTo(paneMargin, h / 2);
      ctx.lineTo(w - paneMargin, h / 2);
      ctx.stroke();
    }

    function renderFurniture(
      ctx: CanvasRenderingContext2D,
      w: number,
      h: number,
      color: string,
      intensity: number,
      subtype?: string
    ) {
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, w, h);

      // Add 3D depth effect
      const depth = 5;
      ctx.fillStyle = applyLighting(color, intensity * 0.7);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(depth, -depth);
      ctx.lineTo(w + depth, -depth);
      ctx.lineTo(w, 0);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = applyLighting(color, intensity * 0.5);
      ctx.beginPath();
      ctx.moveTo(w, 0);
      ctx.lineTo(w + depth, -depth);
      ctx.lineTo(w + depth, h - depth);
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fill();

      // Outline
      ctx.strokeStyle = applyLighting('#000000', intensity * 0.5);
      ctx.lineWidth = 1;
      ctx.strokeRect(0, 0, w, h);
    }

    function renderRoom(ctx: CanvasRenderingContext2D, w: number, h: number, color: string, intensity: number) {
      // Floor
      const floorGradient = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) / 2);
      floorGradient.addColorStop(0, applyLighting(color, intensity));
      floorGradient.addColorStop(1, applyLighting(color, intensity * 0.7));
      ctx.fillStyle = floorGradient;
      ctx.fillRect(0, 0, w, h);

      // Floor tiles
      const tileSize = 20;
      ctx.strokeStyle = applyLighting('#CCCCCC', intensity * 0.3);
      ctx.lineWidth = 0.5;
      for (let x = 0; x < w; x += tileSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += tileSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
    }

    function renderGeneric(ctx: CanvasRenderingContext2D, w: number, h: number, color: string, intensity: number) {
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = applyLighting('#000000', intensity);
      ctx.lineWidth = 1;
      ctx.strokeRect(0, 0, w, h);
    }

    function renderShadow(
      ctx: CanvasRenderingContext2D,
      w: number,
      h: number,
      intensity: number,
      lights: Light[]
    ) {
      const shadowLight = lights.find(l => l.type === 'sun');
      if (!shadowLight) return;

      const shadowOffset = 10;
      const shadowBlur = 15;

      ctx.shadowColor = `rgba(0, 0, 0, ${0.3 * (1 - intensity)})`;
      ctx.shadowBlur = shadowBlur;
      ctx.shadowOffsetX = shadowOffset;
      ctx.shadowOffsetY = shadowOffset;

      // Reset shadow after
      setTimeout(() => {
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
      }, 0);
    }

    function applyPostProcessing(
      ctx: CanvasRenderingContext2D,
      width: number,
      height: number,
      progress: number
    ) {
      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;

      // Apply exposure, contrast, saturation
      for (let i = 0; i < data.length; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];

        // Exposure
        r = Math.min(255, r * settings.postProcessing.exposure);
        g = Math.min(255, g * settings.postProcessing.exposure);
        b = Math.min(255, b * settings.postProcessing.exposure);

        // Contrast
        r = ((r / 255 - 0.5) * settings.postProcessing.contrast + 0.5) * 255;
        g = ((g / 255 - 0.5) * settings.postProcessing.contrast + 0.5) * 255;
        b = ((b / 255 - 0.5) * settings.postProcessing.contrast + 0.5) * 255;

        // Saturation
        const gray = 0.2989 * r + 0.587 * g + 0.114 * b;
        r = gray + (r - gray) * settings.postProcessing.saturation;
        g = gray + (g - gray) * settings.postProcessing.saturation;
        b = gray + (b - gray) * settings.postProcessing.saturation;

        data[i] = Math.max(0, Math.min(255, r));
        data[i + 1] = Math.max(0, Math.min(255, g));
        data[i + 2] = Math.max(0, Math.min(255, b));
      }

      ctx.putImageData(imageData, 0, 0);

      // Apply bloom
      if (settings.postProcessing.bloom) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.filter = 'blur(10px)';
        ctx.globalAlpha = 0.3;
        ctx.drawImage(ctx.canvas, 0, 0);
        ctx.filter = 'none';
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
      }

      // Apply vignette
      if (settings.postProcessing.vignette) {
        const vignetteGradient = ctx.createRadialGradient(
          width / 2, height / 2, 0,
          width / 2, height / 2, Math.max(width, height) / 1.5
        );
        vignetteGradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
        vignetteGradient.addColorStop(1, 'rgba(0, 0, 0, 0.5)');
        ctx.fillStyle = vignetteGradient;
        ctx.fillRect(0, 0, width, height);
      }
    }
  }, [elements, settings]);

  const handleDownload = () => {
    if (!canvasRef.current) return;

    const link = document.createElement('a');
    link.download = `render-${Date.now()}.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  };

  const handleRerender = () => {
    setIsRendering(true);
    setProgress(0);
    setRenderComplete(false);
    // Force re-render by changing a key or recreating canvas
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className={`bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl overflow-hidden flex flex-col transition-all ${
        isFullscreen ? 'w-full h-full' : 'max-w-6xl w-full max-h-[90vh]'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#2A2A2A] bg-[#0A0A0A]">
          <div>
            <h2 className="text-xl font-bold text-white">Photorealistic Render</h2>
            <p className="text-sm text-gray-400">
              {isRendering ? `Rendering: ${progress.toFixed(1)}%` : `Complete in ${(renderTime / 1000).toFixed(1)}s`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {renderComplete && (
              <>
                <button
                  onClick={handleRerender}
                  className="p-2 hover:bg-[#2A2A2A] rounded-lg transition-colors text-gray-400 hover:text-white"
                  title="Re-render"
                >
                  <RefreshCw className="w-5 h-5" />
                </button>
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-2 px-4 py-2 bg-[#ea580c] text-white rounded-lg hover:bg-[#dc2626] transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
                {onSaveToQuote && (
                  <button
                    onClick={() => canvasRef.current && onSaveToQuote(canvasRef.current.toDataURL('image/png'))}
                    disabled={savingToQuote}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    <Download className="w-4 h-4" />
                    {savingToQuote ? 'Saving…' : 'Save to Quote'}
                  </button>
                )}
              </>
            )}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 hover:bg-[#2A2A2A] rounded-lg transition-colors text-gray-400 hover:text-white"
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[#2A2A2A] rounded-lg transition-colors text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Render Progress */}
        {isRendering && (
          <div className="px-4 py-2 bg-[#0A0A0A] border-b border-[#2A2A2A]">
            <div className="w-full h-2 bg-[#2A2A2A] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#ea580c] to-[#dc2626] transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Canvas Container */}
        <div className="flex-1 overflow-auto bg-[#0A0A0A] p-4 flex items-center justify-center">
          <canvas
            ref={canvasRef}
            className="max-w-full max-h-full rounded-lg shadow-2xl"
            style={{ imageRendering: 'high-quality' }}
          />
        </div>

        {/* Render Info */}
        <div className="p-4 border-t border-[#2A2A2A] bg-[#0A0A0A]">
          <div className="flex items-center justify-between text-sm">
            <div className="flex gap-6 text-gray-400">
              <span>Quality: <strong className="text-white">{settings.quality}</strong></span>
              <span>Resolution: <strong className="text-white">{settings.resolution.width}×{settings.resolution.height}</strong></span>
              <span>Samples: <strong className="text-white">{settings.samples}</strong></span>
              <span>Time of Day: <strong className="text-white capitalize">{settings.timeOfDay}</strong></span>
            </div>
            {renderComplete && (
              <div className="text-green-400 font-semibold">
                ✓ Render Complete
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
