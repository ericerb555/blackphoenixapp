/**
 * Fix My Logo - Uploads logo to Supabase Storage so it appears on the live site
 * from any device without relying on base64 or localStorage.
 */

import { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle, AlertCircle, Zap, Upload, Globe } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { toast } from 'sonner@2.0.3';

type Step = 'idle' | 'uploading' | 'publishing' | 'done' | 'error';

export default function FixMyLogo() {
  const [step, setStep] = useState<Step>('idle');
  const [message, setMessage] = useState('');
  const [localLogo, setLocalLogo] = useState<string | null>(null);
  const [dbLogo, setDbLogo] = useState<string | null>(null);
  const [storageLogo, setStorageLogo] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState('');

  useEffect(() => { checkStatus(); }, []);

  const checkStatus = async () => {
    // Check localStorage
    try {
      const stored = localStorage.getItem('company_branding_profile');
      if (stored) {
        const p = JSON.parse(stored);
        const logo = p.logo_url || p.logo_primary || p.logoPrimary;
        setLocalLogo(logo || null);
        setCompanyName(p.company_name || p.dbaName || '');
      }
    } catch {}

    // Check database + current public branding
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: companies } = await supabase
          .from('companies')
          .select('company_name, logo_primary, logo_url')
          .order('created_at', { ascending: false })
          .limit(1);
        if (companies && companies[0]) {
          const logo = companies[0].logo_primary || companies[0].logo_url;
          setDbLogo(logo || null);
          if (companies[0].company_name) setCompanyName(companies[0].company_name);
        }
      }
    } catch {}

    // Check what the live site public endpoint returns
    try {
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/public/branding`,
        { headers: { Authorization: `Bearer ${publicAnonKey}` } }
      );
      if (res.ok) {
        const data = await res.json();
        const logo = data.logo_url || data.logo_primary;
        setStorageLogo(logo && !logo.startsWith('data:') ? logo : null);
      }
    } catch {}
  };

  const fixLogo = async () => {
    setStep('uploading');
    setMessage('Finding your logo...');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Please log in first');

      // Get logo — prefer database, fall back to localStorage
      let logoBase64 = dbLogo || localLogo;
      if (!logoBase64) throw new Error('No logo found. Please upload your logo in Brand Settings first.');

      // If it's already a storage URL (not base64), just publish it
      if (!logoBase64.startsWith('data:')) {
        setStep('publishing');
        setMessage('Logo is already a URL — publishing to live site...');
        await publishUrl(logoBase64);
        return;
      }

      // Upload base64 to Supabase Storage
      setMessage('Uploading logo to permanent storage...');
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/logo/upload`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${publicAnonKey}` },
          body: JSON.stringify({ logo_base64: logoBase64, filename: 'company-logo.png' }),
        }
      );

      const data = await res.json();
      if (!res.ok || !data.logo_url) throw new Error(data.error || 'Storage upload failed');

      await publishUrl(data.logo_url);
    } catch (err: any) {
      setStep('error');
      setMessage(err.message);
      toast.error(err.message);
    }
  };

  const publishUrl = async (url: string) => {
    setStep('publishing');
    setMessage('Publishing to live site...');

    // Write to public_branding_profile in KV table
    await supabase.from('kv_store_57095a78').upsert(
      { key: 'public_branding_profile', value: { company_name: companyName, logo_url: url, logo_primary: url, primary_color: '#ea580c' } },
      { onConflict: 'key' }
    );

    // Bust server cache
    await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/public/branding/refresh`,
      { method: 'POST', headers: { Authorization: `Bearer ${publicAnonKey}`, 'Content-Type': 'application/json' } }
    );

    // Update localStorage too
    const profile = JSON.parse(localStorage.getItem('company_branding_profile') || '{}');
    profile.logo_url = url;
    profile.logo_primary = url;
    localStorage.setItem('company_branding_profile', JSON.stringify(profile));
    window.dispatchEvent(new Event('brandingUpdated'));

    setStorageLogo(url);
    setStep('done');
    setMessage('Your logo is now live on www.theblackphoenixcompany.com!');
    toast.success('Logo is now live on all devices!');
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center p-4">
      <div className="max-w-lg w-full space-y-4">
        <div className="bg-[#1A1A1A] border-2 border-orange-500/30 rounded-2xl p-8">
          <div className="flex items-center gap-3 mb-2">
            <Zap className="w-7 h-7 text-orange-400" />
            <h1 className="text-2xl font-bold">Fix Logo on Live Site</h1>
          </div>
          <p className="text-sm text-gray-400 mb-6">
            Uploads your logo to permanent storage so it appears at <span className="text-orange-400">www.theblackphoenixcompany.com</span> on every device.
          </p>

          {/* Status rows */}
          <div className="space-y-3 mb-6">
            <StatusRow
              label="Logo in your browser"
              ok={!!localLogo}
              logo={localLogo}
              okText="Found"
              failText="Not found"
            />
            <StatusRow
              label="Logo in database"
              ok={!!dbLogo}
              logo={dbLogo}
              okText="Found"
              failText="Not found — upload in Brand Settings"
            />
            <StatusRow
              label="Logo on live site"
              ok={!!storageLogo}
              logo={storageLogo}
              okText="Live ✓"
              failText="Missing — click Fix below"
            />
          </div>

          {step === 'done' ? (
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-green-400 shrink-0" />
              <p className="text-sm text-green-300">{message}</p>
            </div>
          ) : step === 'error' ? (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3 mb-4">
              <AlertCircle className="w-6 h-6 text-red-400 shrink-0" />
              <p className="text-sm text-red-300">{message}</p>
            </div>
          ) : (step === 'uploading' || step === 'publishing') ? (
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 flex items-center gap-3 mb-4">
              <RefreshCw className="w-5 h-5 text-orange-400 animate-spin shrink-0" />
              <p className="text-sm text-orange-300">{message}</p>
            </div>
          ) : null}

          {step !== 'done' && (
            <button
              onClick={fixLogo}
              disabled={step === 'uploading' || step === 'publishing'}
              className="w-full mt-2 px-6 py-4 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white rounded-xl font-bold text-base transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {(step === 'uploading' || step === 'publishing') ? (
                <><RefreshCw className="w-5 h-5 animate-spin" /> Working...</>
              ) : (
                <><Globe className="w-5 h-5" /> Publish Logo to Live Site</>
              )}
            </button>
          )}

          <button
            onClick={checkStatus}
            className="w-full mt-3 px-6 py-2 bg-white/5 hover:bg-white/10 text-gray-400 rounded-xl text-sm transition"
          >
            Refresh Status
          </button>
        </div>
      </div>
    </div>
  );
}

function StatusRow({ label, ok, logo, okText, failText }: {
  label: string; ok: boolean; logo: string | null; okText: string; failText: string;
}) {
  return (
    <div className="flex items-center justify-between bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-3">
      <div className="flex items-center gap-3">
        {logo ? (
          <img src={logo} alt="" className="w-10 h-10 object-contain bg-white/5 rounded-lg p-1 shrink-0" />
        ) : (
          <div className="w-10 h-10 bg-white/5 rounded-lg shrink-0" />
        )}
        <span className="text-sm text-gray-300">{label}</span>
      </div>
      <span className={`text-xs font-semibold ${ok ? 'text-green-400' : 'text-red-400'}`}>
        {ok ? okText : failText}
      </span>
    </div>
  );
}
