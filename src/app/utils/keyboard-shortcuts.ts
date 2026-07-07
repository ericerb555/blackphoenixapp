/**
 * CaptureCAD Studio - Keyboard Shortcuts Reference
 * Quick guide for all keyboard shortcuts and hotkeys
 */

export const KEYBOARD_SHORTCUTS = {
  // ====================
  // TOOL SELECTION
  // ====================
  tools: {
    V: { action: 'Select Tool', description: 'Move and edit components' },
    W: { action: 'Wall Tool', description: 'Draw walls' },
    D: { action: 'Door Tool', description: 'Place doors on walls' },
    N: { action: 'Window Tool', description: 'Place and size windows' },
    M: { action: 'Measure Tool', description: 'Linear distance measurement' },
    A: { action: 'Angle Tool', description: 'Measure angles (3 points)' },
    R: { action: 'Area Tool', description: 'Calculate area/volume' },
    T: { action: 'Annotate Tool', description: 'Add notes and labels' },
    P: { action: 'Plumbing Tool', description: 'Pipes and fixtures' },
    E: { action: 'Electrical Tool', description: 'Circuits and outlets' },
  },

  // ====================
  // VIEW CONTROLS
  // ====================
  view: {
    '+': { action: 'Zoom In', description: 'Increase zoom level' },
    '-': { action: 'Zoom Out', description: 'Decrease zoom level' },
    '0': { action: 'Reset View', description: 'Reset zoom and pan' },
    'Space + Drag': { action: 'Pan Canvas', description: 'Move viewport' },
    'Scroll': { action: 'Pan Vertical', description: 'Scroll canvas' },
    'Shift + Scroll': { action: 'Pan Horizontal', description: 'Scroll canvas horizontally' },
  },

  // ====================
  // GENERAL ACTIONS
  // ====================
  general: {
    Escape: { action: 'Cancel/Close', description: 'Close modals or cancel drawing' },
    Delete: { action: 'Delete Selected', description: 'Delete selected element' },
    'Ctrl/Cmd + Z': { action: 'Undo', description: 'Undo last action' },
    'Ctrl/Cmd + Shift + Z': { action: 'Redo', description: 'Redo last undone action' },
    'Ctrl/Cmd + S': { action: 'Save', description: 'Save project (auto-save enabled)' },
    'Ctrl/Cmd + C': { action: 'Copy', description: 'Copy selected element' },
    'Ctrl/Cmd + V': { action: 'Paste', description: 'Paste copied element' },
    'Ctrl/Cmd + A': { action: 'Select All', description: 'Select all elements' },
  },

  // ====================
  // LAYER SHORTCUTS
  // ====================
  layers: {
    '1': { action: 'Architectural Layer', description: 'Switch to architectural layer' },
    '2': { action: 'Dimensions Layer', description: 'Switch to dimensions layer' },
    '3': { action: 'Annotations Layer', description: 'Switch to annotations layer' },
    '4': { action: 'Plumbing Layer', description: 'Switch to plumbing layer' },
    '5': { action: 'Electrical Layer', description: 'Switch to electrical layer' },
    'Alt + L': { action: 'Toggle Layer Panel', description: 'Show/hide layer panel' },
  },

  // ====================
  // MEASUREMENT SHORTCUTS
  // ====================
  measurements: {
    'Alt + D': { action: 'Auto-Dimension', description: 'Generate dimensions for all walls' },
    'Alt + C': { action: 'Clear Dimensions', description: 'Clear all dimensions' },
    'Alt + M': { action: 'Toggle Dimensions', description: 'Show/hide dimension layer' },
    'Alt + A': { action: 'Toggle Annotations', description: 'Show/hide annotation layer' },
  },

  // ====================
  // GRID & SNAP
  // ====================
  grid: {
    'G': { action: 'Toggle Grid', description: 'Show/hide grid' },
    'Ctrl/Cmd + G': { action: 'Toggle Snap', description: 'Enable/disable snap to grid' },
    '[': { action: 'Decrease Snap', description: 'Decrease snap grid size' },
    ']': { action: 'Increase Snap', description: 'Increase snap grid size' },
  },

  // ====================
  // EXPORT & BLUEPRINTS
  // ====================
  export: {
    'Ctrl/Cmd + E': { action: 'Export Blueprint', description: 'Open blueprint export dialog' },
    'Ctrl/Cmd + P': { action: 'Print', description: 'Print current view' },
    'Ctrl/Cmd + Shift + E': { action: 'Export History', description: 'View export history' },
  },

  // ====================
  // AI & GENERATION
  // ====================
  ai: {
    'Ctrl/Cmd + Shift + G': { action: 'AI Generate', description: 'Open AI generation modal' },
    'Ctrl/Cmd + Shift + I': { action: 'Import Capture', description: 'Import video/image capture' },
  },
};

/**
 * Helper to format shortcuts for display
 */
export function formatShortcut(key: string): string {
  const isMac = typeof navigator !== 'undefined' && /Mac/.test(navigator.platform);
  
  return key
    .replace(/Ctrl\/Cmd/g, isMac ? '⌘' : 'Ctrl')
    .replace(/Alt/g, isMac ? '⌥' : 'Alt')
    .replace(/Shift/g, isMac ? '⇧' : 'Shift')
    .replace(/\+/g, ' + ');
}

/**
 * Get all shortcuts as flat array
 */
export function getAllShortcuts() {
  const allShortcuts: Array<{ category: string; key: string; action: string; description: string }> = [];
  
  Object.entries(KEYBOARD_SHORTCUTS).forEach(([category, shortcuts]) => {
    Object.entries(shortcuts).forEach(([key, value]) => {
      allShortcuts.push({
        category: category.charAt(0).toUpperCase() + category.slice(1),
        key,
        action: value.action,
        description: value.description,
      });
    });
  });
  
  return allShortcuts;
}

/**
 * Search shortcuts
 */
export function searchShortcuts(query: string) {
  return getAllShortcuts().filter(
    (shortcut) =>
      shortcut.key.toLowerCase().includes(query.toLowerCase()) ||
      shortcut.action.toLowerCase().includes(query.toLowerCase()) ||
      shortcut.description.toLowerCase().includes(query.toLowerCase())
  );
}
