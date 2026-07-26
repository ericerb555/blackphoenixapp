import { useState, useEffect } from 'react';
import { Target, Copy, CheckCircle, ExternalLink, Info, AlertCircle, Code, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '../utils/supabase/info';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;
const authHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${publicAnonKey}` };

interface PixelConfig {
  facebookPixelId: string;
  googleAdsId: string;
  googleAnalyticsId: string;
  tiktokPixelId: string;
  snapchatPixelId: string;
}

const DEFAULT: PixelConfig = { facebookPixelId: '', googleAdsId: '', googleAnalyticsId: '', tiktokPixelId: '', snapchatPixelId: '' };

function load(): PixelConfig {
  try { return { ...DEFAULT, ...JSON.parse(localStorage.getItem('retargeting_pixels') || '{}') }; } catch { return DEFAULT; }
}

function persist(cfg: PixelConfig) {
  localStorage.setItem('retargeting_pixels', JSON.stringify(cfg));
  // Mirror to server so pixel IDs are durable and shared across devices.
  fetch(`${SERVER}/retargeting-pixels`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ config: cfg }),
  }).catch((err) => console.error('[RetargetingPixelSetup] server save failed:', err));
}

const PLATFORMS = [
  {
    key: 'facebookPixelId' as keyof PixelConfig,
    name: 'Meta (Facebook) Pixel',
    logo: '📘',
    placeholder: 'e.g. 1234567890123456',
    helpUrl: 'https://www.facebook.com/business/help/952192354843755',
    helpText: 'Find in Events Manager → Pixels',
    color: 'border-blue-500/30 bg-blue-500/5',
    activeColor: 'border-blue-500 bg-blue-500/10',
    format: /^\d{15,16}$/,
    codeSnippet: (id: string) => `<!-- Meta Pixel Code -->
<script>
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${id}');
fbq('track', 'PageView');
</script>
<!-- End Meta Pixel Code -->`,
  },
  {
    key: 'googleAdsId' as keyof PixelConfig,
    name: 'Google Ads Conversion',
    logo: '🟡',
    placeholder: 'e.g. AW-123456789',
    helpUrl: 'https://support.google.com/google-ads/answer/6095821',
    helpText: 'Find in Tools → Measurement → Conversions',
    color: 'border-yellow-500/30 bg-yellow-500/5',
    activeColor: 'border-yellow-500 bg-yellow-500/10',
    format: /^AW-\d+$/,
    codeSnippet: (id: string) => `<!-- Google Ads Conversion Tracking -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${id}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '${id}');
</script>`,
  },
  {
    key: 'googleAnalyticsId' as keyof PixelConfig,
    name: 'Google Analytics 4',
    logo: '📊',
    placeholder: 'e.g. G-XXXXXXXXXX',
    helpUrl: 'https://support.google.com/analytics/answer/9304153',
    helpText: 'Find in Admin → Data Streams',
    color: 'border-orange-500/30 bg-orange-500/5',
    activeColor: 'border-orange-500 bg-orange-500/10',
    format: /^G-[A-Z0-9]+$/,
    codeSnippet: (id: string) => `<!-- Google Analytics 4 -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${id}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '${id}');
</script>`,
  },
  {
    key: 'tiktokPixelId' as keyof PixelConfig,
    name: 'TikTok Pixel',
    logo: '🎵',
    placeholder: 'e.g. CXXXXXXXXXXXXXXXXXXXXXX',
    helpUrl: 'https://ads.tiktok.com/help/article/tiktok-pixel',
    helpText: 'Find in TikTok Ads Manager → Assets → Events',
    color: 'border-pink-500/30 bg-pink-500/5',
    activeColor: 'border-pink-500 bg-pink-500/10',
    format: /^C[A-Z0-9]{20,}/,
    codeSnippet: (id: string) => `<!-- TikTok Pixel Code -->
