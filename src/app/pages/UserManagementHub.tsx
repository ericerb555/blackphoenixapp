/**
 * User Management Hub — the team, and the mail that goes to them.
 *
 * WHAT THIS WAS UNTIL 2026-11-18, AND WHY IT HAD TO CHANGE
 *
 * Eric: "the user management hub isnt not working correctly the add butoon
 * does nothing." It did nothing because it was never wired to anything. Four
 * of its five tabs — Users, Admin Users, Roles & Permissions, Employees —
 * rendered a placeholder under a comment that said so: an icon, a sentence,
 * three buttons with NO onClick, and a row of invented statistics reading
 * "24 Total / 18 Active". Pressing Add New could not have done anything;
 * there was no handler, no form and no request.
 *
 * This is the same thing `TeamAccessPanel` was built to replace — a 1350-line
 * `RoleManagementSystem` under a header reading "FULLY FUNCTIONAL", seeded
 * with twenty invented people, which made no network call of any kind. A
 * screen that looks like it works is worse than an empty one: somebody spends
 * an afternoon in it and changes nothing.
 *
 * WHY THE FIX IS NOT "WIRE UP THE ADD BUTTON"
 *
 * Because the working version already exists. `TeamAccessPanel` lists the real
 * team from `/team/members`, changes a role through `POST /team/members/role`
 * — the one field thirty-odd route guards read — invites somebody with an
 * emailed link, switches an account off and on, and sets a role on several
 * people at once. Building a second Add button here would mean two screens
 * writing authority, free to disagree, which is the mistake the server's own
 * `/me/permissions` route exists to have ended.
 *
 * So this hub now renders the real panel. Four tabs promising four different
 * screens, all showing the same one, would be a fresh lie — so there are two
 * honest tabs instead, and the old tab names still resolve to the right one
 * so existing links and bookmarks keep working.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from '../hooks/useNavigate';
import { Users, ChevronRight, Mail, Settings } from 'lucide-react';
import { EmailCenter } from '../components/EmailCenter';
import TeamAccessPanel from '../components/owner/TeamAccessPanel';

type TabType = 'team' | 'emails';

interface TabConfig {
  id: TabType;
  label: string;
  icon: any;
  description: string;
}

export default function UserManagementHub() {
  const navigate = useNavigate();

  /**
   * The four old tab names all meant "the team", so they all land there.
   * `?tab=roles` was a bookmark somebody may still have.
   */
  const getTabFromUrl = (): TabType => {
    const params = new URLSearchParams(window.location.search);
    const tab = String(params.get('tab') || '');
    return tab === 'emails' ? 'emails' : 'team';
  };

  const [activeTab, setActiveTab] = useState<TabType>(getTabFromUrl());

  const tabs: TabConfig[] = [
    {
      id: 'team',
      label: 'Team & Access',
      icon: Users,
      description: 'Who works here, what they can reach, and bringing somebody on',
    },
    {
      id: 'emails',
      label: 'Emails',
      icon: Mail,
      description: 'View sent emails and edit templates',
    },
  ];

  const handleTabChange = (tabId: TabType) => {
    setActiveTab(tabId);
    window.history.pushState({}, '', `/user-management-hub?tab=${tabId}`);
  };

  useEffect(() => {
    const handlePopState = () => setActiveTab(getTabFromUrl());
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const renderTabContent = () => {
    if (activeTab === 'emails') return <EmailCenter />;
    return (
      <div className="p-4 sm:p-6">
        <TeamAccessPanel />
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
                Who works here, what they can reach, and the mail that goes to them
              </p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
