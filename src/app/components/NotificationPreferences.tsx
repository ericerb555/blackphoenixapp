/**
 * Notification Preferences Component
 * 
 * Allows stakeholders to configure their notification settings:
 * - Which notification types to receive
 * - Delivery channels (in-app, email, SMS)
 * - Frequency settings
 * - Quiet hours
 */

import { useState, useEffect } from 'react';
import {
  Bell, Mail, Phone, Clock, Check, X, Save, RefreshCw,
  AlertCircle, CheckCircle, Info, AlertTriangle, DollarSign,
  FileText, Calendar, MessageSquare, Settings
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner@2.0.3';

interface NotificationPreference {
  stakeholder_id: string;
  notification_types: {
    [key: string]: {
      enabled: boolean;
      in_app: boolean;
      email: boolean;
      sms: boolean;
    };
  };
  quiet_hours: {
    enabled: boolean;
    start_time: string;
    end_time: string;
  };
  frequency: 'instant' | 'hourly' | 'daily' | 'weekly';
  updated_at: string;
}

interface NotificationPreferencesProps {
  stakeholderId: string;
  onClose?: () => void;
}

const notificationTypes = [
  { id: 'info', name: 'General Information', icon: Info, description: 'Updates and general notices' },
  { id: 'message', name: 'Messages', icon: MessageSquare, description: 'Direct messages from admins' },
  { id: 'task', name: 'Tasks', icon: CheckCircle, description: 'Task assignments and updates' },
  { id: 'payment', name: 'Payments', icon: DollarSign, description: 'Payment reminders and invoices' },
  { id: 'schedule', name: 'Schedule', icon: Calendar, description: 'Meetings and appointments' },
  { id: 'document', name: 'Documents', icon: FileText, description: 'New documents and files' },
  { id: 'alert', name: 'Alerts', icon: AlertCircle, description: 'Important alerts and warnings' },
  { id: 'warning', name: 'Warnings', icon: AlertTriangle, description: 'Warning notices' },
  { id: 'success', name: 'Confirmations', icon: CheckCircle, description: 'Success confirmations' }
];

export default function NotificationPreferences({ stakeholderId, onClose }: NotificationPreferencesProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreference | null>(null);

  useEffect(() => {
    loadPreferences();
  }, [stakeholderId]);

  const loadPreferences = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('stakeholder_id', stakeholderId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setPreferences(data);
      } else {
        // Create default preferences
        setPreferences(getDefaultPreferences());
      }
    } catch (error: any) {
      console.error('Error loading preferences:', error);
      toast.error('Failed to load preferences');
      setPreferences(getDefaultPreferences());
    } finally {
      setLoading(false);
    }
  };

  const getDefaultPreferences = (): NotificationPreference => {
    const defaultTypes: any = {};
    notificationTypes.forEach(type => {
      defaultTypes[type.id] = {
        enabled: true,
        in_app: true,
        email: false,
        sms: false
      };
    });

    return {
      stakeholder_id: stakeholderId,
      notification_types: defaultTypes,
      quiet_hours: {
        enabled: false,
        start_time: '22:00',
        end_time: '08:00'
      },
      frequency: 'instant',
      updated_at: new Date().toISOString()
    };
  };

  const toggleType = (typeId: string, enabled: boolean) => {
    if (!preferences) return;

    setPreferences({
      ...preferences,
      notification_types: {
        ...preferences.notification_types,
        [typeId]: {
          ...preferences.notification_types[typeId],
          enabled
        }
      }
    });
  };

  const toggleChannel = (typeId: string, channel: 'in_app' | 'email' | 'sms', enabled: boolean) => {
    if (!preferences) return;

    setPreferences({
      ...preferences,
      notification_types: {
        ...preferences.notification_types,
        [typeId]: {
          ...preferences.notification_types[typeId],
          [channel]: enabled
        }
      }
    });
  };

  const updateQuietHours = (field: 'enabled' | 'start_time' | 'end_time', value: any) => {
    if (!preferences) return;

    setPreferences({
      ...preferences,
      quiet_hours: {
        ...preferences.quiet_hours,
        [field]: value
      }
    });
  };

  const savePreferences = async () => {
    if (!preferences) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('notification_preferences')
        .upsert({
          ...preferences,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      toast.success('Preferences saved successfully');
      
      if (onClose) {
        setTimeout(onClose, 500);
      }
    } catch (error: any) {
      console.error('Error saving preferences:', error);
      toast.error('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#ea580c]"></div>
      </div>
    );
  }

  if (!preferences) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400">Unable to load preferences</p>
      </div>
    );
  }

  return (
    <div className="bg-[#0A0A0A] text-white">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-white/10 bg-white/5">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-[#ea580c]/20 rounded-xl">
            <Settings size={24} className="text-[#ea580c]" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Notification Preferences</h2>
            <p className="text-sm text-gray-400">Customize how you receive notifications</p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-400" />
          </button>
        )}
      </div>

      <div className="p-6 space-y-6 max-h-[600px] overflow-y-auto">
        {/* Notification Types */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Notification Types</h3>
          <div className="space-y-3">
            {notificationTypes.map(type => {
              const typePrefs = preferences.notification_types[type.id] || {
                enabled: true,
                in_app: true,
                email: false,
                sms: false
              };
              const Icon = type.icon;

              return (
                <div
                  key={type.id}
                  className="p-4 bg-white/5 border border-white/10 rounded-lg"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className={`p-2 rounded-lg ${typePrefs.enabled ? 'bg-[#ea580c]/20 text-[#ea580c]' : 'bg-gray-500/20 text-gray-400'}`}>
                      <Icon size={20} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium text-white">{type.name}</h4>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={typePrefs.enabled}
                            onChange={(e) => toggleType(type.id, e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#ea580c] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#ea580c]"></div>
                        </label>
                      </div>
                      <p className="text-sm text-gray-400">{type.description}</p>
                    </div>
                  </div>

                  {typePrefs.enabled && (
                    <div className="ml-12 flex items-center gap-4 text-sm">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={typePrefs.in_app}
                          onChange={(e) => toggleChannel(type.id, 'in_app', e.target.checked)}
                          className="w-4 h-4 rounded border-white/20 bg-white/10 text-[#ea580c] focus:ring-[#ea580c]"
                        />
                        <Bell size={16} className="text-gray-400" />
                        <span className="text-gray-300">In-App</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={typePrefs.email}
                          onChange={(e) => toggleChannel(type.id, 'email', e.target.checked)}
                          className="w-4 h-4 rounded border-white/20 bg-white/10 text-[#ea580c] focus:ring-[#ea580c]"
                        />
                        <Mail size={16} className="text-gray-400" />
                        <span className="text-gray-300">Email</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={typePrefs.sms}
                          onChange={(e) => toggleChannel(type.id, 'sms', e.target.checked)}
                          className="w-4 h-4 rounded border-white/20 bg-white/10 text-[#ea580c] focus:ring-[#ea580c]"
                        />
                        <Phone size={16} className="text-gray-400" />
                        <span className="text-gray-300">SMS</span>
                      </label>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Delivery Frequency */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Delivery Frequency</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { id: 'instant', name: 'Instant', description: 'Receive immediately' },
              { id: 'hourly', name: 'Hourly Digest', description: 'Bundled every hour' },
              { id: 'daily', name: 'Daily Digest', description: 'Once per day' },
              { id: 'weekly', name: 'Weekly Digest', description: 'Once per week' }
            ].map(freq => (
              <label
                key={freq.id}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  preferences.frequency === freq.id
                    ? 'border-[#ea580c] bg-[#ea580c]/20'
                    : 'border-white/10 bg-white/5 hover:bg-white/10'
                }`}
              >
                <input
                  type="radio"
                  name="frequency"
                  value={freq.id}
                  checked={preferences.frequency === freq.id}
                  onChange={(e) => setPreferences({ ...preferences, frequency: e.target.value as any })}
                  className="sr-only"
                />
                <div className="font-medium text-white mb-1">{freq.name}</div>
                <div className="text-sm text-gray-400">{freq.description}</div>
              </label>
            ))}
          </div>
        </div>

        {/* Quiet Hours */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Quiet Hours</h3>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.quiet_hours.enabled}
                onChange={(e) => updateQuietHours('enabled', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#ea580c] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#ea580c]"></div>
            </label>
          </div>

          {preferences.quiet_hours.enabled && (
            <div className="grid grid-cols-2 gap-4 p-4 bg-white/5 border border-white/10 rounded-lg">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Start Time</label>
                <input
                  type="time"
                  value={preferences.quiet_hours.start_time}
                  onChange={(e) => updateQuietHours('start_time', e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ea580c]"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">End Time</label>
                <input
                  type="time"
                  value={preferences.quiet_hours.end_time}
                  onChange={(e) => updateQuietHours('end_time', e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ea580c]"
                />
              </div>
              <p className="col-span-2 text-sm text-gray-400">
                <Clock size={14} className="inline mr-1" />
                No notifications will be sent during these hours
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between p-6 border-t border-white/10 bg-white/5">
        <button
          onClick={loadPreferences}
          className="px-4 py-2 text-gray-400 hover:text-white transition-colors flex items-center gap-2"
        >
          <RefreshCw size={18} />
          Reset
        </button>
        <button
          onClick={savePreferences}
          disabled={saving}
          className="px-6 py-3 bg-gradient-to-r from-[#ea580c] to-[#c2410c] hover:from-[#c2410c] hover:to-[#9a3412] text-white rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
              Saving...
            </>
          ) : (
            <>
              <Save size={18} />
              Save Preferences
            </>
          )}
        </button>
      </div>
    </div>
  );
}
