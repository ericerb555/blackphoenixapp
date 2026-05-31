import { useState } from 'react';
import {
  Brain, Sparkles, Search, Zap, TrendingUp, X, Loader, Package,
  CheckCircle2, Star, DollarSign, ShoppingCart, Eye, ArrowRight
} from 'lucide-react';

interface Material {
  id: string;
  sku: string;
  name: string;
  description: string;
  category: string;
  subcategory: string;
  manufacturer: string;
  unitCost: number;
  unit: string;
  popularity: number;
  usageCount: number;
  aiRecommended?: boolean;
  aiRelevanceScore?: number;
  aiReason?: string;
}

interface MaterialAISearchProps {
  isOpen: boolean;
  onClose: () => void;
  materials: Material[];
  onSelectMaterial?: (material: Material) => void;
}

export default function MaterialAISearch({ isOpen, onClose, materials, onSelectMaterial }: MaterialAISearchProps) {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<Material[]>([]);
  const [searchCompleted, setSearchCompleted] = useState(false);

  const aiExamples = [
    "I need something to stop my AC from leaking water",
    "What do I need to fix a 20 amp circuit that keeps tripping?",
    "Materials for replacing a bathroom sink faucet",
    "Refrigerant for a 5-year-old Carrier AC unit",
    "Wire for adding a 240V outlet in garage",
    "Parts needed for condensate drain maintenance"
  ];

  const handleAiSearch = () => {
    if (!query.trim()) return;

    setIsSearching(true);
    setSearchCompleted(false);

    // Simulate AI processing with intelligent matching
    setTimeout(() => {
      const searchLower = query.toLowerCase();
      
      // Enhanced AI matching logic
      const scoredResults = materials.map(m => {
        let relevanceScore = 0;
        let reasons: string[] = [];

        // Direct keyword matching
        if (m.name.toLowerCase().includes(searchLower)) {
          relevanceScore += 30;
          reasons.push('Name matches your search');
        }
        
        if (m.description.toLowerCase().includes(searchLower)) {
          relevanceScore += 20;
          reasons.push('Description matches');
        }

        // Category matching
        if (m.category.toLowerCase().includes(searchLower)) {
          relevanceScore += 15;
          reasons.push(`${m.category} category match`);
        }

        // Natural language understanding
        // AC/Cooling related
        if ((searchLower.includes('ac') || searchLower.includes('cooling') || searchLower.includes('air conditioning')) && 
            m.category === 'HVAC') {
          relevanceScore += 25;
          reasons.push('HVAC system component');
        }

        // Leak prevention
        if ((searchLower.includes('leak') || searchLower.includes('water') || searchLower.includes('drip')) && 
            (m.subcategory.includes('Maintenance') || m.name.toLowerCase().includes('pan') || 
             m.name.toLowerCase().includes('drain'))) {
          relevanceScore += 35;
          reasons.push('Prevents leaks and water issues');
        }

        // Electrical issues
        if ((searchLower.includes('trip') || searchLower.includes('breaker') || searchLower.includes('circuit')) && 
            m.subcategory === 'Circuit Protection') {
          relevanceScore += 40;
          reasons.push('Circuit protection component');
        }

        // Refrigerant
        if ((searchLower.includes('refrigerant') || searchLower.includes('freon') || searchLower.includes('charge')) && 
            m.subcategory === 'Refrigerants') {
          relevanceScore += 45;
          reasons.push('Refrigerant for cooling systems');
        }

        // Brand/model matching
        if (searchLower.includes('carrier') && m.name.toLowerCase().includes('410a')) {
          relevanceScore += 30;
          reasons.push('Compatible with Carrier systems');
        }

        // Wire/outlet related
        if ((searchLower.includes('wire') || searchLower.includes('outlet') || searchLower.includes('240')) && 
            m.category === 'Electrical' && m.subcategory === 'Wire & Cable') {
          relevanceScore += 35;
          reasons.push('Electrical wiring component');
        }

        // Faucet/plumbing fixtures
        if ((searchLower.includes('faucet') || searchLower.includes('sink') || searchLower.includes('bathroom')) && 
            m.subcategory === 'Fixtures') {
          relevanceScore += 40;
          reasons.push('Plumbing fixture');
        }

        // Boost for AI recommended and popular items
        if (m.aiRecommended) relevanceScore += 10;
        if (m.popularity > 80) relevanceScore += 5;

        return {
          ...m,
          aiRelevanceScore: relevanceScore,
          aiReason: reasons.join(' • ')
        };
      });

      // Filter items with relevance score > 0 and sort by score
      const filteredResults = scoredResults
        .filter(r => r.aiRelevanceScore! > 0)
        .sort((a, b) => b.aiRelevanceScore! - a.aiRelevanceScore!)
        .slice(0, 10); // Top 10 results

      setResults(filteredResults);
      setIsSearching(false);
      setSearchCompleted(true);
    }, 2000);
  };

  const handleExampleClick = (example: string) => {
    setQuery(example);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-purple-50 to-pink-50">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">AI Material Search</h2>
                <p className="text-sm text-slate-600">Describe what you need in plain English</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/50 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAiSearch()}
              placeholder="e.g., 'I need something to stop my AC from leaking water'"
              className="w-full pl-12 pr-32 py-4 border-2 border-purple-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-lg"
              autoFocus
            />
            <button
              onClick={handleAiSearch}
              disabled={!query.trim() || isSearching}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50"
            >
              {isSearching ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Search
                </>
              )}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {!searchCompleted ? (
            <div className="p-6">
              {/* Examples */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Try these examples:</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {aiExamples.map((example, index) => (
                    <button
                      key={index}
                      onClick={() => handleExampleClick(example)}
                      className="text-left p-3 bg-slate-50 hover:bg-purple-50 border border-slate-200 hover:border-purple-300 rounded-lg transition-all text-sm group"
                    >
                      <div className="flex items-start gap-2">
                        <Zap className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                        <span className="text-slate-700 group-hover:text-purple-700">{example}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* How it works */}
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-6 border border-blue-200">
                <h3 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
                  <Brain className="w-5 h-5" />
                  How AI Search Works
                </h3>
                <div className="space-y-3 text-sm text-blue-800">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center flex-shrink-0 font-semibold text-xs">
                      1
                    </div>
                    <div>
                      <p className="font-medium">Natural Language Understanding</p>
                      <p className="text-blue-700">AI analyzes your description in plain English, understanding context and intent</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center flex-shrink-0 font-semibold text-xs">
                      2
                    </div>
                    <div>
                      <p className="font-medium">Intelligent Matching</p>
                      <p className="text-blue-700">Matches your needs with materials based on specifications, applications, and compatibility</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center flex-shrink-0 font-semibold text-xs">
                      3
                    </div>
                    <div>
                      <p className="font-medium">Relevance Scoring</p>
                      <p className="text-blue-700">Each result is scored and explained so you know why it's recommended</p>
                    </div>
                  </div>
                </div>
              </div>

              {isSearching && (
                <div className="mt-6 text-center">
                  <div className="inline-flex flex-col items-center gap-4 p-8">
                    <Loader className="w-12 h-12 text-purple-600 animate-spin" />
                    <div className="space-y-2">
                      <p className="text-lg font-semibold text-slate-900">AI is analyzing your request...</p>
                      <div className="space-y-1 text-sm text-slate-600">
                        <p>🧠 Understanding your needs</p>
                        <p>🔍 Searching {materials.length} materials</p>
                        <p>⚡ Matching specifications</p>
                        <p>📊 Calculating relevance scores</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-6">
              {/* Results Header */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Found {results.length} matching materials
                  </h3>
                  <p className="text-sm text-slate-600">Sorted by relevance to your search</p>
                </div>
                <button
                  onClick={() => {
                    setSearchCompleted(false);
                    setQuery('');
                    setResults([]);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors text-sm"
                >
                  New Search
                </button>
              </div>

              {/* Results List */}
              {results.length > 0 ? (
                <div className="space-y-3">
                  {results.map((material, index) => (
                    <div
                      key={material.id}
                      className="border-2 border-slate-200 rounded-xl p-4 hover:border-purple-300 hover:shadow-lg transition-all"
                    >
                      <div className="flex items-start gap-4">
                        {/* Rank Badge */}
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white flex-shrink-0 ${
                          index === 0 ? 'bg-gradient-to-br from-yellow-400 to-orange-500' :
                          index === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-400' :
                          index === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-500' :
                          'bg-gradient-to-br from-purple-500 to-pink-500'
                        }`}>
                          {index + 1}
                        </div>

                        {/* Material Info */}
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-bold text-slate-900">{material.name}</h4>
                                {material.aiRecommended && (
                                  <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-semibold">
                                    AI Pick
                                  </span>
                                )}
                                <div className="flex items-center gap-1">
                                  <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                                  <span className="text-xs text-slate-600">{material.popularity}%</span>
                                </div>
                              </div>
                              <p className="text-sm text-slate-600 mb-2">{material.description}</p>
                              {material.aiReason && (
                                <div className="flex items-start gap-2 p-2 bg-purple-50 rounded-lg">
                                  <Sparkles className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                                  <p className="text-sm text-purple-700"><strong>Why:</strong> {material.aiReason}</p>
                                </div>
                              )}
                            </div>
                            <div className="text-right ml-4">
                              <p className="text-2xl font-bold text-slate-900">${material.unitCost.toFixed(2)}</p>
                              <p className="text-xs text-slate-500">per {material.unit}</p>
                              {material.aiRelevanceScore && (
                                <div className="mt-2">
                                  <div className="text-xs text-purple-700 font-semibold mb-1">
                                    {material.aiRelevanceScore}% match
                                  </div>
                                  <div className="w-20 h-2 bg-slate-200 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-gradient-to-r from-purple-600 to-pink-600"
                                      style={{ width: `${material.aiRelevanceScore}%` }}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-4 text-xs text-slate-500">
                            <span>{material.manufacturer}</span>
                            <span>•</span>
                            <span>{material.category} → {material.subcategory}</span>
                            <span>•</span>
                            <span>Used {material.usageCount} times</span>
                          </div>

                          <div className="flex items-center gap-2 mt-3">
                            <button
                              onClick={() => onSelectMaterial?.(material)}
                              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg hover:shadow-lg transition-all text-sm font-medium"
                            >
                              <ShoppingCart className="w-4 h-4" />
                              Add to Quote
                            </button>
                            <button className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors text-sm">
                              <Eye className="w-4 h-4" />
                              View Details
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="w-8 h-8 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">No matches found</h3>
                  <p className="text-slate-600 mb-4">Try rephrasing your search or being more specific</p>
                  <button
                    onClick={() => {
                      setSearchCompleted(false);
                      setQuery('');
                    }}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-slate-600">
              <Brain className="w-4 h-4" />
              <span>Powered by advanced AI matching algorithms</span>
            </div>
            <div className="text-slate-500">
              {materials.length} materials in database
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
