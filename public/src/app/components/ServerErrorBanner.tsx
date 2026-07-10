// Server Error Banner Component
// Displays when cart API fails with helpful diagnostic info
import { AlertTriangle, ExternalLink } from 'lucide-react';
import { StandardButton } from './ui/button/StandardButton';

interface ServerErrorBannerProps {
  onRunTest: () => void;
}

export default function ServerErrorBanner({ onRunTest }: ServerErrorBannerProps) {
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-2xl w-full mx-4">
      <div className="bg-gradient-to-r from-red-500/10 to-orange-500/10 backdrop-blur-xl border-2 border-red-500/30 rounded-2xl p-4 shadow-2xl">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-red-500/20 rounded-xl">
            <AlertTriangle className="w-6 h-6 text-red-400" />
          </div>
          
          <div className="flex-1">
            <h3 className="text-lg font-bold text-white mb-1">
              Cart API Connection Error
            </h3>
            <p className="text-sm text-slate-300 mb-3">
              Unable to connect to the cart server. This could be due to the Supabase function not being deployed or CORS configuration issues.
            </p>
            
            <div className="flex gap-2">
              <StandardButton
                onClick={onRunTest}
                size="sm"
                className="bg-gradient-to-r from-cyan-500 to-purple-600"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Run Diagnostics
              </StandardButton>
              
              <a
                href="https://supabase.com/dashboard/project/plzsvzwwcdopnawtiwzm/functions"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-sm font-semibold text-white transition-colors inline-flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Supabase Dashboard
              </a>
            </div>
          </div>
          
          <button
            onClick={() => {
              const banner = document.getElementById('server-error-banner');
              if (banner) banner.style.display = 'none';
            }}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
