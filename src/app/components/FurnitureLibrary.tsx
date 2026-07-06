/**
 * Furniture Library Component
 * Allows users to browse and place furniture items on the floor plan
 */

import { useState } from 'react';
import { X, Sofa, Bed, Table, Armchair, Lamp, Search } from 'lucide-react';
import { SecondaryButton } from './ui/button/index';
import { TextInput } from './ui/input/index';

interface Furniture {
  id: string;
  name: string;
  category: string;
  width: number;
  height: number;
  icon: any;
}

interface FurnitureLibraryProps {
  onPlaceFurniture: (furniture: Furniture) => void;
  onClose: () => void;
}

export default function FurnitureLibrary({ onPlaceFurniture, onClose }: FurnitureLibraryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const furnitureItems: Furniture[] = [
    { id: '1', name: 'Sofa', category: 'seating', width: 200, height: 90, icon: Sofa },
    { id: '2', name: 'Armchair', category: 'seating', width: 90, height: 90, icon: Armchair },
    { id: '3', name: 'Dining Table', category: 'tables', width: 180, height: 100, icon: Table },
    { id: '4', name: 'Coffee Table', category: 'tables', width: 120, height: 60, icon: Table },
    { id: '5', name: 'Queen Bed', category: 'beds', width: 160, height: 200, icon: Bed },
    { id: '6', name: 'King Bed', category: 'beds', width: 180, height: 200, icon: Bed },
    { id: '7', name: 'Floor Lamp', category: 'lighting', width: 40, height: 40, icon: Lamp },
    { id: '8', name: 'Table Lamp', category: 'lighting', width: 30, height: 30, icon: Lamp },
  ];

  const categories = [
    { value: 'all', label: 'All Items' },
    { value: 'seating', label: 'Seating' },
    { value: 'tables', label: 'Tables' },
    { value: 'beds', label: 'Beds' },
    { value: 'lighting', label: 'Lighting' },
  ];

  const filteredFurniture = furnitureItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0F0F0F] border border-[#1a1a1a] rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-[#1a1a1a] flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Furniture Library</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#1a1a1a] rounded transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Search and Filters */}
        <div className="p-6 border-b border-[#1a1a1a] space-y-4">
          <TextInput
            placeholder="Search furniture..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            icon={Search}
          />

          <div className="flex gap-2 flex-wrap">
            {categories.map((category) => (
              <button
                key={category.value}
                onClick={() => setSelectedCategory(category.value)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  selectedCategory === category.value
                    ? 'bg-[#ea580c] text-white'
                    : 'bg-[#1a1a1a] text-gray-400 hover:text-white'
                }`}
              >
                {category.label}
              </button>
            ))}
          </div>
        </div>

        {/* Furniture Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredFurniture.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onPlaceFurniture(item);
                    onClose();
                  }}
                  className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4 hover:bg-[#2a2a2a] hover:border-[#ea580c] transition-all group"
                >
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 bg-[#0F0F0F] rounded-lg flex items-center justify-center group-hover:bg-[#ea580c]/20 transition-colors">
                      <Icon className="w-8 h-8 text-gray-400 group-hover:text-[#ea580c] transition-colors" />
                    </div>
                    <div className="text-center">
                      <p className="text-white font-medium">{item.name}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {item.width} × {item.height} cm
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {filteredFurniture.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-400">No furniture items found</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-[#1a1a1a] flex justify-end gap-3">
          <SecondaryButton onClick={onClose}>
            Close
          </SecondaryButton>
        </div>
      </div>
    </div>
  );
}