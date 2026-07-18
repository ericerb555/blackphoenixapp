/**
 * Publish My Branding
 * Makes your company branding publicly accessible for non-authenticated visitors
 */

import { useState, useEffect } from 'react';
import { Globe, Lock, CheckCircle, Upload } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '/utils/supabase/info';

export default function PublishMyBranding() {
  const [loading, setLoading] = useState(false);
  const [currentBranding, setCurrentBranding] = useState<any>(null);
  const [isPublished, setIsPublished] = useState(false);

  useEffect(() => {
    loadCurrentBranding();
    checkIfPublished();
  }, []);

  const loadCurrentBranding = () => {
    const stored = localStorage.getItem('company_branding_profile');
    if (stored && stored !== 'undefined' && stored !== 'null') {
      try {
        const parsed = JSON.parse(stored);
        setCurrentBranding(parsed);
      } catch (e) {
        console.error('Failed to parse branding:', e);
      }
    }
  };

  const checkIfPublished = async () => {
    try {
      const { data, error } = await supabase
        .from('kv_store_57095a78')
        .select('*')
        .eq('key', 'public_branding_profile')
        .single();

      if (!error && data && data.value) {
        setIsPublished(true);
      }
    } catch (err) {
      console.error('Check published error:', err);
    }
  };

  const publishBranding = async () => {
    if (!currentBranding) {
      toast.error('No branding profile found. Please upload your logo first.');
      return;
    }

    if (!currentBranding.logo_url && !currentBranding.logo_primary && !currentBranding.logoPrimary) {
      toast.error('No logo found in branding profile. Please upload a logo first.');
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast.error('You must be logged in to publish branding');
        setLoading(false);
        return;
      }

      // Save to kv_store with a public key
      const { error } = await supabase
        .from('kv_store_57095a78')
        .upsert({
          key: 'public_branding_profile',
          value: currentBranding,
          updated_at: new Date().toISOString()
        });

      if (error) {
        throw error;
      }

      console.log('✅ Published branding to public_branding_profile');
      console.log('Company:', currentBranding.company_name);
      console.log('Logo size:', currentBranding.logo_url ? (currentBranding.logo_url.length / 1024).toFixed(1) + 'KB' : 'N/A');

      // Refresh server cache so it picks up the new branding
      try {
        const refreshResponse = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-57095a78/public/branding/refresh`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (refreshResponse.ok) {
          console.log('✅ Server cache refreshed');
        } else {
          console.error('Failed to refresh server cache:', await refreshResponse.text());
        }
      } catch (refreshError) {
        console.error('Error refreshing server cache:', refreshError);
      }

      toast.success('✅ Branding published! Public visitors will now see your logo.');
      setIsPublished(true);

      // Dispatch event to update the landing page
      window.dispatchEvent(new Event('brandingUpdated'));
    } catch (error: any) {
      console.error('Publish error:', error);
      toast.error('Failed to publish branding: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-[#1A1A1A] border-2 border-purple-500/30 rounded-2xl p-8">
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <Globe className="w-8 h-8 text-purple-400" />
            Publish My Branding
          </h1>
          <p className="text-gray-400 mb-8">
            Make your company logo and branding visible to all public visitors (even when they're not logged in)
          </p>

          {/* Status */}
          <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              {isPublished ? (
                <>
                  <CheckCircle className="w-6 h-6 text-green-400" />
                  <div>
                    <h3 className="text-lg font-bold text-green-400">Published</h3>
                    <p className="text-sm text-gray-400">Your branding is publicly visible</p>
                  </div>
                </>
              ) : (
                <>
                  <Lock className="w-6 h-6 text-orange-400" />
                  <div>
                    <h3 className="text-lg font-bold text-orange-400">Not Published</h3>
                    <p className="text-sm text-gray-400">Only you can see your branding</p>
                  </div>
                </>
              )}
            </div>

            {currentBranding && (
              <div className="border-t border-[#2A2A2A] pt-4">
                <p className="text-sm text-gray-400 mb-2">Current Branding:</p>
                <div className="flex items-center gap-4">
                  {(currentBranding.logo_url || currentBranding.logo_primary || currentBranding.logoPrimary) && (
                    <img
                      src={currentBranding.logo_url || currentBranding.logo_primary || currentBranding.logoPrimary}
                      alt="Company Logo"
                      className="w-24 h-24 object-contain bg-white/5 border border-white/10 rounded-lg p-2"
                    />
                  )}
                  <div>
                    <p className="text-white font-semibold">
                      {currentBranding.company_name || currentBranding.brandName || currentBranding.businessName || 'No name'}
                    </p>
                    {(currentBranding.logo_url || currentBranding.logo_primary || currentBranding.logoPrimary) && (
                      <p className="text-xs text-green-400">✓ Logo present</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* What This Does */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6 mb-6">
            <h3 className="text-lg font-bold text-blue-400 mb-3">What does this do?</h3>
            <ul className="space-y-2 text-sm text-gray-300">
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-1">•</span>
                <span>Makes your logo visible on the main landing page for ALL visitors</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-1">•</span>
                <span>Public visitors (not logged in) will see your branding</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-1">•</span>
                <span>Your logo will work on any device, even if you're not logged in</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-1">•</span>
                <span>Required for your customers and visitors to see your company branding</span>
              </li>
            </ul>
          </div>

          {/* Action Button */}
          <button
            onClick={publishBranding}
            disabled={loading || !currentBranding}
            className="w-full px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-xl font-bold text-lg transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          >
            {loading ? (
              <>
                <Upload className="w-6 h-6 animate-pulse" />
                Publishing...
              </>
            ) : isPublished ? (
              <>
                <CheckCircle className="w-6 h-6" />
                Re-Publish Updated Branding
              </>
            ) : (
              <>
                <Globe className="w-6 h-6" />
                Publish My Branding
              </>
            )}
          </button>

          {!currentBranding && (
            <p className="text-center text-red-400 text-sm mt-4">
              No branding profile found. Please upload your logo at <a href="/upload-my-logo" className="underline">/upload-my-logo</a> first.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
