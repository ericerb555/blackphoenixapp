/**
 * User Management Hub - Consolidated User Administration
 * 
 * Consolidates 4 pages into tabs:
 * 1. Users - User account management
 * 2. Admin Users - Administrative user management
 * 3. Roles & Permissions - Role configuration
 * 4. Employees - Employee directory
 * 
 * Features:
 * - URL parameter support for direct tab access
 * - Unified back button to dashboard
 * - Deep orange dark theme (#ea580c, #0A0A0A)
 * - Comprehensive user and role management
 */

import { useState, useEffect } from 'react';
import { useNavigate } from '../hooks/useNavigate';
import {
  Users, Shield, Briefcase, UserCog, ChevronRight, Settings,
  Plus, Search, Filter, Edit2, Trash2, MoreVertical, Star
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

type TabType = 'users' | 'admin-users' | 'roles' | 'employees';

interface TabConfig {
  id: TabType;
  label: string;
  icon: any;
  description: string;
}

export default function UserManagementHub() {
  const navigate = useNavigate();
  
  // Get tab from URL or default to 'users'
  const getTabFromUrl = (): TabType => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    return (tab as TabType) || 'users';
  };

  const [activeTab, setActiveTab] = useState<TabType>(getTabFromUrl());

  // Tab configurations
  const tabs: TabConfig[] = [
    {
      id: 'users',
      label: 'Users',
      icon: Users,
      description: 'Manage user accounts and access'
    },
    {
      id: 'admin-users',
      label: 'Admin Users',
      icon: UserCog,
      description: 'Administrative user management'
    },
    {
      id: 'roles',
      label: 'Roles & Permissions',
      icon: Shield,
      description: 'Configure roles and permissions'
    },
    {
      id: 'employees',
      label: 'Employees',
      icon: Briefcase,
      description: 'Employee directory and management'
    }
  ];

  // Update URL when tab changes
  const handleTabChange = (tabId: TabType) => {
    setActiveTab(tabId);
    const newUrl = `/user-management-hub?tab=${tabId}`;
    window.history.pushState({}, '', newUrl);
  };

  // Sync with URL changes (browser back/forward)
  useEffect(() => {
    const handlePopState = () => {
      setActiveTab(getTabFromUrl());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Render placeholder content for each tab
  const renderTabContent = () => {
    return (
      <div className="p-8 text-center">
        <div className="max-w-md mx-auto">
          <div className="w-20 h-20 bg-gradient-to-br from-[#ea580c] to-[#c2410c] rounded-2xl flex items-center justify-center mx-auto mb-6">
            {tabs.find(t => t.id === activeTab)?.icon && 
              (() => {
                const Icon = tabs.find(t => t.id === activeTab)!.icon;
                return <Icon className="w-10 h-10 text-white" />;
              })()
            }
          </div>
          <h3 className="text-2xl font-bold text-white mb-3">
            {tabs.find(t => t.id === activeTab)?.label}
          </h3>
          <p className="text-gray-400 mb-6">
            {tabs.find(t => t.id === activeTab)?.description}
          </p>
          
          {/* Quick Action Buttons */}
          <div className="grid grid-cols-1 gap-3 max-w-xs mx-auto">
            <button className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-br from-[#ea580c] to-[#c2410c] hover:from-[#dc2626] hover:to-[#b91c1c] text-white rounded-xl transition-all duration-200 shadow-lg shadow-orange-500/20">
              <Plus className="w-5 h-5" />
              <span className="font-semibold">Add New</span>
            </button>
            <button className="flex items-center justify-center gap-2 px-6 py-3 bg-[#1A1A1A] hover:bg-[#2A2A2A] border border-[#2A2A2A] hover:border-[#ea580c] text-white rounded-xl transition-all duration-200">
              <Search className="w-5 h-5" />
              <span className="font-semibold">Search</span>
            </button>
            <button className="flex items-center justify-center gap-2 px-6 py-3 bg-[#1A1A1A] hover:bg-[#2A2A2A] border border-[#2A2A2A] hover:border-[#ea580c] text-white rounded-xl transition-all duration-200">
              <Filter className="w-5 h-5" />
              <span className="font-semibold">Filter</span>
            </button>
          </div>

          {/* Sample Stats */}
          <div className="grid grid-cols-3 gap-4 mt-8">
            <div className="bg-[#1A1A1A] rounded-xl p-4 border border-[#2A2A2A]">
              <div className="text-3xl font-bold text-[#ea580c] mb-1">24</div>
              <div className="text-sm text-gray-400">Total</div>
            </div>
            <div className="bg-[#1A1A1A] rounded-xl p-4 border border-[#2A2A2A]">
              <div className="text-3xl font-bold text-green-400 mb-1">18</div>
              <div className="text-sm text-gray-400">Active</div>
            </div>
            <div className="bg-[#1A1A1A] rounded-xl p-4 border border-[#2A2A2A]">
              <div className="text-3xl font-bold text-blue-400 mb-1">6</div>
              <div className="text-sm text-gray-400">Pending</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <div className="max-w-[1920px] mx-auto p-6 space-y-6">
        {/* Unified Back Button */}
        <button
          onClick={() => navigate('/unified-dashboard')}
          className="flex items-center gap-2 px-4 py-2 bg-[#1A1A1A] hover:bg-[#2A2A2A] border border-[#2A2A2A] hover:border-[#ea580c] text-gray-300 hover:text-white rounded-lg transition-all duration-200"
        >
          <ChevronRight className="w-4 h-4 rotate-180" />
          Back to Unified Dashboard
        </button>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-[#ea580c] to-[#c2410c] rounded-2xl flex items-center justify-center">
              <Settings className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">User Management Hub</h1>
              <p className="text-gray-400 mt-1">
                Comprehensive user, role, and employee administration
              </p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-2">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`
                    relative p-4 rounded-xl transition-all duration-200
                    ${isActive
                      ? 'bg-gradient-to-br from-[#ea580c] to-[#c2410c] text-white shadow-lg shadow-orange-500/20'
                      : 'bg-[#0F0F0F] hover:bg-[#2A2A2A] text-gray-400 hover:text-white border border-[#2A2A2A] hover:border-[#ea580c]/30'
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                    <div className="text-left">
                      <div className={`font-semibold ${isActive ? 'text-white' : 'text-gray-300'}`}>
                        {tab.label}
                      </div>
                      <div className={`text-sm mt-0.5 ${isActive ? 'text-orange-100' : 'text-gray-500'}`}>
                        {tab.description}
                      </div>
                    </div>
                  </div>
                  
                  {/* Active indicator */}
                  {isActive && (
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 w-2 h-2 bg-white rounded-full" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A]">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
}