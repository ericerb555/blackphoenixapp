import React from 'react';
import { Construction, ArrowLeft } from 'lucide-react';
import { useNavigate } from '../hooks/useNavigate';

interface StubPageProps {
  title: string;
  description?: string;
  icon?: React.ComponentType<any>;
}

export function StubPage({ title, description, icon: Icon }: StubPageProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-black/50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          {/* Icon */}
          <div className="mb-6 flex justify-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#ea580c] to-[#dc2626] flex items-center justify-center">
              {Icon ? (
                <Icon className="w-10 h-10 text-white" />
              ) : (
                <Construction className="w-10 h-10 text-white" />
              )}
            </div>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-white mb-3">{title}</h1>

          {/* Description */}
          {description && (
            <p className="text-zinc-400 mb-8 leading-relaxed">{description}</p>
          )}

          {/* Default Message */}
          {!description && (
            <p className="text-zinc-400 mb-8 leading-relaxed">
              This feature is currently under development and will be available soon.
            </p>
          )}

          {/* Status Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm">
            <div className="w-2 h-2 bg-[#ea580c] rounded-full animate-pulse" />
            <span className="text-zinc-300">In Development</span>
          </div>

          {/* Additional Info */}
          <div className="mt-12 p-4 bg-zinc-900 border border-zinc-800 rounded-lg">
            <p className="text-xs text-zinc-500 leading-relaxed">
              We're working hard to bring you this feature. Check back soon for updates,
              or contact support if you need immediate assistance.
            </p>
          </div>

          {/* Actions */}
          <div className="mt-8 flex items-center justify-center gap-3">
            <button
              onClick={() => window.history.back()}
              className="px-6 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-white hover:bg-zinc-800 transition-colors"
            >
              Go Back
            </button>
            <button
              onClick={() => navigate('landing')}
              className="px-6 py-2.5 bg-[#ea580c] text-white rounded-lg hover:bg-[#dc2626] transition-colors"
            >
              Go Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}