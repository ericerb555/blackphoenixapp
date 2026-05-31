import React, { useState } from 'react';
import { Scan, Wand2, Image as ImageIcon, FileText, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

interface DetectionResult {
  type: 'success' | 'warning' | 'error';
  message: string;
  data?: any;
}

interface AutoDetectionToolsProps {
  onDetectionComplete?: (result: DetectionResult) => void;
}

export function AutoDetectionTools({ onDetectionComplete }: AutoDetectionToolsProps) {
  const [isDetecting, setIsDetecting] = useState(false);
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [selectedTool, setSelectedTool] = useState<string | null>(null);

  const tools = [
    {
      id: 'image-recognition',
      name: 'Image Recognition',
      icon: ImageIcon,
      description: 'Detect objects and elements in images',
      color: 'from-blue-500 to-blue-600',
    },
    {
      id: 'text-extraction',
      name: 'Text Extraction',
      icon: FileText,
      description: 'Extract text from documents and images',
      color: 'from-green-500 to-green-600',
    },
    {
      id: 'smart-detection',
      name: 'Smart Detection',
      icon: Wand2,
      description: 'AI-powered pattern detection',
      color: 'from-purple-500 to-purple-600',
    },
    {
      id: 'structural-scan',
      name: 'Structural Scan',
      icon: Scan,
      description: 'Analyze structural elements',
      color: 'from-[#ea580c] to-[#dc2626]',
    },
  ];

  const handleDetection = async (toolId: string) => {
    setSelectedTool(toolId);
    setIsDetecting(true);
    setResult(null);

    try {
      // Simulate detection process
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Mock successful detection
      const mockResult: DetectionResult = {
        type: 'success',
        message: `${tools.find(t => t.id === toolId)?.name} completed successfully`,
        data: {
          detected: Math.floor(Math.random() * 20) + 5,
          confidence: (Math.random() * 20 + 80).toFixed(1) + '%',
          processing_time: (Math.random() * 2 + 1).toFixed(2) + 's',
        },
      };

      setResult(mockResult);
      onDetectionComplete?.(mockResult);
    } catch (error) {
      const errorResult: DetectionResult = {
        type: 'error',
        message: 'Detection failed. Please try again.',
      };
      setResult(errorResult);
      onDetectionComplete?.(errorResult);
    } finally {
      setIsDetecting(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Handle file upload
    console.log('File uploaded:', file.name);
    
    // Trigger detection based on selected tool
    if (selectedTool) {
      handleDetection(selectedTool);
    }
  };

  return (
    <div className="bg-[#0A0A0A] rounded-lg border border-zinc-800 p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-white mb-2">Auto Detection Tools</h2>
        <p className="text-sm text-zinc-400">
          Use AI-powered tools to automatically detect and analyze content
        </p>
      </div>

      {/* Tools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {tools.map((tool) => {
          const Icon = tool.icon;
          const isSelected = selectedTool === tool.id;

          return (
            <button
              key={tool.id}
              onClick={() => setSelectedTool(tool.id)}
              disabled={isDetecting}
              className={`p-4 rounded-lg border transition-all ${
                isSelected
                  ? 'bg-zinc-900 border-[#ea580c]'
                  : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700'
              } ${isDetecting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${tool.color} flex items-center justify-center flex-shrink-0`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="text-sm font-semibold text-white mb-1">{tool.name}</h3>
                  <p className="text-xs text-zinc-500">{tool.description}</p>
                </div>
                {isSelected && (
                  <div className="w-2 h-2 bg-[#ea580c] rounded-full flex-shrink-0 mt-2" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* File Upload */}
      {selectedTool && (
        <div className="mb-6">
          <label className="block mb-2 text-sm text-zinc-400">Upload File</label>
          <div className="relative">
            <input
              type="file"
              onChange={handleFileUpload}
              disabled={isDetecting}
              accept="image/*,.pdf,.doc,.docx"
              className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white text-sm file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-[#ea580c] file:text-white file:cursor-pointer hover:file:bg-[#dc2626] disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
        </div>
      )}

      {/* Action Button */}
      {selectedTool && (
        <button
          onClick={() => handleDetection(selectedTool)}
          disabled={isDetecting}
          className="w-full py-3 bg-[#ea580c] text-white rounded-lg font-medium hover:bg-[#dc2626] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isDetecting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Processing...</span>
            </>
          ) : (
            <>
              <Scan className="w-5 h-5" />
              <span>Start Detection</span>
            </>
          )}
        </button>
      )}

      {/* Result Display */}
      {result && (
        <div className={`mt-6 p-4 rounded-lg border ${
          result.type === 'success' ? 'bg-green-900/20 border-green-900/50' :
          result.type === 'warning' ? 'bg-yellow-900/20 border-yellow-900/50' :
          'bg-red-900/20 border-red-900/50'
        }`}>
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              {result.type === 'success' && <CheckCircle2 className="w-5 h-5 text-green-400" />}
              {result.type === 'warning' && <AlertCircle className="w-5 h-5 text-yellow-400" />}
              {result.type === 'error' && <AlertCircle className="w-5 h-5 text-red-400" />}
            </div>
            <div className="flex-1">
              <p className={`text-sm font-medium mb-2 ${
                result.type === 'success' ? 'text-green-400' :
                result.type === 'warning' ? 'text-yellow-400' :
                'text-red-400'
              }`}>
                {result.message}
              </p>
              {result.data && (
                <div className="space-y-1">
                  {Object.entries(result.data).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between text-xs">
                      <span className="text-zinc-400 capitalize">
                        {key.replace(/_/g, ' ')}:
                      </span>
                      <span className="text-white font-medium">{value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
