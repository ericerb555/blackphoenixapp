/**
 * AI Assistant Panel Component
 * Interactive AI helper for design generation and suggestions
 */

import { useState } from 'react';
import { 
  Sparkles, Send, Loader2, X, Image as ImageIcon, 
  FileText, Lightbulb, AlertTriangle, CheckCircle2,
  Upload, Wand2
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { AIDesignService, ComplianceReport } from '../utils/ai-design-service';

interface AIAssistantProps {
  apiKey: string;
  onGeneratePlan: (elements: any[], measurements: any[], annotations: any[]) => void;
  onShowCompliance: (report: ComplianceReport) => void;
  currentElements: any[];
}

export default function AIAssistant({ 
  apiKey, 
  onGeneratePlan, 
  onShowCompliance,
  currentElements 
}: AIAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'text' | 'image' | 'compliance' | 'suggestions'>('text');
  const [textPrompt, setTextPrompt] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiService] = useState(() => new AIDesignService(apiKey));
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const handleTextGeneration = async () => {
    if (!textPrompt.trim()) {
      toast.error('Please enter a description');
      return;
    }

    setIsGenerating(true);
    try {
      const result = await aiService.generateFromText(textPrompt);

      if (result.success) {
        onGeneratePlan(
          result.floorPlan.elements,
          result.floorPlan.measurements,
          result.floorPlan.annotations
        );
        toast.success('🎨 Floor plan generated!');
        if (result.reasoning) {
          toast.info(result.reasoning, { duration: 5000 });
        }
        setTextPrompt('');
      } else {
        toast.error('Generation failed: ' + (result.warnings?.[0] || 'Unknown error'));
      }
    } catch (error) {
      toast.error('Failed to generate floor plan');
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleImageGeneration = async () => {
    if (!imageFile) {
      toast.error('Please select an image');
      return;
    }

    setIsGenerating(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result?.toString().split(',')[1];
        if (!base64) {
          toast.error('Failed to read image');
          setIsGenerating(false);
          return;
        }

        const result = await aiService.generateFromImage(base64);

        if (result.success) {
          onGeneratePlan(
            result.floorPlan.elements,
            result.floorPlan.measurements,
            result.floorPlan.annotations
          );
          toast.success('🎨 Floor plan extracted from image!');
          setImageFile(null);
        } else {
          toast.error('Image analysis failed: ' + (result.warnings?.[0] || 'Unknown error'));
        }
        setIsGenerating(false);
      };
      reader.readAsDataURL(imageFile);
    } catch (error) {
      toast.error('Failed to analyze image');
      console.error(error);
      setIsGenerating(false);
    }
  };

  const handleComplianceCheck = async () => {
    if (currentElements.length === 0) {
      toast.error('No elements to check');
      return;
    }

    setIsGenerating(true);
    try {
      const report = await aiService.checkCompliance(currentElements);
      onShowCompliance(report);
      toast.success(`Compliance check complete: ${report.compliant ? 'PASS' : 'FAIL'}`);
    } catch (error) {
      toast.error('Compliance check failed');
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGetSuggestions = async () => {
    if (currentElements.length === 0) {
      toast.error('No elements to analyze');
      return;
    }

    setIsGenerating(true);
    try {
      const newSuggestions = await aiService.getDesignSuggestions(currentElements);
      setSuggestions(newSuggestions);
      toast.success(`Generated ${newSuggestions.length} design suggestions`);
    } catch (error) {
      toast.error('Failed to get suggestions');
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 left-6 w-14 h-14 rounded-full bg-gradient-to-br from-[#ff5c2a] to-[#ea580c] hover:from-[#ff5c2a]/90 hover:to-[#ea580c]/90 shadow-2xl hover:shadow-[0_0_40px_rgba(255,92,42,0.4)] transition-all hover:scale-110 flex items-center justify-center z-50 group"
        title="AI Assistant"
      >
        <Sparkles className="w-6 h-6 text-white" />
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-[#2cff8f] rounded-full animate-pulse" />
      </button>
    );
  }

  return (
    <div className="fixed left-6 bottom-6 w-96 max-h-[85vh] bg-gradient-to-br from-[#0f131b] to-[#08090e] border border-[#ff5c2a]/30 rounded-2xl shadow-2xl overflow-hidden z-50 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-white/10 bg-gradient-to-b from-[#ff5c2a]/10 to-transparent flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#ff5c2a] to-[#ea580c] flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold">AI Assistant</h3>
            <p className="text-xs text-gray-400">Powered by GPT-4</p>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Mode Selector */}
      <div className="p-3 border-b border-white/10 flex gap-2 flex-shrink-0">
        <button
          onClick={() => setMode('text')}
          className={`flex-1 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
            mode === 'text'
              ? 'bg-gradient-to-b from-[#ff5c2a]/20 to-[#ff5c2a]/5 border border-[#ff5c2a]/40'
              : 'bg-white/5 border border-white/10 hover:bg-white/10'
          }`}
        >
          <FileText className="w-3.5 h-3.5 mx-auto mb-1" />
          Text
        </button>
        <button
          onClick={() => setMode('image')}
          className={`flex-1 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
            mode === 'image'
              ? 'bg-gradient-to-b from-[#ff5c2a]/20 to-[#ff5c2a]/5 border border-[#ff5c2a]/40'
              : 'bg-white/5 border border-white/10 hover:bg-white/10'
          }`}
        >
          <ImageIcon className="w-3.5 h-3.5 mx-auto mb-1" />
          Image
        </button>
        <button
          onClick={() => setMode('compliance')}
          className={`flex-1 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
            mode === 'compliance'
              ? 'bg-gradient-to-b from-[#ff5c2a]/20 to-[#ff5c2a]/5 border border-[#ff5c2a]/40'
              : 'bg-white/5 border border-white/10 hover:bg-white/10'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5 mx-auto mb-1" />
          Code
        </button>
        <button
          onClick={() => setMode('suggestions')}
          className={`flex-1 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
            mode === 'suggestions'
              ? 'bg-gradient-to-b from-[#ff5c2a]/20 to-[#ff5c2a]/5 border border-[#ff5c2a]/40'
              : 'bg-white/5 border border-white/10 hover:bg-white/10'
          }`}
        >
          <Lightbulb className="w-3.5 h-3.5 mx-auto mb-1" />
          Tips
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
        {mode === 'text' && (
          <>
            <div>
              <label className="block text-xs text-gray-400 mb-2">Describe your floor plan</label>
              <textarea
                value={textPrompt}
                onChange={(e) => setTextPrompt(e.target.value)}
                placeholder="e.g., 3 bedroom house with open kitchen, 2000 sq ft, modern style..."
                className="w-full h-32 px-3 py-2 rounded-xl border border-white/10 bg-[#090c12]/55 text-white text-sm outline-none focus:border-[#ff5c2a]/35 focus:shadow-[0_0_0_4px_rgba(255,92,42,0.1)] transition-all resize-none"
              />
            </div>

            <button
              onClick={handleTextGeneration}
              disabled={isGenerating || !textPrompt.trim()}
              className="w-full px-4 py-3 rounded-xl border border-[#ff5c2a]/40 bg-gradient-to-b from-[#ff5c2a]/20 to-[#ff5c2a]/5 hover:from-[#ff5c2a]/30 hover:to-[#ff5c2a]/10 transition-all font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  Generate Floor Plan
                </>
              )}
            </button>

            <div className="p-3 rounded-xl bg-[#ff5c2a]/5 border border-[#ff5c2a]/20">
              <div className="flex gap-2 text-xs text-gray-300">
                <Sparkles className="w-4 h-4 text-[#ff5c2a] flex-shrink-0 mt-0.5" />
                <div>
                  AI will analyze your description and generate a complete floor plan with walls, doors, windows, and room labels. Be specific for better results!
                </div>
              </div>
            </div>
          </>
        )}

        {mode === 'image' && (
          <>
            <div>
              <label className="block text-xs text-gray-400 mb-2">Upload floor plan image</label>
              <div className="border-2 border-dashed border-white/20 rounded-xl p-6 text-center hover:border-[#ff5c2a]/40 transition-colors cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                  className="hidden"
                  id="image-upload"
                />
                <label htmlFor="image-upload" className="cursor-pointer">
                  <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  {imageFile ? (
                    <p className="text-sm text-white font-semibold">{imageFile.name}</p>
                  ) : (
                    <>
                      <p className="text-sm text-gray-300 mb-1">Click to upload</p>
                      <p className="text-xs text-gray-500">JPG, PNG, or PDF sketch/photo</p>
                    </>
                  )}
                </label>
              </div>
            </div>

            <button
              onClick={handleImageGeneration}
              disabled={isGenerating || !imageFile}
              className="w-full px-4 py-3 rounded-xl border border-[#ff5c2a]/40 bg-gradient-to-b from-[#ff5c2a]/20 to-[#ff5c2a]/5 hover:from-[#ff5c2a]/30 hover:to-[#ff5c2a]/10 transition-all font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Analyze & Generate
                </>
              )}
            </button>

            <div className="p-3 rounded-xl bg-[#ff5c2a]/5 border border-[#ff5c2a]/20">
              <div className="flex gap-2 text-xs text-gray-300">
                <ImageIcon className="w-4 h-4 text-[#ff5c2a] flex-shrink-0 mt-0.5" />
                <div>
                  Upload a hand-drawn sketch, photo, or existing floor plan. AI will detect walls, doors, windows, and convert it to CAD format.
                </div>
              </div>
            </div>
          </>
        )}

        {mode === 'compliance' && (
          <>
            <div className="space-y-3">
              <p className="text-sm text-gray-300">
                Check your floor plan against building codes and regulations.
              </p>

              <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">Elements on canvas:</span>
                  <span className="font-mono text-white font-bold">{currentElements.length}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">Building code:</span>
                  <span className="text-white">IBC 2021</span>
                </div>
              </div>

              <button
                onClick={handleComplianceCheck}
                disabled={isGenerating || currentElements.length === 0}
                className="w-full px-4 py-3 rounded-xl border border-[#ff5c2a]/40 bg-gradient-to-b from-[#ff5c2a]/20 to-[#ff5c2a]/5 hover:from-[#ff5c2a]/30 hover:to-[#ff5c2a]/10 transition-all font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Run Compliance Check
                  </>
                )}
              </button>
            </div>

            <div className="p-3 rounded-xl bg-[#ff5c2a]/5 border border-[#ff5c2a]/20">
              <div className="flex gap-2 text-xs text-gray-300">
                <AlertTriangle className="w-4 h-4 text-[#ff5c2a] flex-shrink-0 mt-0.5" />
                <div>
                  AI will check egress requirements, accessibility (ADA), fire safety, ventilation, and structural requirements.
                </div>
              </div>
            </div>
          </>
        )}

        {mode === 'suggestions' && (
          <>
            <div className="space-y-3">
              <p className="text-sm text-gray-300">
                Get AI-powered design improvement suggestions.
              </p>

              <button
                onClick={handleGetSuggestions}
                disabled={isGenerating || currentElements.length === 0}
                className="w-full px-4 py-3 rounded-xl border border-[#ff5c2a]/40 bg-gradient-to-b from-[#ff5c2a]/20 to-[#ff5c2a]/5 hover:from-[#ff5c2a]/30 hover:to-[#ff5c2a]/10 transition-all font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Lightbulb className="w-4 h-4" />
                    Get Suggestions
                  </>
                )}
              </button>

              {suggestions.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs text-gray-400 uppercase tracking-wider">Suggestions:</div>
                  {suggestions.map((suggestion, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-xl bg-white/5 border border-white/10 text-sm text-gray-200"
                    >
                      <div className="flex gap-2">
                        <span className="text-[#ff5c2a] font-bold flex-shrink-0">{i + 1}.</span>
                        <span>{suggestion}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-3 rounded-xl bg-[#ff5c2a]/5 border border-[#ff5c2a]/20">
              <div className="flex gap-2 text-xs text-gray-300">
                <Lightbulb className="w-4 h-4 text-[#ff5c2a] flex-shrink-0 mt-0.5" />
                <div>
                  AI will analyze your design for space utilization, traffic flow, lighting, accessibility, and aesthetics.
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
