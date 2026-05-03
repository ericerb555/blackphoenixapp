import { useState } from 'react';
import {
  Building, Wrench, AlertCircle, CheckCircle, Clock, Users, DollarSign,
  Settings, Bell, Calendar, FileText, MessageSquare, Phone, Mail,
  MapPin, Plus, Search, Filter, Eye, Edit, Trash2, Download, Upload,
  TrendingUp, BarChart3, PieChart, Activity, Tag, Star, Shield,
  Home, Zap, Package, CreditCard, Gift, Target, User, UserCheck,
  ClipboardList, PlayCircle, Image, Video, Share2, ExternalLink, ArrowRight,
  Briefcase, LineChart, Percent
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import PortfolioManagerPortal from './PortfolioManagerPortal';

interface PropertyAsset {
  id: string;
  propertyName: string;
  address: string;
  propertyType: 'residential' | 'commercial' | 'mixed-use' | 'industrial' | 'retail';
  totalUnits: number;
  occupancyRate: number;
  monthlyRevenue: number;
  operatingExpenses: number;
  netOperatingIncome: number;
  capRate: number;
  status: 'active' | 'under-construction' | 'pending-sale' | 'closed';
  acquisitionDate: string;
  marketValue: number;
  mortgageBalance: number;
  equity: number;
}

interface MaintenanceRequest {
  id: string;
  propertyName: string;
  unitNumber?: string;
  category: 'plumbing' | 'electrical' | 'hvac' | 'structural' | 'landscaping' | 'security';
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'assigned' | 'in-progress' | 'completed' | 'cancelled';
  title: string;
  description: string;
  requestedDate: string;
  scheduledDate?: string;
  completedDate?: string;
  assignedTo?: string;
  estimatedCost?: number;
  actualCost?: number;
  photos: string[];
  notes: string[];
}

interface InvestmentDeal {
  id: string;
  title: string;
  description: string;
  propertyType: string;
  investmentAmount: number;
  projectedROI: number;
  timeframe: string;
  riskLevel: 'low' | 'medium' | 'high';
  featured: boolean;
  status: 'available' | 'under-review' | 'funded' | 'closed';
  image: string;
  location: string;
  interestedInvestors: string[];
}

interface TenantLease {
  id: string;
  propertyName: string;
  unitNumber: string;
  tenantName: string;
  tenantEmail: string;
  tenantPhone: string;
  leaseStart: string;
  leaseEnd: string;
  monthlyRent: number;
  securityDeposit: number;
  status: 'active' | 'expiring-soon' | 'expired' | 'terminated';
  renewalStatus: 'auto-renew' | 'pending-negotiation' | 'not-renewing';
  paymentStatus: 'current' | 'late' | 'overdue';
}

export default function PortfolioManagementCRM() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'properties' | 'maintenance' | 'tenants' | 'investments' | 'portfolio-manager' | 'reports' | 'settings'>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showPropertyModal, setShowPropertyModal] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<PropertyAsset | null>(null);
  const [showPortfolioManagerPortal, setShowPortfolioManagerPortal] = useState(false);

  // Portfolio Info
  const portfolioInfo = {
    name: 'Premier Property Portfolio',
    portfolioManager: 'Michael Anderson',
    totalProperties: 24,
    totalUnits: 486,
    totalValue: 125000000,
    phone: '(305) 555-0200',
    email: 'info@premierportfolio.com'
  };

  // Mock property assets
  const [propertyAssets] = useState<PropertyAsset[]>([
    {
      id: 'PROP-001',
      propertyName: 'Oceanview Towers',
      address: '456 Coastal Boulevard, Miami, FL 33140',
      propertyType: 'residential',
      totalUnits: 120,
      occupancyRate: 96,
      monthlyRevenue: 240000,
      operatingExpenses: 85000,
      netOperatingIncome: 155000,
      capRate: 5.2,
      status: 'active',
      acquisitionDate: '2020-03-15',
      marketValue: 35000000,
      mortgageBalance: 22000000,
      equity: 13000000
    },
    {
      id: 'PROP-002',
      propertyName: 'Downtown Commerce Center',
      address: '789 Business Plaza, Miami, FL 33131',
      propertyType: 'commercial',
      totalUnits: 45,
      occupancyRate: 91,
      monthlyRevenue: 185000,
      operatingExpenses: 62000,
      netOperatingIncome: 123000,
      capRate: 6.1,
      status: 'active',
      acquisitionDate: '2019-08-20',
      marketValue: 24000000,
      mortgageBalance: 15000000,
      equity: 9000000
    },
    {
      id: 'PROP-003',
      propertyName: 'Riverside Mixed-Use Complex',
      address: '321 River Road, Miami, FL 33142',
      propertyType: 'mixed-use',
      totalUnits: 68,
      occupancyRate: 88,
      monthlyRevenue: 156000,
      operatingExpenses: 58000,
      netOperatingIncome: 98000,
      capRate: 5.8,
      status: 'active',
      acquisitionDate: '2021-11-10',
      marketValue: 20000000,
      mortgageBalance: 13000000,
      equity: 7000000
    }
  ]);

  // Mock maintenance requests
  const [maintenanceRequests] = useState<MaintenanceRequest[]>([
    {
      id: 'MR-001',
      propertyName: 'Oceanview Towers',
      unitNumber: '15C',
      category: 'hvac',
      priority: 'high',
      status: 'pending',
      title: 'AC Unit Not Cooling',
      description: 'Central air conditioning system in unit 15C is running but not producing cold air.',
      requestedDate: '2024-01-25T08:00:00Z',
      photos: ['https://images.unsplash.com/photo-1631545023242-0af56a7be9d6?w=400'],
      notes: [],
      estimatedCost: 450
    },
    {
      id: 'MR-002',
      propertyName: 'Downtown Commerce Center',
      category: 'electrical',
      priority: 'critical',
      status: 'in-progress',
      title: 'Emergency Generator Failure',
      description: 'Backup generator failed during weekly test. Needs immediate inspection and repair.',
      requestedDate: '2024-01-24T14:30:00Z',
      scheduledDate: '2024-01-25T10:00:00Z',
      assignedTo: 'Elite Electric Services',
      photos: [],
      notes: ['Technician on-site', 'Parts ordered'],
      estimatedCost: 2500,
      actualCost: 2800
    },
    {
      id: 'MR-003',
      propertyName: 'Riverside Mixed-Use Complex',
      unitNumber: 'Retail-A',
      category: 'plumbing',
      priority: 'medium',
      status: 'completed',
      title: 'Water Pressure Issue',
      description: 'Low water pressure reported in retail unit A. Main line valve was partially closed.',
      requestedDate: '2024-01-22T11:15:00Z',
      scheduledDate: '2024-01-23T09:00:00Z',
      completedDate: '2024-01-23T10:30:00Z',
      assignedTo: 'ProFlow Plumbing',
      photos: [],
      notes: ['Issue resolved', 'Valve adjusted'],
      estimatedCost: 150,
      actualCost: 125
    }
  ]);

  // Mock investment deals
  const [investmentDeals] = useState<InvestmentDeal[]>([
    {
      id: 'DEAL-001',
      title: 'Luxury Beachfront Development',
      description: 'New 80-unit luxury condominium development with ocean views. Pre-construction pricing available.',
      propertyType: 'Residential Development',
      investmentAmount: 5000000,
      projectedROI: 18,
      timeframe: '36 months',
      riskLevel: 'medium',
      featured: true,
      status: 'available',
      image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600',
      location: 'Miami Beach, FL',
      interestedInvestors: ['INV-001', 'INV-003', 'INV-007']
    },
    {
      id: 'DEAL-002',
      title: 'Industrial Warehouse Portfolio',
      description: 'Portfolio of 4 industrial warehouses in growing logistics hub. Strong tenant base with long-term leases.',
      propertyType: 'Industrial',
      investmentAmount: 12000000,
      projectedROI: 12,
      timeframe: '60 months',
      riskLevel: 'low',
      featured: true,
      status: 'under-review',
      image: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600',
      location: 'Fort Lauderdale, FL',
      interestedInvestors: ['INV-002', 'INV-005']
    },
    {
      id: 'DEAL-003',
      title: 'Downtown Office Tower Renovation',
      description: 'Value-add opportunity: 15-story office building requiring modernization. Prime downtown location.',
      propertyType: 'Commercial Office',
      investmentAmount: 8000000,
      projectedROI: 22,
      timeframe: '48 months',
      riskLevel: 'high',
      featured: false,
      status: 'available',
      image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600',
      location: 'Miami, FL',
      interestedInvestors: ['INV-004']
    }
  ]);

  // Mock tenant leases
  const [tenantLeases] = useState<TenantLease[]>([
    {
      id: 'LEASE-001',
      propertyName: 'Oceanview Towers',
      unitNumber: '12A',
      tenantName: 'Sarah Williams',
      tenantEmail: 'sarah.w@email.com',
      tenantPhone: '(305) 555-1111',
      leaseStart: '2023-06-01',
      leaseEnd: '2025-05-31',
      monthlyRent: 2800,
      securityDeposit: 5600,
      status: 'active',
      renewalStatus: 'auto-renew',
      paymentStatus: 'current'
    },
    {
      id: 'LEASE-002',
      propertyName: 'Downtown Commerce Center',
      unitNumber: 'Suite 401',
      tenantName: 'Tech Innovations LLC',
      tenantEmail: 'admin@techinnovations.com',
      tenantPhone: '(305) 555-2222',
      leaseStart: '2022-01-01',
      leaseEnd: '2025-03-31',
      monthlyRent: 8500,
      securityDeposit: 25500,
      status: 'expiring-soon',
      renewalStatus: 'pending-negotiation',
      paymentStatus: 'current'
    },
    {
      id: 'LEASE-003',
      propertyName: 'Riverside Mixed-Use Complex',
      unitNumber: 'Retail-B',
      tenantName: 'Riverside Cafe',
      tenantEmail: 'owner@riversidecafe.com',
      tenantPhone: '(305) 555-3333',
      leaseStart: '2021-09-01',
      leaseEnd: '2024-02-28',
      monthlyRent: 4200,
      securityDeposit: 12600,
      status: 'expiring-soon',
      renewalStatus: 'not-renewing',
      paymentStatus: 'late'
    }
  ]);

  // Portfolio stats
  const portfolioStats = {
    totalProperties: propertyAssets.length,
    totalUnits: propertyAssets.reduce((sum, p) => sum + p.totalUnits, 0),
    avgOccupancyRate: (propertyAssets.reduce((sum, p) => sum + p.occupancyRate, 0) / propertyAssets.length).toFixed(1),
    totalMonthlyRevenue: propertyAssets.reduce((sum, p) => sum + p.monthlyRevenue, 0),
    totalNOI: propertyAssets.reduce((sum, p) => sum + p.netOperatingIncome, 0),
    portfolioValue: propertyAssets.reduce((sum, p) => sum + p.marketValue, 0),
    totalEquity: propertyAssets.reduce((sum, p) => sum + p.equity, 0),
    avgCapRate: (propertyAssets.reduce((sum, p) => sum + p.capRate, 0) / propertyAssets.length).toFixed(2),
    pendingMaintenance: maintenanceRequests.filter(r => r.status === 'pending').length,
    activeMaintenance: maintenanceRequests.filter(r => r.status === 'in-progress').length,
    expiringLeases: tenantLeases.filter(l => l.status === 'expiring-soon').length,
    latePayments: tenantLeases.filter(l => l.paymentStatus === 'late' || l.paymentStatus === 'overdue').length
  };

  if (showPortfolioManagerPortal) {
    return (
      <PortfolioManagerPortal
        portfolioInfo={portfolioInfo}
        onClose={() => setShowPortfolioManagerPortal(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Header */}
      <div className="bg-gradient-to-r from-cyan-600 to-blue-700 p-8 border-b-4 border-cyan-500">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center border-2 border-white/20">
                <Briefcase className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white mb-1">{portfolioInfo.name}</h1>
                <p className="text-gray-200">Portfolio Management System</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowPortfolioManagerPortal(true)}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl hover:from-purple-700 hover:to-purple-800 transition font-bold flex items-center gap-2 shadow-lg shadow-purple-500/20"
              >
                <UserCheck className="w-5 h-5" />
                Portfolio Manager Portal
              </button>
              <button className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-cyan-700 text-white rounded-xl hover:from-cyan-700 hover:to-cyan-800 transition font-bold flex items-center gap-2 shadow-lg shadow-cyan-500/20">
                <Bell className="w-5 h-5" />
                Alerts ({portfolioStats.pendingMaintenance + portfolioStats.expiringLeases})
              </button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-4 gap-4 mt-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-cyan-100 text-sm mb-1">Total Properties</p>
                  <p className="text-3xl font-bold text-white">{portfolioStats.totalProperties}</p>
                </div>
                <Building className="w-8 h-8 text-cyan-200" />
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-cyan-100 text-sm mb-1">Portfolio Value</p>
                  <p className="text-3xl font-bold text-white">${(portfolioStats.portfolioValue / 1000000).toFixed(1)}M</p>
                </div>
                <DollarSign className="w-8 h-8 text-cyan-200" />
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-cyan-100 text-sm mb-1">Avg Occupancy</p>
                  <p className="text-3xl font-bold text-white">{portfolioStats.avgOccupancyRate}%</p>
                </div>
                <Users className="w-8 h-8 text-cyan-200" />
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-cyan-100 text-sm mb-1">Monthly NOI</p>
                  <p className="text-3xl font-bold text-white">${(portfolioStats.totalNOI / 1000).toFixed(0)}K</p>
                </div>
                <TrendingUp className="w-8 h-8 text-cyan-200" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-[#1A1A1A] border-b border-[#2A2A2A]">
        <div className="max-w-7xl mx-auto px-8">
          <div className="flex gap-1">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
              { id: 'properties', label: 'Properties', icon: Building },
              { id: 'maintenance', label: 'Maintenance', icon: Wrench },
              { id: 'tenants', label: 'Tenants', icon: Users },
              { id: 'investments', label: 'Investments', icon: TrendingUp },
              { id: 'reports', label: 'Reports', icon: FileText },
              { id: 'settings', label: 'Settings', icon: Settings }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-6 py-4 font-medium transition flex items-center gap-2 border-b-2 ${
                    activeTab === tab.id
                      ? 'text-cyan-400 border-cyan-500 bg-cyan-500/5'
                      : 'text-gray-400 border-transparent hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-8">
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-4 gap-6">
              <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-600/20 to-green-700/20 flex items-center justify-center border border-green-500/30">
                    <LineChart className="w-6 h-6 text-green-400" />
                  </div>
                  <span className="text-xs px-2 py-1 bg-green-500/10 text-green-400 rounded-lg border border-green-500/20">
                    +5.2%
                  </span>
                </div>
                <p className="text-sm text-gray-400 mb-1">Total Equity</p>
                <p className="text-2xl font-bold text-white">${(portfolioStats.totalEquity / 1000000).toFixed(1)}M</p>
              </div>

              <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600/20 to-blue-700/20 flex items-center justify-center border border-blue-500/30">
                    <Percent className="w-6 h-6 text-blue-400" />
                  </div>
                  <span className="text-xs px-2 py-1 bg-blue-500/10 text-blue-400 rounded-lg border border-blue-500/20">
                    Stable
                  </span>
                </div>
                <p className="text-sm text-gray-400 mb-1">Avg Cap Rate</p>
                <p className="text-2xl font-bold text-white">{portfolioStats.avgCapRate}%</p>
              </div>

              <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-600/20 to-orange-700/20 flex items-center justify-center border border-orange-500/30">
                    <AlertCircle className="w-6 h-6 text-orange-400" />
                  </div>
                  <span className="text-xs px-2 py-1 bg-orange-500/10 text-orange-400 rounded-lg border border-orange-500/20">
                    Action Required
                  </span>
                </div>
                <p className="text-sm text-gray-400 mb-1">Expiring Leases</p>
                <p className="text-2xl font-bold text-white">{portfolioStats.expiringLeases}</p>
              </div>

              <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-600/20 to-red-700/20 flex items-center justify-center border border-red-500/30">
                    <Wrench className="w-6 h-6 text-red-400" />
                  </div>
                  <span className="text-xs px-2 py-1 bg-red-500/10 text-red-400 rounded-lg border border-red-500/20">
                    {portfolioStats.pendingMaintenance} Pending
                  </span>
                </div>
                <p className="text-sm text-gray-400 mb-1">Maintenance Requests</p>
                <p className="text-2xl font-bold text-white">{maintenanceRequests.length}</p>
              </div>
            </div>

            {/* Recent Activity & Quick Actions */}
            <div className="grid grid-cols-2 gap-6">
              {/* Top Performing Properties */}
              <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-400" />
                  Top Performing Properties
                </h3>
                <div className="space-y-3">
                  {propertyAssets.sort((a, b) => b.capRate - a.capRate).slice(0, 3).map((property) => (
                    <div key={property.id} className="flex items-center justify-between p-3 bg-[#0F0F0F] rounded-lg border border-[#2A2A2A]">
                      <div className="flex-1">
                        <p className="text-sm font-bold text-white">{property.propertyName}</p>
                        <p className="text-xs text-gray-400">{property.totalUnits} units • {property.occupancyRate}% occupied</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-green-400">{property.capRate}%</p>
                        <p className="text-xs text-gray-500">Cap Rate</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Urgent Maintenance */}
              <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-400" />
                  Urgent Maintenance Requests
                </h3>
                <div className="space-y-3">
                  {maintenanceRequests.filter(r => r.priority === 'critical' || r.priority === 'high').slice(0, 3).map((request) => (
                    <div key={request.id} className="flex items-center justify-between p-3 bg-[#0F0F0F] rounded-lg border border-[#2A2A2A]">
                      <div className="flex-1">
                        <p className="text-sm font-bold text-white">{request.title}</p>
                        <p className="text-xs text-gray-400">{request.propertyName} {request.unitNumber ? `• ${request.unitNumber}` : ''}</p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        request.priority === 'critical' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                        'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                      }`}>
                        {request.priority.toUpperCase()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'properties' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">Property Portfolio</h2>
              <button className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-cyan-700 text-white rounded-xl hover:from-cyan-700 hover:to-cyan-800 transition font-bold flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Add Property
              </button>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {propertyAssets.map((property) => (
                <div key={property.id} className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-white mb-2">{property.propertyName}</h3>
                      <p className="text-gray-400 flex items-center gap-2 mb-1">
                        <MapPin className="w-4 h-4" />
                        {property.address}
                      </p>
                      <div className="flex items-center gap-4 mt-2">
                        <span className="px-3 py-1 bg-cyan-500/10 text-cyan-400 rounded-lg text-sm font-semibold border border-cyan-500/20">
                          {property.propertyType.replace('-', ' ').toUpperCase()}
                        </span>
                        <span className="px-3 py-1 bg-green-500/10 text-green-400 rounded-lg text-sm font-semibold border border-green-500/20">
                          {property.status.toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <button className="px-4 py-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] rounded-xl text-white transition flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      View Details
                    </button>
                  </div>

                  <div className="grid grid-cols-6 gap-4 pt-4 border-t border-[#2A2A2A]">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Total Units</p>
                      <p className="text-lg font-bold text-white">{property.totalUnits}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Occupancy</p>
                      <p className="text-lg font-bold text-green-400">{property.occupancyRate}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Monthly Revenue</p>
                      <p className="text-lg font-bold text-white">${(property.monthlyRevenue / 1000).toFixed(0)}K</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">NOI</p>
                      <p className="text-lg font-bold text-white">${(property.netOperatingIncome / 1000).toFixed(0)}K</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Cap Rate</p>
                      <p className="text-lg font-bold text-cyan-400">{property.capRate}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Market Value</p>
                      <p className="text-lg font-bold text-white">${(property.marketValue / 1000000).toFixed(1)}M</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'maintenance' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">Maintenance Requests</h2>
              <button className="px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-xl hover:from-orange-700 hover:to-orange-800 transition font-bold flex items-center gap-2">
                <Plus className="w-5 h-5" />
                New Request
              </button>
            </div>

            <div className="space-y-4">
              {maintenanceRequests.map((request) => (
                <div key={request.id} className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold text-white">{request.title}</h3>
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          request.priority === 'critical' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                          request.priority === 'high' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
                          request.priority === 'medium' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                          'bg-green-500/10 text-green-400 border border-green-500/20'
                        }`}>
                          {request.priority.toUpperCase()}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          request.status === 'completed' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                          request.status === 'in-progress' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                          request.status === 'pending' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                          'bg-gray-500/10 text-gray-400 border border-gray-500/20'
                        }`}>
                          {request.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-gray-400 mb-2">{request.description}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Building className="w-4 h-4" />
                          {request.propertyName}
                        </span>
                        {request.unitNumber && (
                          <span className="flex items-center gap-1">
                            <Home className="w-4 h-4" />
                            Unit {request.unitNumber}
                          </span>
                        )}
                        {request.assignedTo && (
                          <span className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            {request.assignedTo}
                          </span>
                        )}
                        {request.estimatedCost && (
                          <span className="flex items-center gap-1">
                            <DollarSign className="w-4 h-4" />
                            ${request.estimatedCost}
                          </span>
                        )}
                      </div>
                    </div>
                    <button className="px-4 py-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] rounded-xl text-white transition">
                      Manage
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'investments' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">Investment Opportunities</h2>
              <button className="px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 transition font-bold flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Add Deal
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {investmentDeals.map((deal) => (
                <div key={deal.id} className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] overflow-hidden">
                  <img src={deal.image} alt={deal.title} className="w-full h-48 object-cover" />
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-lg font-bold text-white">{deal.title}</h3>
                      {deal.featured && (
                        <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                      )}
                    </div>
                    <p className="text-gray-400 text-sm mb-4">{deal.description}</p>
                    
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Investment Amount</p>
                        <p className="text-lg font-bold text-white">${(deal.investmentAmount / 1000000).toFixed(1)}M</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Projected ROI</p>
                        <p className="text-lg font-bold text-green-400">{deal.projectedROI}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Timeframe</p>
                        <p className="text-sm font-semibold text-white">{deal.timeframe}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Risk Level</p>
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          deal.riskLevel === 'low' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                          deal.riskLevel === 'medium' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                          'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}>
                          {deal.riskLevel.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mb-4">
                      <MapPin className="w-4 h-4 text-gray-500" />
                      <p className="text-sm text-gray-400">{deal.location}</p>
                    </div>

                    <button className="w-full py-3 bg-gradient-to-r from-cyan-600 to-cyan-700 text-white rounded-xl hover:from-cyan-700 hover:to-cyan-800 transition font-bold">
                      View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'tenants' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">Tenant Leases</h2>
              <button className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition font-bold flex items-center gap-2">
                <Plus className="w-5 h-5" />
                New Lease
              </button>
            </div>

            <div className="space-y-4">
              {tenantLeases.map((lease) => (
                <div key={lease.id} className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-white mb-2">{lease.tenantName}</h3>
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          lease.status === 'active' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                          lease.status === 'expiring-soon' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
                          'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}>
                          {lease.status.toUpperCase().replace('-', ' ')}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          lease.paymentStatus === 'current' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                          lease.paymentStatus === 'late' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                          'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}>
                          Payment: {lease.paymentStatus.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-400">
                        <span className="flex items-center gap-1">
                          <Building className="w-4 h-4" />
                          {lease.propertyName}
                        </span>
                        <span className="flex items-center gap-1">
                          <Home className="w-4 h-4" />
                          {lease.unitNumber}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(lease.leaseEnd).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-white mb-1">${lease.monthlyRent.toLocaleString()}</p>
                      <p className="text-xs text-gray-500">Monthly Rent</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button className="flex-1 py-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] rounded-xl text-white transition text-sm">
                      Contact Tenant
                    </button>
                    <button className="flex-1 py-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] rounded-xl text-white transition text-sm">
                      View Lease
                    </button>
                    <button className="flex-1 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-xl text-white transition text-sm font-semibold">
                      Manage Renewal
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Reports & Analytics</h3>
            <p className="text-gray-400">Generate comprehensive portfolio reports and analytics</p>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="text-center py-12">
            <Settings className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Portfolio Settings</h3>
            <p className="text-gray-400">Configure portfolio management preferences</p>
          </div>
        )}
      </div>
    </div>
  );
}
