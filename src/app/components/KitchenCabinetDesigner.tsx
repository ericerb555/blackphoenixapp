/**
 * Kitchen Cabinet Designer
 * 
 * Advanced kitchen cabinet design tool with 3D preview and material selection
 */

import { useState } from 'react';
import {
  Box, Grid, Move, RotateCw, Copy, Trash2, Plus, Minus,
  Ruler, Palette, Eye, EyeOff, Layers, ChevronDown, X,
  Save, Download, Upload, Maximize2, ZoomIn, ZoomOut,
  Settings, Package, DollarSign, CheckCircle, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface KitchenCabinetDesignerProps {
  onClose: () => void;
  onSave: (data: KitchenDesign) => void;
  initialData?: KitchenDesign;
}

interface Cabinet {
  id: string;
  type: 'base' | 'wall' | 'tall' | 'corner' | 'island';
  width: number;
  height: number;
  depth: number;
  x: number;
  y: number;
  material: string;
  finish: string;
  hardware: string;
  price: number;
}

interface KitchenDesign {
  id?: string;
  name: string;
  cabinets: Cabinet[];
  roomDimensions: {
    width: number;
    length: number;
    height: number;
  };
  countertop: {
    material: string;
    thickness: number;
    edgeProfile: string;
    squareFeet: number;
  };
  backsplash: {
    material: string;
    squareFeet: number;
  };
  totalCost: number;
}

export default function KitchenCabinetDesigner({ onClose, onSave, initialData }: KitchenCabinetDesignerProps) {
  const [designName, setDesignName] = useState(initialData?.name || 'New Kitchen Design');
  const [cabinets, setCabinets] = useState<Cabinet[]>(initialData?.cabinets || []);
  const [selectedCabinet, setSelectedCabinet] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');
  const [showGrid, setShowGrid] = useState(true);
  const [zoom, setZoom] = useState(100);
  const [activeTab, setActiveTab] = useState<'cabinets' | 'countertops' | 'materials' | 'summary'>('cabinets');

  const [roomDimensions, setRoomDimensions] = useState(
    initialData?.roomDimensions || { width: 120, length: 144, height: 96 }
  );

  const cabinetTypes = [
    { type: 'base', label: 'Base Cabinet', width: 24, height: 34.5, depth: 24, price: 450 },
    { type: 'wall', label: 'Wall Cabinet', width: 30, height: 30, depth: 12, price: 320 },
    { type: 'tall', label: 'Tall Cabinet', width: 24, height: 84, depth: 24, price: 850 },
    { type: 'corner', label: 'Corner Cabinet', width: 36, height: 34.5, depth: 24, price: 680 },
    { type: 'island', label: 'Island Base', width: 48, height: 34.5, depth: 36, price: 1200 }
  ] as const;

  const materials = [
    { id: 'maple', name: 'Maple', multiplier: 1.0 },
    { id: 'oak', name: 'Oak', multiplier: 1.1 },
    { id: 'cherry', name: 'Cherry', multiplier: 1.3 },
    { id: 'walnut', name: 'Walnut', multiplier: 1.5 },
    { id: 'mdf', name: 'MDF (Painted)', multiplier: 0.7 }
  ];

  const finishes = [
    { id: 'natural', name: 'Natural Stain' },
    { id: 'white', name: 'White Paint' },
    { id: 'espresso', name: 'Espresso Stain' },
    { id: 'gray', name: 'Gray Paint' },
    { id: 'custom', name: 'Custom Color' }
  ];

  const handleAddCabinet = (type: Cabinet['type']) => {
    const template = cabinetTypes.find(t => t.type === type);
    if (!template) return;

    const newCabinet: Cabinet = {
      id: Date.now().toString(),
      type,
      width: template.width,
      height: template.height,
      depth: template.depth,
      x: 0,
      y: 0,
      material: 'maple',
      finish: 'natural',
      hardware: 'brushed-nickel',
      price: template.price
    };

    setCabinets(prev => [...prev, newCabinet]);
    setSelectedCabinet(newCabinet.id);
    toast.success(`${template.label} added`);
  };

  const handleDeleteCabinet = (id: string) => {
    setCabinets(prev => prev.filter(c => c.id !== id));
    if (selectedCabinet === id) {
      setSelectedCabinet(null);
    }
    toast.success('Cabinet removed');
  };

  const handleDuplicateCabinet = (id: string) => {
    const cabinet = cabinets.find(c => c.id === id);
    if (!cabinet) return;

    const newCabinet: Cabinet = {
      ...cabinet,
      id: Date.now().toString(),
      x: cabinet.x + 24,
      y: cabinet.y
    };

    setCabinets(prev => [...prev, newCabinet]);
    toast.success('Cabinet duplicated');
  };

  const calculateTotalCost = () => {
    const cabinetCost = cabinets.reduce((sum, cabinet) => {
      const material = materials.find(m => m.id === cabinet.material);
      const multiplier = material?.multiplier || 1.0;
      return sum + (cabinet.price * multiplier);
    }, 0);

    return cabinetCost;
  };

  const handleSaveDesign = () => {
    const design: KitchenDesign = {
      name: designName,
      cabinets,
      roomDimensions,
      countertop: {
        material: 'granite',
        thickness: 1.25,
        edgeProfile: 'eased',
        squareFeet: 45
      },
      backsplash: {
        material: 'ceramic-tile',
        squareFeet: 28
      },
      totalCost: calculateTotalCost()
    };

    onSave(design);
    toast.success('Kitchen design saved successfully!');
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl w-full max-w-7xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-[#2A2A2A] flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Box className="w-6 h-6 text-[#ea580c]" />
            <div>
              <input
                type="text"
                value={designName}
                onChange={(e) => setDesignName(e.target.value)}
                className="text-xl font-bold text-white bg-transparent border-none focus:outline-none"
              />
              <p className="text-sm text-gray-400">{cabinets.length} cabinets • ${calculateTotalCost().toLocaleString()}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setViewMode(viewMode === '2d' ? '3d' : '2d')}
              className="px-4 py-2 bg-[#0A0A0A] hover:bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg text-white font-medium transition-colors flex items-center gap-2"
            >
              <Eye className="w-4 h-4" />
              {viewMode === '2d' ? '3D View' : '2D View'}
            </button>
            <button
              onClick={handleSaveDesign}
              className="px-4 py-2 bg-[#ea580c] hover:bg-[#dc2626] rounded-lg text-white font-bold transition-colors flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save Design
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[#2A2A2A] rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left Sidebar - Cabinet Library */}
          <div className="w-64 border-r border-[#2A2A2A] p-4 overflow-y-auto">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
              <Package className="w-4 h-4 text-[#ea580c]" />
              Cabinet Library
            </h3>
            <div className="space-y-2">
              {cabinetTypes.map(type => (
                <button
                  key={type.type}
                  onClick={() => handleAddCabinet(type.type)}
                  className="w-full p-3 bg-[#0A0A0A] hover:bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg text-left transition-colors group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-white font-medium text-sm">{type.label}</span>
                    <Plus className="w-4 h-4 text-[#ea580c] opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="text-xs text-gray-400">
                    {type.width}" × {type.height}" × {type.depth}"
                  </div>
                  <div className="text-xs text-[#ea580c] font-semibold mt-1">
                    ${type.price}
                  </div>
                </button>
              ))}
            </div>

            {/* Room Dimensions */}
            <div className="mt-6 pt-6 border-t border-[#2A2A2A]">
              <h4 className="text-white font-semibold mb-3 text-sm">Room Dimensions</h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Width (inches)</label>
                  <input
                    type="number"
                    value={roomDimensions.width}
                    onChange={(e) => setRoomDimensions(prev => ({ ...prev, width: Number(e.target.value) }))}
                    className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white text-sm focus:outline-none focus:border-[#ea580c]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Length (inches)</label>
                  <input
                    type="number"
                    value={roomDimensions.length}
                    onChange={(e) => setRoomDimensions(prev => ({ ...prev, length: Number(e.target.value) }))}
                    className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white text-sm focus:outline-none focus:border-[#ea580c]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Height (inches)</label>
                  <input
                    type="number"
                    value={roomDimensions.height}
                    onChange={(e) => setRoomDimensions(prev => ({ ...prev, height: Number(e.target.value) }))}
                    className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white text-sm focus:outline-none focus:border-[#ea580c]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Main Canvas Area */}
          <div className="flex-1 flex flex-col">
            {/* Canvas Toolbar */}
            <div className="p-4 border-b border-[#2A2A2A] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowGrid(!showGrid)}
                  className={`p-2 rounded-lg transition-colors ${
                    showGrid ? 'bg-[#ea580c] text-white' : 'bg-[#0A0A0A] text-gray-400 hover:text-white'
                  }`}
                >
                  <Grid className="w-4 h-4" />
                </button>
                <div className="w-px h-6 bg-[#2A2A2A]" />
                <button
                  onClick={() => setZoom(Math.max(50, zoom - 10))}
                  className="p-2 bg-[#0A0A0A] hover:bg-[#2A2A2A] rounded-lg text-gray-400 hover:text-white transition-colors"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-sm text-gray-400 font-medium min-w-[60px] text-center">
                  {zoom}%
                </span>
                <button
                  onClick={() => setZoom(Math.min(200, zoom + 10))}
                  className="p-2 bg-[#0A0A0A] hover:bg-[#2A2A2A] rounded-lg text-gray-400 hover:text-white transition-colors"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <Ruler className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-400">
                  {roomDimensions.width}" × {roomDimensions.length}"
                </span>
              </div>
            </div>

            {/* Canvas */}
            <div className="flex-1 bg-[#0A0A0A] p-8 overflow-auto">
              <div
                className="mx-auto border border-[#2A2A2A] bg-[#1A1A1A] relative"
                style={{
                  width: `${(roomDimensions.width * zoom) / 100}px`,
                  height: `${(roomDimensions.length * zoom) / 100}px`
                }}
              >
                {/* Grid */}
                {showGrid && (
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      backgroundImage: `
                        linear-gradient(to right, #2A2A2A 1px, transparent 1px),
                        linear-gradient(to bottom, #2A2A2A 1px, transparent 1px)
                      `,
                      backgroundSize: `${(12 * zoom) / 100}px ${(12 * zoom) / 100}px`
                    }}
                  />
                )}

                {/* Cabinets */}
                {cabinets.map(cabinet => (
                  <div
                    key={cabinet.id}
                    onClick={() => setSelectedCabinet(cabinet.id)}
                    className={`absolute cursor-move border-2 transition-all ${
                      selectedCabinet === cabinet.id
                        ? 'border-[#ea580c] bg-[#ea580c]/20'
                        : 'border-[#4A4A4A] bg-[#2A2A2A] hover:border-[#ea580c]/50'
                    }`}
                    style={{
                      left: `${(cabinet.x * zoom) / 100}px`,
                      top: `${(cabinet.y * zoom) / 100}px`,
                      width: `${(cabinet.width * zoom) / 100}px`,
                      height: `${(cabinet.depth * zoom) / 100}px`
                    }}
                  >
                    <div className="p-1 text-xs text-white font-medium truncate">
                      {cabinet.type}
                    </div>
                  </div>
                ))}

                {cabinets.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <Box className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                      <p className="text-gray-500 text-sm">Add cabinets from the library</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Sidebar - Properties */}
          <div className="w-80 border-l border-[#2A2A2A] p-4 overflow-y-auto">
            {selectedCabinet ? (
              <>
                <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                  <Settings className="w-4 h-4 text-[#ea580c]" />
                  Cabinet Properties
                </h3>
                {(() => {
                  const cabinet = cabinets.find(c => c.id === selectedCabinet);
                  if (!cabinet) return null;

                  return (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm text-gray-400 mb-2">Type</label>
                        <div className="px-3 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white capitalize">
                          {cabinet.type}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm text-gray-400 mb-2">Material</label>
                        <select
                          value={cabinet.material}
                          onChange={(e) => {
                            setCabinets(prev => prev.map(c =>
                              c.id === selectedCabinet ? { ...c, material: e.target.value } : c
                            ));
                          }}
                          className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                        >
                          {materials.map(m => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm text-gray-400 mb-2">Finish</label>
                        <select
                          value={cabinet.finish}
                          onChange={(e) => {
                            setCabinets(prev => prev.map(c =>
                              c.id === selectedCabinet ? { ...c, finish: e.target.value } : c
                            ));
                          }}
                          className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                        >
                          {finishes.map(f => (
                            <option key={f.id} value={f.id}>{f.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Width</label>
                          <input
                            type="number"
                            value={cabinet.width}
                            onChange={(e) => {
                              setCabinets(prev => prev.map(c =>
                                c.id === selectedCabinet ? { ...c, width: Number(e.target.value) } : c
                              ));
                            }}
                            className="w-full px-2 py-1 bg-[#0A0A0A] border border-[#2A2A2A] rounded text-white text-sm focus:outline-none focus:border-[#ea580c]"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Height</label>
                          <input
                            type="number"
                            value={cabinet.height}
                            onChange={(e) => {
                              setCabinets(prev => prev.map(c =>
                                c.id === selectedCabinet ? { ...c, height: Number(e.target.value) } : c
                              ));
                            }}
                            className="w-full px-2 py-1 bg-[#0A0A0A] border border-[#2A2A2A] rounded text-white text-sm focus:outline-none focus:border-[#ea580c]"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Depth</label>
                          <input
                            type="number"
                            value={cabinet.depth}
                            onChange={(e) => {
                              setCabinets(prev => prev.map(c =>
                                c.id === selectedCabinet ? { ...c, depth: Number(e.target.value) } : c
                              ));
                            }}
                            className="w-full px-2 py-1 bg-[#0A0A0A] border border-[#2A2A2A] rounded text-white text-sm focus:outline-none focus:border-[#ea580c]"
                          />
                        </div>
                      </div>

                      <div className="pt-4 border-t border-[#2A2A2A]">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-gray-400">Cabinet Price</span>
                          <span className="text-lg font-bold text-[#ea580c]">
                            ${cabinet.price.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-4">
                        <button
                          onClick={() => handleDuplicateCabinet(cabinet.id)}
                          className="flex-1 px-3 py-2 bg-[#0A0A0A] hover:bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg text-white font-medium transition-colors flex items-center justify-center gap-2"
                        >
                          <Copy className="w-4 h-4" />
                          Duplicate
                        </button>
                        <button
                          onClick={() => handleDeleteCabinet(cabinet.id)}
                          className="flex-1 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg text-red-400 font-medium transition-colors flex items-center justify-center gap-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </>
            ) : (
              <div className="text-center py-12">
                <Box className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">Select a cabinet to edit properties</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#2A2A2A] flex items-center justify-between bg-[#0A0A0A]">
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <Box className="w-4 h-4 text-gray-500" />
              <span className="text-gray-400">{cabinets.length} Cabinets</span>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-gray-500" />
              <span className="text-white font-semibold">${calculateTotalCost().toLocaleString()}</span>
            </div>
          </div>
          <div className="text-xs text-gray-500">
            Click and drag cabinets to position • Select to edit properties
          </div>
        </div>
      </div>
    </div>
  );
}
