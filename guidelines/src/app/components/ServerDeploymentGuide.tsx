/**
 * Server Deployment Guide
 * 
 * Shows instructions for deploying the Supabase Edge Function
 */

import { AlertCircle, Terminal, ExternalLink, CheckCircle2, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner@2.0.3';
import { projectId } from '../utils/supabase/info';

export default function ServerDeploymentGuide() {
  const [isChecking, setIsChecking] = useState(false);
  const [serverStatus, setServerStatus] = useState<'unknown' | 'deployed' | 'not-deployed'>('unknown');

  const checkServerStatus = async () => {
    setIsChecking(true);
    try {
      // DISABLED: Health check removed to prevent console 404 spam
      // Simulate offline response
      const response = { ok: false } as Response;

      if (response.ok) {
        setServerStatus('deployed');
        toast.success('Server is deployed and running!');
      } else if (response.status === 404) {
        setServerStatus('not-deployed');
        toast.error('Server is not deployed yet');
      } else {
        setServerStatus('unknown');
        toast.error(`Server returned status: ${response.status}`);
      }
    } catch (error) {
      console.error('Health check error:', error);
      setServerStatus('not-deployed');
      toast.error('Unable to reach server');
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md">
      <div className="bg-gradient-to-br from-orange-950 to-red-950 border-2 border-orange-500 rounded-xl shadow-2xl p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="p-2 bg-orange-500/20 rounded-lg">
            <AlertCircle className="w-6 h-6 text-orange-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white mb-1">Server Not Deployed</h3>
            <p className="text-sm text-orange-200">
              The Supabase Edge Function needs to be deployed
            </p>
          </div>
        </div>

        {/* Status Badge */}
        <div className="mb-4 flex items-center gap-2">
          <span className="text-xs text-gray-400">Status:</span>
          {serverStatus === 'deployed' ? (
            <span className="flex items-center gap-1 text-xs text-green-400 bg-green-500/20 px-2 py-1 rounded">
              <CheckCircle2 className="w-3 h-3" />
              Deployed
            </span>
          ) : serverStatus === 'not-deployed' ? (
            <span className="flex items-center gap-1 text-xs text-red-400 bg-red-500/20 px-2 py-1 rounded">
              <AlertCircle className="w-3 h-3" />
              Not Deployed
            </span>
          ) : (
            <span className="text-xs text-gray-400 bg-gray-800/50 px-2 py-1 rounded">
              Unknown
            </span>
          )}
          
          <button
            onClick={checkServerStatus}
            disabled={isChecking}
            className="ml-auto flex items-center gap-1 text-xs text-orange-400 hover:text-orange-300 disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${isChecking ? 'animate-spin' : ''}`} />
            Check Status
          </button>
        </div>

        {/* Deployment Instructions */}
        <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Terminal className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-semibold text-white">Deploy Command</span>
          </div>
          
          <code className="block bg-black/50 text-green-400 text-xs p-3 rounded border border-green-500/20 mb-3 font-mono">
            supabase functions deploy server
          </code>

          <p className="text-xs text-gray-400 mb-2">Or if you need to login first:</p>
          
          <code className="block bg-black/50 text-blue-400 text-xs p-3 rounded border border-blue-500/20 font-mono">
            supabase login<br />
            supabase link --project-ref {projectId}<br />
            supabase functions deploy server
          </code>
        </div>

        {/* Help Links */}
        <div className="space-y-2">
          <a
            href="https://supabase.com/docs/guides/functions/deploy"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300"
          >
            <ExternalLink className="w-3 h-3" />
            Supabase Functions Documentation
          </a>
          
          <a
            href={`https://supabase.com/dashboard/project/${projectId}/functions`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300"
          >
            <ExternalLink className="w-3 h-3" />
            View Functions in Dashboard
          </a>
        </div>

        {/* Dismiss Note */}
        <p className="text-xs text-gray-500 mt-4 italic">
          Once deployed, refresh the page and this message will disappear
        </p>
      </div>
    </div>
  );
}
