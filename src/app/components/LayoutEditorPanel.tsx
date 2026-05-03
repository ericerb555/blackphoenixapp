/**
 * Enterprise Layout Editor Panel
 * 
 * Complete visual page editor allowing admins to:
 * - Customize buttons (colors, sizes, positions, text)
 * - Adjust graphs (types, data, colors, sizes)
 * - Add/remove page elements
 * - Drag and drop components
 * - Responsive design controls
 * - Save/preview/publish workflow
 */

import { useState, useRef, useEffect } from 'react';
import {
  Layout, Save, Eye, RotateCcw, Settings, Palette, Move,
  Trash2, Copy, Plus, ChevronDown, ChevronRight, Grid,
  Layers, Type, Image, BarChart3, Square, Circle,
  MousePointer, Hand, ZoomIn, ZoomOut, Monitor, Smartphone,
  Tablet, Undo, Redo, Code, Download, Upload, Lock,
  Unlock, EyeOff, AlignLeft, AlignCenter, AlignRight,
  Bold, Italic, Underline, Link, List, CheckSquare,
  Star, Crown, Shield, Users, DollarSign, TrendingUp,
  Package, FileText, Calendar, Clock, MapPin, Phone,
  Mail, Search, Filter, Edit, X, Check, AlertCircle,
  Info, Zap, Target, Award, Activity, Database, Server,
  Globe, Home, Menu, MoreVertical, ArrowLeft, ArrowRight,
  ArrowUp, ArrowDown, Maximize2, Minimize2, RefreshCw,
  Sliders, Paintbrush, Sparkles, Wand2, Box, Component
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { ConfirmModal } from '../ui/modal';

type EditorMode = 'select' | 'edit' | 'add' | 'preview';
type ElementType = 'button' | 'chart' | 'card' | 'text' | 'image' | 'grid' | 'section';
type ViewMode = 'desktop' | 'tablet' | 'mobile';

interface LayoutElement {
  id: string;
  type: ElementType;
  name: string;
  properties: {
    // Position & Size
    x?: number;
    y?: number;
    width?: string;
    height?: string;
    
    // Styling
    backgroundColor?: string;
    textColor?: string;
    borderColor?: string;
    borderWidth?: string;
    borderRadius?: string;
    padding?: string;
    margin?: string;
    
    // Typography
    fontSize?: string;
    fontWeight?: string;
    textAlign?: 'left' | 'center' | 'right';
    
    // Content
    text?: string;
    icon?: string;
    href?: string;
    
    // Chart Specific
    chartType?: 'line' | 'bar' | 'pie' | 'area';
    chartData?: any[];
    chartColors?: string[];
    
    // Visibility
    visible?: boolean;
    visibleOn?: ('desktop' | 'tablet' | 'mobile')[];
    
    // Interaction
    onClick?: string;
    disabled?: boolean;
    
    // Grid/Layout
    columns?: number;
    gap?: string;
    
    // Custom
    customCSS?: string;
    customClass?: string;
  };
  children?: LayoutElement[];
  locked?: boolean;
}

interface LayoutEditorPanelProps {
  isOpen: boolean;
  onClose: () => void;
  pageName: string;
  currentElements?: LayoutElement[];
  onSave?: (elements: LayoutElement[]) => void;
}

export default function LayoutEditorPanel({ 
  isOpen, 
  onClose, 
  pageName,
  currentElements = [],
  onSave 
}: LayoutEditorPanelProps) {
  const [editorMode, setEditorMode] = useState<EditorMode>('select');
  const [viewMode, setViewMode] = useState<ViewMode>('desktop');
  const [selectedElement, setSelectedElement] = useState<LayoutElement | null>(null);
  const [elements, setElements] = useState<LayoutElement[]>(currentElements);
  const [history, setHistory] = useState<LayoutElement[][]>([currentElements]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [showGrid, setShowGrid] = useState(true);
  const [zoom, setZoom] = useState(100);
  const [activePanel, setActivePanel] = useState<'elements' | 'properties' | 'styles'>('elements');
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Sample element templates
  const elementTemplates: Record<ElementType, Partial<LayoutElement>> = {
    button: {
      type: 'button',
      name: 'New Button',
      properties: {
        text: 'Button Text',
        backgroundColor: '#ea580c',
        textColor: '#ffffff',
        borderRadius: '0.75rem',
        padding: '0.75rem 1.5rem',
        fontSize: '0.875rem',
        fontWeight: '600',
        visible: true,
        visibleOn: ['desktop', 'tablet', 'mobile']
      }
    },
    chart: {
      type: 'chart',
      name: 'New Chart',
      properties: {
        chartType: 'bar',
        width: '100%',
        height: '300px',
        backgroundColor: '#1A1A1A',
        borderRadius: '1rem',
        padding: '1rem',
        chartColors: ['#ea580c', '#f97316', '#fb923c'],
        visible: true,
        visibleOn: ['desktop', 'tablet', 'mobile']
      }
    },
    card: {
      type: 'card',
      name: 'New Card',
      properties: {
        backgroundColor: '#1A1A1A',
        borderColor: '#2A2A2A',
        borderWidth: '1px',
        borderRadius: '1rem',
        padding: '1.5rem',
        visible: true,
        visibleOn: ['desktop', 'tablet', 'mobile']
      }
    },
    text: {
      type: 'text',
      name: 'New Text',
      properties: {
        text: 'Sample Text',
        textColor: '#ffffff',
        fontSize: '1rem',
        fontWeight: '400',
        textAlign: 'left',
        visible: true,
        visibleOn: ['desktop', 'tablet', 'mobile']
      }
    },
    image: {
      type: 'image',
      name: 'New Image',
      properties: {
        width: '200px',
        height: '200px',
        borderRadius: '0.5rem',
        visible: true,
        visibleOn: ['desktop', 'tablet', 'mobile']
      }
    },
    grid: {
      type: 'grid',
      name: 'New Grid',
      properties: {
        columns: 3,
        gap: '1rem',
        visible: true,
        visibleOn: ['desktop', 'tablet', 'mobile']
      },
      children: []
    },
    section: {
      type: 'section',
      name: 'New Section',
      properties: {
        backgroundColor: '#0A0A0A',
        padding: '2rem',
        margin: '0',
        visible: true,
        visibleOn: ['desktop', 'tablet', 'mobile']
      },
      children: []
    }
  };

  if (!isOpen) return null;

  // Add element to canvas
  const addElement = (type: ElementType) => {
    const template = elementTemplates[type];
    const newElement: LayoutElement = {
      id: `${type}-${Date.now()}`,
      type,
      name: template.name || `New ${type}`,
      properties: { ...template.properties },
      children: template.children || undefined,
      locked: false
    };

    const updatedElements = [...elements, newElement];
    setElements(updatedElements);
    addToHistory(updatedElements);
    setSelectedElement(newElement);
    toast.success(`Added ${type} to canvas`);
  };

  // Update element properties
  const updateElement = (id: string, updates: Partial<LayoutElement>) => {
    const updatedElements = elements.map(el => 
      el.id === id ? { ...el, ...updates } : el
    );
    setElements(updatedElements);
    addToHistory(updatedElements);
    
    if (selectedElement?.id === id) {
      setSelectedElement({ ...selectedElement, ...updates });
    }
  };

  // Delete element
  const deleteElement = (id: string) => {
    const updatedElements = elements.filter(el => el.id !== id);
    setElements(updatedElements);
    addToHistory(updatedElements);
    setSelectedElement(null);
    toast.success('Element deleted');
  };

  // Duplicate element
  const duplicateElement = (element: LayoutElement) => {
    const duplicate: LayoutElement = {
      ...element,
      id: `${element.type}-${Date.now()}`,
      name: `${element.name} (Copy)`,
      properties: { ...element.properties }
    };
    const updatedElements = [...elements, duplicate];
    setElements(updatedElements);
    addToHistory(updatedElements);
    toast.success('Element duplicated');
  };

  // History management
  const addToHistory = (newElements: LayoutElement[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newElements);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setElements(history[historyIndex - 1]);
      toast.success('Undo');
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setElements(history[historyIndex + 1]);
      toast.success('Redo');
    }
  };

  // Save layout
  const saveLayout = () => {
    if (onSave) {
      onSave(elements);
    }
    localStorage.setItem(`layout-${pageName}`, JSON.stringify(elements));
    toast.success('Layout saved successfully!');
  };

  // Export layout
  const exportLayout = () => {
    const dataStr = JSON.stringify(elements, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${pageName}-layout.json`;
    link.click();
    toast.success('Layout exported!');
  };

  // Reset layout
  const resetLayout = () => {
    setElements([]);
    setSelectedElement(null);
    addToHistory([]);
    toast.success('Layout reset');
    setShowResetConfirm(false);
  };

  const getViewportWidth = () => {
    switch (viewMode) {
      case 'mobile': return '375px';
      case 'tablet': return '768px';
      case 'desktop': return '100%';
    }
  };

  const getElementIcon = (type: ElementType) => {
    switch (type) {
      case 'button': return MousePointer;
      case 'chart': return BarChart3;
      case 'card': return Square;
      case 'text': return Type;
      case 'image': return Image;
      case 'grid': return Grid;
      case 'section': return Box;
      default: return Component;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-sm z-50 flex">
      {/* Left Sidebar - Tools & Elements */}
      <div className="w-80 bg-[#0A0A0A] border-r border-[#2A2A2A] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-[#2A2A2A]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-[#ea580c]/20 rounded-lg">
                <Layout className="w-5 h-5 text-[#ea580c]" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Layout Editor</h2>
                <p className="text-xs text-gray-400">{pageName}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[#1A1A1A] rounded-lg transition text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Mode Selector */}
          <div className="grid grid-cols-4 gap-1 bg-[#1A1A1A] p-1 rounded-lg">
            {[
              { mode: 'select', icon: MousePointer, label: 'Select' },
              { mode: 'edit', icon: Edit, label: 'Edit' },
              { mode: 'add', icon: Plus, label: 'Add' },
              { mode: 'preview', icon: Eye, label: 'Preview' }
            ].map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.mode}
                  onClick={() => setEditorMode(item.mode as EditorMode)}
                  className={`p-2 rounded-md text-xs font-semibold transition ${
                    editorMode === item.mode
                      ? 'bg-[#ea580c] text-white'
                      : 'text-gray-400 hover:text-white hover:bg-[#2A2A2A]'
                  }`}
                  title={item.label}
                >
                  <Icon className="w-4 h-4 mx-auto mb-1" />
                  <span className="block">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Panel Tabs */}
        <div className="flex border-b border-[#2A2A2A]">
          {[
            { id: 'elements', label: 'Elements', icon: Layers },
            { id: 'properties', label: 'Properties', icon: Sliders },
            { id: 'styles', label: 'Styles', icon: Paintbrush }
          ].map((panel) => {
            const Icon = panel.icon;
            return (
              <button
                key={panel.id}
                onClick={() => setActivePanel(panel.id as any)}
                className={`flex-1 p-3 text-xs font-semibold transition flex items-center justify-center gap-2 ${
                  activePanel === panel.id
                    ? 'bg-[#1A1A1A] text-[#ea580c] border-b-2 border-[#ea580c]'
                    : 'text-gray-400 hover:text-white hover:bg-[#1A1A1A]'
                }`}
              >
                <Icon className="w-4 h-4" />
                {panel.label}
              </button>
            );
          })}
        </div>

        {/* Panel Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Elements Panel */}
          {activePanel === 'elements' && (
            <div className="p-4 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-[#ea580c]" />
                  Add Elements
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {Object.keys(elementTemplates).map((type) => {
                    const Icon = getElementIcon(type as ElementType);
                    return (
                      <button
                        key={type}
                        onClick={() => addElement(type as ElementType)}
                        className="p-3 bg-[#1A1A1A] hover:bg-[#2A2A2A] border border-[#2A2A2A] hover:border-[#ea580c]/50 rounded-lg transition text-left group"
                      >
                        <Icon className="w-5 h-5 text-gray-400 group-hover:text-[#ea580c] mb-2" />
                        <p className="text-xs font-semibold text-white capitalize">{type}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#ea580c]" />
                  Elements ({elements.length})
                </h3>
                <div className="space-y-1">
                  {elements.length === 0 ? (
                    <div className="text-center py-8">
                      <Component className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                      <p className="text-sm text-gray-400">No elements yet</p>
                      <p className="text-xs text-gray-500 mt-1">Click "Add" to start</p>
                    </div>
                  ) : (
                    elements.map((element) => {
                      const Icon = getElementIcon(element.type);
                      return (
                        <div
                          key={element.id}
                          onClick={() => setSelectedElement(element)}
                          className={`p-2 rounded-lg cursor-pointer transition group ${
                            selectedElement?.id === element.id
                              ? 'bg-[#ea580c]/20 border border-[#ea580c]/50'
                              : 'bg-[#1A1A1A] border border-[#2A2A2A] hover:border-[#ea580c]/30'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 flex-1">
                              <Icon className={`w-4 h-4 ${
                                selectedElement?.id === element.id ? 'text-[#ea580c]' : 'text-gray-400'
                              }`} />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-white truncate">
                                  {element.name}
                                </p>
                                <p className="text-xs text-gray-400">{element.type}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                              {element.locked ? (
                                <Lock className="w-3 h-3 text-yellow-400" />
                              ) : (
                                <Unlock className="w-3 h-3 text-gray-400" />
                              )}
                              {!element.properties.visible && (
                                <EyeOff className="w-3 h-3 text-gray-400" />
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Properties Panel */}
          {activePanel === 'properties' && selectedElement && (
            <div className="p-4 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white mb-3">Element Properties</h3>
                
                {/* Name */}
                <div className="mb-3">
                  <label className="block text-xs font-semibold text-gray-400 mb-1">Name</label>
                  <input
                    type="text"
                    value={selectedElement.name}
                    onChange={(e) => updateElement(selectedElement.id, { name: e.target.value })}
                    className="w-full px-3 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white text-sm focus:outline-none focus:border-[#ea580c]"
                  />
                </div>

                {/* Text Content (for text elements and buttons) */}
                {(selectedElement.type === 'text' || selectedElement.type === 'button') && (
                  <div className="mb-3">
                    <label className="block text-xs font-semibold text-gray-400 mb-1">Text</label>
                    <input
                      type="text"
                      value={selectedElement.properties.text || ''}
                      onChange={(e) => updateElement(selectedElement.id, {
                        properties: { ...selectedElement.properties, text: e.target.value }
                      })}
                      className="w-full px-3 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white text-sm focus:outline-none focus:border-[#ea580c]"
                    />
                  </div>
                )}

                {/* Dimensions */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1">Width</label>
                    <input
                      type="text"
                      value={selectedElement.properties.width || ''}
                      onChange={(e) => updateElement(selectedElement.id, {
                        properties: { ...selectedElement.properties, width: e.target.value }
                      })}
                      placeholder="auto"
                      className="w-full px-3 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white text-sm focus:outline-none focus:border-[#ea580c]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1">Height</label>
                    <input
                      type="text"
                      value={selectedElement.properties.height || ''}
                      onChange={(e) => updateElement(selectedElement.id, {
                        properties: { ...selectedElement.properties, height: e.target.value }
                      })}
                      placeholder="auto"
                      className="w-full px-3 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white text-sm focus:outline-none focus:border-[#ea580c]"
                    />
                  </div>
                </div>

                {/* Visibility */}
                <div className="mb-3">
                  <label className="flex items-center justify-between text-xs font-semibold text-gray-400 mb-2">
                    Visible
                    <input
                      type="checkbox"
                      checked={selectedElement.properties.visible !== false}
                      onChange={(e) => updateElement(selectedElement.id, {
                        properties: { ...selectedElement.properties, visible: e.target.checked }
                      })}
                      className="w-4 h-4 rounded border-[#2A2A2A] bg-[#1A1A1A] text-[#ea580c] focus:ring-[#ea580c]"
                    />
                  </label>
                </div>

                {/* Lock */}
                <div className="mb-3">
                  <label className="flex items-center justify-between text-xs font-semibold text-gray-400 mb-2">
                    Locked
                    <input
                      type="checkbox"
                      checked={selectedElement.locked || false}
                      onChange={(e) => updateElement(selectedElement.id, { locked: e.target.checked })}
                      className="w-4 h-4 rounded border-[#2A2A2A] bg-[#1A1A1A] text-[#ea580c] focus:ring-[#ea580c]"
                    />
                  </label>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2 pt-4 border-t border-[#2A2A2A]">
                <button
                  onClick={() => duplicateElement(selectedElement)}
                  className="w-full px-3 py-2 bg-[#1A1A1A] hover:bg-[#2A2A2A] border border-[#2A2A2A] text-white rounded-lg text-sm font-semibold transition flex items-center justify-center gap-2"
                >
                  <Copy className="w-4 h-4" />
                  Duplicate
                </button>
                <button
                  onClick={() => deleteElement(selectedElement.id)}
                  className="w-full px-3 py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-600/30 text-red-400 rounded-lg text-sm font-semibold transition flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </div>
          )}

          {activePanel === 'properties' && !selectedElement && (
            <div className="p-4 text-center py-12">
              <Sliders className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-sm text-gray-400">Select an element to edit properties</p>
            </div>
          )}

          {/* Styles Panel */}
          {activePanel === 'styles' && selectedElement && (
            <div className="p-4 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white mb-3">Style Properties</h3>

                {/* Colors */}
                <div className="space-y-3 mb-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1">Background</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={selectedElement.properties.backgroundColor || '#1A1A1A'}
                        onChange={(e) => updateElement(selectedElement.id, {
                          properties: { ...selectedElement.properties, backgroundColor: e.target.value }
                        })}
                        className="w-10 h-10 rounded-lg border border-[#2A2A2A] cursor-pointer"
                      />
                      <input
                        type="text"
                        value={selectedElement.properties.backgroundColor || ''}
                        onChange={(e) => updateElement(selectedElement.id, {
                          properties: { ...selectedElement.properties, backgroundColor: e.target.value }
                        })}
                        className="flex-1 px-3 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white text-sm focus:outline-none focus:border-[#ea580c]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1">Text Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={selectedElement.properties.textColor || '#ffffff'}
                        onChange={(e) => updateElement(selectedElement.id, {
                          properties: { ...selectedElement.properties, textColor: e.target.value }
                        })}
                        className="w-10 h-10 rounded-lg border border-[#2A2A2A] cursor-pointer"
                      />
                      <input
                        type="text"
                        value={selectedElement.properties.textColor || ''}
                        onChange={(e) => updateElement(selectedElement.id, {
                          properties: { ...selectedElement.properties, textColor: e.target.value }
                        })}
                        className="flex-1 px-3 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white text-sm focus:outline-none focus:border-[#ea580c]"
                      />
                    </div>
                  </div>
                </div>

                {/* Typography */}
                {(selectedElement.type === 'text' || selectedElement.type === 'button') && (
                  <div className="space-y-3 mb-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 mb-1">Font Size</label>
                      <input
                        type="text"
                        value={selectedElement.properties.fontSize || ''}
                        onChange={(e) => updateElement(selectedElement.id, {
                          properties: { ...selectedElement.properties, fontSize: e.target.value }
                        })}
                        placeholder="1rem"
                        className="w-full px-3 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white text-sm focus:outline-none focus:border-[#ea580c]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-400 mb-1">Font Weight</label>
                      <select
                        value={selectedElement.properties.fontWeight || '400'}
                        onChange={(e) => updateElement(selectedElement.id, {
                          properties: { ...selectedElement.properties, fontWeight: e.target.value }
                        })}
                        className="w-full px-3 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white text-sm focus:outline-none focus:border-[#ea580c]"
                      >
                        <option value="300">Light</option>
                        <option value="400">Normal</option>
                        <option value="500">Medium</option>
                        <option value="600">Semibold</option>
                        <option value="700">Bold</option>
                        <option value="800">Extra Bold</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-400 mb-2">Text Align</label>
                      <div className="grid grid-cols-3 gap-2">
                        {['left', 'center', 'right'].map((align) => (
                          <button
                            key={align}
                            onClick={() => updateElement(selectedElement.id, {
                              properties: { ...selectedElement.properties, textAlign: align as any }
                            })}
                            className={`p-2 rounded-lg border transition ${
                              selectedElement.properties.textAlign === align
                                ? 'bg-[#ea580c] border-[#ea580c] text-white'
                                : 'bg-[#1A1A1A] border-[#2A2A2A] text-gray-400 hover:border-[#ea580c]/50'
                            }`}
                          >
                            {align === 'left' && <AlignLeft className="w-4 h-4 mx-auto" />}
                            {align === 'center' && <AlignCenter className="w-4 h-4 mx-auto" />}
                            {align === 'right' && <AlignRight className="w-4 h-4 mx-auto" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Spacing */}
                <div className="space-y-3 mb-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1">Padding</label>
                    <input
                      type="text"
                      value={selectedElement.properties.padding || ''}
                      onChange={(e) => updateElement(selectedElement.id, {
                        properties: { ...selectedElement.properties, padding: e.target.value }
                      })}
                      placeholder="1rem"
                      className="w-full px-3 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white text-sm focus:outline-none focus:border-[#ea580c]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1">Margin</label>
                    <input
                      type="text"
                      value={selectedElement.properties.margin || ''}
                      onChange={(e) => updateElement(selectedElement.id, {
                        properties: { ...selectedElement.properties, margin: e.target.value }
                      })}
                      placeholder="0"
                      className="w-full px-3 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white text-sm focus:outline-none focus:border-[#ea580c]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1">Border Radius</label>
                    <input
                      type="text"
                      value={selectedElement.properties.borderRadius || ''}
                      onChange={(e) => updateElement(selectedElement.id, {
                        properties: { ...selectedElement.properties, borderRadius: e.target.value }
                      })}
                      placeholder="0.5rem"
                      className="w-full px-3 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white text-sm focus:outline-none focus:border-[#ea580c]"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activePanel === 'styles' && !selectedElement && (
            <div className="p-4 text-center py-12">
              <Paintbrush className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-sm text-gray-400">Select an element to edit styles</p>
            </div>
          )}
        </div>
      </div>

      {/* Main Canvas */}
      <div className="flex-1 flex flex-col bg-[#0A0A0A]">
        {/* Top Toolbar */}
        <div className="bg-[#1A1A1A] border-b border-[#2A2A2A] p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Undo/Redo */}
            <button
              onClick={undo}
              disabled={historyIndex === 0}
              className="p-2 bg-[#0A0A0A] hover:bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg transition disabled:opacity-30 disabled:cursor-not-allowed"
              title="Undo"
            >
              <Undo className="w-4 h-4 text-white" />
            </button>
            <button
              onClick={redo}
              disabled={historyIndex === history.length - 1}
              className="p-2 bg-[#0A0A0A] hover:bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg transition disabled:opacity-30 disabled:cursor-not-allowed"
              title="Redo"
            >
              <Redo className="w-4 h-4 text-white" />
            </button>

            <div className="w-px h-6 bg-[#2A2A2A] mx-2" />

            {/* View Mode */}
            <div className="flex items-center gap-1 bg-[#0A0A0A] p-1 rounded-lg border border-[#2A2A2A]">
              {[
                { mode: 'desktop', icon: Monitor },
                { mode: 'tablet', icon: Tablet },
                { mode: 'mobile', icon: Smartphone }
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.mode}
                    onClick={() => setViewMode(item.mode as ViewMode)}
                    className={`p-2 rounded-md transition ${
                      viewMode === item.mode
                        ? 'bg-[#ea580c] text-white'
                        : 'text-gray-400 hover:text-white'
                    }`}
                    title={item.mode}
                  >
                    <Icon className="w-4 h-4" />
                  </button>
                );
              })}
            </div>

            <div className="w-px h-6 bg-[#2A2A2A] mx-2" />

            {/* Zoom */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setZoom(Math.max(25, zoom - 25))}
                className="p-2 bg-[#0A0A0A] hover:bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg transition"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4 text-white" />
              </button>
              <span className="text-sm font-semibold text-white min-w-[3rem] text-center">
                {zoom}%
              </span>
              <button
                onClick={() => setZoom(Math.min(200, zoom + 25))}
                className="p-2 bg-[#0A0A0A] hover:bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg transition"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4 text-white" />
              </button>
            </div>

            <div className="w-px h-6 bg-[#2A2A2A] mx-2" />

            {/* Grid Toggle */}
            <button
              onClick={() => setShowGrid(!showGrid)}
              className={`px-3 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2 ${
                showGrid
                  ? 'bg-[#ea580c] text-white'
                  : 'bg-[#0A0A0A] border border-[#2A2A2A] text-gray-400 hover:text-white'
              }`}
            >
              <Grid className="w-4 h-4" />
              Grid
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={exportLayout}
              className="px-3 py-2 bg-[#0A0A0A] hover:bg-[#2A2A2A] border border-[#2A2A2A] text-white rounded-lg text-sm font-semibold transition flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            <button
              onClick={() => setShowResetConfirm(true)}
              className="px-3 py-2 bg-[#0A0A0A] hover:bg-[#2A2A2A] border border-[#2A2A2A] text-white rounded-lg text-sm font-semibold transition flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
            <button
              onClick={saveLayout}
              className="px-4 py-2 bg-[#ea580c] hover:bg-[#ea580c]/90 text-white rounded-lg text-sm font-bold transition flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save Layout
            </button>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 overflow-auto p-8 relative">
          <div 
            className="mx-auto bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg relative"
            style={{ 
              width: getViewportWidth(),
              minHeight: '600px',
              transform: `scale(${zoom / 100})`,
              transformOrigin: 'top center'
            }}
          >
            {/* Grid Overlay */}
            {showGrid && (
              <div 
                className="absolute inset-0 pointer-events-none"
                style={{
                  backgroundImage: 'linear-gradient(#2A2A2A 1px, transparent 1px), linear-gradient(90deg, #2A2A2A 1px, transparent 1px)',
                  backgroundSize: '20px 20px'
                }}
              />
            )}

            {/* Canvas Info */}
            <div className="absolute top-4 left-4 bg-[#0A0A0A]/90 backdrop-blur-sm px-3 py-2 rounded-lg border border-[#2A2A2A]">
              <p className="text-xs font-semibold text-white">
                {viewMode.charAt(0).toUpperCase() + viewMode.slice(1)} View
              </p>
              <p className="text-xs text-gray-400">{getViewportWidth()}</p>
            </div>

            {/* Elements Preview */}
            <div className="p-8 space-y-4">
              {elements.length === 0 ? (
                <div className="text-center py-20">
                  <Component className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-white mb-2">Empty Canvas</h3>
                  <p className="text-sm text-gray-400">Add elements from the left panel to start designing</p>
                </div>
              ) : (
                elements.map((element) => {
                  if (!element.properties.visible) return null;
                  
                  return (
                    <div
                      key={element.id}
                      onClick={() => setSelectedElement(element)}
                      className={`relative cursor-pointer transition ${
                        selectedElement?.id === element.id
                          ? 'ring-2 ring-[#ea580c] ring-offset-2 ring-offset-[#1A1A1A]'
                          : 'hover:ring-2 hover:ring-[#ea580c]/50'
                      }`}
                      style={{
                        width: element.properties.width,
                        height: element.properties.height,
                        backgroundColor: element.properties.backgroundColor,
                        color: element.properties.textColor,
                        padding: element.properties.padding,
                        margin: element.properties.margin,
                        borderRadius: element.properties.borderRadius,
                        fontSize: element.properties.fontSize,
                        fontWeight: element.properties.fontWeight,
                        textAlign: element.properties.textAlign
                      }}
                    >
                      {element.type === 'button' && (
                        <button className="w-full h-full">
                          {element.properties.text}
                        </button>
                      )}
                      {element.type === 'text' && (
                        <p>{element.properties.text}</p>
                      )}
                      {element.type === 'card' && (
                        <div className="border" style={{ borderColor: element.properties.borderColor }}>
                          <p className="text-sm text-gray-400">{element.name}</p>
                        </div>
                      )}
                      {element.type === 'chart' && (
                        <div className="flex items-center justify-center">
                          <BarChart3 className="w-12 h-12 text-gray-600" />
                          <p className="text-sm text-gray-400 ml-3">{element.name}</p>
                        </div>
                      )}

                      {/* Element Label */}
                      {selectedElement?.id === element.id && (
                        <div className="absolute -top-8 left-0 bg-[#ea580c] px-2 py-1 rounded text-xs font-bold text-white whitespace-nowrap">
                          {element.name}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>

    <ConfirmModal
      isOpen={showResetConfirm}
      onClose={() => setShowResetConfirm(false)}
      onConfirm={resetLayout}
      title="Reset Layout"
      message="Are you sure you want to reset the layout? This will remove all elements and cannot be undone."
      variant="danger"
    />
  );
}
