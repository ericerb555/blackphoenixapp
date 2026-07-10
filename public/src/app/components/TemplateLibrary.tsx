/**
 * Template Library Browser Component
 * Browse and apply pre-built templates
 */

import { useState } from 'react';
import { X, Search, Home, Building2, Factory, Grid3x3, Star, Plus } from 'lucide-react';
import { Template, TemplateLibraryManager, applyTemplate } from '../utils/template-library';
import { toast } from 'sonner@2.0.3';

interface TemplateLibraryProps {
  onApplyTemplate: (elements: any[], measurements: any[], annotations: any[]) => void;
  onClose: () => void;
}

export default function TemplateLibrary({ onApplyTemplate, onClose }: TemplateLibraryProps) {
  const [manager] = useState(() => new TemplateLibraryManager());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);

  const categories = [
    { id: 'all', label: 'All Templates', icon: Grid3x3 },
    { id: 'residential', label: 'Residential', icon: Home },
    { id: 'commercial', label: 'Commercial', icon: Building2 },
    { id: 'industrial', label: 'Industrial', icon: Factory },
  ];

  const templates =
    selectedCategory === 'all'
      ? manager.searchTemplates(searchQuery)
      : manager.searchTemplates(searchQuery, selectedCategory);

  const handleApply = (template: Template) => {
    const applied = applyTemplate(template, 50, 50); // Offset by 50px
    onApplyTemplate(applied.elements, applied.measurements, applied.annotations);
    toast.success(`Applied template: ${template.name}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-5xl h-[85vh] bg-gradient-to-br from-[#0f131b] to-[#08090e] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-white/10 bg-gradient-to-b from-white/5 to-transparent flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6cf0ff] to-[#3b82f6] flex items-center justify-center">
              <Grid3x3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Template Library</h2>
              <p className="text-sm text-gray-400">Choose from {templates.length} pre-built templates</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Filters */}
        <div className="p-6 border-b border-white/10 flex-shrink-0 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search templates..."
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-white/10 bg-[#090c12]/55 text-white outline-none focus:border-[#6cf0ff]/35 focus:shadow-[0_0_0_4px_rgba(108,240,255,0.1)] transition-all"
            />
          </div>

          {/* Category Tabs */}
          <div className="flex gap-2">
            {categories.map((cat) => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex-1 px-4 py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                    selectedCategory === cat.id
                      ? 'bg-gradient-to-b from-[#6cf0ff]/20 to-[#6cf0ff]/5 border border-[#6cf0ff]/40'
                      : 'bg-white/5 border border-white/10 hover:bg-white/10'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Templates Grid */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => (
              <div
                key={template.id}
                className={`group rounded-xl border ${
                  selectedTemplate?.id === template.id
                    ? 'border-[#6cf0ff]/50 bg-gradient-to-b from-[#6cf0ff]/15 to-[#6cf0ff]/5'
                    : 'border-white/10 bg-gradient-to-b from-white/5 to-white/2 hover:border-white/20'
                } overflow-hidden transition-all cursor-pointer`}
                onClick={() => setSelectedTemplate(template)}
              >
                {/* Thumbnail */}
                <div className="h-32 bg-gradient-to-br from-[#0a0c12] to-[#0f131b] relative overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-6xl opacity-20">
                      {template.category === 'residential' && '🏠'}
                      {template.category === 'commercial' && '🏢'}
                      {template.category === 'industrial' && '🏭'}
                    </div>
                  </div>
                  <div className="absolute top-2 right-2 flex gap-1">
                    <div className="px-2 py-1 rounded-lg bg-black/60 backdrop-blur-sm text-xs flex items-center gap-1">
                      <Star className="w-3 h-3 text-[#fbbf24] fill-[#fbbf24]" />
                      {template.popularity}
                    </div>
                  </div>
                </div>

                {/* Info */}
                <div className="p-4">
                  <h3 className="font-bold mb-1 group-hover:text-[#6cf0ff] transition-colors">
                    {template.name}
                  </h3>
                  <p className="text-xs text-gray-400 mb-3 line-clamp-2">{template.description}</p>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
                    <div className="p-2 rounded-lg bg-white/5 text-center">
                      <div className="text-gray-400">Area</div>
                      <div className="font-mono text-white font-bold">{template.dimensions.area} sf</div>
                    </div>
                    <div className="p-2 rounded-lg bg-white/5 text-center">
                      <div className="text-gray-400">W×H</div>
                      <div className="font-mono text-white font-bold text-[10px]">
                        {template.dimensions.width}×{template.dimensions.height}
                      </div>
                    </div>
                    <div className="p-2 rounded-lg bg-white/5 text-center">
                      <div className="text-gray-400">Items</div>
                      <div className="font-mono text-white font-bold">{template.elements.length}</div>
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1 mb-3">
                    {template.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 rounded-full bg-white/10 text-[10px] text-gray-300"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Apply Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleApply(template);
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-[#6cf0ff]/30 bg-gradient-to-b from-[#6cf0ff]/15 to-transparent hover:from-[#6cf0ff]/25 hover:border-[#6cf0ff]/50 transition-all font-semibold text-xs flex items-center justify-center gap-2"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Apply Template
                  </button>
                </div>
              </div>
            ))}
          </div>

          {templates.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-gray-500" />
              </div>
              <p className="text-gray-400">No templates found</p>
              <p className="text-sm text-gray-500 mt-1">Try a different search or category</p>
            </div>
          )}
        </div>

        {/* Footer */}
        {selectedTemplate && (
          <div className="p-4 border-t border-white/10 bg-gradient-to-t from-white/5 to-transparent flex items-center justify-between flex-shrink-0">
            <div>
              <div className="font-semibold">{selectedTemplate.name}</div>
              <div className="text-xs text-gray-400">
                {selectedTemplate.elements.length} elements • {selectedTemplate.dimensions.area} sq ft
              </div>
            </div>
            <button
              onClick={() => handleApply(selectedTemplate)}
              className="px-6 py-3 rounded-xl border border-[#6cf0ff]/40 bg-gradient-to-b from-[#6cf0ff]/20 to-[#6cf0ff]/5 hover:from-[#6cf0ff]/30 hover:to-[#6cf0ff]/10 transition-all font-bold flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Apply to Canvas
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
