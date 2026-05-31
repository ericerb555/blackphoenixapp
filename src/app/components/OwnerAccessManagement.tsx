import { Crown, Shield, Users, Key, Lock, Unlock, Plus, Edit2, Trash2, AlertCircle, CheckCircle } from 'lucide-react';

export default function OwnerAccessManagement() {
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-amber-600 to-orange-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <Crown className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-1">Owner & Admin Access Control</h2>
              <p className="text-amber-100">Manage company ownership and administrative privileges</p>
            </div>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-white text-amber-600 rounded-lg hover:bg-amber-50 transition-colors font-medium">
            <Plus className="w-4 h-4" />
            Add Owner/Admin
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-amber-700">Company Owners</p>
            <Crown className="w-5 h-5 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">0</p>
          <p className="text-xs text-gray-600 mt-1">Full control</p>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border border-blue-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-blue-700">Administrators</p>
            <Shield className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">0</p>
          <p className="text-xs text-gray-600 mt-1">Admin access</p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-purple-700">Total Users</p>
            <Users className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">0</p>
          <p className="text-xs text-gray-600 mt-1">All roles</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Access Levels</h3>
          <p className="text-sm text-gray-600 mt-1">Understand the different permission levels</p>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="p-2 bg-amber-600 rounded-lg">
              <Crown className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-semibold text-gray-900">Owner</h4>
                <span className="px-2 py-0.5 bg-amber-600 text-white text-xs font-medium rounded-full">
                  Highest Level
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-2">
                Complete control over all company settings, data, and access management. Can add/remove other owners and admins.
              </p>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="px-2 py-1 bg-white border border-amber-200 rounded">Full Access</span>
                <span className="px-2 py-1 bg-white border border-amber-200 rounded">User Management</span>
                <span className="px-2 py-1 bg-white border border-amber-200 rounded">Financial Access</span>
                <span className="px-2 py-1 bg-white border border-amber-200 rounded">System Settings</span>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-semibold text-gray-900">Administrator</h4>
                <span className="px-2 py-0.5 bg-blue-600 text-white text-xs font-medium rounded-full">
                  High Level
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-2">
                Manage day-to-day operations, create quotes, manage customers, and view reports. Cannot modify owner settings.
              </p>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="px-2 py-1 bg-white border border-blue-200 rounded">Operations</span>
                <span className="px-2 py-1 bg-white border border-blue-200 rounded">Customer Management</span>
                <span className="px-2 py-1 bg-white border border-blue-200 rounded">Reports</span>
                <span className="px-2 py-1 bg-white border border-blue-200 rounded">Team Management</span>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="p-2 bg-gray-600 rounded-lg">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-semibold text-gray-900">Technician / Staff</h4>
                <span className="px-2 py-0.5 bg-gray-600 text-white text-xs font-medium rounded-full">
                  Standard Level
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-2">
                Access to assigned work orders, ability to update job status, and view customer information. Limited settings access.
              </p>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="px-2 py-1 bg-white border border-gray-200 rounded">View Jobs</span>
                <span className="px-2 py-1 bg-white border border-gray-200 rounded">Update Status</span>
                <span className="px-2 py-1 bg-white border border-gray-200 rounded">Time Tracking</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">Current Access List</h3>
              <p className="text-sm text-gray-600 mt-1">Owners and administrators with elevated privileges</p>
            </div>
            <div className="flex gap-2">
              <button className="px-3 py-1.5 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                <Crown className="w-4 h-4 inline mr-1" />
                Owners
              </button>
              <button className="px-3 py-1.5 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                <Shield className="w-4 h-4 inline mr-1" />
                Admins
              </button>
            </div>
          </div>
        </div>
        <div className="p-12 text-center">
          <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h4 className="text-lg font-semibold text-gray-900 mb-2">No Privileged Users Yet</h4>
          <p className="text-gray-600 mb-4">Add company owners and administrators to manage access</p>
          <button className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors">
            <Plus className="w-4 h-4" />
            Add First Owner/Admin
          </button>
        </div>
      </div>

      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="text-sm font-semibold text-red-900 mb-1">Security Best Practices</h4>
            <ul className="text-sm text-red-800 space-y-1 list-disc list-inside">
              <li>Limit owner access to trusted individuals only</li>
              <li>Regularly audit who has admin privileges</li>
              <li>Require 2-factor authentication for all owners and admins</li>
              <li>Review access logs periodically for suspicious activity</li>
              <li>Remove access immediately when someone leaves the company</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
