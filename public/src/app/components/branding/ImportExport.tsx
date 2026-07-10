/**
 * Import/Export Section Component
 * Handles: Figma Import, Stock Photos, Brand Kit Export
 * MAX SIZE: 200 lines | Modular Architecture
 */

import { ExternalLink, Camera, Download, LayoutGrid, Palette, FileText } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import type { BrandingSettings } from './types';

interface ImportExportProps {
  settings: BrandingSettings;
}

export function ImportExport({ settings }: ImportExportProps) {
  const handleExportJSON = () => {
    const brandData = {
      companyName: settings.companyName,
      tagline: settings.tagline,
      logos: settings.logos,
      colors: settings.colorPalettes,
      typography: settings.typography
    };
    
    const blob = new Blob([JSON.stringify(brandData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `brand-kit-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Brand kit exported as JSON');
  };

  return (
    <div className="space-y-6">
      {/* Import from Figma */}
      <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6">
        <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <ExternalLink className="w-5 h-5 text-[#ea580c]" />
          Import from Figma
        </h4>
        
        <div className="space-y-4">
          <p className="text-sm text-gray-400">
            Import design assets, components, and design tokens directly from your Figma files.
          </p>
          
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => toast.info('Import Figma frames - Coming soon')}
              className="p-4 bg-[#0A0A0A] hover:bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl transition group"
            >
              <LayoutGrid className="w-6 h-6 text-[#ea580c] mb-2" />
              <p className="text-sm font-semibold text-white">Import Frames</p>
              <p className="text-xs text-gray-400 mt-1">Import design frames as components</p>
            </button>
            
            <button
              onClick={() => toast.info('Import design tokens - Coming soon')}
              className="p-4 bg-[#0A0A0A] hover:bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl transition group"
            >
              <Palette className="w-6 h-6 text-[#ea580c] mb-2" />
              <p className="text-sm font-semibold text-white">Import Tokens</p>
              <p className="text-xs text-gray-400 mt-1">Import colors, spacing, typography</p>
            </button>
          </div>
        </div>
      </div>

      {/* Import from Stock Photos */}
      <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6">
        <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Camera className="w-5 h-5 text-[#ea580c]" />
          Import from Stock Photos
        </h4>
        
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => toast.info('Browse Unsplash - Integration coming soon')}
            className="p-4 bg-[#0A0A0A] hover:bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl transition"
          >
            <p className="text-sm font-semibold text-white">Unsplash</p>
            <p className="text-xs text-gray-400 mt-1">Free high-res photos</p>
          </button>
          
          <button
            onClick={() => toast.info('Browse Pexels - Integration coming soon')}
            className="p-4 bg-[#0A0A0A] hover:bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl transition"
          >
            <p className="text-sm font-semibold text-white">Pexels</p>
            <p className="text-xs text-gray-400 mt-1">Free stock photos</p>
          </button>
          
          <button
            onClick={() => toast.info('Browse Pixabay - Integration coming soon')}
            className="p-4 bg-[#0A0A0A] hover:bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl transition"
          >
            <p className="text-sm font-semibold text-white">Pixabay</p>
            <p className="text-xs text-gray-400 mt-1">Free images & videos</p>
          </button>
        </div>
      </div>

      {/* Export Brand Kit */}
      <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6">
        <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Download className="w-5 h-5 text-[#ea580c]" />
          Export Brand Kit
        </h4>
        
        <div className="space-y-4">
          <p className="text-sm text-gray-400">
            Export your complete brand guidelines, assets, and style guide.
          </p>
          
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => {
                toast.success('Exporting brand kit as PDF...');
                // TODO: Generate PDF with all brand assets
              }}
              className="p-4 bg-[#ea580c]/10 hover:bg-[#ea580c]/20 border border-[#ea580c]/30 rounded-xl transition"
            >
              <FileText className="w-6 h-6 text-[#ea580c] mb-2" />
              <p className="text-sm font-semibold text-white">PDF Guide</p>
              <p className="text-xs text-gray-400 mt-1">Complete brand guide</p>
            </button>
            
            <button
              onClick={handleExportJSON}
              className="p-4 bg-[#ea580c]/10 hover:bg-[#ea580c]/20 border border-[#ea580c]/30 rounded-xl transition"
            >
              <Download className="w-6 h-6 text-[#ea580c] mb-2" />
              <p className="text-sm font-semibold text-white">JSON Export</p>
              <p className="text-xs text-gray-400 mt-1">Developer-friendly</p>
            </button>
            
            <button
              onClick={() => toast.info('Export as web page - Coming soon')}
              className="p-4 bg-[#ea580c]/10 hover:bg-[#ea580c]/20 border border-[#ea580c]/30 rounded-xl transition"
            >
              <ExternalLink className="w-6 h-6 text-[#ea580c] mb-2" />
              <p className="text-sm font-semibold text-white">Web Page</p>
              <p className="text-xs text-gray-400 mt-1">Interactive guide</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
