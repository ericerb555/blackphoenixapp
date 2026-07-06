/**
 * Step 7: Security Configuration
 * Configure access control and security settings
 */

import { ChevronLeft, Shield, Lock, Users, Globe } from 'lucide-react';
import { WizardStepProps } from '../types';
import { PrimaryButton } from '../../ui/button/PrimaryButton';

export default function SecurityConfiguration({ data, onUpdate, onNext, onPrevious }: WizardStepProps) {
  const accessControl = data.access_control || {
    requireLogin: true,
    allowSignup: false,
    twoFactorAuth: false,
    ipWhitelist: [],
    allowedDomains: [],
    sessionTimeout: 3600
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="text-center mb-6">
        <h3 className="text-xl font-bold text-white mb-2">Security & Access Control</h3>
        <p className="text-gray-400">Configure who can access your portal and how</p>
      </div>

      <div className="space-y-4">
        {/* Require Login */}
        <div className="p-4 bg-[#1A1A1A] rounded-xl border border-[#2A2A2A]">
          <label className="flex items-center justify-between cursor-pointer">
            <div className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-orange-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-white">Require Login</p>
                <p className="text-xs text-gray-400 mt-1">Users must authenticate to access the portal</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={accessControl.requireLogin}
              onChange={(e) => onUpdate({
                access_control: { ...accessControl, requireLogin: e.target.checked }
              })}
              className="w-5 h-5 text-orange-600 bg-[#2A2A2A] border-[#3A3A3A] rounded focus:ring-orange-500"
            />
          </label>
        </div>

        {/* Allow Signup */}
        <div className="p-4 bg-[#1A1A1A] rounded-xl border border-[#2A2A2A]">
          <label className="flex items-center justify-between cursor-pointer">
            <div className="flex items-start gap-3">
              <Users className="w-5 h-5 text-blue-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-white">Allow Self-Registration</p>
                <p className="text-xs text-gray-400 mt-1">Users can create accounts without invitation</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={accessControl.allowSignup}
              onChange={(e) => onUpdate({
                access_control: { ...accessControl, allowSignup: e.target.checked }
              })}
              className="w-5 h-5 text-orange-600 bg-[#2A2A2A] border-[#3A3A3A] rounded focus:ring-orange-500"
            />
          </label>
        </div>

        {/* Two-Factor Authentication */}
        <div className="p-4 bg-[#1A1A1A] rounded-xl border border-[#2A2A2A]">
          <label className="flex items-center justify-between cursor-pointer">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-green-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-white">Two-Factor Authentication</p>
                <p className="text-xs text-gray-400 mt-1">Require 2FA for enhanced security</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={accessControl.twoFactorAuth}
              onChange={(e) => onUpdate({
                access_control: { ...accessControl, twoFactorAuth: e.target.checked }
              })}
              className="w-5 h-5 text-orange-600 bg-[#2A2A2A] border-[#3A3A3A] rounded focus:ring-orange-500"
            />
          </label>
        </div>

        {/* Session Timeout */}
        <div>
          <label className="text-sm font-medium text-gray-400 mb-2 block">Session Timeout (seconds)</label>
          <input
            type="number"
            value={accessControl.sessionTimeout}
            onChange={(e) => onUpdate({
              access_control: { ...accessControl, sessionTimeout: parseInt(e.target.value) }
            })}
            min={300}
            max={86400}
            className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:border-orange-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            {Math.floor(accessControl.sessionTimeout! / 60)} minutes ({accessControl.sessionTimeout} seconds)
          </p>
        </div>

        {/* Info Panel */}
        <div className="p-4 bg-blue-600/10 rounded-xl border border-blue-500/30">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-blue-300 mb-1">Security Best Practices</p>
              <ul className="text-xs text-blue-200/70 space-y-1">
                <li>• Enable 2FA for sensitive portals (financial, HR, etc.)</li>
                <li>• Use strong session timeouts for public portals</li>
                <li>• Disable self-registration for internal portals</li>
                <li>• Always require login for portals with confidential data</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between gap-3 pt-6 border-t border-[#2A2A2A]">
        <button
          onClick={onPrevious}
          className="px-6 py-3 bg-[#1A1A1A] border border-[#2A2A2A] text-white rounded-xl font-medium hover:bg-[#2A2A2A] transition flex items-center gap-2"
        >
          <ChevronLeft className="w-5 h-5" />
          Previous
        </button>
        <PrimaryButton
          onClick={onNext}
        >
          Continue
        </PrimaryButton>
      </div>
    </div>
  );
}
