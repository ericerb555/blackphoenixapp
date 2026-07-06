import { useState } from 'react';
import { Brain, Sparkles, Settings, Zap, Shield, TrendingUp, AlertCircle } from 'lucide-react';
import { Select } from './ui/input/Select';
import { TextInput } from './ui/input/TextInput';
import { Checkbox } from './ui/input/Checkbox';

export default function AISettingsSection() {
  const [primaryModel, setPrimaryModel] = useState('GPT-4 Turbo (Recommended)');
  const [apiKey, setApiKey] = useState('••••••••••••••••');
  const [contentGeneration, setContentGeneration] = useState(true);
  const [smartQuotes, setSmartQuotes] = useState(true);
  const [predictiveAnalytics, setPredictiveAnalytics] = useState(true);
  const [automationWorkflows, setAutomationWorkflows] = useState(false);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg">
          <Brain className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">AI Configuration</h3>
          <p className="text-sm text-gray-600">Configure AI models and automation settings</p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Select
            label="Primary AI Model"
            value={primaryModel}
            onChange={setPrimaryModel}
            options={[
              { value: 'GPT-4 Turbo (Recommended)', label: 'GPT-4 Turbo (Recommended)' },
              { value: 'GPT-4', label: 'GPT-4' },
              { value: 'GPT-3.5 Turbo', label: 'GPT-3.5 Turbo' },
              { value: 'Claude 3 Opus', label: 'Claude 3 Opus' },
              { value: 'Claude 3 Sonnet', label: 'Claude 3 Sonnet' }
            ]}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Temperature (Creativity)</label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                defaultValue="0.7"
                className="flex-1"
              />
              <span className="text-sm font-medium text-gray-700 w-12 text-center">0.7</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">Lower = more focused, Higher = more creative</p>
          </div>

          <div className="md:col-span-2">
            <TextInput
              label="API Key"
              type="password"
              value={apiKey}
              onChange={setApiKey}
              placeholder="sk-..."
            />
          </div>
        </div>

        <div className="border-t border-gray-200 pt-6">
          <h4 className="text-sm font-semibold text-gray-900 mb-4">AI Features</h4>
          <div className="space-y-3">
            <label className="flex items-start gap-3 p-4 bg-purple-50 border border-purple-200 rounded-lg cursor-pointer">
              <Checkbox
                checked={contentGeneration}
                onChange={setContentGeneration}
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <p className="font-medium text-gray-900">Content Generation</p>
                </div>
                <p className="text-sm text-gray-600">Generate marketing content, descriptions, and social posts</p>
              </div>
            </label>

            <label className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg cursor-pointer">
              <Checkbox
                checked={smartQuotes}
                onChange={setSmartQuotes}
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Brain className="w-4 h-4 text-blue-600" />
                  <p className="font-medium text-gray-900">Smart Quotes</p>
                </div>
                <p className="text-sm text-gray-600">AI-assisted quote generation and pricing suggestions</p>
              </div>
            </label>

            <label className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-lg cursor-pointer">
              <Checkbox
                checked={predictiveAnalytics}
                onChange={setPredictiveAnalytics}
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <p className="font-medium text-gray-900">Predictive Analytics</p>
                </div>
                <p className="text-sm text-gray-600">Revenue forecasting and business insights</p>
              </div>
            </label>

            <label className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg cursor-pointer">
              <Checkbox
                checked={automationWorkflows}
                onChange={setAutomationWorkflows}
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="w-4 h-4 text-amber-600" />
                  <p className="font-medium text-gray-900">Automation Workflows</p>
                </div>
                <p className="text-sm text-gray-600">Automate repetitive tasks and workflows</p>
              </div>
            </label>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border border-purple-200">
              <div className="flex items-center gap-2 mb-2">
                <Brain className="w-5 h-5 text-purple-600" />
                <p className="text-sm font-medium text-purple-700">AI Requests</p>
              </div>
              <p className="text-2xl font-bold text-gray-900">0</p>
              <p className="text-xs text-gray-600 mt-1">This month</p>
            </div>

            <div className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-5 h-5 text-blue-600" />
                <p className="text-sm font-medium text-blue-700">Content Created</p>
              </div>
              <p className="text-2xl font-bold text-gray-900">0</p>
              <p className="text-xs text-gray-600 mt-1">Pieces generated</p>
            </div>

            <div className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg border border-emerald-200">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
                <p className="text-sm font-medium text-emerald-700">Time Saved</p>
              </div>
              <p className="text-2xl font-bold text-gray-900">0h</p>
              <p className="text-xs text-gray-600 mt-1">Est. this month</p>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-semibold text-blue-900 mb-1">Privacy & Security</h4>
              <p className="text-sm text-blue-800">
                Your data is encrypted and never shared with third parties. AI models are configured to respect your privacy and comply with data protection regulations.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
