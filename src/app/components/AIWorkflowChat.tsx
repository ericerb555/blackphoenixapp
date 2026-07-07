/**
 * AI Workflow Chat Widget
 * 
 * Floating chat interface for interacting with the Workflow Sentinel AI
 * Can be embedded anywhere in the application
 */

import { useState, useRef, useEffect } from 'react';
import {
  MessageCircle, X, Send, Sparkles, TrendingUp, AlertCircle,
  CheckCircle, Clock, Users, Zap, ChevronDown, Minimize2,
  Maximize2, Bot, User, ArrowRight, GitBranch, BarChart3
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { IconButton } from './ui/button/IconButton';

interface Message {
  id: string;
  type: 'user' | 'ai' | 'system';
  content: string;
  timestamp: Date;
  actions?: ChatAction[];
  data?: any;
}

interface ChatAction {
  label: string;
  onClick: () => void;
  variant: 'primary' | 'secondary' | 'success' | 'warning';
}

interface AIWorkflowChatProps {
  isOpen?: boolean;
  onClose?: () => void;
  initialMessage?: string;
}

export default function AIWorkflowChat({ isOpen = false, onClose }: AIWorkflowChatProps) {
  const [open, setOpen] = useState(isOpen);
  const [minimized, setMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'ai',
      content: "👋 Hi! I'm Workflow Sentinel, your AI assistant. I'm monitoring all 12 workflows across 416 active instances. How can I help you today?",
      timestamp: new Date(),
      actions: [
        { label: 'Show Alerts', onClick: () => handleQuickAction('alerts'), variant: 'warning' },
        { label: 'System Health', onClick: () => handleQuickAction('health'), variant: 'primary' },
        { label: 'Predictions', onClick: () => handleQuickAction('predictions'), variant: 'success' }
      ]
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && !minimized) {
      inputRef.current?.focus();
    }
  }, [open, minimized]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleQuickAction = (action: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: getQuickActionText(action),
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    simulateAIResponse(action);
  };

  const getQuickActionText = (action: string): string => {
    const actions: Record<string, string> = {
      'alerts': 'Show me current alerts',
      'health': 'What is the system health status?',
      'predictions': 'Show me workflow predictions',
      'stuck': 'Which workflows are stuck?',
      'performance': 'Show performance metrics',
      'optimize': 'How can I optimize workflows?'
    };
    return actions[action] || action;
  };

  const simulateAIResponse = (query: string) => {
    setIsTyping(true);
    
    setTimeout(() => {
      const response = getAIResponse(query);
      const aiMessage: Message = {
        id: Date.now().toString(),
        type: 'ai',
        content: response.content,
        timestamp: new Date(),
        actions: response.actions,
        data: response.data
      };
      
      setMessages(prev => [...prev, aiMessage]);
      setIsTyping(false);
    }, 1000 + Math.random() * 1000);
  };

  const getAIResponse = (query: string): { content: string; actions?: ChatAction[]; data?: any } => {
    const q = query.toLowerCase();
    
    if (q.includes('alert') || q.includes('issue') || q.includes('problem')) {
      return {
        content: "🚨 **Current Alerts (3 Critical, 5 Warning)**\n\n**Critical:**\n• Subcontractor Onboarding #SC-1047 stuck at License Verification (4 days)\n• Vendor Performance Review #VP-203 missing required documents\n• Technician Dispatch #TD-5621 - Tech unreachable\n\n**Warnings:**\n• 5 Purchase Orders awaiting manager approval (>2 days)\n• Background checks taking 6.2 days avg (target: 5 days)\n• Invoice processing backlog: 12 items",
        actions: [
          { label: 'Auto-Resolve Simple Issues', onClick: () => toast.success('Resolved 3 issues automatically'), variant: 'success' },
          { label: 'Escalate Critical', onClick: () => toast.success('Escalated to managers'), variant: 'warning' },
          { label: 'View Details', onClick: () => toast.info('Opening alert dashboard'), variant: 'primary' }
        ]
      };
    }
    
    if (q.includes('health') || q.includes('status')) {
      return {
        content: "✅ **Overall System Health: 87% (Good)**\n\n**Breakdown:**\n• Vendor Workflows: 92% healthy (65 active)\n• Subcontractor Workflows: 84% healthy (134 active)\n• Technician Workflows: 91% healthy (190 active)\n• Employee Workflows: 88% healthy (27 active)\n\n**Key Metrics:**\n• Average completion rate: 94%\n• On-time completion: 87%\n• Bottlenecks detected: 3\n• Auto-resolved today: 18 issues",
        actions: [
          { label: 'Fix Bottlenecks', onClick: () => toast.success('Optimizing workflows...'), variant: 'warning' },
          { label: 'Full Report', onClick: () => toast.info('Generating report...'), variant: 'primary' }
        ]
      };
    }
    
    if (q.includes('predict') || q.includes('forecast') || q.includes('will')) {
      return {
        content: "🔮 **Workflow Predictions (Next 48 Hours)**\n\n**Likely to Complete:**\n• 12 Subcontractor Onboardings (avg 8.5 days remaining)\n• 8 Purchase Orders (avg 1.2 days)\n• 23 Service Calls (today)\n• 4 Time Off Requests (tomorrow)\n\n**At Risk of Delay:**\n• Vendor Onboarding #VO-892 (License verification bottleneck)\n• Employee Onboarding #EO-412 (Background check pending)\n\n**Recommended Actions:**\n• Assign backup approver for Finance team\n• Follow up on 2 pending background checks",
        actions: [
          { label: 'Take Recommended Actions', onClick: () => toast.success('Actions queued'), variant: 'success' },
          { label: 'See Timeline', onClick: () => toast.info('Opening timeline view'), variant: 'primary' }
        ]
      };
    }
    
    if (q.includes('stuck') || q.includes('delayed') || q.includes('slow')) {
      return {
        content: "⚠️ **Stuck Workflows (7 total)**\n\n**Subcontractor:**\n• #SC-1047 - Stage 2 (License) - 4 days\n• #SC-1052 - Stage 4 (Rates) - 3 days\n\n**Vendor:**\n• #VO-892 - Stage 2 (Background) - 5 days\n• #VO-898 - Stage 3 (Contract) - 4 days\n\n**Employee:**\n• #EO-412 - Stage 3 (Background) - 7 days\n\n**Root Causes:**\n• Compliance Officer overloaded (23 pending approvals)\n• Missing documents from applicants\n• Background check vendor delays",
        actions: [
          { label: 'Send Reminders', onClick: () => toast.success('Reminders sent to 7 stakeholders'), variant: 'primary' },
          { label: 'Escalate All', onClick: () => toast.success('Escalated to managers'), variant: 'warning' },
          { label: 'Assign Backup Approvers', onClick: () => toast.success('Backup approvers assigned'), variant: 'success' }
        ]
      };
    }
    
    if (q.includes('performance') || q.includes('metric') || q.includes('stat')) {
      return {
        content: "📊 **Performance Metrics (Last 30 Days)**\n\n**Completion Rates:**\n• Vendor: 94% (target: 90%) ✅\n• Subcontractor: 92% (target: 90%) ✅\n• Technician: 96% (target: 95%) ✅\n• Employee: 93% (target: 90%) ✅\n\n**Average Times:**\n• Vendor Onboarding: 7.2 days (target: 7) ⚠️\n• Subcontractor Onboarding: 9.8 days (target: 10) ✅\n• Service Call: 4.2 hours (target: 4) ⚠️\n\n**Efficiency Gains:**\n• 18% faster than 6 months ago\n• 42% reduction in stuck workflows\n• 87% auto-advance success rate",
        actions: [
          { label: 'Download Report', onClick: () => toast.success('Report downloaded'), variant: 'primary' },
          { label: 'Compare Periods', onClick: () => toast.info('Opening comparison view'), variant: 'secondary' }
        ]
      };
    }
    
    if (q.includes('optimize') || q.includes('improve') || q.includes('better')) {
      return {
        content: "💡 **AI Optimization Recommendations**\n\n**Quick Wins (Implement Now):**\n1. Enable auto-advance on PO approval Stage 2 (99% approval rate)\n2. Combine Vendor stages 4 & 5 (same approver)\n3. Increase doc upload deadline from 1 to 2 days (reduces rejections 34%)\n\n**Medium Priority:**\n1. Add 2nd approver for Compliance role (current bottleneck)\n2. Create document templates for common forms (saves 1.5 days avg)\n3. Enable parallel approvals for Finance + Legal stages\n\n**Long Term:**\n1. Implement ML-based approval routing\n2. Auto-generate missing documents from previous submissions\n3. Real-time collaboration on contract negotiations",
        actions: [
          { label: 'Apply Quick Wins', onClick: () => toast.success('Applied 3 optimizations'), variant: 'success' },
          { label: 'Schedule Review', onClick: () => toast.info('Review meeting scheduled'), variant: 'primary' }
        ]
      };
    }
    
    if (q.includes('who') && (q.includes('approval') || q.includes('pending'))) {
      return {
        content: "👥 **Pending Approvals by Person**\n\n**Highest Workload:**\n• Sarah Chen (Compliance): 23 approvals pending\n  - 12 License verifications\n  - 8 Background checks\n  - 3 Insurance reviews\n\n• Mike Johnson (Finance): 15 approvals\n  - 10 Purchase orders\n  - 5 Invoice reviews\n\n• Lisa Rodriguez (HR): 8 approvals\n  - 5 Employee onboardings\n  - 3 Time off requests\n\n**Recommendation:** Assign backup approver for Sarah Chen (overloaded)",
        actions: [
          { label: 'Assign Backup', onClick: () => toast.success('Backup approver assigned to Sarah'), variant: 'success' },
          { label: 'Send Reminder', onClick: () => toast.success('Reminders sent'), variant: 'primary' }
        ]
      };
    }
    
    // Default response
    return {
      content: "I can help you with:\n\n• **Alerts & Issues** - \"Show me current alerts\"\n• **System Health** - \"What's the system health?\"\n• **Predictions** - \"What will complete soon?\"\n• **Stuck Workflows** - \"Which workflows are stuck?\"\n• **Performance** - \"Show performance metrics\"\n• **Optimization** - \"How can I improve workflows?\"\n• **Approvals** - \"Who has pending approvals?\"\n\nWhat would you like to know?",
      actions: [
        { label: 'Show Alerts', onClick: () => handleQuickAction('alerts'), variant: 'warning' },
        { label: 'System Health', onClick: () => handleQuickAction('health'), variant: 'primary' },
        { label: 'Stuck Workflows', onClick: () => handleQuickAction('stuck'), variant: 'secondary' }
      ]
    };
  };

  const handleSend = () => {
    if (!input.trim()) return;
    
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    simulateAIResponse(input);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-br from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 z-50 group"
      >
        <MessageCircle className="w-7 h-7" />
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-pulse" />
        <div className="absolute -top-8 right-0 bg-[#1A1A1A] border border-orange-500/30 rounded-lg px-3 py-1 text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition">
          Ask AI Assistant
        </div>
      </button>
    );
  }

  return (
    <div className={`fixed bottom-6 right-6 bg-[#1A1A1A] border-2 border-orange-500/30 rounded-2xl shadow-2xl z-50 transition-all ${
      minimized ? 'w-80 h-16' : 'w-96 h-[600px]'
    }`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-900/40 to-orange-800/20 border-b border-orange-500/30 px-4 py-3 rounded-t-2xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-600 to-orange-700 rounded-full flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-[#1A1A1A]" />
          </div>
          <div>
            <h3 className="font-bold text-white flex items-center gap-2">
              Workflow Sentinel
              <span className="px-2 py-0.5 bg-green-600/20 border border-green-500/30 rounded text-xs text-green-400">
                Active
              </span>
            </h3>
            <p className="text-xs text-gray-400">AI Workflow Assistant</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMinimized(!minimized)}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-[#2A2A2A] rounded-lg transition"
          >
            {minimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={() => { setOpen(false); onClose?.(); }}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-[#2A2A2A] rounded-lg transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!minimized && (
        <>
          {/* Messages */}
          <div className="h-[460px] overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.type === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  message.type === 'user' 
                    ? 'bg-blue-600' 
                    : 'bg-gradient-to-br from-orange-600 to-orange-700'
                }`}>
                  {message.type === 'user' ? (
                    <User className="w-4 h-4 text-white" />
                  ) : (
                    <Bot className="w-4 h-4 text-white" />
                  )}
                </div>
                
                <div className={`flex-1 ${message.type === 'user' ? 'text-right' : ''}`}>
                  <div className={`inline-block max-w-[85%] ${
                    message.type === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-[#0A0A0A] border border-[#2A2A2A] text-gray-200'
                  } rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap`}>
                    {message.content}
                  </div>
                  
                  {message.actions && message.actions.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {message.actions.map((action, idx) => (
                        <button
                          key={idx}
                          onClick={action.onClick}
                          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                            action.variant === 'primary' ? 'bg-orange-600 hover:bg-orange-700 text-white' :
                            action.variant === 'success' ? 'bg-green-600 hover:bg-green-700 text-white' :
                            action.variant === 'warning' ? 'bg-yellow-600 hover:bg-yellow-700 text-white' :
                            'bg-[#2A2A2A] hover:bg-[#3A3A3A] text-gray-300'
                          }`}
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  )}
                  
                  <p className="text-xs text-gray-500 mt-1">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-600 to-orange-700 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-2xl px-4 py-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-[#2A2A2A] p-3">
            <div className="flex items-end gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything about workflows..."
                className="flex-1 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
              />
              <IconButton
                onClick={handleSend}
                disabled={!input.trim()}
                icon={<Send />}
                variant="primary"
                tooltip="Send message"
              />
            </div>
            
            {/* Quick Actions */}
            <div className="mt-2 flex flex-wrap gap-1">
              {['alerts', 'stuck', 'predictions', 'optimize'].map((action) => (
                <button
                  key={action}
                  onClick={() => handleQuickAction(action)}
                  className="px-2 py-1 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-gray-400 hover:text-white text-xs rounded transition"
                >
                  {action.charAt(0).toUpperCase() + action.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
