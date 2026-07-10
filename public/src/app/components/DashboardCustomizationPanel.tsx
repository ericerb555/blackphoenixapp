import { useState, useEffect } from 'react';
import { X, Save, Trash2, Layout, RotateCcw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useCompany } from '../contexts/CompanyContext';

interface DashboardLayout {
  id: string;
  layout_name: string;
  layout_data: any;
  is_default: boolean;
  created_at: string;
}

interface DashboardPreset {
  id: string;
  preset_name: string;
  preset_type: string;
  description: string;
  layout_data: any;
}

interface DashboardCustomizationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DashboardCustomizationPanel({ isOpen, onClose }: DashboardCustomizationPanelProps) {
  const { user } = useAuth();
  const companyContext = useCompany();
  const activeCompany = companyContext?.activeCompany || null;
  const [layouts, setLayouts] = useState<DashboardLayout[]>([]);
  const [presets, setPresets] = useState<DashboardPreset[]>([]);
  const [newLayoutName, setNewLayoutName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && user && activeCompany) {
      fetchLayouts();
      fetchPresets();
    }
  }, [isOpen, user, activeCompany]);

  const fetchLayouts = async () => {
    if (!user || !activeCompany) return;

    try {
      const { data, error } = await supabase
        .from('dashboard_layouts')
        .select('*')
        .eq('company_id', activeCompany.id)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching layouts:', error);
      } else {
        setLayouts(data || []);
      }
    } catch (error) {
      console.error('Error fetching layouts:', error);
    }
  };

  const fetchPresets = async () => {
    if (!activeCompany) return;

    try {
      const { data, error } = await supabase
        .from('dashboard_presets')
        .select('*')
        .eq('company_id', activeCompany.id)
        .order('preset_name');

      if (error) {
        console.error('Error fetching presets:', error);
      } else {
        setPresets(data || []);
      }
    } catch (error) {
      console.error('Error fetching presets:', error);
    }
  };

  const createLayout = async () => {
    if (!user || !activeCompany || !newLayoutName.trim()) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('dashboard_layouts')
        .insert({
          company_id: activeCompany.id,
          user_id: user.id,
          layout_name: newLayoutName,
          layout_data: {
            widgets: ['quick-actions', 'navigation', 'status', 'activity'],
            columns: 3
          },
          is_default: false
        });

      if (error) {
        console.error('Error creating layout:', error);
      } else {
        setNewLayoutName('');
        await fetchLayouts();
      }
    } catch (error) {
      console.error('Error creating layout:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteLayout = async (layoutId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('dashboard_layouts')
        .delete()
        .eq('id', layoutId);

      if (error) {
        console.error('Error deleting layout:', error);
      } else {
        await fetchLayouts();
      }
    } catch (error) {
      console.error('Error deleting layout:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyPreset = async (presetId: string) => {
    if (!user || !activeCompany) return;

    setLoading(true);
    try {
      const preset = presets.find(p => p.id === presetId);
      if (!preset) return;

      const { error } = await supabase
        .from('dashboard_layouts')
        .insert({
          company_id: activeCompany.id,
          user_id: user.id,
          layout_name: `${preset.preset_name} (Applied)`,
          layout_data: preset.layout_data,
          is_default: false
        });

      if (error) {
        console.error('Error applying preset:', error);
      } else {
        await fetchLayouts();
      }
    } catch (error) {
      console.error('Error applying preset:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center space-x-3">
            <Layout className="w-6 h-6 text-slate-700" />
            <h2 className="text-xl font-semibold text-slate-900">Dashboard Customization</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          {/* Create New Layout */}
          <div className="mb-6">
            <h3 className="font-medium text-slate-900 mb-3">Create New Layout</h3>
            <div className="flex space-x-3">
              <input
                type="text"
                value={newLayoutName}
                onChange={(e) => setNewLayoutName(e.target.value)}
                placeholder="Enter layout name..."
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={createLayout}
                disabled={!newLayoutName.trim() || loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <Save className="w-4 h-4" />
                <span>Create</span>
              </button>
            </div>
          </div>

          {/* Saved Layouts */}
          <div className="mb-6">
            <h3 className="font-medium text-slate-900 mb-3">Your Saved Layouts</h3>
            {layouts.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 rounded-lg">
                <Layout className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">No saved layouts yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {layouts.map((layout) => (
                  <div
                    key={layout.id}
                    className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:border-slate-300 transition-colors"
                  >
                    <div>
                      <div className="font-medium text-slate-900">{layout.layout_name}</div>
                      <div className="text-xs text-slate-500">
                        Created {new Date(layout.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <button
                      onClick={() => deleteLayout(layout.id)}
                      disabled={loading}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Presets */}
          <div className="mb-6">
            <h3 className="font-medium text-slate-900 mb-3">Apply Preset</h3>
            {presets.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 rounded-lg">
                <RotateCcw className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">No presets available</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {presets.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => applyPreset(preset.id)}
                    disabled={loading}
                    className="p-4 border border-slate-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
                  >
                    <div className="font-medium text-slate-900">{preset.preset_name}</div>
                    {preset.description && (
                      <div className="text-xs text-slate-500 mt-1">{preset.description}</div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Restore Default */}
          <div className="pt-4 border-t border-slate-200">
            <button
              onClick={onClose}
              className="w-full px-4 py-3 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors flex items-center justify-center space-x-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Close</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
