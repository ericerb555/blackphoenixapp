/**
 * Enterprise Email Management System
 * 
 * Features:
 * - Company email domain configuration
 * - Auto-provisioning for new employees
 * - Manual email assignment for contractors/vendors
 * - Import private company email systems
 * - Email account management
 * - Distribution lists & aliases
 * - Security & compliance settings
 */

import { useState } from 'react';
import {
  Mail, Plus, Settings, Users, Shield, Send, Inbox, Archive,
  CheckCircle, XCircle, Clock, AlertTriangle, Search, Filter,
  Download, Upload, Edit, Trash2, RefreshCw, Key, Lock,
  Globe, Server, Database, Zap, UserPlus, Building2, Link,
  Eye, EyeOff, Copy, Check, ExternalLink, FileText, Activity,
  TrendingUp, BarChart3, Calendar, ChevronDown, ChevronRight,
  Crown, Star, Sparkles, Target, Box, Layers, Grid, List
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { IconButton } from '../components/ui/button';
import { DataTable } from '../components/ui/table/DataTable';
import type { DataTableColumn } from '../components/ui/table/DataTable';

type EmailProvider = 'google-workspace' | 'microsoft-365' | 'custom-smtp' | 'internal';
type AccountStatus = 'active' | 'suspended' | 'pending' | 'disabled';
type AccountType = 'employee' | 'contractor' | 'vendor' | 'admin' | 'shared' | 'distribution';

interface CompanyEmailDomain {
  id: string;
  companyId: string;
  companyName: string;
  domain: string;
  provider: EmailProvider;
  status: 'active' | 'pending' | 'error';
  autoProvision: boolean;
  totalAccounts: number;
  activeAccounts: number;
  storageUsed: number;
  storageLimit: number;
  createdAt: string;
}

interface EmailAccount {
  id: string;
  email: string;
  displayName: string;
  accountType: AccountType;
  status: AccountStatus;
  userId?: string;
  companyId: string;
  domain: string;
  aliases: string[];
  forwardTo?: string;
  storageUsed: number;
  storageQuota: number;
  lastActive: string;
  createdAt: string;
  autoCreated: boolean;
}

interface EmailProviderConfig {
  provider: EmailProvider;
  domain: string;
  smtpHost?: string;
  smtpPort?: number;
  imapHost?: string;
  imapPort?: number;
  username?: string;
  password?: string;
  apiKey?: string;
  clientId?: string;
  clientSecret?: string;
}

export default function EnterpriseEmailManagement() {
  const [activeTab, setActiveTab] = useState<'domains' | 'accounts' | 'provisioning' | 'settings'>('domains');
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddDomain, setShowAddDomain] = useState(false);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [showImportProvider, setShowImportProvider] = useState(false);

  // Mock data
  const [companyDomains] = useState<CompanyEmailDomain[]>([
    {
      id: '1',
      companyId: 'comp1',
      companyName: 'TechDesign Inc',
      domain: 'techdesign.com',
      provider: 'google-workspace',
      status: 'active',
      autoProvision: true,
      totalAccounts: 45,
      activeAccounts: 42,
      storageUsed: 250,
      storageLimit: 1000,
      createdAt: '2024-01-15'
    },
    {
      id: '2',
      companyId: 'comp2',
      companyName: 'BuildCo Construction',
      domain: 'buildco.pro',
      provider: 'microsoft-365',
      status: 'active',
      autoProvision: true,
      totalAccounts: 28,
      activeAccounts: 27,
      storageUsed: 180,
      storageLimit: 500,
      createdAt: '2024-02-10'
    },
    {
      id: '3',
      companyId: 'comp3',
      companyName: 'Design Studio',
      domain: 'designstudio.io',
      provider: 'custom-smtp',
      status: 'active',
      autoProvision: false,
      totalAccounts: 12,
      activeAccounts: 11,
      storageUsed: 60,
      storageLimit: 200,
      createdAt: '2024-03-05'
    }
  ]);

  const [emailAccounts] = useState<EmailAccount[]>([
    {
      id: '1',
      email: 'john.smith@techdesign.com',
      displayName: 'John Smith',
      accountType: 'employee',
      status: 'active',
      userId: 'user1',
      companyId: 'comp1',
      domain: 'techdesign.com',
      aliases: ['j.smith@techdesign.com', 'johnsmith@techdesign.com'],
      storageUsed: 5.2,
      storageQuota: 30,
      lastActive: '2026-01-25 14:30',
      createdAt: '2024-01-16',
      autoCreated: true
    },
    {
      id: '2',
      email: 'sarah.johnson@techdesign.com',
      displayName: 'Sarah Johnson',
      accountType: 'admin',
      status: 'active',
      userId: 'user2',
      companyId: 'comp1',
      domain: 'techdesign.com',
      aliases: ['admin@techdesign.com', 's.johnson@techdesign.com'],
      storageUsed: 12.8,
      storageQuota: 50,
      lastActive: '2026-01-25 15:45',
      createdAt: '2024-01-16',
      autoCreated: true
    },
    {
      id: '3',
      email: 'support@techdesign.com',
      displayName: 'Support Team',
      accountType: 'shared',
      status: 'active',
      companyId: 'comp1',
      domain: 'techdesign.com',
      aliases: ['help@techdesign.com', 'contact@techdesign.com'],
      storageUsed: 8.5,
      storageQuota: 100,
      lastActive: '2026-01-25 16:00',
      createdAt: '2024-01-20',
      autoCreated: false
    },
    {
      id: '4',
      email: 'contractor@techdesign.com',
      displayName: 'Mike Wilson',
      accountType: 'contractor',
      status: 'active',
      userId: 'contractor1',
      companyId: 'comp1',
      domain: 'techdesign.com',
      aliases: [],
      storageUsed: 2.1,
      storageQuota: 15,
      lastActive: '2026-01-24 11:20',
      createdAt: '2024-02-01',
      autoCreated: false
    }
  ]);

  const providerIcons = {
    'google-workspace': Globe,
    'microsoft-365': Box,
    'custom-smtp': Server,
    'internal': Database
  };

  const statusColors = {
    active: 'bg-green-600/20 text-green-400 border-green-500/30',
    suspended: 'bg-yellow-600/20 text-yellow-400 border-yellow-500/30',
    pending: 'bg-blue-600/20 text-blue-400 border-blue-500/30',
    disabled: 'bg-red-600/20 text-red-400 border-red-500/30',
    error: 'bg-red-600/20 text-red-400 border-red-500/30'
  };

  const accountTypeColors = {
    employee: 'bg-blue-600/20 text-blue-400 border-blue-500/30',
    contractor: 'bg-purple-600/20 text-purple-400 border-purple-500/30',
    vendor: 'bg-green-600/20 text-green-400 border-green-500/30',
    admin: 'bg-orange-600/20 text-orange-400 border-orange-500/30',
    shared: 'bg-cyan-600/20 text-cyan-400 border-cyan-500/30',
    distribution: 'bg-pink-600/20 text-pink-400 border-pink-500/30'
  };

  const handleCreateEmailAccount = (accountData: any) => {
    toast.success(`Email account created: ${accountData.email}`);
    setShowAddAccount(false);
  };

  const handleImportProvider = (providerConfig: EmailProviderConfig) => {
    toast.success(`Email provider imported for ${providerConfig.domain}`);
    setShowImportProvider(false);
  };

  const handleSuspendAccount = (accountId: string) => {
    toast.warning('Email account suspended');
  };

  const handleDeleteAccount = (accountId: string) => {
    toast.error('Email account deleted');
  };

  // Email account table columns
  const accountColumns: DataTableColumn<EmailAccount>[] = [
    {
      key: 'email',
      header: 'Email Account',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-orange-600 to-orange-500 rounded-lg flex items-center justify-center">
            <Mail className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-semibold text-white">{row.displayName}</p>
            <p className="text-sm text-gray-400">{row.email}</p>
            {row.autoCreated && (
              <span className="inline-flex items-center gap-1 text-sm text-purple-400 mt-1">
                <Zap className="w-3 h-3" />
                Auto-created
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (row) => (
        <span className={`px-2 py-1 rounded text-sm font-bold border ${accountTypeColors[row.accountType]}`}>
          {row.accountType.toUpperCase()}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <span className={`px-2 py-1 rounded text-sm font-bold border ${statusColors[row.status]}`}>
          {row.status.toUpperCase()}
        </span>
      ),
    },
    {
      key: 'storage',
      header: 'Storage',
      render: (row) => (
        <div>
          <p className="text-sm text-white">{row.storageUsed} GB</p>
          <p className="text-sm text-gray-400">of {row.storageQuota} GB</p>
          <div className="w-24 h-1 bg-[#2A2A2A] rounded-full mt-1 overflow-hidden">
            <div
              className="h-full bg-orange-600"
              style={{ width: `${(row.storageUsed / row.storageQuota) * 100}%` }}
            ></div>
          </div>
        </div>
      ),
    },
    {
      key: 'lastActive',
      header: 'Last Active',
      render: (row) => <p className="text-sm text-gray-400">{row.lastActive}</p>,
    },
    {
      key: 'created',
      header: 'Created',
      render: (row) => <p className="text-sm text-gray-400">{row.createdAt}</p>,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center justify-end gap-2">
          <button className="p-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white rounded-lg transition">
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleSuspendAccount(row.id);
            }}
            className="p-2 bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-400 rounded-lg transition"
          >
            <Lock className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteAccount(row.id);
            }}
            className="p-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
      align: 'right',
    },
  ];

  const filteredDomains = companyDomains.filter(domain =>
    domain.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    domain.domain.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredAccounts = emailAccounts.filter(account =>
    account.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    account.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#0A0A0A] p-6">
      {/* Unified Back Button */}
      <button
        onClick={() => window.location.href = '/unified-dashboard'}
        className="flex items-center gap-2 px-4 py-2 mb-6 bg-[#1A1A1A] hover:bg-[#2A2A2A] border border-[#2A2A2A] hover:border-[#ea580c] text-gray-300 hover:text-white rounded-lg transition-all duration-200"
      >
        <ChevronRight className="w-4 h-4 rotate-180" />
        Back to Unified Dashboard
      </button>

      {/* Header */}
      <div className="max-w-[1800px] mx-auto mb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Enterprise Email Management</h1>
            <p className="text-gray-400">Manage company email domains, accounts, and auto-provisioning</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowImportProvider(true)}
              className="px-4 py-2 bg-[#1A1A1A] hover:bg-[#2A2A2A] border border-[#2A2A2A] text-white rounded-lg transition flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Import Provider
            </button>
            <button
              onClick={() => setShowAddDomain(true)}
              className="px-4 py-2 bg-[#1A1A1A] hover:bg-[#2A2A2A] border border-[#2A2A2A] text-white rounded-lg transition flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Domain
            </button>
            <button
              onClick={() => setShowAddAccount(true)}
              className="px-4 py-2 bg-gradient-to-r from-[#ea580c] to-[#f97316] hover:opacity-90 text-white rounded-lg font-semibold transition flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              Create Email Account
            </button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-400">Total Domains</p>
              <Building2 className="w-5 h-5 text-blue-400" />
            </div>
            <p className="text-3xl font-bold text-white">{companyDomains.length}</p>
            <p className="text-sm text-green-400 mt-1">+2 this month</p>
          </div>
          
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-400">Total Accounts</p>
              <Mail className="w-5 h-5 text-green-400" />
            </div>
            <p className="text-3xl font-bold text-white">
              {companyDomains.reduce((sum, d) => sum + d.totalAccounts, 0)}
            </p>
            <p className="text-sm text-green-400 mt-1">+8 this week</p>
          </div>

          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-400">Auto-Provisioned</p>
              <Zap className="w-5 h-5 text-purple-400" />
            </div>
            <p className="text-3xl font-bold text-white">
              {emailAccounts.filter(a => a.autoCreated).length}
            </p>
            <p className="text-sm text-blue-400 mt-1">Automatic creation enabled</p>
          </div>

          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-400">Storage Used</p>
              <Database className="w-5 h-5 text-orange-400" />
            </div>
            <p className="text-3xl font-bold text-white">
              {companyDomains.reduce((sum, d) => sum + d.storageUsed, 0)} GB
            </p>
            <p className="text-sm text-gray-400 mt-1">
              of {companyDomains.reduce((sum, d) => sum + d.storageLimit, 0)} GB
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-1 flex gap-1 mb-6">
          {[
            { id: 'domains', label: 'Email Domains', icon: Globe },
            { id: 'accounts', label: 'Email Accounts', icon: Users },
            { id: 'provisioning', label: 'Auto-Provisioning', icon: Zap },
            { id: 'settings', label: 'Settings', icon: Settings }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 px-6 py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2 ${
                  activeTab === tab.id
                    ? 'bg-[#ea580c] text-white'
                    : 'text-gray-400 hover:text-white hover:bg-[#2A2A2A]'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search & Filters */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={activeTab === 'domains' ? 'Search domains...' : 'Search accounts...'}
              className="w-full pl-12 pr-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#ea580c] transition"
            />
          </div>
          <button className="px-4 py-3 bg-[#1A1A1A] hover:bg-[#2A2A2A] border border-[#2A2A2A] text-white rounded-xl transition flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filters
          </button>
          <button className="px-4 py-3 bg-[#1A1A1A] hover:bg-[#2A2A2A] border border-[#2A2A2A] text-white rounded-xl transition flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1800px] mx-auto">
        {/* EMAIL DOMAINS TAB */}
        {activeTab === 'domains' && (
          <div className="space-y-4">
            {filteredDomains.map((domain) => {
              const ProviderIcon = providerIcons[domain.provider];
              return (
                <div key={domain.id} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 hover:border-[#3A3A3A] transition">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-[#ea580c] to-[#f97316] rounded-xl flex items-center justify-center">
                        <Mail className="w-8 h-8 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white mb-1">{domain.companyName}</h3>
                        <p className="text-gray-400 mb-2">@{domain.domain}</p>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded text-sm font-bold border ${statusColors[domain.status]}`}>
                            {domain.status.toUpperCase()}
                          </span>
                          <span className="px-2 py-1 bg-blue-600/20 text-blue-400 rounded text-sm font-bold border border-blue-500/30 flex items-center gap-1">
                            <ProviderIcon className="w-3 h-3" />
                            {domain.provider.replace('-', ' ').toUpperCase()}
                          </span>
                          {domain.autoProvision && (
                            <span className="px-2 py-1 bg-purple-600/20 text-purple-400 rounded text-sm font-bold border border-purple-500/30 flex items-center gap-1">
                              <Zap className="w-3 h-3" />
                              AUTO-PROVISION
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="p-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white rounded-lg transition">
                        <Settings className="w-4 h-4" />
                      </button>
                      <button className="p-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white rounded-lg transition">
                        <Activity className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-4 gap-4 mb-4">
                    <div className="bg-[#0A0A0A] rounded-lg p-3 border border-[#2A2A2A]">
                      <p className="text-sm text-gray-400 mb-1">Total Accounts</p>
                      <p className="text-2xl font-bold text-white">{domain.totalAccounts}</p>
                    </div>
                    <div className="bg-[#0A0A0A] rounded-lg p-3 border border-[#2A2A2A]">
                      <p className="text-sm text-gray-400 mb-1">Active</p>
                      <p className="text-2xl font-bold text-green-400">{domain.activeAccounts}</p>
                    </div>
                    <div className="bg-[#0A0A0A] rounded-lg p-3 border border-[#2A2A2A]">
                      <p className="text-sm text-gray-400 mb-1">Storage Used</p>
                      <p className="text-2xl font-bold text-orange-400">{domain.storageUsed} GB</p>
                    </div>
                    <div className="bg-[#0A0A0A] rounded-lg p-3 border border-[#2A2A2A]">
                      <p className="text-sm text-gray-400 mb-1">Storage Limit</p>
                      <p className="text-2xl font-bold text-blue-400">{domain.storageLimit} GB</p>
                    </div>
                  </div>

                  {/* Storage Bar */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-400">Storage Usage</span>
                      <span className="text-sm text-white">
                        {((domain.storageUsed / domain.storageLimit) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-2 bg-[#2A2A2A] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#ea580c] to-[#f97316]"
                        style={{ width: `${(domain.storageUsed / domain.storageLimit) * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-4 border-t border-[#2A2A2A]">
                    <button
                      onClick={() => setSelectedCompany(domain.companyId)}
                      className="px-4 py-2 bg-[#ea580c] hover:opacity-90 text-white rounded-lg font-semibold transition flex items-center gap-2"
                    >
                      <Users className="w-4 h-4" />
                      View Accounts ({domain.totalAccounts})
                    </button>
                    <button className="px-4 py-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white rounded-lg transition flex items-center gap-2">
                      <Settings className="w-4 h-4" />
                      Configure
                    </button>
                    <button className="px-4 py-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white rounded-lg transition flex items-center gap-2">
                      <RefreshCw className="w-4 h-4" />
                      Sync
                    </button>
                    <div className="flex-1"></div>
                    <span className="text-sm text-gray-500">Created {domain.createdAt}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* EMAIL ACCOUNTS TAB */}
        {activeTab === 'accounts' && (
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl overflow-hidden">
            <DataTable
              columns={accountColumns}
              data={filteredAccounts}
              emptyMessage="No email accounts found"
              containerClassName="bg-transparent border-none"
              headerClassName="bg-transparent border-[#2A2A2A]"
              rowClassName="hover:bg-[#1A1A1A]"
            />
          </div>
        )}

        {/* AUTO-PROVISIONING TAB */}
        {activeTab === 'provisioning' && (
          <div className="space-y-6">
            {/* Auto-Provisioning Settings */}
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-purple-600/20 rounded-xl flex items-center justify-center border border-purple-500/30">
                  <Zap className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Auto-Provisioning Rules</h3>
                  <p className="text-sm text-gray-400">Automatically create email accounts for new employees</p>
                </div>
              </div>

              <div className="space-y-4">
                {companyDomains.map((domain) => (
                  <div key={domain.id} className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="font-bold text-white">{domain.companyName}</h4>
                        <p className="text-sm text-gray-400">@{domain.domain}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={domain.autoProvision}
                          className="sr-only peer"
                        />
                        <div className="w-14 h-7 bg-[#2A2A2A] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-[#ea580c]"></div>
                      </label>
                    </div>

                    {domain.autoProvision && (
                      <div className="space-y-3 pt-4 border-t border-[#2A2A2A]">
                        <div>
                          <label className="block text-sm font-semibold text-gray-300 mb-2">
                            Email Format
                          </label>
                          <select className="w-full px-4 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-[#ea580c]">
                            <option>firstname.lastname@{domain.domain}</option>
                            <option>firstnamelastname@{domain.domain}</option>
                            <option>first.last@{domain.domain}</option>
                            <option>flastname@{domain.domain}</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-gray-300 mb-2">
                            Default Storage Quota (GB)
                          </label>
                          <input
                            type="number"
                            defaultValue={30}
                            className="w-full px-4 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                          />
                        </div>

                        <div>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              defaultChecked
                              className="w-4 h-4 rounded border-[#2A2A2A] bg-[#0A0A0A] text-[#ea580c] focus:ring-[#ea580c]"
                            />
                            <span className="text-sm text-gray-300">Send welcome email to new users</span>
                          </label>
                        </div>

                        <div>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              defaultChecked
                              className="w-4 h-4 rounded border-[#2A2A2A] bg-[#0A0A0A] text-[#ea580c] focus:ring-[#ea580c]"
                            />
                            <span className="text-sm text-gray-300">Require password change on first login</span>
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Auto-Provisioned Accounts */}
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-[#ea580c]" />
                Recent Auto-Provisioned Accounts
              </h3>
              <div className="space-y-3">
                {emailAccounts.filter(a => a.autoCreated).slice(0, 5).map((account) => (
                  <div key={account.id} className="flex items-center justify-between p-3 bg-[#0A0A0A] rounded-lg border border-[#2A2A2A]">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-green-400" />
                      <div>
                        <p className="font-semibold text-white">{account.email}</p>
                        <p className="text-sm text-gray-400">{account.displayName}</p>
                      </div>
                    </div>
                    <span className="text-sm text-gray-500">{account.createdAt}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* SETTINGS TAB */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            {/* Security Settings */}
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-red-600/20 rounded-xl flex items-center justify-center border border-red-500/30">
                  <Shield className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Security Settings</h3>
                  <p className="text-sm text-gray-400">Configure email security and authentication</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="flex items-center justify-between cursor-pointer p-4 bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] hover:border-[#3A3A3A] transition">
                    <div>
                      <p className="font-semibold text-white">Require Two-Factor Authentication</p>
                      <p className="text-sm text-gray-400">All email accounts must enable 2FA</p>
                    </div>
                    <input
                      type="checkbox"
                      defaultChecked
                      className="w-5 h-5 rounded border-[#2A2A2A] bg-[#0A0A0A] text-[#ea580c] focus:ring-[#ea580c]"
                    />
                  </label>
                </div>

                <div>
                  <label className="flex items-center justify-between cursor-pointer p-4 bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] hover:border-[#3A3A3A] transition">
                    <div>
                      <p className="font-semibold text-white">Enforce Strong Passwords</p>
                      <p className="text-sm text-gray-400">Minimum 12 characters with complexity requirements</p>
                    </div>
                    <input
                      type="checkbox"
                      defaultChecked
                      className="w-5 h-5 rounded border-[#2A2A2A] bg-[#0A0A0A] text-[#ea580c] focus:ring-[#ea580c]"
                    />
                  </label>
                </div>

                <div>
                  <label className="flex items-center justify-between cursor-pointer p-4 bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] hover:border-[#3A3A3A] transition">
                    <div>
                      <p className="font-semibold text-white">Email Encryption (TLS)</p>
                      <p className="text-sm text-gray-400">Encrypt all email communications</p>
                    </div>
                    <input
                      type="checkbox"
                      defaultChecked
                      className="w-5 h-5 rounded border-[#2A2A2A] bg-[#0A0A0A] text-[#ea580c] focus:ring-[#ea580c]"
                    />
                  </label>
                </div>

                <div>
                  <label className="flex items-center justify-between cursor-pointer p-4 bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] hover:border-[#3A3A3A] transition">
                    <div>
                      <p className="font-semibold text-white">SPF/DKIM/DMARC</p>
                      <p className="text-sm text-gray-400">Enable advanced email authentication</p>
                    </div>
                    <input
                      type="checkbox"
                      defaultChecked
                      className="w-5 h-5 rounded border-[#2A2A2A] bg-[#0A0A0A] text-[#ea580c] focus:ring-[#ea580c]"
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Global Settings */}
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">Global Settings</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">
                    Default Password Expiry (Days)
                  </label>
                  <input
                    type="number"
                    defaultValue={90}
                    className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">
                    Email Retention Period (Days)
                  </label>
                  <input
                    type="number"
                    defaultValue={365}
                    className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">
                    Max Attachment Size (MB)
                  </label>
                  <input
                    type="number"
                    defaultValue={25}
                    className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                  />
                </div>
              </div>

              <button className="mt-6 w-full px-6 py-3 bg-gradient-to-r from-[#ea580c] to-[#f97316] hover:opacity-90 text-white rounded-lg font-bold transition">
                Save Settings
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Domain Modal */}
      {showAddDomain && (
        <AddDomainModal
          onClose={() => setShowAddDomain(false)}
          onAdd={(domain) => {
            toast.success(`Domain ${domain} added successfully`);
            setShowAddDomain(false);
          }}
        />
      )}

      {/* Add Account Modal */}
      {showAddAccount && (
        <AddAccountModal
          onClose={() => setShowAddAccount(false)}
          onAdd={handleCreateEmailAccount}
          domains={companyDomains}
        />
      )}

      {/* Import Provider Modal */}
      {showImportProvider && (
        <ImportProviderModal
          onClose={() => setShowImportProvider(false)}
          onImport={handleImportProvider}
        />
      )}
    </div>
  );
}

// Add Domain Modal Component
function AddDomainModal({ onClose, onAdd }: { onClose: () => void; onAdd: (domain: string) => void }) {
  const [domain, setDomain] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [provider, setProvider] = useState<EmailProvider>('google-workspace');

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Add Email Domain</h2>
          <IconButton
            icon={<XCircle />}
            onClick={onClose}
            variant="ghost"
            tooltip="Close"
            className="hover:bg-[#2A2A2A]"
          />
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">Company Name</label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g., TechDesign Inc"
              className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#ea580c]"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">Domain</label>
            <input
              type="text"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="e.g., techdesign.com"
              className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#ea580c]"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">Email Provider</label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as EmailProvider)}
              className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:border-[#ea580c]"
            >
              <option value="google-workspace">Google Workspace</option>
              <option value="microsoft-365">Microsoft 365</option>
              <option value="custom-smtp">Custom SMTP</option>
              <option value="internal">Internal System</option>
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white rounded-xl font-semibold transition"
            >
              Cancel
            </button>
            <button
              onClick={() => onAdd(domain)}
              disabled={!domain || !companyName}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-[#ea580c] to-[#f97316] hover:opacity-90 text-white rounded-xl font-semibold transition disabled:opacity-50"
            >
              Add Domain
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Add Account Modal Component
function AddAccountModal({
  onClose,
  onAdd,
  domains
}: {
  onClose: () => void;
  onAdd: (data: any) => void;
  domains: CompanyEmailDomain[];
}) {
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [selectedDomain, setSelectedDomain] = useState('');
  const [accountType, setAccountType] = useState<AccountType>('employee');
  const [storageQuota, setStorageQuota] = useState(30);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Create Email Account</h2>
          <IconButton
            icon={<XCircle />}
            onClick={onClose}
            variant="ghost"
            tooltip="Close"
            className="hover:bg-[#2A2A2A]"
          />
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">Domain</label>
            <select
              value={selectedDomain}
              onChange={(e) => setSelectedDomain(e.target.value)}
              className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:border-[#ea580c]"
            >
              <option value="">Select domain...</option>
              {domains.map((domain) => (
                <option key={domain.id} value={domain.domain}>
                  @{domain.domain} ({domain.companyName})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">Email Address</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="username"
                className="flex-1 px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#ea580c]"
              />
              <div className="px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-gray-400 flex items-center">
                @{selectedDomain || 'domain.com'}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g., John Smith"
              className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#ea580c]"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">Account Type</label>
            <select
              value={accountType}
              onChange={(e) => setAccountType(e.target.value as AccountType)}
              className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:border-[#ea580c]"
            >
              <option value="employee">Employee</option>
              <option value="contractor">Contractor</option>
              <option value="vendor">Vendor</option>
              <option value="admin">Administrator</option>
              <option value="shared">Shared Mailbox</option>
              <option value="distribution">Distribution List</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">Storage Quota (GB)</label>
            <input
              type="number"
              value={storageQuota}
              onChange={(e) => setStorageQuota(Number(e.target.value))}
              className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:border-[#ea580c]"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white rounded-xl font-semibold transition"
            >
              Cancel
            </button>
            <button
              onClick={() => onAdd({ email: `${email}@${selectedDomain}`, displayName, accountType, storageQuota })}
              disabled={!email || !selectedDomain || !displayName}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-[#ea580c] to-[#f97316] hover:opacity-90 text-white rounded-xl font-semibold transition disabled:opacity-50"
            >
              Create Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Import Provider Modal Component
function ImportProviderModal({
  onClose,
  onImport
}: {
  onClose: () => void;
  onImport: (config: EmailProviderConfig) => void;
}) {
  const [provider, setProvider] = useState<EmailProvider>('google-workspace');
  const [domain, setDomain] = useState('');

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Import Email Provider</h2>
          <IconButton
            icon={<XCircle />}
            onClick={onClose}
            variant="ghost"
            tooltip="Close"
            className="hover:bg-[#2A2A2A]"
          />
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">Provider Type</label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as EmailProvider)}
              className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:border-[#ea580c]"
            >
              <option value="google-workspace">Google Workspace</option>
              <option value="microsoft-365">Microsoft 365</option>
              <option value="custom-smtp">Custom SMTP Server</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">Domain</label>
            <input
              type="text"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="e.g., company.com"
              className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#ea580c]"
            />
          </div>

          {provider === 'custom-smtp' && (
            <>
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">SMTP Host</label>
                <input
                  type="text"
                  placeholder="smtp.example.com"
                  className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#ea580c]"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">SMTP Port</label>
                <input
                  type="number"
                  placeholder="587"
                  className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#ea580c]"
                />
              </div>
            </>
          )}

          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white rounded-xl font-semibold transition"
            >
              Cancel
            </button>
            <button
              onClick={() => onImport({ provider, domain })}
              disabled={!domain}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-[#ea580c] to-[#f97316] hover:opacity-90 text-white rounded-xl font-semibold transition disabled:opacity-50"
            >
              Import Provider
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}