<script>
!function (w, d, t) {
  w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];
  ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"];
  ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};
  for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);
  ttq.load('${id}'); ttq.page();
}(window, document, 'ttq');
</script>
<!-- End TikTok Pixel Code -->`,
  },
  {
    key: 'snapchatPixelId' as keyof PixelConfig,
    name: 'Snapchat Pixel',
    logo: '👻',
    placeholder: 'e.g. a1b2c3d4-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    helpUrl: 'https://businesshelp.snapchat.com/s/article/pixel-website-install',
    helpText: 'Find in Snap Ads Manager → Events Manager',
    color: 'border-yellow-400/30 bg-yellow-400/5',
    activeColor: 'border-yellow-400 bg-yellow-400/10',
    format: /^[a-f0-9-]{30,}$/i,
    codeSnippet: (id: string) => `<!-- Snap Pixel Code -->
<script type='text/javascript'>
(function(e,t,n){if(e.snaptr)return;var a=e.snaptr=function(){a.handleRequest?a.handleRequest.apply(a,arguments):a.queue.push(arguments)};a.queue=[];var s='script';r=t.createElement(s);r.async=!0;r.src=n;var u=t.getElementsByTagName(s)[0];u.parentNode.insertBefore(r,u);})(window,document,'https://sc-static.net/scevent.min.js');
snaptr('init', '${id}', {'user_email': '__INSERT_USER_EMAIL__'});
snaptr('track', 'PAGE_VIEW');
</script>
<!-- End Snap Pixel Code -->`,
  },
];

export default function RetargetingPixelSetup() {
  const [config, setConfig] = useState<PixelConfig>(load);
  const [showCode, setShowCode] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState(false);

  // Load saved pixel IDs from the server (falls back to the localStorage cache).
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${SERVER}/retargeting-pixels`, { headers: authHeaders });
        const json = await res.json();
        if (json.success && json.config) {
          setConfig({ ...DEFAULT, ...json.config });
          localStorage.setItem('retargeting_pixels', JSON.stringify(json.config));
        }
      } catch (err) {
        console.error('[RetargetingPixelSetup] Error loading pixels from server:', err);
      }
    })();
  }, []);

  function update(key: keyof PixelConfig, val: string) {
    setConfig(c => ({ ...c, [key]: val }));
    setSaved(false);
  }

  function saveAll() {
    persist(config);
    setSaved(true);
    toast.success('Pixel IDs saved!');
    setTimeout(() => setSaved(false), 3000);
  }

  function copyCode(key: string, code: string) {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(c => ({ ...c, [key]: true }));
      setTimeout(() => setCopied(c => ({ ...c, [key]: false })), 2000);
      toast.success('Snippet copied to clipboard!');
    });
  }

  function toggleCode(key: string) {
    setShowCode(s => ({ ...s, [key]: !s[key] }));
  }

  const configuredCount = PLATFORMS.filter(p => config[p.key]?.trim()).length;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
            <Target className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Retargeting Pixel Setup</h1>
            <p className="text-sm text-gray-400">Store your ad pixel IDs and generate tracking snippets</p>
          </div>
        </div>
        <button onClick={saveAll}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition ${saved ? 'bg-emerald-600 text-white' : 'bg-orange-600 hover:bg-orange-500 text-white'}`}>
          {saved ? <><CheckCircle className="w-4 h-4" /> Saved</> : 'Save All'}
        </button>
      </div>

      {/* Status */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-[#111] border border-[#222] rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-white">{configuredCount}</p>
          <p className="text-xs text-gray-500 mt-0.5">Pixels Configured</p>
        </div>
        <div className="bg-[#111] border border-[#222] rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-white">{PLATFORMS.length - configuredCount}</p>
          <p className="text-xs text-gray-500 mt-0.5">Not Set Up</p>
        </div>
        <div className="bg-[#111] border border-[#222] rounded-xl p-4 text-center">
          <p className={`text-2xl font-bold ${configuredCount > 0 ? 'text-emerald-400' : 'text-gray-600'}`}>
            {configuredCount > 0 ? 'Ready' : 'None'}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">Status</p>
        </div>
      </div>

      {/* How it works */}
      <div className="bg-[#0d1a2a] border border-blue-900/30 rounded-xl p-4 mb-6 flex gap-3">
        <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-gray-400">
          <p className="text-blue-300 font-semibold mb-1">How to use</p>
          <p>Enter your pixel IDs below and click Save. Then copy the generated code snippet and paste it into the <code className="text-orange-300">&lt;head&gt;</code> of your website (blackphoenixbuilds.com). This lets ad platforms track visitors and retarget them on Facebook, Google, TikTok, and Snapchat.</p>
        </div>
      </div>

      {/* Platforms */}
      <div className="space-y-4">
        {PLATFORMS.map(p => {
          const val = config[p.key] || '';
          const isSet = val.trim().length > 0;
          const isValid = !val || p.format.test(val.trim());
          const snippet = isSet ? p.codeSnippet(val.trim()) : '';

          return (
            <div key={p.key} className={`border rounded-2xl overflow-hidden transition ${isSet ? p.activeColor : p.color}`}>
              <div className="px-5 py-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">{p.logo}</span>
                    <div>
                      <p className="font-semibold text-white text-sm">{p.name}</p>
                      <p className="text-xs text-gray-500">{p.helpText}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isSet && !isValid && (
                      <div className="flex items-center gap-1 text-yellow-400 text-xs">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Check format
                      </div>
                    )}
                    {isSet && isValid && <CheckCircle className="w-4 h-4 text-emerald-400" />}
                    <a href={p.helpUrl} target="_blank" rel="noopener noreferrer"
                      className="text-gray-600 hover:text-gray-300 transition">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>

                <input
                  type="text"
                  value={val}
                  onChange={e => update(p.key, e.target.value)}
                  placeholder={p.placeholder}
                  className="w-full bg-[#0e0e0e] border border-[#2a2a2a] rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500 transition font-mono"
                />

                {isSet && isValid && (
                  <div className="mt-3 flex items-center gap-2">
                    <button onClick={() => toggleCode(p.key)}
                      className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition">
                      {showCode[p.key] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      {showCode[p.key] ? 'Hide' : 'Show'} Code Snippet
                    </button>
                    <button onClick={() => copyCode(p.key, snippet)}
                      className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition">
                      {copied[p.key] ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied[p.key] ? 'Copied!' : 'Copy Snippet'}
                    </button>
                  </div>
                )}

                {showCode[p.key] && snippet && (
                  <pre className="mt-3 bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-3 text-[10px] text-gray-400 overflow-x-auto font-mono leading-relaxed whitespace-pre-wrap">
                    {snippet}
                  </pre>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Instructions */}
      <div className="mt-6 bg-[#111] border border-[#222] rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <Code className="w-4 h-4 text-orange-400" />
          Installation Guide
        </h3>
        <ol className="text-xs text-gray-400 space-y-2 list-decimal list-inside">
          <li>Enter your pixel ID(s) above and click <strong className="text-white">Save All</strong>.</li>
          <li>Click <strong className="text-white">Show Code Snippet</strong> next to each configured pixel.</li>
          <li>Copy the snippet and paste it inside the <code className="text-orange-300 bg-[#1a1a1a] px-1 rounded">&lt;head&gt;</code> tag of every page on your website.</li>
          <li>If your site uses a website builder (Wix, Squarespace, Webflow), look for <strong className="text-white">Custom Code / Header Code</strong> settings — paste the snippet there.</li>
          <li>Verify installation using the platform's pixel helper browser extension (Facebook Pixel Helper, Google Tag Assistant, etc.).</li>
        </ol>

        <div className="mt-4 p-3 bg-[#1a1a1a] rounded-lg">
          <p className="text-xs text-gray-500">
            <strong className="text-yellow-400">Pro tip:</strong> For best results, install <strong className="text-white">Meta Pixel + Google Analytics 4</strong> first — these give the highest retargeting audience sizes for home services in NH.
          </p>
        </div>
      </div>
    </div>
  );
}
