// Quick Actions Toolbar - Floating toolbar for common actions
import { 
  Copy, 
  Trash2, 
  RotateCw, 
  FlipHorizontal,
  AlignCenter,
  Grid2x2,
  Lock,
  Layers,
  Settings,
  ChevronRight
} from 'lucide-react';

interface QuickActionsToolbarProps {
  selectedElements: any[];
  position: { x: number; y: number };
  onAction: (action: string) => void;
  visible: boolean;
}

export default function QuickActionsToolbar({
  selectedElements,
  position,
  onAction,
  visible
}: QuickActionsToolbarProps) {
  if (!visible || selectedElements.length === 0) return null;

  const hasMultiple = selectedElements.length > 1;

  const actions = [
    { id: 'copy', icon: Copy, label: 'Copy', color: 'hover:bg-blue-600' },
    { id: 'duplicate', icon: Copy, label: 'Duplicate', color: 'hover:bg-blue-600' },
    { id: 'rotate-90', icon: RotateCw, label: 'Rotate', color: 'hover:bg-purple-600' },
    { id: 'flip-horizontal', icon: FlipHorizontal, label: 'Flip', color: 'hover:bg-purple-600' },
    { id: 'align', icon: AlignCenter, label: 'Align', color: 'hover:bg-green-600', requiresMultiple: true },
    { id: 'array', icon: Grid2x2, label: 'Array', color: 'hover:bg-orange-600' },
    { id: 'group', icon: Layers, label: 'Group', color: 'hover:bg-pink-600', requiresMultiple: true },
    { id: 'lock', icon: Lock, label: 'Lock', color: 'hover:bg-yellow-600' },
    { id: 'properties', icon: Settings, label: 'Props', color: 'hover:bg-indigo-600' },
    { id: 'delete', icon: Trash2, label: 'Delete', color: 'hover:bg-red-600' },
  ];

  return (
    <div
      className="fixed z-40 flex items-center gap-1 bg-[#1A1A1A] border-2 border-purple-500/50 rounded-lg shadow-2xl p-1 backdrop-blur-sm"
      style={{
        left: position.x,
        top: position.y - 60, // Position above selection
        transform: 'translateX(-50%)'
      }}
    >
      {/* Selection count badge */}
      <div className="px-3 py-1.5 bg-purple-600 rounded-md mr-1">
        <span className="text-xs font-bold text-white">
          {selectedElements.length}
        </span>
      </div>

      {/* Action buttons */}
      {actions.map((action) => {
        const isDisabled = action.requiresMultiple && !hasMultiple;
        
        return (
          <button
            key={action.id}
            onClick={() => onAction(action.id)}
            disabled={isDisabled}
            className={`p-2 rounded-md transition-all ${
              isDisabled 
                ? 'opacity-30 cursor-not-allowed' 
                : `${action.color} hover:scale-110`
            } bg-[#2A2A2A]`}
            title={action.label}
          >
            <action.icon className="w-4 h-4 text-white" />
          </button>
        );
      })}

      {/* Arrow indicator pointing to selection */}
      <div 
        className="absolute left-1/2 -bottom-2 w-4 h-4 bg-[#1A1A1A] border-r-2 border-b-2 border-purple-500/50 transform -translate-x-1/2 rotate-45"
      />
    </div>
  );
}
