import { useState, ReactNode } from 'react';
import { Settings, X, Eye, EyeOff, LayoutGrid, Save, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

interface LayoutManagerProps {
  pageName: string;
  enableCustomization?: boolean;
  showEditButton?: boolean;
  children: ReactNode;
}

interface LayoutConfig {
  compact: boolean;
  sidebarWidth: 'narrow' | 'normal' | 'wide';
  cardStyle: 'default' | 'flat' | 'bordered';
  density: 'comfortable' | 'compact' | 'spacious';
}

const DEFAULTS: LayoutConfig = {
  compact: false,
  sidebarWidth: 'normal',
  cardStyle: 'default',
  density: 'comfortable',
};

function getStorageKey(pageName: string) {
  return `layout_config_${pageName.toLowerCase().replace(/\s+/g, '_')}`;
}

function loadConfig(pageName: string): LayoutConfig {
  try {
    const stored = localStorage.getItem(getStorageKey(pageName));
    return stored ? { ...DEFAULTS, ...JSON.parse(stored) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

export default function LayoutManager({
  pageName,
  enableCustomization = false,
  showEditButton = false,
  children,
}: LayoutManagerProps) {
  const [open, setOpen] = useState(false);
  const [config, setConfig] = useState<LayoutConfig>(() => loadConfig(pageName));
  const [draft, setDraft] = useState<LayoutConfig>(config);

  if (!enableCustomization && !showEditButton) {
    return <>{children}</>;
  }

  function save() {
    setConfig(draft);
    localStorage.setItem(getStorageKey(pageName), JSON.stringify(draft));
    toast.success('Layout saved');
    setOpen(false);
  }

  function reset() {
    setDraft(DEFAULTS);
  }

  return (
    <div className="relative">
      {children}

      {showEditButton && (
        <button
          onClick={() => { setDraft(config); setOpen(true); }}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-2.5 bg-[#1A1A1A] hover:bg-[#252525] border border-[#333] text-gray-300 hover:text-white text-sm font-semibold rounded-xl shadow-xl transition-all"
          title={`Customize ${pageName} layout`}
        >
          <LayoutGrid className="w-4 h-4" />
          Layout
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-base font-bold text-white">Layout Settings</h3>
                <p className="text-xs text-gray-500 mt-0.5">{pageName}</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-white transition">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Density</p>
                <div className="grid grid-cols-3 gap-2">
                  {(['comfortable', 'compact', 'spacious'] as const).map(d => (
                    <button
                      key={d}
                      onClick={() => setDraft(v => ({ ...v, density: d }))}
                      className={`py-2 rounded-lg text-xs font-semibold transition capitalize border ${
                        draft.density === d
                          ? 'bg-orange-600/20 border-orange-500/40 text-orange-300'
                          : 'bg-[#111] border-[#2A2A2A] text-gray-400 hover:text-white hover:border-[#3A3A3A]'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Card Style</p>
                <div className="grid grid-cols-3 gap-2">
                  {(['default', 'flat', 'bordered'] as const).map(s => (
                    <button
                      key={s}
                      onClick={() => setDraft(v => ({ ...v, cardStyle: s }))}
                      className={`py-2 rounded-lg text-xs font-semibold transition capitalize border ${
                        draft.cardStyle === s
                          ? 'bg-orange-600/20 border-orange-500/40 text-orange-300'
                          : 'bg-[#111] border-[#2A2A2A] text-gray-400 hover:text-white hover:border-[#3A3A3A]'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Sidebar Width</p>
                <div className="grid grid-cols-3 gap-2">
                  {(['narrow', 'normal', 'wide'] as const).map(w => (
                    <button
                      key={w}
                      onClick={() => setDraft(v => ({ ...v, sidebarWidth: w }))}
                      className={`py-2 rounded-lg text-xs font-semibold transition capitalize border ${
                        draft.sidebarWidth === w
                          ? 'bg-orange-600/20 border-orange-500/40 text-orange-300'
                          : 'bg-[#111] border-[#2A2A2A] text-gray-400 hover:text-white hover:border-[#3A3A3A]'
                      }`}
                    >
                      {w}
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="text-sm font-semibold text-white">Compact Mode</p>
                  <p className="text-xs text-gray-500">Reduce padding and spacing globally</p>
                </div>
                <button
                  onClick={() => setDraft(v => ({ ...v, compact: !v.compact }))}
                  className="relative w-10 h-5 rounded-full transition-colors flex-shrink-0"
                  style={{ background: draft.compact ? '#ea580c' : '#2a2a2a' }}
                >
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${draft.compact ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </label>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={reset}
                className="flex items-center gap-1.5 px-3 py-2 text-xs text-gray-400 hover:text-white border border-[#2A2A2A] hover:border-[#3A3A3A] rounded-lg transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>
              <button
                onClick={save}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-orange-600 hover:bg-orange-500 text-white text-sm font-semibold rounded-lg transition"
              >
                <Save className="w-3.5 h-3.5" />
                Save Layout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
