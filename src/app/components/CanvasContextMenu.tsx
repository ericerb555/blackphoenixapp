// Canvas Context Menu - Right-click actions
import { 
  Copy, 
  Scissors, 
  Trash2, 
  RotateCw, 
  FlipHorizontal, 
  FlipVertical,
  Layers,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Move,
  Grid2x2,
  Settings
} from 'lucide-react';

interface ContextMenuProps {
  x: number;
  y: number;
  selectedElements: any[];
  onAction: (action: ContextMenuAction, data?: any) => void;
  onClose: () => void;
}

export type ContextMenuAction = 
  | 'copy'
  | 'cut'
  | 'paste'
  | 'delete'
  | 'duplicate'
  | 'rotate-90'
  | 'rotate-180'
  | 'flip-horizontal'
  | 'flip-vertical'
  | 'bring-forward'
  | 'bring-to-front'
  | 'send-backward'
  | 'send-to-back'
  | 'group'
  | 'ungroup'
  | 'lock'
  | 'unlock'
  | 'hide'
  | 'show'
  | 'array'
  | 'properties';

export default function CanvasContextMenu({ 
  x, 
  y, 
  selectedElements, 
  onAction, 
  onClose 
}: ContextMenuProps) {
  const hasSelection = selectedElements.length > 0;
  const multipleSelected = selectedElements.length > 1;

  const menuItems = [
    { 
      action: 'copy', 
      label: 'Copy', 
      icon: Copy, 
      shortcut: 'Ctrl+C',
      enabled: hasSelection,
      divider: false
    },
    { 
      action: 'cut', 
      label: 'Cut', 
      icon: Scissors, 
      shortcut: 'Ctrl+X',
      enabled: hasSelection,
      divider: false
    },
    { 
      action: 'paste', 
      label: 'Paste', 
      icon: Copy, 
      shortcut: 'Ctrl+V',
      enabled: true,
      divider: false
    },
    { 
      action: 'duplicate', 
      label: 'Duplicate', 
      icon: Copy, 
      shortcut: 'Ctrl+D',
      enabled: hasSelection,
      divider: true
    },
    { 
      action: 'delete', 
      label: 'Delete', 
      icon: Trash2, 
      shortcut: 'Del',
      enabled: hasSelection,
      color: 'text-red-400',
      divider: true
    },
    { 
      action: 'rotate-90', 
      label: 'Rotate 90°', 
      icon: RotateCw, 
      shortcut: 'R',
      enabled: hasSelection,
      divider: false
    },
    { 
      action: 'rotate-180', 
      label: 'Rotate 180°', 
      icon: RotateCw, 
      shortcut: 'Shift+R',
      enabled: hasSelection,
      divider: false
    },
    { 
      action: 'flip-horizontal', 
      label: 'Flip Horizontal', 
      icon: FlipHorizontal, 
      shortcut: 'H',
      enabled: hasSelection,
      divider: false
    },
    { 
      action: 'flip-vertical', 
      label: 'Flip Vertical', 
      icon: FlipVertical, 
      shortcut: 'V',
      enabled: hasSelection,
      divider: true
    },
    { 
      action: 'bring-to-front', 
      label: 'Bring to Front', 
      icon: Layers, 
      shortcut: 'Ctrl+]',
      enabled: hasSelection,
      divider: false
    },
    { 
      action: 'bring-forward', 
      label: 'Bring Forward', 
      icon: Layers, 
      shortcut: ']',
      enabled: hasSelection,
      divider: false
    },
    { 
      action: 'send-backward', 
      label: 'Send Backward', 
      icon: Layers, 
      shortcut: '[',
      enabled: hasSelection,
      divider: false
    },
    { 
      action: 'send-to-back', 
      label: 'Send to Back', 
      icon: Layers, 
      shortcut: 'Ctrl+[',
      enabled: hasSelection,
      divider: true
    },
    { 
      action: 'group', 
      label: 'Group', 
      icon: Layers, 
      shortcut: 'Ctrl+G',
      enabled: multipleSelected,
      divider: false
    },
    { 
      action: 'ungroup', 
      label: 'Ungroup', 
      icon: Layers, 
      shortcut: 'Ctrl+Shift+G',
      enabled: hasSelection,
      divider: true
    },
    { 
      action: 'array', 
      label: 'Create Array', 
      icon: Grid2x2, 
      shortcut: 'Ctrl+Shift+A',
      enabled: hasSelection,
      divider: true
    },
    { 
      action: 'lock', 
      label: 'Lock', 
      icon: Lock, 
      shortcut: 'Ctrl+L',
      enabled: hasSelection,
      divider: false
    },
    { 
      action: 'properties', 
      label: 'Properties', 
      icon: Settings, 
      shortcut: 'Enter',
      enabled: hasSelection,
      color: 'text-purple-400',
      divider: false
    },
  ];

  // Auto-position menu to stay on screen
  const menuWidth = 240;
  const menuHeight = menuItems.length * 40;
  const adjustedX = Math.min(x, window.innerWidth - menuWidth - 20);
  const adjustedY = Math.min(y, window.innerHeight - menuHeight - 20);

  return (
    <>
      {/* Backdrop - click to close */}
      <div 
        className="fixed inset-0 z-40" 
        onClick={onClose}
        onContextMenu={(e) => {
          e.preventDefault();
          onClose();
        }}
      />

      {/* Context Menu */}
      <div
        className="fixed bg-[#1A1A1A] border-2 border-[#2A2A2A] rounded-lg shadow-2xl z-50 py-1 min-w-[240px]"
        style={{
          left: adjustedX,
          top: adjustedY
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {menuItems.map((item, index) => (
          <div key={item.action}>
            <button
              onClick={() => {
                if (item.enabled) {
                  onAction(item.action as ContextMenuAction);
                  onClose();
                }
              }}
              disabled={!item.enabled}
              className={`w-full px-4 py-2.5 flex items-center justify-between hover:bg-[#2A2A2A] transition-colors text-left disabled:opacity-40 disabled:cursor-not-allowed ${
                item.color || 'text-gray-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <item.icon className="w-4 h-4" />
                <span className="text-sm font-medium">{item.label}</span>
              </div>
              {item.shortcut && (
                <span className="text-xs text-gray-500 font-mono">
                  {item.shortcut}
                </span>
              )}
            </button>
            {item.divider && (
              <div className="h-px bg-[#2A2A2A] my-1" />
            )}
          </div>
        ))}

        {/* Selection info */}
        {hasSelection && (
          <div className="px-4 py-2 border-t border-[#2A2A2A] mt-1">
            <p className="text-xs text-gray-500">
              {selectedElements.length} element{selectedElements.length !== 1 ? 's' : ''} selected
            </p>
          </div>
        )}
      </div>
    </>
  );
}
