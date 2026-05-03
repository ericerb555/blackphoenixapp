/**
 * REAL-TIME QUOTE PROGRESS TRACKER
 * 
 * Live visualization of quote workflow progress with:
 * - Step-by-step progress timeline
 * - Real-time activity feed
 * - Animated transitions
 * - Live status updates
 * - Progress bars and timers
 */

import { useState, useEffect } from 'react';
import { 
  Clock, CheckCircle2, Loader2, AlertCircle, 
  Zap, Brain, FileText, Edit2, Palette, Send 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface ProgressStep {
  id: string;
  label: string;
  icon: any;
  status: 'pending' | 'active' | 'complete' | 'error';
  progress?: number;
  startTime?: number;
  endTime?: number;
  substeps?: string[];
}

export interface ActivityLog {
  id: string;
  timestamp: number;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  icon?: any;
}

interface RealTimeQuoteProgressProps {
  currentStep: string;
  steps: ProgressStep[];
  activityLogs: ActivityLog[];
  isProcessing: boolean;
  estimatedTimeRemaining?: number;
}

export default function RealTimeQuoteProgress({
  currentStep,
  steps,
  activityLogs,
  isProcessing,
  estimatedTimeRemaining
}: RealTimeQuoteProgressProps) {
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 100);
    return () => clearInterval(interval);
  }, []);

  const getStepStatus = (stepId: string) => {
    const step = steps.find(s => s.id === stepId);
    return step?.status || 'pending';
  };

  const getStepProgress = (stepId: string) => {
    const step = steps.find(s => s.id === stepId);
    return step?.progress || 0;
  };

  const getElapsedTime = (step: ProgressStep) => {
    if (!step.startTime) return 0;
    const end = step.endTime || currentTime;
    return Math.floor((end - step.startTime) / 1000);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'complete': return 'text-green-500';
      case 'active': return 'text-[#ea580c]';
      case 'error': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'success': return 'border-green-500/30 bg-green-500/5';
      case 'warning': return 'border-yellow-500/30 bg-yellow-500/5';
      case 'error': return 'border-red-500/30 bg-red-500/5';
      default: return 'border-gray-700 bg-[#1A1A1A]';
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#0A0A0A] border-l border-gray-800">
      {/* Header */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-[#ea580c]" />
            Live Progress
          </h3>
          {isProcessing && (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Loader2 className="w-4 h-4 animate-spin text-[#ea580c]" />
              Processing...
            </div>
          )}
        </div>
        
        {estimatedTimeRemaining !== undefined && estimatedTimeRemaining > 0 && (
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Clock className="w-3 h-3" />
            Est. {formatTime(estimatedTimeRemaining)} remaining
          </div>
        )}
      </div>

      {/* Progress Timeline */}
      <div className="flex-1 overflow-y-auto">
        {/* Steps */}
        <div className="p-4 space-y-4">
          {steps.map((step, index) => {
            const isActive = step.status === 'active';
            const isComplete = step.status === 'complete';
            const isError = step.status === 'error';
            const isPending = step.status === 'pending';
            
            return (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="relative"
              >
                {/* Connector Line */}
                {index < steps.length - 1 && (
                  <div className={`absolute left-[19px] top-10 w-0.5 h-6 ${
                    isComplete ? 'bg-green-500' : 'bg-gray-800'
                  }`} />
                )}
                
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                    isComplete ? 'bg-green-500/10 border-green-500' :
                    isActive ? 'bg-[#ea580c]/10 border-[#ea580c]' :
                    isError ? 'bg-red-500/10 border-red-500' :
                    'bg-gray-900 border-gray-700'
                  }`}>
                    {isComplete ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    ) : isError ? (
                      <AlertCircle className="w-5 h-5 text-red-500" />
                    ) : isActive ? (
                      <Loader2 className="w-5 h-5 text-[#ea580c] animate-spin" />
                    ) : (
                      <step.icon className="w-5 h-5 text-gray-500" />
                    )}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className={`text-sm font-medium ${getStatusColor(step.status)}`}>
                        {step.label}
                      </h4>
                      {step.startTime && (
                        <span className="text-xs text-gray-500">
                          {formatTime(getElapsedTime(step))}
                        </span>
                      )}
                    </div>
                    
                    {/* Progress Bar */}
                    {isActive && step.progress !== undefined && (
                      <div className="mt-2">
                        <div className="w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
                          <motion.div
                            className="h-full bg-[#ea580c] rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${step.progress}%` }}
                            transition={{ duration: 0.3 }}
                          />
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {Math.round(step.progress)}% complete
                        </div>
                      </div>
                    )}
                    
                    {/* Substeps */}
                    {isActive && step.substeps && step.substeps.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {step.substeps.map((substep, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="flex items-center gap-2 text-xs text-gray-400"
                          >
                            <div className="w-1 h-1 rounded-full bg-[#ea580c]" />
                            {substep}
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Activity Feed */}
        <div className="border-t border-gray-800 p-4">
          <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Brain className="w-4 h-4 text-[#ea580c]" />
            Activity Feed
          </h4>
          
          <div className="space-y-2 max-h-64 overflow-y-auto">
            <AnimatePresence mode="popLayout">
              {activityLogs.slice().reverse().slice(0, 10).map((log) => {
                const Icon = log.icon || FileText;
                return (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={`p-2 rounded-lg border ${getActivityColor(log.type)}`}
                  >
                    <div className="flex items-start gap-2">
                      <Icon className={`w-3 h-3 mt-0.5 flex-shrink-0 ${
                        log.type === 'success' ? 'text-green-500' :
                        log.type === 'warning' ? 'text-yellow-500' :
                        log.type === 'error' ? 'text-red-500' :
                        'text-gray-400'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-300">{log.message}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Processing Indicator */}
      {isProcessing && (
        <div className="p-4 border-t border-gray-800 bg-gradient-to-r from-[#ea580c]/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-8 h-8 rounded-full border-2 border-[#ea580c] border-t-transparent animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Brain className="w-4 h-4 text-[#ea580c]" />
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-white">AI Processing</p>
              <p className="text-xs text-gray-400">Analyzing and generating...</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
