/**
 * Wall Tool Overlay Component
 * Displays real-time drawing information and controls for wall tool
 */

import { MousePointer, Grid3x3, Link2, X, Check } from 'lucide-react';

interface Point {
  x: number;
  y: number;
}

interface WallToolOverlayProps {
  isActive: boolean;
  startPoint: Point | null;
  currentPoint: Point | null;
  length: number;
  angle: number;
  snapToAngle: boolean;
  continuousMode: boolean;
  wallThickness: number;
  onToggleSnap: () => void;
  onToggleContinuous: () => void;
  onFinish: () => void;
  onCancel: () => void;
}

export default function WallToolOverlay({
  isActive,
  startPoint,
  currentPoint,
  length,
  angle,
  snapToAngle,
  continuousMode,
  wallThickness,
  onToggleSnap,
  onToggleContinuous,
  onFinish,
  onCancel,
}: WallToolOverlayProps) {
  if (!isActive) return null;

  const isDrawing = startPoint !== null && currentPoint !== null;
  const normalizedAngle = ((angle % 360) + 360) % 360;
  const lengthInFeet = (length / 20).toFixed(2); // Convert pixels to feet (assuming 20px = 1ft)

  return (
    <div className="fixed top-20 right-6 bg-[#0F0F0F] border border-[#1a1a1a] rounded-lg p-4 shadow-xl z-40 min-w-[280px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MousePointer className="w-5 h-5 text-[#ea580c]" />
          <h3 className="font-semibold text-white">Wall Tool</h3>
        </div>
        <button
          onClick={onCancel}
          className="p-1 hover:bg-[#1a1a1a] rounded transition-colors"
          title="Exit Wall Tool"
        >
          <X className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      {/* Drawing Info */}
      {isDrawing && (
        <div className="space-y-3 mb-4 p-3 bg-[#1a1a1a] rounded border border-[#2a2a2a]">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-400">Length:</span>
            <span className="text-sm font-mono text-white">{lengthInFeet} ft</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-400">Angle:</span>
            <span className="text-sm font-mono text-white">{normalizedAngle.toFixed(1)}°</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-400">Thickness:</span>
            <span className="text-sm font-mono text-white">{wallThickness / 2} in</span>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="space-y-2">
        <button
          onClick={onToggleSnap}
          className={`w-full flex items-center justify-between p-3 rounded transition-colors ${
            snapToAngle
              ? 'bg-[#ea580c]/20 border border-[#ea580c] text-white'
              : 'bg-[#1a1a1a] border border-[#2a2a2a] text-gray-400 hover:border-[#ea580c]/50'
          }`}
        >
          <div className="flex items-center gap-2">
            <Grid3x3 className="w-4 h-4" />
            <span className="text-sm font-medium">Angle Snapping</span>
          </div>
          <div className={`w-2 h-2 rounded-full ${snapToAngle ? 'bg-[#ea580c]' : 'bg-gray-600'}`} />
        </button>

        <button
          onClick={onToggleContinuous}
          className={`w-full flex items-center justify-between p-3 rounded transition-colors ${
            continuousMode
              ? 'bg-[#ea580c]/20 border border-[#ea580c] text-white'
              : 'bg-[#1a1a1a] border border-[#2a2a2a] text-gray-400 hover:border-[#ea580c]/50'
          }`}
        >
          <div className="flex items-center gap-2">
            <Link2 className="w-4 h-4" />
            <span className="text-sm font-medium">Continuous Mode</span>
          </div>
          <div className={`w-2 h-2 rounded-full ${continuousMode ? 'bg-[#ea580c]' : 'bg-gray-600'}`} />
        </button>
      </div>

      {/* Instructions */}
      <div className="mt-4 p-3 bg-[#1a1a1a]/50 rounded border border-[#2a2a2a]">
        <p className="text-xs text-gray-400 leading-relaxed">
          {isDrawing ? (
            <>
              Click to place wall endpoint. Press <kbd className="px-1 py-0.5 bg-[#0A0A0A] border border-[#2a2a2a] rounded text-[10px]">ESC</kbd> to cancel.
            </>
          ) : (
            <>
              Click to start drawing a wall. {snapToAngle && 'Angle snapping enabled. '}{continuousMode && 'Continuous mode: walls will chain together.'}
            </>
          )}
        </p>
      </div>

      {/* Action Buttons */}
      {isDrawing && (
        <div className="mt-4 flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 px-3 py-2 bg-[#1a1a1a] hover:bg-[#2a2a2a] text-white rounded transition text-sm font-medium flex items-center justify-center gap-2"
          >
            <X className="w-4 h-4" />
            Cancel
          </button>
          <button
            onClick={onFinish}
            className="flex-1 px-3 py-2 bg-[#ea580c] hover:bg-[#ea580c]/90 text-white rounded transition text-sm font-medium flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4" />
            Finish
          </button>
        </div>
      )}

      {/* Keyboard Shortcuts */}
      <div className="mt-4 pt-3 border-t border-[#2a2a2a]">
        <p className="text-xs font-medium text-gray-500 mb-2">Shortcuts</p>
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Toggle snap</span>
            <kbd className="px-1.5 py-0.5 bg-[#0A0A0A] border border-[#2a2a2a] rounded text-[10px] text-gray-400">S</kbd>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Continuous mode</span>
            <kbd className="px-1.5 py-0.5 bg-[#0A0A0A] border border-[#2a2a2a] rounded text-[10px] text-gray-400">C</kbd>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Cancel</span>
            <kbd className="px-1.5 py-0.5 bg-[#0A0A0A] border border-[#2a2a2a] rounded text-[10px] text-gray-400">ESC</kbd>
          </div>
        </div>
      </div>
    </div>
  );
}
