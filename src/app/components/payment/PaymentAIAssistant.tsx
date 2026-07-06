import { useState, useEffect } from 'react';
import {
  Sparkles, MessageSquare, Settings, Zap, TrendingUp,
  AlertTriangle, CheckCircle, Clock, Brain, ChevronDown,
  ChevronUp, Info, ArrowRight, RefreshCw, Play, Pause
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner@2.0.3';

interface AIAction {
  id: string;
  action_type: string;
  action_description: string;
  confidence_score: number;
  reasoning: string;
  status: string;
  suggested_at: string;
  estimated_impact: string;
}

export default function PaymentAIAssistant() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEnabled, setIsEnabled] = useState(true);
  const [pendingActions, setPendingActions] = useState<AIAction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    loadPendingActions();
    loadAISettings();
  }, []);

  const loadAISettings = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_ai_assistant')
        .select('*')
        .single();

      if (error) throw error;
      if (data) {
        setIsEnabled(data.is_enabled);
      }
    } catch (err) {
      console.error('Error loading AI settings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadPendingActions = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_ai_actions')
        .select('*')
        .eq('status', 'pending')
        .order('confidence_score', { ascending: false })
        .limit(10);

      if (error) throw error;
      setPendingActions(data || []);
    } catch (err) {
      console.error('Error loading pending actions:', err);
    }
  };

  const toggleAI = async () => {
    try {
      const { error } = await supabase
        .from('payment_ai_assistant')
        .update({ is_enabled: !isEnabled })
        .eq('id', 'id');

      if (error) throw error;

      setIsEnabled(!isEnabled);
      toast.success(isEnabled ? 'AI Assistant paused' : 'AI Assistant activated');
    } catch (err) {
      console.error('Error toggling AI:', err);
      toast.error('Failed to update AI status');
    }
  };

  const approveAction = async (actionId: string) => {
    try {
      const { error } = await supabase
        .from('payment_ai_actions')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString()
        })
        .eq('id', actionId);

      if (error) throw error;

      toast.success('Action approved and queued for implementation');
      loadPendingActions();
    } catch (err) {
      console.error('Error approving action:', err);
      toast.error('Failed to approve action');
    }
  };

  const rejectAction = async (actionId: string) => {
    try {
      const { error } = await supabase
        .from('payment_ai_actions')
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString()
        })
        .eq('id', actionId);

      if (error) throw error;

      toast.success('Action rejected');
      loadPendingActions();
    } catch (err) {
      console.error('Error rejecting action:', err);
      toast.error('Failed to reject action');
    }
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 0.9) return 'text-green-400 bg-green-500/20';
    if (score >= 0.7) return 'text-blue-400 bg-blue-500/20';
    if (score >= 0.5) return 'text-amber-400 bg-amber-500/20';
    return 'text-red-400 bg-red-500/20';
  };

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'workflow_created': return Settings;
      case 'fraud_detected': return AlertTriangle;
      case 'optimization_suggested': return TrendingUp;
      case 'automation_created': return Zap;
      default: return Brain;
    }
  };

  if (isLoading) {
    return (
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6">
        <div className="flex items-center justify-center">
          <RefreshCw className="w-6 h-6 text-orange-400 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-purple-500/10 via-blue-500/5 to-orange-500/10 border border-purple-500/30 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="p-6 bg-[#1A1A1A]/50 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-blue-500 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/30">
                <Sparkles className="w-7 h-7 text-white" />
              </div>
              {isEnabled && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-[#1A1A1A] animate-pulse" />
              )}
            </div>
            
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-white">AI Payment Assistant</h3>
                <span className={`px-2 py-1 rounded-lg text-xs font-semibold border ${
                  isEnabled
                    ? 'bg-green-500/20 text-green-400 border-green-500/30'
                    : 'bg-gray-500/20 text-gray-400 border-gray-500/30'
                }`}>
                  {isEnabled ? 'Active' : 'Paused'}
                </span>
              </div>
              <p className="text-gray-400 text-sm mt-1">
                Intelligent automation and payment workflow management
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleAI}
              className={`px-4 py-2 rounded-xl font-semibold transition-all flex items-center gap-2 ${
                isEnabled
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30'
                  : 'bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30'
              }`}
            >
              {isEnabled ? (
                <>
                  <Pause className="w-4 h-4" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Activate
                </>
              )}
            </button>

            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 hover:bg-white/10 rounded-xl transition"
            >
              {isExpanded ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-4 mt-6">
          <div className="bg-[#0A0A0A]/50 border border-[#2A2A2A] rounded-xl p-4">
            <div className="text-2xl font-bold text-white mb-1">
              {pendingActions.length}
            </div>
            <div className="text-xs text-gray-400">Pending Actions</div>
          </div>
          
          <div className="bg-[#0A0A0A]/50 border border-[#2A2A2A] rounded-xl p-4">
            <div className="text-2xl font-bold text-green-400 mb-1">
              24
            </div>
            <div className="text-xs text-gray-400">Approved Today</div>
          </div>
          
          <div className="bg-[#0A0A0A]/50 border border-[#2A2A2A] rounded-xl p-4">
            <div className="text-2xl font-bold text-blue-400 mb-1">
              98%
            </div>
            <div className="text-xs text-gray-400">Accuracy Rate</div>
          </div>
          
          <div className="bg-[#0A0A0A]/50 border border-[#2A2A2A] rounded-xl p-4">
            <div className="text-2xl font-bold text-purple-400 mb-1">
              $12K
            </div>
            <div className="text-xs text-gray-400">Saved This Month</div>
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-6 bg-[#0A0A0A]/30">
          {/* Capabilities */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
              <Brain className="w-4 h-4" />
              AI CAPABILITIES
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { label: 'Fraud Detection', icon: AlertTriangle, enabled: true },
                { label: 'Workflow Automation', icon: Zap, enabled: true },
                { label: 'Trend Analysis', icon: TrendingUp, enabled: true },
                { label: 'Smart Routing', icon: ArrowRight, enabled: true },
                { label: 'Refund Management', icon: RefreshCw, enabled: false },
                { label: 'Cost Optimization', icon: TrendingUp, enabled: true }
              ].map((cap, i) => {
                const Icon = cap.icon;
                return (
                  <div
                    key={i}
                    className={`p-3 rounded-xl border flex items-center gap-2 ${
                      cap.enabled
                        ? 'bg-green-500/10 border-green-500/30'
                        : 'bg-gray-500/10 border-gray-500/30'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${cap.enabled ? 'text-green-400' : 'text-gray-500'}`} />
                    <span className={`text-sm font-medium ${cap.enabled ? 'text-green-400' : 'text-gray-500'}`}>
                      {cap.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pending Actions */}
          {pendingActions.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                PENDING ACTIONS ({pendingActions.length})
              </h4>
              <div className="space-y-3">
                {pendingActions.map(action => {
                  const ActionIcon = getActionIcon(action.action_type);
                  return (
                    <div
                      key={action.id}
                      className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4 hover:border-orange-500/30 transition-all"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="w-10 h-10 bg-gradient-to-br from-purple-500/20 to-blue-500/10 rounded-lg flex items-center justify-center border border-purple-500/30 flex-shrink-0">
                            <ActionIcon className="w-5 h-5 text-purple-400" />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h5 className="font-semibold text-white text-sm">
                                {action.action_description}
                              </h5>
                              <span className={`px-2 py-0.5 rounded text-xs font-semibold ${getConfidenceColor(action.confidence_score)}`}>
                                {(action.confidence_score * 100).toFixed(0)}% confident
                              </span>
                            </div>
                            
                            <p className="text-xs text-gray-400 mb-2">{action.reasoning}</p>
                            
                            {action.estimated_impact && (
                              <div className="flex items-center gap-1 text-xs text-blue-400">
                                <Info className="w-3 h-3" />
                                <span>Impact: {action.estimated_impact}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-2 flex-shrink-0">
                          <button
                            onClick={() => approveAction(action.id)}
                            className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 text-green-400 rounded-lg text-sm font-semibold transition-all flex items-center gap-1"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Approve
                          </button>
                          <button
                            onClick={() => rejectAction(action.id)}
                            className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 rounded-lg text-sm font-semibold transition-all"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {pendingActions.length === 0 && (
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-8 text-center">
              <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
              <h4 className="text-white font-semibold mb-2">All Caught Up!</h4>
              <p className="text-gray-400 text-sm">
                No pending actions. The AI is monitoring and will notify you of any recommendations.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
