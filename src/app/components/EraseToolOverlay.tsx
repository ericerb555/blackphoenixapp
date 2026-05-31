/**
 * Erase Tool Overlay Component
 * Displays controls and information for element deletion
 */

import { Eraser, Trash2, X, Square, MousePointer } from 'lucide-react';

interface EraseToolOverlayProps {
  isActive: boolean;
  hoveredElement: string | null;
  selectedElements: string[];
  onErase: (elementIds: string[]) => void;
  onCancel: () => void;
  onClearSelection: () => void;
  mode: 'single' | 'multiple';
  onModeChange: (mode: 'single' | 'multiple') => void;
}

export default function EraseToolOverlay({
  isActive,
  hoveredElement,
  selectedElements,
  onErase,
  onCancel,
  onClearSelection,
  mode,
  onModeChange,
}: EraseToolOverlayProps) {
  if (!isActive) return null;

  const hasSelection = selectedElements.length > 0;

  return (
    <div className="fixed top-20 right-6 bg-[#0F0F0F] border border-[#1a1a1a] rounded-lg p-4 shadow-xl z-40 min-w-[280px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Eraser className="w-5 h-5 text-[#ea580c]" />
          <h3 className="font-semibold text-white">Erase Tool</h3>
        </div>
        <button
          onClick={onCancel}
          className="p-1 hover:bg-[#1a1a1a] rounded transition-colors"
          title="Exit Erase Tool"
        >
          <X className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      {/* Selection Info */}
      {hasSelection && (
        <div className="mb-4 p-3 bg-[#ea580c]/10 rounded border border-[#ea580c]/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Square className="w-4 h-4 text-[#ea580c]" />
              <span className="text-sm text-white font-medium">
                {selectedElements.length} element{selectedElements.length !== 1 ? 's' : ''} selected
              </span>
            </div>
            <button
              onClick={onClearSelection}
              className="text-xs text-gray-400 hover:text-white transition"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Mode Selection */}
      <div className="space-y-2 mb-4">
        <p className="text-xs font-medium text-gray-500 mb-2">Erase Mode</p>
        
        <button
          onClick={() => onModeChange('single')}
          className={`w-full flex items-center justify-between p-3 rounded transition-colors ${
            mode === 'single'
              ? 'bg-[#ea580c]/20 border border-[#ea580c] text-white'
              : 'bg-[#1a1a1a] border border-[#2a2a2a] text-gray-400 hover:border-[#ea580c]/50'
          }`}
        >
          <div className="flex items-center gap-2">
            <MousePointer className="w-4 h-4" />
            <span className="text-sm font-medium">Single Click</span>
          </div>
          <div className={`w-2 h-2 rounded-full ${mode === 'single' ? 'bg-[#ea580c]' : 'bg-gray-600'}`} />
        </button>

        <button
          onClick={() => onModeChange('multiple')}
          className={`w-full flex items-center justify-between p-3 rounded transition-colors ${
            mode === 'multiple'
              ? 'bg-[#ea580c]/20 border border-[#ea580c] text-white'
              : 'bg-[#1a1a1a] border border-[#2a2a2a] text-gray-400 hover:border-[#ea580c]/50'
          }`}
        >
          <div className="flex items-center gap-2">
            <Square className="w-4 h-4" />
            <span className="text-sm font-medium">Multiple Selection</span>
          </div>
          <div className={`w-2 h-2 rounded-full ${mode === 'multiple' ? 'bg-[#ea580c]' : 'bg-gray-600'}`} />
        </button>
      </div>

      {/* Instructions */}
      <div className="mb-4 p-3 bg-[#1a1a1a]/50 rounded border border-[#2a2a2a]">
        <p className="text-xs text-gray-400 leading-relaxed">
          {mode === 'single' ? (
            <>
              Click on any element to delete it immediately. Hover over elements to highlight them.
            </>
          ) : (
            <>
              Click on elements to select them (they'll turn red), then click the Delete button below. Hold <kbd className="px-1 py-0.5 bg-[#0A0A0A] border border-[#2a2a2a] rounded text-[10px]">Ctrl</kbd> to select multiple.
            </>
          )}
        </p>
      </div>

      {/* Delete Button (for multiple mode) */}
      {mode === 'multiple' && hasSelection && (
        <button
          onClick={() => onErase(selectedElements)}
          className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded transition font-medium flex items-center justify-center gap-2 mb-4"
        >
          <Trash2 className="w-4 h-4" />
          Delete {selectedElements.length} Element{selectedElements.length !== 1 ? 's' : ''}
        </button>
      )}

      {/* Status */}
      {hoveredElement && mode === 'single' && (
        <div className="mb-4 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded">
          <p className="text-xs text-yellow-500 text-center">
            Click to delete this element
          </p>
        </div>
      )}

      {/* Keyboard Shortcuts */}
      <div className="pt-3 border-t border-[#2a2a2a]">
        <p className="text-xs font-medium text-gray-500 mb-2">Shortcuts</p>
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Delete selected</span>
            <kbd className="px-1.5 py-0.5 bg-[#0A0A0A] border border-[#2a2a2a] rounded text-[10px] text-gray-400">Del</kbd>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Cancel</span>
            <kbd className="px-1.5 py-0.5 bg-[#0A0A0A] border border-[#2a2a2a] rounded text-[10px] text-gray-400">ESC</kbd>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Multi-select</span>
            <kbd className="px-1.5 py-0.5 bg-[#0A0A0A] border border-[#2a2a2a] rounded text-[10px] text-gray-400">Ctrl</kbd>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-4 flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 px-3 py-2 bg-[#1a1a1a] hover:bg-[#2a2a2a] text-white rounded transition text-sm font-medium flex items-center justify-center gap-2"
        >
          <X className="w-4 h-4" />
          Exit Erase Mode
        </button>
      </div>
    </div>
  );
}
