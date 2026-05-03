// Canvas Status Bar - Bottom status bar with helpful info
import { 
  Info, 
  Zap,
  Clock,
  Layers,
  Save,
  AlertCircle
} from 'lucide-react';

interface StatusBarProps {
  activeTool: string | null;
  elementCount: number;
  selectedCount: number;
  lastSaved: Date | null;
  canUndo: boolean;
  canRedo: boolean;
  message?: string;
  messageType?: 'info' | 'success' | 'warning' | 'error';
}

export default function CanvasStatusBar({
  activeTool,
  elementCount,
  selectedCount,
  lastSaved,
  canUndo,
  canRedo,
  message,
  messageType = 'info'
}: StatusBarProps) {
  const toolNames: Record<string, string> = {
    'select': 'Select Tool',
    'wall': 'Wall Tool',
    'door': 'Door Tool',
    'window': 'Window Tool',
    'furniture': 'Furniture Tool',
    'electrical': 'Electrical Tool',
    'plumbing': 'Plumbing Tool',
    'measure': 'Measure Tool',
    'text': 'Text Tool',
    'rectangle': 'Rectangle Tool',
    'circle': 'Circle Tool',
    'lasso-select': 'Lasso Selection',
    'offset': 'Offset Tool',
    'array-linear': 'Linear Array',
    'mirror': 'Mirror Tool',
  };

  const messageIcons = {
    info: Info,
    success: Zap,
    warning: AlertCircle,
    error: AlertCircle
  };

  const messageColors = {
    info: 'text-blue-400 bg-blue-900/20 border-blue-500/30',
    success: 'text-green-400 bg-green-900/20 border-green-500/30',
    warning: 'text-yellow-400 bg-yellow-900/20 border-yellow-500/30',
    error: 'text-red-400 bg-red-900/20 border-red-500/30'
  };

  const MessageIcon = messageIcons[messageType];

  const formatTime = (date: Date | null) => {
    if (!date) return 'Never';
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="h-8 bg-[#0A0A0A] border-t border-[#2A2A2A] flex items-center justify-between px-4 text-xs">
      {/* Left section - Tool and message */}
      <div className="flex items-center gap-4 flex-1">
        {/* Active tool */}
        {activeTool && (
          <div className="flex items-center gap-2 px-2 py-1 bg-[#2A2A2A] rounded">
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
            <span className="text-gray-300 font-medium">
              {toolNames[activeTool] || activeTool}
            </span>
          </div>
        )}

        {/* Message */}
        {message && (
          <div className={`flex items-center gap-2 px-3 py-1 rounded border ${messageColors[messageType]}`}>
            <MessageIcon className="w-3.5 h-3.5" />
            <span className="font-medium">{message}</span>
          </div>
        )}

        {/* Quick tips based on state */}
        {!message && !activeTool && (
          <span className="text-gray-500 italic">
            Press <kbd className="px-1.5 py-0.5 bg-[#2A2A2A] rounded text-white">?</kbd> for keyboard shortcuts
          </span>
        )}
      </div>

      {/* Right section - Stats */}
      <div className="flex items-center gap-4">
        {/* Element count */}
        <div className="flex items-center gap-2 text-gray-400">
          <Layers className="w-3.5 h-3.5" />
          <span>
            {elementCount} element{elementCount !== 1 ? 's' : ''}
            {selectedCount > 0 && (
              <span className="text-purple-400 ml-1">
                ({selectedCount} selected)
              </span>
            )}
          </span>
        </div>

        {/* Undo/Redo status */}
        <div className="flex items-center gap-1 text-gray-500">
          <button 
            className={`px-2 py-0.5 rounded ${canUndo ? 'text-white hover:bg-[#2A2A2A]' : 'opacity-30 cursor-not-allowed'}`}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
          >
            ↶
          </button>
          <button 
            className={`px-2 py-0.5 rounded ${canRedo ? 'text-white hover:bg-[#2A2A2A]' : 'opacity-30 cursor-not-allowed'}`}
            disabled={!canRedo}
            title="Redo (Ctrl+Y)"
          >
            ↷
          </button>
        </div>

        {/* Last saved */}
        <div className="flex items-center gap-2 text-gray-400">
          <Save className="w-3.5 h-3.5" />
          <span>Saved {formatTime(lastSaved)}</span>
        </div>

        {/* System status */}
        <div className="flex items-center gap-2 px-2 py-1 bg-green-900/20 text-green-400 rounded border border-green-500/30">
          <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
          <span className="font-medium">Ready</span>
        </div>
      </div>
    </div>
  );
}
