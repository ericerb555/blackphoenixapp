/**
 * User Context Selector
 * Allows users to view/change their user context for folder isolation
 * Shows what folder they're saving to
 */

import { useState } from 'react';
import { X, User, Briefcase, Store, Megaphone, Users, Crown, Shield, Check, AlertCircle, FolderOpen } from 'lucide-react';
import { UserContext, UserType, setMockUserContext } from '../lib/userStorageManager';

interface UserContextSelectorProps {
  currentContext: UserContext;
  onContextChange: (context: UserContext) => void;
  onClose: () => void;
}

export default function UserContextSelector({
  currentContext,
  onContextChange,
  onClose
}: UserContextSelectorProps) {
  const [selectedType, setSelectedType] = useState<UserType>(currentContext.userType);
  const [userId, setUserId] = useState(currentContext.userId);
  const [userName, setUserName] = useState(currentContext.userName);
  const [companyId, setCompanyId] = useState(currentContext.companyId || '');

  const userTypes: Array<{
    type: UserType;
    label: string;
    description: string;
    icon: any;
    color: string;
  }> = [
    {
      type: 'customer',
      label: 'Customer',
      description: 'Save to customer folder',
      icon: User,
      color: 'blue'
    },
    {
      type: 'vendor',
      label: 'Vendor',
      description: 'Save to vendor folder',
      icon: Store,
      color: 'green'
    },
    {
      type: 'advertiser',
      label: 'Advertiser',
      description: 'Save to advertiser folder',
      icon: Megaphone,
      color: 'purple'
    },
    {
      type: 'employee',
      label: 'Employee',
      description: 'Save to employee folder',
      icon: Briefcase,
      color: 'orange'
    },
    {
      type: 'owner',
      label: 'Owner',
      description: 'Full access to all folders',
      icon: Crown,
      color: 'yellow'
    },
    {
      type: 'admin',
      label: 'Admin',
      description: 'Full access to all folders',
      icon: Shield,
      color: 'red'
    }
  ];

  const handleApply = () => {
    const newContext: UserContext = {
      userId,
      userType: selectedType,
      userName,
      companyId: companyId || undefined
    };
    
    setMockUserContext(newContext);
    onContextChange(newContext);
    onClose();
  };

  const selectedTypeInfo = userTypes.find(t => t.type === selectedType);
  const Icon = selectedTypeInfo?.icon || User;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-6">
      <div className="bg-[#1a1a1a] border border-gray-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-[#1a1a1a] border-b border-gray-800 p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#ea580c]/10 rounded-lg">
              <FolderOpen className="w-6 h-6 text-[#ea580c]" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">User Folder Settings</h2>
              <p className="text-sm text-gray-400">
                Choose which folder to save your work to
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#2a2a2a] rounded-lg transition"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Current Context Info */}
        <div className="p-6 border-b border-gray-800 bg-gradient-to-r from-[#ea580c]/5 to-blue-500/5">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-[#ea580c] mt-0.5" />
            <div>
              <div className="text-sm font-semibold text-[#ea580c] mb-1">Folder Isolation Active</div>
              <div className="text-sm text-gray-400">
                Your work is saved to your private folder. Only you can access files in your folder.
                You can export your work at any time.
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="p-6 space-y-6">
          {/* User Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Select User Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              {userTypes.map(type => {
                const TypeIcon = type.icon;
                const isSelected = selectedType === type.type;
                
                return (
                  <button
                    key={type.type}
                    onClick={() => setSelectedType(type.type)}
                    className={`p-4 rounded-lg border-2 transition text-left ${
                      isSelected
                        ? type.color === 'blue' ? 'border-blue-500 bg-blue-500/10'
                        : type.color === 'green' ? 'border-green-500 bg-green-500/10'
                        : type.color === 'purple' ? 'border-purple-500 bg-purple-500/10'
                        : type.color === 'orange' ? 'border-orange-500 bg-orange-500/10'
                        : type.color === 'yellow' ? 'border-yellow-500 bg-yellow-500/10'
                        : 'border-red-500 bg-red-500/10'
                        : 'border-gray-700 bg-[#2a2a2a] hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <TypeIcon className={`w-5 h-5 ${
                        isSelected
                          ? type.color === 'blue' ? 'text-blue-400'
                          : type.color === 'green' ? 'text-green-400'
                          : type.color === 'purple' ? 'text-purple-400'
                          : type.color === 'orange' ? 'text-orange-400'
                          : type.color === 'yellow' ? 'text-yellow-400'
                          : 'text-red-400'
                          : 'text-gray-400'
                      }`} />
                      <div className="text-sm font-medium text-white">{type.label}</div>
                      {isSelected && <Check className="w-4 h-4 ml-auto text-white" />}
                    </div>
                    <div className="text-xs text-gray-400">{type.description}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* User Details */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                User ID
              </label>
              <input
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="e.g., user-123"
                className="w-full px-4 py-3 bg-[#2a2a2a] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#ea580c]"
              />
              <div className="mt-1 text-xs text-gray-500">
                Unique identifier for the user
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                User Name
              </label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="e.g., John Smith"
                className="w-full px-4 py-3 bg-[#2a2a2a] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#ea580c]"
              />
              <div className="mt-1 text-xs text-gray-500">
                Display name for the user
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Company ID (Optional)
              </label>
              <input
                type="text"
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                placeholder="e.g., company-abc"
                className="w-full px-4 py-3 bg-[#2a2a2a] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#ea580c]"
              />
              <div className="mt-1 text-xs text-gray-500">
                Link user to a specific company or organization
              </div>
            </div>
          </div>

          {/* Storage Path Preview */}
          <div className="p-4 bg-[#2a2a2a] border border-gray-700 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <FolderOpen className="w-4 h-4 text-gray-400" />
              <div className="text-xs font-medium text-gray-400">Your Folder Path:</div>
            </div>
            <div className="font-mono text-sm text-[#ea580c] break-all">
              user_{selectedType}_{userId || '<user-id>'}
            </div>
            <div className="mt-2 text-xs text-gray-500">
              All your designs and content will be saved here
            </div>
          </div>

          {/* Warning for Owner/Admin */}
          {(selectedType === 'owner' || selectedType === 'admin') && (
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5" />
              <div>
                <div className="text-sm font-semibold text-yellow-400 mb-1">
                  Administrator Access
                </div>
                <div className="text-sm text-gray-400">
                  Owners and Admins have access to all user folders. This is for administrative purposes only.
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-4 border-t border-gray-800">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-[#2a2a2a] hover:bg-[#333] text-gray-300 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              disabled={!userId.trim() || !userName.trim()}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-[#ea580c] to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-lg flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check className="w-4 h-4" />
              Apply Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
