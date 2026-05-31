/**
 * Blueprint Upload Widget
 * 
 * Compact widget for uploading blueprints inline within forms
 * Can be embedded in Work Request forms, Project pages, etc.
 */

import { useState, useRef } from 'react';
import { Upload, FileImage, X, Eye, Sparkles, Loader2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface BlueprintFile {
  id: string;
  file: File;
  preview: string;
  analyzed: boolean;
}

interface BlueprintUploadWidgetProps {
  onBlueprintsChange?: (blueprints: BlueprintFile[]) => void;
  onAnalysisRequested?: (blueprints: BlueprintFile[]) => void;
  maxFiles?: number;
  showAnalyzeButton?: boolean;
  compact?: boolean;
}

export default function BlueprintUploadWidget({
  onBlueprintsChange,
  onAnalysisRequested,
  maxFiles = 10,
  showAnalyzeButton = true,
  compact = false
}: BlueprintUploadWidgetProps) {
  const [blueprints, setBlueprints] = useState<BlueprintFile[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (files.length === 0) return;

    if (blueprints.length + files.length > maxFiles) {
      toast.error(`Maximum ${maxFiles} blueprints allowed`);
      return;
    }

    const newBlueprints: BlueprintFile[] = files.map(file => ({
      id: `bp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      preview: URL.createObjectURL(file),
      analyzed: false
    }));

    const updated = [...blueprints, ...newBlueprints];
    setBlueprints(updated);

    if (onBlueprintsChange) {
      onBlueprintsChange(updated);
    }

    toast.success(`${files.length} blueprint${files.length > 1 ? 's' : ''} uploaded`);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeBlueprint = (id: string) => {
    const updated = blueprints.filter(bp => {
      if (bp.id === id) {
        URL.revokeObjectURL(bp.preview);
        return false;
      }
      return true;
    });

    setBlueprints(updated);

    if (onBlueprintsChange) {
      onBlueprintsChange(updated);
    }
  };

  const handleAnalyze = () => {
    if (blueprints.length === 0) {
      toast.error('Please upload blueprints first');
      return;
    }

    setIsAnalyzing(true);
    
    if (onAnalysisRequested) {
      onAnalysisRequested(blueprints);
    }

    // Simulate analysis delay
    setTimeout(() => {
      setIsAnalyzing(false);
      setBlueprints(prev => prev.map(bp => ({ ...bp, analyzed: true })));
      toast.success('Blueprints analyzed!');
    }, 2000);
  };

  if (compact) {
    // Compact mode - simple file list
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition text-sm"
          >
            <Upload className="w-4 h-4" />
            Upload Blueprints
          </button>
          {showAnalyzeButton && blueprints.length > 0 && (
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition text-sm disabled:opacity-50"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Analyze with AI
                </>
              )}
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {blueprints.length > 0 && (
          <div className="space-y-2">
            {blueprints.map(bp => (
              <div
                key={bp.id}
                className="flex items-center gap-3 p-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg"
              >
                <FileImage className="w-5 h-5 text-blue-400 flex-shrink-0" />
                <span className="text-white text-sm flex-1 truncate">{bp.file.name}</span>
                {bp.analyzed && (
                  <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                )}
                <button
                  onClick={() => window.open(bp.preview, '_blank')}
                  className="p-1 hover:bg-[#2A2A2A] rounded transition"
                >
                  <Eye className="w-4 h-4 text-gray-400" />
                </button>
                <button
                  onClick={() => removeBlueprint(bp.id)}
                  className="p-1 hover:bg-red-600/10 rounded transition"
                >
                  <X className="w-4 h-4 text-red-400" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Full mode - card grid
  return (
    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-white font-bold flex items-center gap-2">
            <FileImage className="w-5 h-5 text-blue-400" />
            Blueprints & Floor Plans
          </h3>
          <p className="text-sm text-gray-400">Upload drawings for AI analysis</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition text-sm"
          >
            <Upload className="w-4 h-4" />
            Upload
          </button>
          {showAnalyzeButton && blueprints.length > 0 && (
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition text-sm disabled:opacity-50"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Analyze
                </>
              )}
            </button>
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      {blueprints.length === 0 ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-[#2A2A2A] rounded-xl p-8 text-center cursor-pointer hover:border-blue-500/30 hover:bg-blue-600/5 transition"
        >
          <FileImage className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 mb-1">Click to upload blueprints</p>
          <p className="text-sm text-gray-600">Supports images and PDFs • Max {maxFiles} files</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {blueprints.map(bp => (
            <div
              key={bp.id}
              className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg overflow-hidden hover:border-blue-500/30 transition group"
            >
              <div className="aspect-video bg-[#1A1A1A] relative">
                <img
                  src={bp.preview}
                  alt={bp.file.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                  <button
                    onClick={() => window.open(bp.preview, '_blank')}
                    className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition"
                  >
                    <Eye className="w-4 h-4 text-white" />
                  </button>
                  <button
                    onClick={() => removeBlueprint(bp.id)}
                    className="p-2 bg-red-600 hover:bg-red-700 rounded-lg transition"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
                {bp.analyzed && (
                  <div className="absolute top-2 right-2">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  </div>
                )}
              </div>
              <div className="p-2">
                <p className="text-white text-xs font-semibold truncate">{bp.file.name}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {blueprints.length > 0 && (
        <div className="mt-4 p-3 bg-blue-600/10 border border-blue-500/30 rounded-lg">
          <p className="text-sm text-blue-300">
            <Sparkles className="w-4 h-4 inline mr-1" />
            {blueprints.length} blueprint{blueprints.length > 1 ? 's' : ''} uploaded
            {showAnalyzeButton && !isAnalyzing && ' - Click "Analyze" to extract measurements and materials'}
          </p>
        </div>
      )}
    </div>
  );
}
