/**
 * AI Blueprint Analyzer - Enterprise Grade
 * 
 * Uses GPT-4 Vision to analyze uploaded blueprints, drawings, and plans
 * Extracts: Materials lists, square footage, linear footage, room dimensions, and construction details
 * 
 * Features:
 * - Multi-image upload (supports multiple blueprint pages)
 * - Advanced measurement extraction
 * - Detailed materials quantification
 * - Construction cost estimation
 * - CAD-level accuracy with AI vision
 * - Integration with auto-quote generation
 */

import { useState, useRef } from 'react';
import {
  Upload, FileImage, Loader2, CheckCircle, AlertCircle, Trash2,
  Maximize2, Ruler, Package, DollarSign, Eye, Download, Sparkles,
  Brain, Zap, FileText, Image as ImageIcon, ChevronDown, ChevronUp,
  Square, Move, Layers, Calculator, ClipboardList, TrendingUp,
  Home, Wrench, Hammer, PaintBucket, XCircle, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-57095a78`;

interface UploadedBlueprint {
  id: string;
  file: File;
  preview: string;
  status: 'pending' | 'analyzing' | 'complete' | 'error';
  analysis?: BlueprintAnalysis;
}

interface BlueprintAnalysis {
  // Measurements
  totalSquareFootage: number;
  totalLinearFootage: number;
  
  // Room-by-room breakdown
  rooms: {
    name: string;
    type: string;
    squareFootage: number;
    dimensions: {
      length: number;
      width: number;
      height?: number;
    };
    perimeterLinearFeet: number;
    ceilingLinearFeet?: number;
    features: string[];
  }[];

  // Materials List (comprehensive)
  materials: {
    category: string;
    items: {
      name: string;
      quantity: number;
      unit: string;
      estimatedCost: number;
      supplier?: string;
      notes?: string;
    }[];
  }[];

  // Construction Details
  constructionDetails: {
    wallCount: number;
    doorCount: number;
    windowCount: number;
    electricalOutlets: number;
    plumbingFixtures: number;
    hvacVents: number;
  };

  // Cost Estimates
  costEstimates: {
    materials: number;
    labor: number;
    total: number;
    breakdown: {
      category: string;
      cost: number;
    }[];
  };

  // Additional Insights
  insights: {
    complexity: 'low' | 'medium' | 'high';
    estimatedDuration: string;
    specialRequirements: string[];
    recommendations: string[];
    potentialIssues: string[];
  };
}

interface AIBlueprintAnalyzerProps {
  onAnalysisComplete?: (analysis: BlueprintAnalysis) => void;
  onMaterialsExtracted?: (materials: any[]) => void;
  workRequestId?: string;
  autoGenerateQuote?: boolean;
}

export default function AIBlueprintAnalyzer({
  onAnalysisComplete,
  onMaterialsExtracted,
  workRequestId,
  autoGenerateQuote = false
}: AIBlueprintAnalyzerProps) {
  const [blueprints, setBlueprints] = useState<UploadedBlueprint[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [combinedAnalysis, setCombinedAnalysis] = useState<BlueprintAnalysis | null>(null);
  const [expandedSections, setExpandedSections] = useState({
    measurements: true,
    rooms: true,
    materials: true,
    construction: true,
    costs: true,
    insights: true
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (files.length === 0) return;

    const newBlueprints: UploadedBlueprint[] = files.map(file => ({
      id: `bp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      preview: URL.createObjectURL(file),
      status: 'pending'
    }));

    setBlueprints(prev => [...prev, ...newBlueprints]);
    
    toast.success(`${files.length} blueprint${files.length > 1 ? 's' : ''} uploaded`, {
      description: 'Ready to analyze'
    });
  };

  const removeBlueprint = (id: string) => {
    setBlueprints(prev => {
      const blueprint = prev.find(bp => bp.id === id);
      if (blueprint) {
        URL.revokeObjectURL(blueprint.preview);
      }
      return prev.filter(bp => bp.id !== id);
    });
    toast.success('Blueprint removed');
  };

  const analyzeBlueprints = async () => {
    if (blueprints.length === 0) {
      toast.error('Please upload at least one blueprint');
      return;
    }

    setIsAnalyzing(true);
    toast.info('Analyzing blueprints with AI...', {
      description: 'This may take 30-90 seconds for detailed analysis'
    });

    try {
      // Convert images to base64
      const blueprintData = await Promise.all(
        blueprints.map(async (bp) => {
          const base64 = await fileToBase64(bp.file);
          return {
            id: bp.id,
            filename: bp.file.name,
            base64
          };
        })
      );

      // Update status
      setBlueprints(prev =>
        prev.map(bp => ({ ...bp, status: 'analyzing' as const }))
      );

      // Call AI analysis endpoint
      const response = await fetch(
        `${API_BASE}/ai/analyze-blueprints`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            blueprints: blueprintData,
            workRequestId,
            analysisType: 'comprehensive' // Request full analysis
          })
        }
      );

      if (!response.ok) {
        throw new Error('Blueprint analysis failed');
      }

      const result = await response.json();
      const analysis: BlueprintAnalysis = result.analysis;

      // Update blueprints with individual analyses if available
      if (result.individualAnalyses) {
        setBlueprints(prev =>
          prev.map(bp => {
            const individualAnalysis = result.individualAnalyses.find(
              (a: any) => a.blueprintId === bp.id
            );
            return {
              ...bp,
              status: 'complete' as const,
              analysis: individualAnalysis?.analysis
            };
          })
        );
      } else {
        setBlueprints(prev =>
          prev.map(bp => ({ ...bp, status: 'complete' as const }))
        );
      }

      setCombinedAnalysis(analysis);

      toast.success('Blueprint analysis complete!', {
        description: `Found ${analysis.rooms.length} rooms, ${analysis.materials.reduce((sum, cat) => sum + cat.items.length, 0)} materials`
      });

      // Callbacks
      if (onAnalysisComplete) {
        onAnalysisComplete(analysis);
      }

      if (onMaterialsExtracted) {
        const flatMaterials = analysis.materials.flatMap(cat =>
          cat.items.map(item => ({
            ...item,
            category: cat.category
          }))
        );
        onMaterialsExtracted(flatMaterials);
      }

      // Auto-generate quote if requested
      if (autoGenerateQuote && workRequestId) {
        generateQuoteFromAnalysis(analysis);
      }

    } catch (error) {
      console.error('Error analyzing blueprints:', error);
      toast.error('Blueprint analysis failed', {
        description: 'Please try again or contact support'
      });
      setBlueprints(prev =>
        prev.map(bp => ({ ...bp, status: 'error' as const }))
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const generateQuoteFromAnalysis = async (analysis: BlueprintAnalysis) => {
    toast.info('Generating quote from blueprint analysis...');
    
    try {
      const response = await fetch(
        `${API_BASE}/quotes/generate-from-blueprint`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            workRequestId,
            blueprintAnalysis: analysis
          })
        }
      );

      if (response.ok) {
        toast.success('Quote generated from blueprints!');
      }
    } catch (error) {
      console.error('Error generating quote:', error);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64 = reader.result as string;
        resolve(base64.split(',')[1]); // Remove data:image/...;base64, prefix
      };
      reader.onerror = error => reject(error);
    });
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="bg-gradient-to-r from-[#1A1A1A] to-[#0F0F0F] border border-[#2A2A2A] rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl">
                  <Brain className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white">AI Blueprint Analyzer</h1>
                  <p className="text-gray-400">Enterprise-grade blueprint analysis with GPT-4 Vision</p>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-semibold transition-all shadow-lg"
              >
                <Upload className="w-5 h-5" />
                Upload Blueprints
              </button>
              <button
                onClick={analyzeBlueprints}
                disabled={isAnalyzing || blueprints.length === 0}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-xl font-semibold transition-all disabled:opacity-50 shadow-lg"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Analyze with AI
                  </>
                )}
              </button>
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

          {/* Upload Instructions */}
          {blueprints.length === 0 && (
            <div className="bg-purple-600/10 border border-purple-500/30 rounded-xl p-6">
              <div className="flex items-start gap-3">
                <Brain className="w-6 h-6 text-purple-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-white font-bold mb-2">Advanced AI Blueprint Analysis</h3>
                  <ul className="text-purple-300 space-y-1 text-sm">
                    <li>• Automatically extracts <strong>square footage and linear footage</strong></li>
                    <li>• Generates detailed <strong>materials lists with quantities</strong></li>
                    <li>• Identifies rooms, dimensions, and features</li>
                    <li>• Counts walls, doors, windows, outlets, fixtures</li>
                    <li>• Provides cost estimates and construction timeline</li>
                    <li>• Supports multiple blueprint pages (floor plans, elevations, details)</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Uploaded Blueprints Grid */}
        {blueprints.length > 0 && (
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <FileImage className="w-6 h-6 text-blue-400" />
              Uploaded Blueprints ({blueprints.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {blueprints.map(bp => (
                <div
                  key={bp.id}
                  className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl overflow-hidden hover:border-purple-500/30 transition"
                >
                  <div className="aspect-video bg-[#1A1A1A] relative">
                    <img
                      src={bp.preview}
                      alt={bp.file.name}
                      className="w-full h-full object-cover"
                    />
                    {bp.status === 'analyzing' && (
                      <div className="absolute inset-0 bg-purple-600/20 flex items-center justify-center">
                        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
                      </div>
                    )}
                    {bp.status === 'complete' && (
                      <div className="absolute top-2 right-2">
                        <CheckCircle className="w-6 h-6 text-green-400" />
                      </div>
                    )}
                    {bp.status === 'error' && (
                      <div className="absolute top-2 right-2">
                        <AlertCircle className="w-6 h-6 text-red-400" />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <p className="text-white text-sm font-semibold truncate mb-2">{bp.file.name}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">
                        {(bp.file.size / 1024 / 1024).toFixed(2)} MB
                      </span>
                      <button
                        onClick={() => removeBlueprint(bp.id)}
                        className="p-1 hover:bg-red-600/10 rounded transition"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Analysis Results */}
        {combinedAnalysis && (
          <>
            {/* Quick Stats */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-purple-600/20 to-purple-700/10 border border-purple-500/30 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Square className="w-5 h-5 text-purple-400" />
                  <span className="text-sm text-purple-300">Total Area</span>
                </div>
                <p className="text-3xl font-bold text-white">
                  {combinedAnalysis.totalSquareFootage.toLocaleString()}
                </p>
                <p className="text-sm text-purple-300">square feet</p>
              </div>

              <div className="bg-gradient-to-br from-blue-600/20 to-blue-700/10 border border-blue-500/30 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Ruler className="w-5 h-5 text-blue-400" />
                  <span className="text-sm text-blue-300">Linear Footage</span>
                </div>
                <p className="text-3xl font-bold text-white">
                  {combinedAnalysis.totalLinearFootage.toLocaleString()}
                </p>
                <p className="text-sm text-blue-300">linear feet</p>
              </div>

              <div className="bg-gradient-to-br from-green-600/20 to-green-700/10 border border-green-500/30 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="w-5 h-5 text-green-400" />
                  <span className="text-sm text-green-300">Materials</span>
                </div>
                <p className="text-3xl font-bold text-white">
                  {combinedAnalysis.materials.reduce((sum, cat) => sum + cat.items.length, 0)}
                </p>
                <p className="text-sm text-green-300">items identified</p>
              </div>

              <div className="bg-gradient-to-br from-orange-600/20 to-orange-700/10 border border-orange-500/30 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-5 h-5 text-orange-400" />
                  <span className="text-sm text-orange-300">Est. Total</span>
                </div>
                <p className="text-3xl font-bold text-white">
                  ${combinedAnalysis.costEstimates.total.toLocaleString()}
                </p>
                <p className="text-sm text-orange-300">estimated cost</p>
              </div>
            </div>

            {/* Rooms Breakdown */}
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl overflow-hidden">
              <div
                className="p-6 cursor-pointer hover:bg-[#1A1A1A]/80 transition"
                onClick={() => toggleSection('rooms')}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Home className="w-6 h-6 text-purple-400" />
                    <div>
                      <h2 className="text-xl font-bold text-white">Room Analysis</h2>
                      <p className="text-sm text-gray-400">{combinedAnalysis.rooms.length} rooms detected</p>
                    </div>
                  </div>
                  {expandedSections.rooms ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </div>

              {expandedSections.rooms && (
                <div className="border-t border-[#2A2A2A] p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {combinedAnalysis.rooms.map((room, idx) => (
                      <div
                        key={idx}
                        className="bg-[#0A0A0A] border border-purple-500/30 rounded-xl p-4"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="text-white font-bold text-lg">{room.name}</h3>
                            <p className="text-sm text-purple-300">{room.type}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-purple-400">
                              {room.squareFootage.toLocaleString()}
                            </p>
                            <p className="text-xs text-gray-400">sq ft</p>
                          </div>
                        </div>

                        <div className="space-y-2 mb-3">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-400">Dimensions:</span>
                            <span className="text-white font-semibold">
                              {room.dimensions.length}' × {room.dimensions.width}'
                              {room.dimensions.height && ` × ${room.dimensions.height}'`}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-400">Perimeter:</span>
                            <span className="text-white font-semibold">
                              {room.perimeterLinearFeet.toLocaleString()} LF
                            </span>
                          </div>
                        </div>

                        {room.features.length > 0 && (
                          <div className="pt-3 border-t border-[#2A2A2A]">
                            <p className="text-xs text-gray-400 mb-2">Features:</p>
                            <div className="flex flex-wrap gap-1">
                              {room.features.map((feature, fidx) => (
                                <span
                                  key={fidx}
                                  className="px-2 py-1 bg-purple-600/20 border border-purple-500/30 rounded text-xs text-purple-300"
                                >
                                  {feature}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Materials List */}
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl overflow-hidden">
              <div
                className="p-6 cursor-pointer hover:bg-[#1A1A1A]/80 transition"
                onClick={() => toggleSection('materials')}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Package className="w-6 h-6 text-green-400" />
                    <div>
                      <h2 className="text-xl font-bold text-white">Materials List</h2>
                      <p className="text-sm text-gray-400">
                        {combinedAnalysis.materials.reduce((sum, cat) => sum + cat.items.length, 0)} items across {combinedAnalysis.materials.length} categories
                      </p>
                    </div>
                  </div>
                  {expandedSections.materials ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </div>

              {expandedSections.materials && (
                <div className="border-t border-[#2A2A2A] p-6">
                  <div className="space-y-6">
                    {combinedAnalysis.materials.map((category, catIdx) => (
                      <div key={catIdx} className="bg-[#0A0A0A] border border-green-500/30 rounded-xl p-4">
                        <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                          <Layers className="w-5 h-5 text-green-400" />
                          {category.category}
                        </h3>
                        <div className="space-y-2">
                          {category.items.map((item, itemIdx) => (
                            <div
                              key={itemIdx}
                              className="flex items-center justify-between p-3 bg-[#1A1A1A] rounded-lg"
                            >
                              <div className="flex-1">
                                <p className="text-white font-semibold">{item.name}</p>
                                {item.notes && (
                                  <p className="text-xs text-gray-400 mt-1">{item.notes}</p>
                                )}
                                {item.supplier && (
                                  <p className="text-xs text-green-400 mt-1">Supplier: {item.supplier}</p>
                                )}
                              </div>
                              <div className="text-right ml-4">
                                <p className="text-white font-bold">
                                  {item.quantity} {item.unit}
                                </p>
                                <p className="text-sm text-green-400">
                                  ${item.estimatedCost.toLocaleString()}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Construction Details */}
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl overflow-hidden">
              <div
                className="p-6 cursor-pointer hover:bg-[#1A1A1A]/80 transition"
                onClick={() => toggleSection('construction')}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Wrench className="w-6 h-6 text-orange-400" />
                    <div>
                      <h2 className="text-xl font-bold text-white">Construction Details</h2>
                      <p className="text-sm text-gray-400">Structural elements and fixtures</p>
                    </div>
                  </div>
                  {expandedSections.construction ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </div>

              {expandedSections.construction && (
                <div className="border-t border-[#2A2A2A] p-6">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="bg-[#0A0A0A] border border-orange-500/30 rounded-xl p-4">
                      <p className="text-gray-400 text-sm mb-1">Walls</p>
                      <p className="text-3xl font-bold text-white">{combinedAnalysis.constructionDetails.wallCount}</p>
                    </div>
                    <div className="bg-[#0A0A0A] border border-orange-500/30 rounded-xl p-4">
                      <p className="text-gray-400 text-sm mb-1">Doors</p>
                      <p className="text-3xl font-bold text-white">{combinedAnalysis.constructionDetails.doorCount}</p>
                    </div>
                    <div className="bg-[#0A0A0A] border border-orange-500/30 rounded-xl p-4">
                      <p className="text-gray-400 text-sm mb-1">Windows</p>
                      <p className="text-3xl font-bold text-white">{combinedAnalysis.constructionDetails.windowCount}</p>
                    </div>
                    <div className="bg-[#0A0A0A] border border-orange-500/30 rounded-xl p-4">
                      <p className="text-gray-400 text-sm mb-1">Electrical Outlets</p>
                      <p className="text-3xl font-bold text-white">{combinedAnalysis.constructionDetails.electricalOutlets}</p>
                    </div>
                    <div className="bg-[#0A0A0A] border border-orange-500/30 rounded-xl p-4">
                      <p className="text-gray-400 text-sm mb-1">Plumbing Fixtures</p>
                      <p className="text-3xl font-bold text-white">{combinedAnalysis.constructionDetails.plumbingFixtures}</p>
                    </div>
                    <div className="bg-[#0A0A0A] border border-orange-500/30 rounded-xl p-4">
                      <p className="text-gray-400 text-sm mb-1">HVAC Vents</p>
                      <p className="text-3xl font-bold text-white">{combinedAnalysis.constructionDetails.hvacVents}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Cost Estimates */}
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl overflow-hidden">
              <div
                className="p-6 cursor-pointer hover:bg-[#1A1A1A]/80 transition"
                onClick={() => toggleSection('costs')}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <DollarSign className="w-6 h-6 text-green-400" />
                    <div>
                      <h2 className="text-xl font-bold text-white">Cost Estimates</h2>
                      <p className="text-sm text-gray-400">Based on blueprint analysis</p>
                    </div>
                  </div>
                  {expandedSections.costs ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </div>

              {expandedSections.costs && (
                <div className="border-t border-[#2A2A2A] p-6">
                  <div className="bg-[#0A0A0A] border border-green-500/30 rounded-xl p-6">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-gray-300">
                        <span>Materials:</span>
                        <span className="font-semibold">${combinedAnalysis.costEstimates.materials.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between text-gray-300">
                        <span>Labor:</span>
                        <span className="font-semibold">${combinedAnalysis.costEstimates.labor.toLocaleString()}</span>
                      </div>
                      <div className="border-t-2 border-green-500 pt-3 flex items-center justify-between">
                        <span className="text-xl font-bold text-white">Total Estimate:</span>
                        <span className="text-2xl font-bold text-green-400">
                          ${combinedAnalysis.costEstimates.total.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="mt-6 pt-6 border-t border-[#2A2A2A]">
                      <h4 className="text-white font-bold mb-3">Cost Breakdown by Category:</h4>
                      <div className="space-y-2">
                        {combinedAnalysis.costEstimates.breakdown.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between">
                            <span className="text-gray-300">{item.category}</span>
                            <span className="text-white font-semibold">${item.cost.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* AI Insights */}
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl overflow-hidden">
              <div
                className="p-6 cursor-pointer hover:bg-[#1A1A1A]/80 transition"
                onClick={() => toggleSection('insights')}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Brain className="w-6 h-6 text-purple-400" />
                    <div>
                      <h2 className="text-xl font-bold text-white">AI Insights & Recommendations</h2>
                      <p className="text-sm text-gray-400">Smart analysis and suggestions</p>
                    </div>
                  </div>
                  {expandedSections.insights ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </div>

              {expandedSections.insights && (
                <div className="border-t border-[#2A2A2A] p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-[#0A0A0A] border border-purple-500/30 rounded-xl p-4">
                      <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-purple-400" />
                        Project Complexity
                      </h3>
                      <div className="flex items-center gap-3">
                        <span className={`px-4 py-2 rounded-lg font-bold ${
                          combinedAnalysis.insights.complexity === 'high' ? 'bg-red-600/20 text-red-400 border border-red-500/30' :
                          combinedAnalysis.insights.complexity === 'medium' ? 'bg-yellow-600/20 text-yellow-400 border border-yellow-500/30' :
                          'bg-green-600/20 text-green-400 border border-green-500/30'
                        }`}>
                          {combinedAnalysis.insights.complexity.toUpperCase()}
                        </span>
                        <span className="text-gray-400">•</span>
                        <span className="text-white">{combinedAnalysis.insights.estimatedDuration}</span>
                      </div>
                    </div>

                    <div className="bg-[#0A0A0A] border border-blue-500/30 rounded-xl p-4">
                      <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-blue-400" />
                        Special Requirements
                      </h3>
                      <ul className="space-y-1">
                        {combinedAnalysis.insights.specialRequirements.map((req, idx) => (
                          <li key={idx} className="text-blue-300 text-sm">• {req}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="bg-[#0A0A0A] border border-green-500/30 rounded-xl p-4">
                      <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-400" />
                        Recommendations
                      </h3>
                      <ul className="space-y-1">
                        {combinedAnalysis.insights.recommendations.map((rec, idx) => (
                          <li key={idx} className="text-green-300 text-sm">• {rec}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="bg-[#0A0A0A] border border-yellow-500/30 rounded-xl p-4">
                      <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-yellow-400" />
                        Potential Issues
                      </h3>
                      <ul className="space-y-1">
                        {combinedAnalysis.insights.potentialIssues.map((issue, idx) => (
                          <li key={idx} className="text-yellow-300 text-sm">• {issue}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}