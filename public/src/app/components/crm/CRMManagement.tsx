import { useState, useEffect } from 'react';
import { 
  Users, Building2, TrendingUp, Activity, CheckSquare, 
  BarChart3, Search, Filter, Plus, Download, Upload,
  Phone, Mail, Calendar, MapPin, DollarSign, Star,
  Clock, MessageSquare, FileText, Settings, Eye,
  Edit, Trash2, MoreVertical, ArrowUpRight, ArrowDownRight, X, ArrowLeft
} from 'lucide-react';
import { CRMDashboard } from './CRMDashboard';
import { ContactsList } from './ContactsList';
import { CompaniesList } from './CompaniesList';
import { PipelineView } from './PipelineView';
import { ActivitiesLog } from './ActivitiesLog';
import { TasksManager } from './TasksManager';
import { CRMAnalytics } from './CRMAnalytics';
import AddContactModal from './AddContactModal';
import { SecondaryButton } from '../ui/button/SecondaryButton';
import { PrimaryButton } from '../ui/button/PrimaryButton';

type TabType = 'dashboard' | 'contacts' | 'companies' | 'pipeline' | 'activities' | 'tasks' | 'analytics';

interface CRMManagementProps {
  initialAction?: string;
}

export function CRMManagement({ initialAction }: CRMManagementProps = {}) {
  const [activeTab, setActiveTab] = useState<TabType>('contacts');
  const [showAddContactModal, setShowAddContactModal] = useState(false);

  // Open add contact modal if initialAction is set
  useEffect(() => {
    if (initialAction === 'add-contact') {
      setActiveTab('contacts');
      setShowAddContactModal(true);
    }
  }, [initialAction]);

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'contacts', label: 'Contacts', icon: Users },
    { id: 'companies', label: 'Companies', icon: Building2 },
    { id: 'pipeline', label: 'Pipeline', icon: TrendingUp },
    { id: 'activities', label: 'Activities', icon: Activity },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  ];

  return (
    <div className="h-full flex flex-col bg-[#0A0A0A]">
      {/* Header */}
      <div className="bg-[#1A1A1A] border-b border-[#2A2A2A] px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                window.location.href = '/unified-dashboard';
              }}
              className="p-2 hover:bg-[#2A2A2A] rounded-lg transition-colors text-gray-400 hover:text-white"
              title="Back to Unified Dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white">CRM Management</h1>
              <p className="text-sm text-gray-400 mt-1">
                Manage customer relationships, pipeline, and sales activities
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <SecondaryButton icon={<Download className="w-4 h-4" />}>
              Export
            </SecondaryButton>
            <SecondaryButton icon={<Upload className="w-4 h-4" />}>
              Import
            </SecondaryButton>
            <PrimaryButton 
              icon={<Plus className="w-4 h-4" />}
              onClick={() => setShowAddContactModal(true)}
            >
              Add New
            </PrimaryButton>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mt-6 border-b border-[#2A2A2A]">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-orange-500 text-orange-400'
                    : 'border-transparent text-gray-400 hover:text-white hover:border-[#2A2A2A]'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'dashboard' && <CRMDashboard />}
        {activeTab === 'contacts' && <ContactsList />}
        {activeTab === 'companies' && <CompaniesList />}
        {activeTab === 'pipeline' && <PipelineView />}
        {activeTab === 'activities' && <ActivitiesLog />}
        {activeTab === 'tasks' && <TasksManager />}
        {activeTab === 'analytics' && <CRMAnalytics />}
      </div>

      {/* Add Contact Modal */}
      <AddContactModal
        isOpen={showAddContactModal}
        onClose={() => setShowAddContactModal(false)}
        onContactAdded={(contact) => {
          console.log('Contact added:', contact);
          // Optionally refresh the contacts list here
        }}
      />
    </div>
  );
}