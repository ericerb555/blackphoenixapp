import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

/** Same fallback RoleSwitcher carries, for the same reason: the real owner
 *  stays able to work while the ownership tables are loading or unavailable. */
const OWNER_EMAILS = ['ericerb555@proton.me'];

interface Theme {
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  error: string;
  success: string;
  warning: string;
}

interface ThemeContextType {
  theme: Theme;
  mode: 'light' | 'dark';
  toggleMode: () => void;
  setCustomTheme: (theme: Partial<Theme>) => void;
}

const defaultDarkTheme: Theme = {
  primary: '#ea580c',
  secondary: '#dc2626',
  background: '#0A0A0A',
  surface: '#18181b',
  text: '#ffffff',
  textSecondary: '#a1a1aa',
  border: '#27272a',
  error: '#ef4444',
  success: '#10b981',
  warning: '#f59e0b',
};

const defaultLightTheme: Theme = {
  primary: '#ea580c',
  secondary: '#dc2626',
  background: '#ffffff',
  surface: '#f9fafb',
  text: '#0A0A0A',
  textSecondary: '#6b7280',
  border: '#e5e7eb',
  error: '#ef4444',
  success: '#10b981',
  warning: '#f59e0b',
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<'light' | 'dark'>('dark');
  const [theme, setTheme] = useState<Theme>(defaultDarkTheme);

  useEffect(() => {
    // Load saved theme from localStorage
    const savedMode = localStorage.getItem('theme-mode') as 'light' | 'dark' | null;
    const savedTheme = localStorage.getItem('custom-theme');

    if (savedMode) {
      setMode(savedMode);
      setTheme(savedMode === 'dark' ? defaultDarkTheme : defaultLightTheme);
    }

    if (savedTheme) {
      try {
        const parsedTheme = JSON.parse(savedTheme);
        setTheme(prev => ({ ...prev, ...parsedTheme }));
      } catch (error) {
        console.error('Failed to parse saved theme:', error);
      }
    }
  }, []);

  useEffect(() => {
    // Apply theme to document
    const root = document.documentElement;
    Object.entries(theme).forEach(([key, value]) => {
      root.style.setProperty(`--theme-${key}`, value);
    });
  }, [theme]);

  const toggleMode = () => {
    const newMode = mode === 'dark' ? 'light' : 'dark';
    setMode(newMode);
    setTheme(newMode === 'dark' ? defaultDarkTheme : defaultLightTheme);
    localStorage.setItem('theme-mode', newMode);
  };

  const setCustomTheme = (customTheme: Partial<Theme>) => {
    const newTheme = { ...theme, ...customTheme };
    setTheme(newTheme);
    localStorage.setItem('custom-theme', JSON.stringify(customTheme));
  };

  return (
    <ThemeContext.Provider value={{ theme, mode, toggleMode, setCustomTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// Theme Manager Component
export function ThemeManager() {
  const { theme, mode, toggleMode, setCustomTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  /*
   * OWNER AND ADMIN ONLY.
   *
   * This had no gate of any kind. It renders from App's global tree, so every
   * visitor on every page — a resident looking up a plumber, a customer
   * approving a quote — got a floating button that opens an editor for the
   * application's colour palette. Found by the 390px device sweep, which was
   * looking for a third floating control and found a permissions question.
   *
   * The same test RoleSwitcher uses, deliberately: one idea of who staff are,
   * including the email fallback that keeps the real owner working while the
   * ownership tables are still loading.
   *
   * NOTE: only the button and the panel are gated. `ThemeProvider` above is
   * untouched and still runs for everybody — it is what APPLIES the theme, and
   * gating it would leave every visitor unstyled.
   */
  const { isOwner, isAdmin, user: authUser } = useAuth();
  const authEmail = String(authUser?.email || '').trim().toLowerCase();
  const canUse = isOwner || isAdmin || OWNER_EMAILS.includes(authEmail);
  if (!canUse) return null;

  const ColorPicker = ({ label, value, onChange }: { label: string; value: string; onChange: (color: string) => void }) => (
    <div className="flex items-center gap-3">
      <label className="text-sm text-zinc-400 w-24">{label}</label>
      <div className="flex items-center gap-2 flex-1">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-10 h-10 rounded border border-zinc-700 cursor-pointer"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#ea580c]"
        />
      </div>
    </div>
  );

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        /*
         * `hidden sm:flex` — not on a phone.
         *
         * This is the THIRD fixed control in the bottom-right corner at 390px,
         * under the chat widget and beside the store button, on every page.
         * Found by the device sweep, which could see what was on screen where
         * a file-by-file read could not.
         *
         * Of the three this is the easiest call: it opens a colour editor for
         * the theme. That is a thing you do once at a desk, not something a
         * resident needs while looking up a plumber.
         */
        className="hidden sm:flex fixed bottom-6 right-6 w-12 h-12 bg-[#ea580c] rounded-full shadow-lg hover:bg-[#dc2626] transition-colors items-center justify-center z-50"
        style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
        title="Theme Settings"
      >
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
        </svg>
      </button>

      {/* Theme Panel */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6">
          <div className="bg-[#0A0A0A] border border-zinc-800 rounded-lg shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white">Theme Settings</h2>
                <p className="text-sm text-zinc-500 mt-1">Customize your application theme</p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-zinc-800 rounded transition-colors"
              >
                <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Mode Toggle */}
              <div>
                <h3 className="text-sm font-semibold text-white mb-3">Mode</h3>
                <button
                  onClick={toggleMode}
                  className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-lg flex items-center justify-between hover:bg-zinc-800 transition-colors"
                >
                  <span className="text-white">{mode === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
                  <div className={`w-12 h-6 rounded-full relative transition-colors ${
                    mode === 'dark' ? 'bg-[#ea580c]' : 'bg-zinc-700'
                  }`}>
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                      mode === 'dark' ? 'translate-x-7' : 'translate-x-1'
                    }`} />
                  </div>
                </button>
              </div>

              {/* Color Customization */}
              <div>
                <h3 className="text-sm font-semibold text-white mb-3">Colors</h3>
                <div className="space-y-3">
                  <ColorPicker
                    label="Primary"
                    value={theme.primary}
                    onChange={(color) => setCustomTheme({ primary: color })}
                  />
                  <ColorPicker
                    label="Secondary"
                    value={theme.secondary}
                    onChange={(color) => setCustomTheme({ secondary: color })}
                  />
                  <ColorPicker
                    label="Background"
                    value={theme.background}
                    onChange={(color) => setCustomTheme({ background: color })}
                  />
                  <ColorPicker
                    label="Surface"
                    value={theme.surface}
                    onChange={(color) => setCustomTheme({ surface: color })}
                  />
                </div>
              </div>

              {/* Presets */}
              <div>
                <h3 className="text-sm font-semibold text-white mb-3">Presets</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <button
                    onClick={() => setCustomTheme({ primary: '#ea580c', secondary: '#dc2626' })}
                    className="p-3 bg-zinc-900 border border-zinc-800 rounded-lg hover:bg-zinc-800 transition-colors"
                  >
                    <div className="w-full h-8 bg-gradient-to-r from-[#ea580c] to-[#dc2626] rounded mb-2" />
                    <span className="text-xs text-white">Orange</span>
                  </button>
                  <button
                    onClick={() => setCustomTheme({ primary: '#3b82f6', secondary: '#1d4ed8' })}
                    className="p-3 bg-zinc-900 border border-zinc-800 rounded-lg hover:bg-zinc-800 transition-colors"
                  >
                    <div className="w-full h-8 bg-gradient-to-r from-blue-500 to-blue-700 rounded mb-2" />
                    <span className="text-xs text-white">Blue</span>
                  </button>
                  <button
                    onClick={() => setCustomTheme({ primary: '#10b981', secondary: '#059669' })}
                    className="p-3 bg-zinc-900 border border-zinc-800 rounded-lg hover:bg-zinc-800 transition-colors"
                  >
                    <div className="w-full h-8 bg-gradient-to-r from-green-500 to-green-600 rounded mb-2" />
                    <span className="text-xs text-white">Green</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-zinc-800 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setCustomTheme(mode === 'dark' ? defaultDarkTheme : defaultLightTheme);
                }}
                className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded text-white hover:bg-zinc-800 transition-colors"
              >
                Reset to Default
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 bg-[#ea580c] text-white rounded hover:bg-[#dc2626] transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
