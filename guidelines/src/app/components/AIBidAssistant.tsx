import { useState } from 'react';
import { Brain, Sparkles, Package, Wrench, TrendingUp, Users, Send, CheckCircle, AlertCircle, Zap, ChevronRight, Star, Crown } from 'lucide-react';
import { StandardButton } from './ui/button/StandardButton';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface AIBidAssistantProps {
  job: {
    id: string;
    title: string;
    description: string;
    requirements?: string[];
    type?: string;
  };
  onRouted?: () => void;
}

export default function AIBidAssistant({ job, onRouted }: AIBidAssistantProps) {
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [matchingProviders, setMatchingProviders] = useState<any[]>([]);
  const [routing, setRouting] = useState(false);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      console.log('🧪 Testing endpoint connectivity...');
      
      // DISABLED: Health check removed to prevent console 404 spam
      // Skip health check and proceed directly to bid analysis

      // Now try the simple test endpoint we just created
      const testResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-57095a78/bid-router/simple-test`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify({ test: true })
        }
      );

      console.log('Bid router test status:', testResponse.status);
      if (testResponse.ok) {
        const testData = await testResponse.json();
        console.log('✅ Bid router test endpoint working:', testData);
      } else {
        console.error('❌ Bid router test endpoint failed:', testResponse.status);
        const text = await testResponse.text();
        console.error('Response:', text);
        toast.error(`Bid router endpoint not found: ${testResponse.status}`);
        return;
      }

      // Now try the actual analysis endpoint
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-57095a78/bid-router/ai-analyze`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify({
            title: job.title,
            description: job.description,
            requirements: job.requirements,
            type: job.type
          })
        }
      );

      // Check if response is ok
      if (!response.ok) {
        console.error('Server response not ok:', response.status, response.statusText);
        const text = await response.text();
        console.error('Response body:', text);
        toast.error(`Analysis failed: ${response.statusText}`);
        return;
      }

      // Check content type
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error('Response is not JSON. Content-Type:', contentType);
        const text = await response.text();
        console.error('Response body:', text);
        toast.error('Server returned invalid response format');
        return;
      }

      const data = await response.json();
      
      if (data.success) {
        setAnalysis(data.analysis);
        setMatchingProviders(data.matchingProviders || []);
        toast.success('AI analysis complete!');
      } else {
        toast.error(data.error || 'Analysis failed');
      }
    } catch (error) {
      console.log('AI analysis unavailable (backend not responding), using mock data');
      // Create mock analysis data so the UI still works
      setAnalysis({
        complexity: 'Medium',
        estimatedTime: '2-4 hours',
        suggestedProviders: 3,
        confidence: 85
      });
      toast.info('Analysis complete with mock data (backend unavailable)');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleAutoRoute = async () => {
    setRouting(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-57095a78/bid-router/ai-route`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify({
            requestId: job.id,
            title: job.title,
            description: job.description,
            requirements: job.requirements,
            type: job.type,
            autoSend: true
          })
        }
      );

      // Check if response is ok
      if (!response.ok) {
        console.error('Server response not ok:', response.status, response.statusText);
        const text = await response.text();
        console.error('Response body:', text);
        toast.error(`Routing failed: ${response.statusText}`);
        return;
      }

      // Check content type
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error('Response is not JSON. Content-Type:', contentType);
        const text = await response.text();
        console.error('Response body:', text);
        toast.error('Server returned invalid response format');
        return;
      }

      const data = await response.json();
      
      if (data.success) {
        toast.success(`✅ Routed to ${data.providersNotified} providers!`);
        onRouted?.();
      } else {
        toast.error(data.error || 'Routing failed');
      }
    } catch (error) {
      console.error('Error routing request:', error);
      toast.error('Failed to route request');
    } finally {
      setRouting(false);
    }
  };

  const getNeedTypeIcon = (needType: string) => {
    if (needType === 'product') return <Package className="w-5 h-5" />;
    if (needType === 'service') return <Wrench className="w-5 h-5" />;
    return <Zap className="w-5 h-5" />;
  };

  const getNeedTypeColor = (needType: string) => {
    if (needType === 'product') return 'text-blue-400';
    if (needType === 'service') return 'text-orange-400';
    return 'text-purple-400';
  };

  const getComplexityColor = (complexity: string) => {
    if (complexity === 'high') return 'text-red-400';
    if (complexity === 'medium') return 'text-yellow-400';
    return 'text-green-400';
  };

  return (
    <div className="bg-gradient-to-br from-purple-600/10 to-blue-600/10 border border-purple-500/30 rounded-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
            <Brain className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              AI Bid Assistant
              <Sparkles className="w-4 h-4 text-purple-400" />
            </h3>
            <p className="text-sm text-gray-400">Intelligent routing & matching</p>
          </div>
        </div>

        {!analysis && (
          <StandardButton
            variant="primary"
            size="sm"
            onClick={handleAnalyze}
            loading={analyzing}
            icon={<Sparkles className="w-4 h-4" />}
          >
            Analyze Request
          </StandardButton>
        )}
      </div>

      {/* Analysis Results */}
      {analysis && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <div className="flex items-start gap-3 mb-3">
              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-gray-300">{analysis.summary}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-gray-500">Confidence:</span>
                  <div className="flex-1 bg-gray-700 rounded-full h-2 overflow-hidden max-w-32">
                    <div 
                      className="bg-green-500 h-full transition-all"
                      style={{ width: `${analysis.confidence}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-green-400">{analysis.confidence}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Need Type & Complexity */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
              <div className="flex items-center gap-2 mb-1">
                <span className={getNeedTypeColor(analysis.needType)}>
                  {getNeedTypeIcon(analysis.needType)}
                </span>
                <span className="text-xs text-gray-400">Request Type</span>
              </div>
              <div className={`font-semibold capitalize ${getNeedTypeColor(analysis.needType)}`}>
                {analysis.needType === 'both' ? 'Product + Service' : analysis.needType}
              </div>
            </div>

            <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className={`w-5 h-5 ${getComplexityColor(analysis.complexity)}`} />
                <span className="text-xs text-gray-400">Complexity</span>
              </div>
              <div className={`font-semibold capitalize ${getComplexityColor(analysis.complexity)}`}>
                {analysis.complexity}
              </div>
            </div>
          </div>

          {/* Categories */}
          {analysis.categories && analysis.categories.length > 0 && (
            <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
              <div className="text-xs text-gray-400 mb-2">Detected Categories:</div>
              <div className="flex flex-wrap gap-2">
                {analysis.categories.map((cat: string) => (
                  <span key={cat} className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded text-xs font-semibold">
                    {cat.replace(/-/g, ' ')}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Matching Providers */}
          {matchingProviders.length > 0 && (
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-400" />
                  <span className="font-semibold text-white">
                    {matchingProviders.length} Matching Providers
                  </span>
                </div>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto">
                {matchingProviders.slice(0, 5).map((provider) => (
                  <div key={provider.id} className="flex items-center justify-between p-2 bg-gray-700/30 rounded">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="flex items-center gap-2">
                        {provider.subscriptionTier === 'enterprise' && (
                          <Crown className="w-4 h-4 text-purple-400" />
                        )}
                        <span className="text-sm font-semibold text-white">{provider.name}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        provider.type === 'subcontractor' 
                          ? 'bg-orange-500/20 text-orange-300'
                          : 'bg-blue-500/20 text-blue-300'
                      }`}>
                        {provider.type === 'subcontractor' ? 'Subcontractor' : 'Service Provider'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-yellow-400 fill-current" />
                        <span className="text-xs text-gray-400">{provider.rating?.toFixed(1) || 'N/A'}</span>
                      </div>
                      <div className="w-12 bg-gray-600 rounded-full h-2 overflow-hidden">
                        <div 
                          className="bg-green-500 h-full"
                          style={{ width: `${provider.matchScore}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-green-400 w-8 text-right">
                        {provider.matchScore}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {matchingProviders.length > 5 && (
                <div className="text-center mt-2">
                  <span className="text-xs text-gray-400">
                    +{matchingProviders.length - 5} more providers
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <StandardButton
              variant="success"
              onClick={handleAutoRoute}
              loading={routing}
              icon={<Send className="w-4 h-4" />}
              className="flex-1"
            >
              Auto-Route to Top {Math.min(5, matchingProviders.length)} Providers
            </StandardButton>
            <StandardButton
              variant="secondary"
              size="sm"
              onClick={handleAnalyze}
              loading={analyzing}
            >
              Re-analyze
            </StandardButton>
          </div>

          {/* Recommendation */}
          {analysis.recommendedAction && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-300">
                  <strong>Recommendation:</strong>{' '}
                  {analysis.recommendedAction === 'send_to_bid_room' && 'Send to bid room for competitive bidding'}
                  {analysis.recommendedAction === 'direct_assign' && 'Direct assign to the best match'}
                  {analysis.recommendedAction === 'select_top_3' && 'Invite top 3 providers to quote'}
                  {analysis.recommendedAction === 'no_matches' && 'No suitable providers found - may need external sourcing'}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Initial State */}
      {!analysis && !analyzing && (
        <div className="text-center py-6">
          <Brain className="w-12 h-12 text-purple-400 mx-auto mb-3 opacity-50" />
          <p className="text-sm text-gray-400 mb-4">
            AI will analyze this request and suggest the best routing strategy
          </p>
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div className="bg-gray-800/30 rounded p-2">
              <Package className="w-4 h-4 text-blue-400 mx-auto mb-1" />
              <div className="text-gray-400">Product vs Service</div>
            </div>
            <div className="bg-gray-800/30 rounded p-2">
              <Users className="w-4 h-4 text-green-400 mx-auto mb-1" />
              <div className="text-gray-400">Match Providers</div>
            </div>
            <div className="bg-gray-800/30 rounded p-2">
              <Zap className="w-4 h-4 text-orange-400 mx-auto mb-1" />
              <div className="text-gray-400">Auto-Route</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}