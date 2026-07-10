// Undo/Redo Panel - Visual history management
import { Undo2, Redo2, History, RotateCcw, Clock } from 'lucide-react';
import { useState } from 'react';

interface HistoryEntry {
  timestamp: Date;
  action: string;
  description: string;
}

interface UndoRedoPanelProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  historyIndex: number;
  historyLength: number;
  recentActions?: HistoryEntry[];
}

export default function UndoRedoPanel({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  historyIndex,
  historyLength,
  recentActions = []
}: UndoRedoPanelProps) {
  const [showHistory, setShowHistory] = useState(false);

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diff < 10) return 'Just now';
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return date.toLocaleTimeString();
  };

  return (
    <>
      {/* Compact Undo/Redo Bar */}
      <div className="fixed bottom-24 right-4 z-30">
        <div className="bg-[#1A1A1A] border-2 border-[#2A2A2A] rounded-lg shadow-xl p-2 flex items-center gap-2">
          {/* Undo Button */}
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className={`p-3 rounded-lg transition-all ${
              canUndo
                ? 'bg-blue-600 hover:bg-blue-700 text-white hover:scale-110'
                : 'bg-[#2A2A2A] text-gray-600 cursor-not-allowed opacity-50'
            }`}
            title={canUndo ? 'Undo (Ctrl+Z)' : 'Nothing to undo'}
          >
            <Undo2 className="w-5 h-5" />
          </button>

          {/* History Position Indicator */}
          <div className="px-3 py-2 bg-[#2A2A2A] rounded-lg min-w-[80px]">
            <div className="text-xs text-gray-400 text-center mb-1">History</div>
            <div className="flex items-center justify-center gap-1">
              <div className="text-sm font-bold text-white">{historyIndex + 1}</div>
              <div className="text-xs text-gray-500">/</div>
              <div className="text-sm text-gray-400">{historyLength}</div>
            </div>
            {/* Progress bar */}
            <div className="mt-2 h-1 bg-[#1A1A1A] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-600 to-purple-600 transition-all"
                style={{ width: `${historyLength > 0 ? ((historyIndex + 1) / historyLength) * 100 : 0}%` }}
              />
            </div>
          </div>

          {/* Redo Button */}
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className={`p-3 rounded-lg transition-all ${
              canRedo
                ? 'bg-purple-600 hover:bg-purple-700 text-white hover:scale-110'
                : 'bg-[#2A2A2A] text-gray-600 cursor-not-allowed opacity-50'
            }`}
            title={canRedo ? 'Redo (Ctrl+Y)' : 'Nothing to redo'}
          >
            <Redo2 className="w-5 h-5" />
          </button>

          {/* History Toggle */}
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="p-3 rounded-lg bg-[#2A2A2A] hover:bg-[#3A3A3A] text-gray-300 transition-colors"
            title="Show history"
          >
            <History className="w-5 h-5" />
          </button>
        </div>

        {/* Keyboard Hints */}
        {(canUndo || canRedo) && (
          <div className="mt-2 flex items-center justify-center gap-3 text-xs text-gray-500">
            {canUndo && (
              <div className="flex items-center gap-1">
                <kbd className="px-2 py-1 bg-[#1A1A1A] border border-[#2A2A2A] rounded text-white">Ctrl</kbd>
                <span>+</span>
                <kbd className="px-2 py-1 bg-[#1A1A1A] border border-[#2A2A2A] rounded text-white">Z</kbd>
              </div>
            )}
            {canRedo && (
              <div className="flex items-center gap-1">
                <kbd className="px-2 py-1 bg-[#1A1A1A] border border-[#2A2A2A] rounded text-white">Ctrl</kbd>
                <span>+</span>
                <kbd className="px-2 py-1 bg-[#1A1A1A] border border-[#2A2A2A] rounded text-white">Y</kbd>
              </div>
            )}
          </div>
        )}
      </div>

      {/* History Panel */}
      {showHistory && (
        <div className="fixed bottom-24 right-[280px] z-30 w-80">
          <div className="bg-[#1A1A1A] border-2 border-[#2A2A2A] rounded-lg shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-white" />
                  <h3 className="font-bold text-white">Action History</h3>
                </div>
                <button
                  onClick={() => setShowHistory(false)}
                  className="p-1 hover:bg-white/20 rounded text-white"
                >
                  ×
                </button>
              </div>
            </div>

            {/* History List */}
            <div className="max-h-96 overflow-y-auto">
              {recentActions.length > 0 ? (
                <div className="divide-y divide-[#2A2A2A]">
                  {recentActions.map((action, index) => (
                    <div
                      key={index}
                      className={`p-3 hover:bg-[#2A2A2A] transition-colors ${
                        index === historyIndex ? 'bg-blue-900/20 border-l-4 border-blue-500' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="text-sm font-medium text-white mb-1">
                            {action.action}
                          </div>
                          <div className="text-xs text-gray-400">
                            {action.description}
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 whitespace-nowrap">
                          {formatTime(action.timestamp)}
                        </div>
                      </div>
                      {index === historyIndex && (
                        <div className="mt-2 text-xs text-blue-400 flex items-center gap-1">
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                          Current state
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-gray-500">
                  <RotateCcw className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No history yet</p>
                  <p className="text-xs mt-1">Start making changes to see history</p>
                </div>
              )}
            </div>

            {/* Footer */}
            {recentActions.length > 0 && (
              <div className="bg-[#0A0A0A] p-3 border-t border-[#2A2A2A] flex items-center justify-between text-xs text-gray-400">
                <span>{recentActions.length} actions recorded</span>
                <button className="text-blue-400 hover:text-blue-300">
                  Clear History
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
