/**
 * Territory-Based Cohort Management System
 *
 * Geographic radius-based cohort management with:
 * - 50-mile radius territories
 * - Trade-specific capacity (4 per trade)
 * - Role limits: 5 vendors, 5 advertisers, 4 per trade
 * - Total territory cap: 45 members
 * - 6-month free trial periods
 * - Founder pricing (30% off for life) for first 10 subcontractors
 */

import { useState, useEffect } from 'react';
import {
  MapPin, Users, Target, Crown, Percent, Calendar, AlertCircle,
  CheckCircle, Clock, TrendingUp, Search, Plus, Edit2, Trash2,
  Wrench, Building2, Megaphone, Award, Lock, Unlock, Star,
  ChevronDown, ChevronRight, Eye, BarChart3, Map, Activity,
  Timer, Zap, Shield, DollarSign, Package, X, Filter, Settings, Save
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { CohortSettingsModal } from './CohortSettingsModal';
import { FoundingMemberLimitsModal } from './FoundingMemberLimitsModal';
import { useCompany } from '../contexts/CompanyContext';

type ViewMode = 'territories' | 'members' | 'analytics' | 'waiting-list';
type MemberType = 'subcontractor' | 'vendor' | 'advertiser';
type MemberStatus = 'trial' | 'active' | 'expired' | 'suspended';

interface Territory {
  id: string;
  name: string;
  zipCode: string;
  city: string;
  state: string;
  address?: string;
  radius: number;
  active: boolean;
  createdDate: string;
  allowCrossState: boolean;
  ownerCompanyId?: string;
  coveredCities?: string[];
  coveredStates?: string[];
  subcontractorsByTrade: { [trade: string]: Member[] };
  vendors: Member[];
  advertisers: Member[];
  foundingMemberLimits?: {
    subcontractorsPerTrade: number;
    totalVendors: number;
    totalAdvertisers: number;
  };
}

interface Member {
  id: string;
  name: string;
  type: MemberType;
  trade?: string;
  joinDate: string;
  trialEndDate: string;
  status: MemberStatus;
  isFounder: boolean;
  founderNumber?: number;
  subscriptionRate: number;
  normalRate: number;
  location: {
    address: string;
    zipCode: string;
    distance: number;
  };
  phone: string;
  email: string;
}

const CAPACITY_LIMITS = {
  total: 45,
  subcontractorsPerTrade: 4,
  vendors: 5,
  advertisers: 5,
  radius: 50,
  trialMonths: 6,
  founderSlots: 10,
  founderDiscount: 0.30,
};

const SUBSCRIPTION_RATES = {
  subcontractor: 99,
  vendor: 149,
  advertiser: 199,
};

const TRADES = [
  'Plumbing', 'Electrical', 'HVAC', 'Carpentry', 'Masonry',
  'Roofing', 'Painting', 'Flooring', 'Landscaping', 'Concrete',
  'Drywall', 'Siding', 'Windows', 'Doors', 'Insulation',
  'Fencing', 'Demolition', 'Framing', 'Foundation', 'Excavation'
];

export function TerritoryBasedCohortManagement() {
  const companyContext = useCompany();
  const activeCompany = companyContext?.activeCompany;

  const [viewMode, setViewMode] = useState<ViewMode>('territories');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTerritory, setSelectedTerritory] = useState<string | null>(null);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showCreateTerritoryModal, setShowCreateTerritoryModal] = useState(false);
  const [editingTerritory, setEditingTerritory] = useState<Territory | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showFoundingLimitsModal, setShowFoundingLimitsModal] = useState(false);
  const [editingFoundingLimitsFor, setEditingFoundingLimitsFor] = useState<string | null>(null);
  const [expandedTrades, setExpandedTrades] = useState<string[]>([]);

  // Territory form state
  const [formName, setFormName] = useState('');
  const [formZipCode, setFormZipCode] = useState('');
  const [formCity, setFormCity] = useState('');
  const [formState, setFormState] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formRadius, setFormRadius] = useState(CAPACITY_LIMITS.radius);
  const [formActive, setFormActive] = useState(true);
  const [formAllowCrossState, setFormAllowCrossState] = useState(false);
  const [formSubsPerTrade, setFormSubsPerTrade] = useState(CAPACITY_LIMITS.subcontractorsPerTrade);
  const [formVendorLimit, setFormVendorLimit] = useState(CAPACITY_LIMITS.vendors);
  const [formAdvertiserLimit, setFormAdvertiserLimit] = useState(CAPACITY_LIMITS.advertisers);

  // Populate form when editing territory
  useEffect(() => {
    if (editingTerritory) {
      setFormName(editingTerritory.name);
      setFormZipCode(editingTerritory.zipCode);
      setFormCity(editingTerritory.city);
      setFormState(editingTerritory.state);
      setFormAddress(editingTerritory.address || '');
      setFormRadius(editingTerritory.radius);
      setFormActive(editingTerritory.active);
      setFormAllowCrossState(editingTerritory.allowCrossState);
      setFormSubsPerTrade(editingTerritory.foundingMemberLimits?.subcontractorsPerTrade || CAPACITY_LIMITS.subcontractorsPerTrade);
      setFormVendorLimit(editingTerritory.foundingMemberLimits?.totalVendors || CAPACITY_LIMITS.vendors);
      setFormAdvertiserLimit(editingTerritory.foundingMemberLimits?.totalAdvertisers || CAPACITY_LIMITS.advertisers);
    } else {
      setFormName('');
      setFormZipCode('');
      setFormCity('');
      setFormState('');
      setFormAddress('');
      setFormRadius(CAPACITY_LIMITS.radius);
      setFormActive(true);
      setFormAllowCrossState(false);
      setFormSubsPerTrade(CAPACITY_LIMITS.subcontractorsPerTrade);
      setFormVendorLimit(CAPACITY_LIMITS.vendors);
      setFormAdvertiserLimit(CAPACITY_LIMITS.advertisers);
    }
  }, [editingTerritory]);

  // Helper function to calculate coverage area based on city/state
  const calculateCoverageArea = (city: string, state: string, radius: number, allowCrossState: boolean) => {
    // In a production app, this would use a geocoding API (Google Maps, Mapbox, etc.)
    // For now, we'll use predefined coverage areas based on major cities
    const coverageMap: { [key: string]: { cities: string[], nearbyStates?: string[] } } = {
      'Salem_NH': {
        cities: [
          'Salem', 'Derry', 'Londonderry', 'Windham', 'Pelham', 'Atkinson', 'Hampstead',
          'Nashua', 'Hudson', 'Litchfield', 'Manchester', 'Bedford', 'Merrimack',
          'Methuen', 'Lawrence', 'Haverhill', 'Andover', 'North Andover', 'Lowell',
          'Chelmsford', 'Tewksbury', 'Dracut', 'Billerica', 'Burlington', 'Woburn',
          'Reading', 'Wakefield', 'Stoneham', 'Malden', 'Medford', 'Everett'
        ],
        nearbyStates: ['NH', 'MA', 'ME']
      },
      'Boston_MA': {
        cities: [
          'Boston', 'Cambridge', 'Somerville', 'Quincy', 'Lynn', 'Salem', 'Waltham',
          'Newton', 'Brookline', 'Medford', 'Malden', 'Revere', 'Chelsea', 'Everett',
          'Framingham', 'Natick', 'Needham', 'Wellesley', 'Lexington', 'Arlington',
          'Watertown', 'Belmont', 'Milton', 'Dedham', 'Braintree', 'Weymouth'
        ],
        nearbyStates: ['MA', 'NH', 'RI']
      },
      'New York_NY': {
        cities: [
          'New York', 'Brooklyn', 'Queens', 'Manhattan', 'Bronx', 'Staten Island',
          'Yonkers', 'White Plains', 'New Rochelle', 'Mount Vernon', 'Newark', 'Jersey City'
        ],
        nearbyStates: ['NY', 'NJ', 'CT']
      },
      'Los Angeles_CA': {
        cities: [
          'Los Angeles', 'Long Beach', 'Anaheim', 'Santa Ana', 'Irvine', 'Glendale',
          'Pasadena', 'Torrance', 'Burbank', 'Pomona', 'Downey', 'Inglewood'
        ],
        nearbyStates: ['CA']
      },
      'Chicago_IL': {
        cities: [
          'Chicago', 'Aurora', 'Naperville', 'Joliet', 'Rockford', 'Elgin',
          'Waukegan', 'Cicero', 'Evanston', 'Oak Lawn', 'Berwyn', 'Schaumburg'
        ],
        nearbyStates: ['IL', 'IN', 'WI']
      }
    };

    const key = `${city}_${state}`;
    const coverage = coverageMap[key] || {
      cities: [city],
      nearbyStates: [state]
    };

    const coveredStates = allowCrossState
      ? (coverage.nearbyStates || [state])
      : [state];

    return {
      coveredCities: coverage.cities,
      coveredStates
    };
  };

  // Auto-create territory from company data
  useEffect(() => {
    if (activeCompany && activeCompany.address && activeCompany.city && activeCompany.state) {
      // Check if territory already exists for this company
      const existingTerritory = territories.find(t => t.ownerCompanyId === activeCompany.id);

      if (!existingTerritory) {
        console.log('[TerritoryManagement] Auto-creating territory for company:', activeCompany.name);

        // Calculate coverage area based on company location
        const { coveredCities, coveredStates } = calculateCoverageArea(
          activeCompany.city,
          activeCompany.state,
          CAPACITY_LIMITS.radius,
          false // Default to no cross-state expansion
        );

        const newTerritory: Territory = {
          id: `TERR-${activeCompany.id}`,
          name: `${activeCompany.name} Territory`,
          zipCode: activeCompany.zip_code || '',
          city: activeCompany.city,
          state: activeCompany.state,
          address: activeCompany.address,
          radius: CAPACITY_LIMITS.radius,
          active: true,
          allowCrossState: false,
          ownerCompanyId: activeCompany.id,
          coveredCities,
          coveredStates,
          createdDate: new Date().toISOString().split('T')[0],
          subcontractorsByTrade: {},
          vendors: [],
          advertisers: [],
          foundingMemberLimits: {
            subcontractorsPerTrade: CAPACITY_LIMITS.subcontractorsPerTrade,
            totalVendors: CAPACITY_LIMITS.vendors,
            totalAdvertisers: CAPACITY_LIMITS.advertisers,
          }
        };

        setTerritories(prev => [newTerritory, ...prev]);
        toast.success(`Territory created for ${activeCompany.name} covering ${coveredCities.length} cities`);
      }
    }
  }, [activeCompany]);

  // Mock territories data
  const [territories, setTerritories] = useState<Territory[]>([
    {
      id: 'TERR-001',
      name: 'Downtown Metro',
      zipCode: '10001',
      city: 'New York',
      state: 'NY',
      address: '123 Main St',
      radius: 40,
      active: true,
      allowCrossState: false,
      coveredCities: ['New York', 'Brooklyn', 'Queens', 'Manhattan', 'Bronx'],
      coveredStates: ['NY'],
      createdDate: '2024-01-15',
      subcontractorsByTrade: {
        'Plumbing': [
          {
            id: 'SUB-001',
            name: 'Premier Plumbing Co',
            type: 'subcontractor',
            trade: 'Plumbing',
            joinDate: '2024-01-20',
            trialEndDate: '2024-07-20',
            status: 'trial',
            isFounder: true,
            founderNumber: 1,
            subscriptionRate: 69.30,
            normalRate: 99,
            location: { address: '123 Main St', zipCode: '10001', distance: 2.5 },
            phone: '555-0101',
            email: 'contact@premierplumbing.com'
          },
          {
            id: 'SUB-002',
            name: 'Quick Fix Plumbing',
            type: 'subcontractor',
            trade: 'Plumbing',
            joinDate: '2024-02-01',
            trialEndDate: '2024-08-01',
            status: 'trial',
            isFounder: true,
            founderNumber: 2,
            subscriptionRate: 69.30,
            normalRate: 99,
            location: { address: '456 Oak Ave', zipCode: '10002', distance: 8.3 },
            phone: '555-0102',
            email: 'info@quickfixplumbing.com'
          }
        ],
        'Electrical': [
          {
            id: 'SUB-003',
            name: 'Bright Sparks Electric',
            type: 'subcontractor',
            trade: 'Electrical',
            joinDate: '2024-01-25',
            trialEndDate: '2024-07-25',
            status: 'trial',
            isFounder: true,
            founderNumber: 3,
            subscriptionRate: 69.30,
            normalRate: 99,
            location: { address: '789 Elm St', zipCode: '10003', distance: 5.1 },
            phone: '555-0103',
            email: 'hello@brightsparks.com'
          }
        ],
        'HVAC': [
          {
            id: 'SUB-004',
            name: 'Cool Comfort HVAC',
            type: 'subcontractor',
            trade: 'HVAC',
            joinDate: '2024-02-10',
            trialEndDate: '2024-08-10',
            status: 'trial',
            isFounder: true,
            founderNumber: 4,
            subscriptionRate: 69.30,
            normalRate: 99,
            location: { address: '321 Pine Rd', zipCode: '10004', distance: 12.7 },
            phone: '555-0104',
            email: 'service@coolcomfort.com'
          }
        ]
      },
      vendors: [
        {
          id: 'VEN-001',
          name: 'Home Depot Partner',
          type: 'vendor',
          joinDate: '2024-01-18',
          trialEndDate: '2024-07-18',
          status: 'active',
          isFounder: false,
          subscriptionRate: 149,
          normalRate: 149,
          location: { address: '100 Commerce Dr', zipCode: '10005', distance: 15.2 },
          phone: '555-0201',
          email: 'partner@homedepot.com'
        }
      ],
      advertisers: [
        {
          id: 'ADV-001',
          name: 'Metro Marketing Group',
          type: 'advertiser',
          joinDate: '2024-02-05',
          trialEndDate: '2024-08-05',
          status: 'trial',
          isFounder: false,
          subscriptionRate: 199,
          normalRate: 199,
          location: { address: '500 Ad Plaza', zipCode: '10006', distance: 18.5 },
          phone: '555-0301',
          email: 'info@metromarketing.com'
        }
      ]
    }
  ]);

  const getTotalMembers = (territory: Territory): number => {
    const subcontractorCount = Object.values(territory.subcontractorsByTrade)
      .reduce((sum, members) => sum + members.length, 0);
    return subcontractorCount + territory.vendors.length + territory.advertisers.length;
  };

  const getCapacityPercentage = (territory: Territory): number => {
    return (getTotalMembers(territory) / CAPACITY_LIMITS.total) * 100;
  };

  const getTradeCapacity = (territory: Territory, trade: string): number => {
    const members = territory.subcontractorsByTrade[trade] || [];
    return members.length;
  };

  const getFounderCount = (territory: Territory): number => {
    return Object.values(territory.subcontractorsByTrade)
      .flat()
      .filter(m => m.isFounder).length;
  };

  const canAddMember = (territory: Territory, type: MemberType, trade?: string): boolean => {
    const total = getTotalMembers(territory);
    
    if (total >= CAPACITY_LIMITS.total) return false;
    
    if (type === 'subcontractor' && trade) {
      const tradeCount = getTradeCapacity(territory, trade);
      return tradeCount < CAPACITY_LIMITS.subcontractorsPerTrade;
    }
    
    if (type === 'vendor') {
      return territory.vendors.length < CAPACITY_LIMITS.vendors;
    }
    
    if (type === 'advertiser') {
      return territory.advertisers.length < CAPACITY_LIMITS.advertisers;
    }
    
    return false;
  };

  const getCapacityColor = (percentage: number): string => {
    if (percentage >= 90) return 'text-red-400';
    if (percentage >= 75) return 'text-yellow-400';
    if (percentage >= 50) return 'text-blue-400';
    return 'text-green-400';
  };

  const getStatusColor = (status: MemberStatus): string => {
    switch (status) {
      case 'trial': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'active': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'expired': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'suspended': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const calculateTrialEndDate = (startDate: string): string => {
    const date = new Date(startDate);
    date.setMonth(date.getMonth() + CAPACITY_LIMITS.trialMonths);
    return date.toISOString().split('T')[0];
  };

  const toggleTradeExpansion = (trade: string) => {
    setExpandedTrades(prev =>
      prev.includes(trade)
        ? prev.filter(t => t !== trade)
        : [...prev, trade]
    );
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] p-6 w-full" style={{ alignSelf: 'stretch' }}>
      <div className="max-w-[1800px] mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl flex items-center justify-center">
                <MapPin className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Territory-Based Cohort Management</h1>
                <p className="text-zinc-400 mt-1">
                  40-mile radius territories • 45 total capacity • 4 per trade • 6-month trials • Founder pricing
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowSettingsModal(true)}
                className="px-4 py-3 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg font-medium flex items-center gap-2 transition-colors border border-zinc-800"
              >
                <Settings className="w-5 h-5" />
                Settings
              </button>
              <button
                onClick={() => {
                  setEditingTerritory(null);
                  setShowCreateTerritoryModal(true);
                }}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Create Territory
              </button>
            </div>
          </div>
        </div>

        {/* View Mode Tabs */}
        <div className="bg-[#1A1A1A] border border-zinc-800 rounded-lg p-2 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            {[
              { id: 'territories', label: 'Territories', icon: Map, count: territories.length },
              { id: 'members', label: 'All Members', icon: Users, count: territories.reduce((sum, t) => sum + getTotalMembers(t), 0) },
              { id: 'analytics', label: 'Analytics', icon: BarChart3, count: 0 },
              { id: 'waiting-list', label: 'Waiting List', icon: Clock, count: 0 },
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = viewMode === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setViewMode(tab.id as ViewMode)}
                  className={`p-4 rounded-lg transition-all ${
                    isActive
                      ? 'bg-purple-600 text-white shadow-lg'
                      : 'bg-[#0A0A0A] text-zinc-400 hover:text-white hover:bg-[#2A2A2A]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="w-5 h-5" />
                      <span className="font-semibold">{tab.label}</span>
                    </div>
                    {tab.count > 0 && (
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        isActive ? 'bg-white/20' : 'bg-zinc-800'
                      }`}>
                        {tab.count}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* TERRITORIES VIEW */}
        {viewMode === 'territories' && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {territories.map(territory => {
              const totalMembers = getTotalMembers(territory);
              const capacityPercent = getCapacityPercentage(territory);
              const founderCount = getFounderCount(territory);
              const remainingFounderSlots = CAPACITY_LIMITS.founderSlots - founderCount;

              return (
                <div
                  key={territory.id}
                  className="bg-[#1A1A1A] border border-zinc-800 rounded-xl overflow-hidden hover:border-purple-500/50 transition-all"
                >
                  {/* Territory Header */}
                  <div className="bg-gradient-to-r from-purple-600/20 to-purple-700/10 border-b border-zinc-800 p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-purple-600/20 rounded-lg flex items-center justify-center">
                          <MapPin className="w-6 h-6 text-purple-400" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-white">{territory.name}</h3>
                          <p className="text-sm text-zinc-400">
                            {territory.city}, {territory.state} {territory.zipCode} • {territory.radius}mi radius
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditingTerritory(territory);
                            setShowCreateTerritoryModal(true);
                          }}
                          className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4 text-zinc-400" />
                        </button>
                        <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                          territory.active
                            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                            : 'bg-red-500/20 text-red-400 border border-red-500/30'
                        }`}>
                          {territory.active ? 'Active' : 'Inactive'}
                        </div>
                      </div>
                    </div>

                    {/* Capacity Bar */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-zinc-400">Territory Capacity</span>
                        <span className={`text-sm font-bold ${getCapacityColor(capacityPercent)}`}>
                          {totalMembers} / {CAPACITY_LIMITS.total}
                        </span>
                      </div>
                      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            capacityPercent >= 90 ? 'bg-red-500' :
                            capacityPercent >= 75 ? 'bg-yellow-500' :
                            capacityPercent >= 50 ? 'bg-blue-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${capacityPercent}%` }}
                        />
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-[#0A0A0A] border border-zinc-800 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Wrench className="w-4 h-4 text-orange-400" />
                          <span className="text-xs text-zinc-400">Subcontractors</span>
                        </div>
                        <p className="text-lg font-bold text-white">
                          {Object.values(territory.subcontractorsByTrade).reduce((sum, members) => sum + members.length, 0)}
                        </p>
                      </div>
                      <div className="bg-[#0A0A0A] border border-zinc-800 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Building2 className="w-4 h-4 text-blue-400" />
                          <span className="text-xs text-zinc-400">Vendors</span>
                        </div>
                        <p className="text-lg font-bold text-white">
                          {territory.vendors.length} / {CAPACITY_LIMITS.vendors}
                        </p>
                      </div>
                      <div className="bg-[#0A0A0A] border border-zinc-800 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Megaphone className="w-4 h-4 text-purple-400" />
                          <span className="text-xs text-zinc-400">Advertisers</span>
                        </div>
                        <p className="text-lg font-bold text-white">
                          {territory.advertisers.length} / {CAPACITY_LIMITS.advertisers}
                        </p>
                      </div>
                    </div>

                    {/* Covered Cities & States */}
                    {(territory.coveredCities || territory.coveredStates) && (
                      <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                        <div className="flex items-start gap-2">
                          <Map className="w-4 h-4 text-blue-400 flex-shrink-0 mt-1" />
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-xs font-medium text-blue-400">Coverage Area ({territory.radius} mi radius)</p>
                              {territory.coveredCities && (
                                <span className="text-xs text-zinc-500">{territory.coveredCities.length} cities</span>
                              )}
                            </div>
                            {territory.coveredCities && territory.coveredCities.length > 0 && (
                              <p className="text-xs text-zinc-300 leading-relaxed">
                                {territory.coveredCities.slice(0, 6).join(', ')}
                                {territory.coveredCities.length > 6 && ` +${territory.coveredCities.length - 6} more`}
                              </p>
                            )}
                            {territory.coveredStates && territory.coveredStates.length > 0 && (
                              <div className="flex items-center gap-2 mt-2">
                                <p className="text-xs text-zinc-400">
                                  {territory.coveredStates.length > 1 ? 'States: ' : 'State: '}
                                  <span className="text-zinc-300 font-medium">{territory.coveredStates.join(', ')}</span>
                                </p>
                                {territory.allowCrossState && territory.coveredStates.length > 1 && (
                                  <span className="text-xs text-purple-400 flex items-center gap-1">
                                    <Shield className="w-3 h-3" />
                                    Cross-state
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Founder Status */}
                    {remainingFounderSlots > 0 && (
                      <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Crown className="w-5 h-5 text-yellow-400" />
                          <span className="text-sm font-medium text-yellow-400">
                            {remainingFounderSlots} Founder Slots Remaining
                          </span>
                          <span className="ml-auto text-xs text-yellow-400/80">
                            30% off for life
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Configure Founding Limits Button */}
                    <button
                      onClick={() => {
                        setEditingFoundingLimitsFor(territory.id);
                        setShowFoundingLimitsModal(true);
                      }}
                      className="mt-3 w-full px-4 py-2 bg-yellow-600/10 hover:bg-yellow-600/20 border border-yellow-500/30 hover:border-yellow-500/50 rounded-lg transition-all flex items-center justify-center gap-2 text-yellow-400 hover:text-yellow-300 font-medium"
                    >
                      <Settings className="w-4 h-4" />
                      Configure Founding Member Limits
                    </button>
                  </div>

                  {/* Trades Breakdown */}
                  <div className="p-6">
                    <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                      <Target className="w-4 h-4 text-purple-400" />
                      Subcontractors by Trade
                    </h4>
                    <div className="space-y-2">
                      {TRADES.map(trade => {
                        const members = territory.subcontractorsByTrade[trade] || [];
                        const capacity = members.length;
                        const isExpanded = expandedTrades.includes(trade);
                        const isFull = capacity >= CAPACITY_LIMITS.subcontractorsPerTrade;

                        if (capacity === 0) return null;

                        return (
                          <div key={trade} className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
                            <button
                              onClick={() => toggleTradeExpansion(trade)}
                              className="w-full p-3 flex items-center justify-between hover:bg-zinc-800 transition-colors"
                            >
                              <div className="flex items-center gap-3 flex-1">
                                <Wrench className="w-4 h-4 text-orange-400" />
                                <span className="text-sm font-medium text-white">{trade}</span>
                                <div className="flex-1 max-w-[120px] h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full ${isFull ? 'bg-red-500' : 'bg-orange-500'}`}
                                    style={{ width: `${(capacity / CAPACITY_LIMITS.subcontractorsPerTrade) * 100}%` }}
                                  />
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className={`text-sm font-bold ${isFull ? 'text-red-400' : 'text-orange-400'}`}>
                                  {capacity} / {CAPACITY_LIMITS.subcontractorsPerTrade}
                                </span>
                                {isFull && <Lock className="w-4 h-4 text-red-400" />}
                                {isExpanded ? (
                                  <ChevronDown className="w-4 h-4 text-zinc-400" />
                                ) : (
                                  <ChevronRight className="w-4 h-4 text-zinc-400" />
                                )}
                              </div>
                            </button>

                            {isExpanded && (
                              <div className="border-t border-zinc-800 bg-[#0A0A0A] p-3 space-y-2">
                                {members.map(member => (
                                  <div
                                    key={member.id}
                                    className="flex items-center justify-between p-2 bg-zinc-900 rounded-lg"
                                  >
                                    <div className="flex items-center gap-3">
                                      {member.isFounder && (
                                        <div className="w-6 h-6 bg-yellow-500/20 rounded-full flex items-center justify-center" title="Founder Member">
                                          <Crown className="w-3 h-3 text-yellow-400" />
                                        </div>
                                      )}
                                      <div>
                                        <p className="text-sm font-medium text-white">{member.name}</p>
                                        <p className="text-xs text-zinc-500">{member.location.distance.toFixed(1)}mi away</p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(member.status)}`}>
                                        {member.status === 'trial' ? `Trial (${CAPACITY_LIMITS.trialMonths}mo)` : member.status}
                                      </span>
                                      <span className="text-xs font-medium text-green-400">
                                        {formatCurrency(member.subscriptionRate)}/mo
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Add Member Button */}
                    <button
                      onClick={() => {
                        setSelectedTerritory(territory.id);
                        setShowAddMemberModal(true);
                      }}
                      disabled={totalMembers >= CAPACITY_LIMITS.total}
                      className={`w-full mt-4 px-4 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all ${
                        totalMembers >= CAPACITY_LIMITS.total
                          ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                          : 'bg-purple-600 hover:bg-purple-700 text-white'
                      }`}
                    >
                      {totalMembers >= CAPACITY_LIMITS.total ? (
                        <>
                          <Lock className="w-5 h-5" />
                          Territory Full
                        </>
                      ) : (
                        <>
                          <Plus className="w-5 h-5" />
                          Add Member to Territory
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Analytics View */}
        {viewMode === 'analytics' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-[#1A1A1A] border border-zinc-800 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-purple-600/20 rounded-lg flex items-center justify-center">
                  <Map className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-zinc-400">Total Territories</p>
                  <p className="text-2xl font-bold text-white">{territories.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-[#1A1A1A] border border-zinc-800 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-orange-600/20 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-orange-400" />
                </div>
                <div>
                  <p className="text-sm text-zinc-400">Total Members</p>
                  <p className="text-2xl font-bold text-white">
                    {territories.reduce((sum, t) => sum + getTotalMembers(t), 0)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-[#1A1A1A] border border-zinc-800 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-yellow-600/20 rounded-lg flex items-center justify-center">
                  <Crown className="w-6 h-6 text-yellow-400" />
                </div>
                <div>
                  <p className="text-sm text-zinc-400">Founder Members</p>
                  <p className="text-2xl font-bold text-white">
                    {territories.reduce((sum, t) => sum + getFounderCount(t), 0)} / {CAPACITY_LIMITS.founderSlots}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-[#1A1A1A] border border-zinc-800 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-green-600/20 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-zinc-400">Monthly Recurring Revenue</p>
                  <p className="text-2xl font-bold text-white">
                    {formatCurrency(
                      territories.reduce((sum, t) => {
                        const subTotal = Object.values(t.subcontractorsByTrade)
                          .flat()
                          .reduce((s, m) => s + (m.status !== 'expired' ? m.subscriptionRate : 0), 0);
                        const vendorTotal = t.vendors.reduce((s, m) => s + (m.status !== 'expired' ? m.subscriptionRate : 0), 0);
                        const advertiserTotal = t.advertisers.reduce((s, m) => s + (m.status !== 'expired' ? m.subscriptionRate : 0), 0);
                        return sum + subTotal + vendorTotal + advertiserTotal;
                      }, 0)
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Settings Modal */}
      <CohortSettingsModal 
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
      />

      {/* Add Member Modal */}
      {showAddMemberModal && selectedTerritory && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1A1A1A] border border-zinc-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-[#1A1A1A] border-b border-zinc-800 p-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">Add Member to Territory</h2>
                <p className="text-sm text-zinc-400 mt-1">
                  Territory: {territories.find(t => t.id === selectedTerritory)?.name}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowAddMemberModal(false);
                  setSelectedTerritory(null);
                }}
                className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-zinc-400" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Member Type Selection */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Member Type <span className="text-red-400">*</span>
                </label>
                <select className="w-full px-4 py-3 bg-[#0F0F0F] border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-purple-500">
                  <option value="">Select member type...</option>
                  <option value="subcontractor">Subcontractor</option>
                  <option value="vendor">Vendor</option>
                  <option value="advertiser">Advertiser</option>
                </select>
              </div>

              {/* Trade Selection (for subcontractors) */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Trade/Specialty <span className="text-red-400">*</span>
                </label>
                <select className="w-full px-4 py-3 bg-[#0F0F0F] border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-purple-500">
                  <option value="">Select trade...</option>
                  {TRADES.map(trade => (
                    <option key={trade} value={trade}>{trade}</option>
                  ))}
                </select>
              </div>

              {/* Company Name */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Company Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter company name..."
                  className="w-full px-4 py-3 bg-[#0F0F0F] border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Contact Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Email <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="email"
                    placeholder="email@company.com"
                    className="w-full px-4 py-3 bg-[#0F0F0F] border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Phone <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="tel"
                    placeholder="(555) 123-4567"
                    className="w-full px-4 py-3 bg-[#0F0F0F] border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Street Address <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="123 Main Street"
                  className="w-full px-4 py-3 bg-[#0F0F0F] border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-medium text-white mb-2">
                    ZIP Code <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="10001"
                    className="w-full px-4 py-3 bg-[#0F0F0F] border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    City
                  </label>
                  <input
                    type="text"
                    placeholder="New York"
                    className="w-full px-4 py-3 bg-[#0F0F0F] border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    State
                  </label>
                  <input
                    type="text"
                    placeholder="NY"
                    maxLength={2}
                    className="w-full px-4 py-3 bg-[#0F0F0F] border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Founder Status */}
              <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <Crown className="w-5 h-5 text-yellow-400 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <input
                        type="checkbox"
                        id="founder-status"
                        className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-purple-600 focus:ring-purple-500"
                      />
                      <label htmlFor="founder-status" className="text-sm font-medium text-white cursor-pointer">
                        Founder Member (30% off for life)
                      </label>
                    </div>
                    <p className="text-xs text-zinc-400">
                      Limited to first {CAPACITY_LIMITS.founderSlots} subcontractors
                    </p>
                  </div>
                </div>
              </div>

              {/* Pricing Preview */}
              <div className="p-4 bg-[#0F0F0F] border border-zinc-800 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-zinc-400">Standard Rate</span>
                  <span className="text-white line-through">{formatCurrency(SUBSCRIPTION_RATES.subcontractor)}</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-zinc-400">Founder Discount (30%)</span>
                  <span className="text-green-400">-{formatCurrency(SUBSCRIPTION_RATES.subcontractor * 0.30)}</span>
                </div>
                <div className="pt-2 border-t border-zinc-800">
                  <div className="flex items-center justify-between">
                    <span className="text-base font-semibold text-white">Member Rate</span>
                    <span className="text-xl font-bold text-purple-400">
                      {formatCurrency(SUBSCRIPTION_RATES.subcontractor * 0.70)}/mo
                    </span>
                  </div>
                </div>
                <p className="text-xs text-zinc-500 mt-2">
                  Includes {CAPACITY_LIMITS.trialMonths}-month free trial
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-[#1A1A1A] border-t border-zinc-800 p-6 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowAddMemberModal(false);
                  setSelectedTerritory(null);
                }}
                className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  toast.success('Member added successfully! They will receive an onboarding email.');
                  setShowAddMemberModal(false);
                  setSelectedTerritory(null);
                }}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Add Member
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Territory Modal */}
      {showCreateTerritoryModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-[#1A1A1A] border border-zinc-800 rounded-xl max-w-2xl w-full my-8">
              {/* Modal Header */}
              <div className="border-b border-zinc-800 p-6 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    {editingTerritory ? 'Edit Territory' : 'Create New Territory'}
                  </h2>
                  <p className="text-sm text-zinc-400 mt-1">
                    Define a {CAPACITY_LIMITS.radius}-mile radius territory
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowCreateTerritoryModal(false);
                    setEditingTerritory(null);
                  }}
                  className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-zinc-400" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Territory Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g., Downtown Metro, North Side District"
                    className="w-full px-4 py-3 bg-[#0F0F0F] border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Street Address
                  </label>
                  <input
                    type="text"
                    value={formAddress}
                    onChange={(e) => setFormAddress(e.target.value)}
                    placeholder="e.g., 123 Main Street"
                    className="w-full px-4 py-3 bg-[#0F0F0F] border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                  />
                  <p className="text-xs text-zinc-500 mt-1">Territory radius is calculated from this address</p>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      ZIP Code <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={formZipCode}
                      onChange={(e) => setFormZipCode(e.target.value)}
                      placeholder="10001"
                      className="w-full px-4 py-3 bg-[#0F0F0F] border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      City <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={formCity}
                      onChange={(e) => setFormCity(e.target.value)}
                      placeholder="New York"
                      className="w-full px-4 py-3 bg-[#0F0F0F] border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      State <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={formState}
                      onChange={(e) => setFormState(e.target.value.toUpperCase())}
                      placeholder="NY"
                      maxLength={2}
                      className="w-full px-4 py-3 bg-[#0F0F0F] border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                {/* Territory Settings */}
                <div className="border-t border-zinc-800 pt-4">
                  <h3 className="text-lg font-semibold text-white mb-4">Territory Settings</h3>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-white mb-2">
                        Radius (miles) <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="number"
                        value={formRadius}
                        onChange={(e) => setFormRadius(parseInt(e.target.value) || 0)}
                        min="1"
                        max="100"
                        className="w-full px-4 py-3 bg-[#0F0F0F] border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white mb-2">
                        Territory Status
                      </label>
                      <select
                        value={formActive ? 'active' : 'inactive'}
                        onChange={(e) => setFormActive(e.target.value === 'active')}
                        className="w-full px-4 py-3 bg-[#0F0F0F] border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-purple-500"
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formAllowCrossState}
                        onChange={(e) => setFormAllowCrossState(e.target.checked)}
                        className="w-5 h-5 bg-[#0F0F0F] border-2 border-zinc-800 rounded text-purple-600 focus:ring-2 focus:ring-purple-500"
                      />
                      <div>
                        <span className="text-sm font-medium text-white">Allow Cross-State Expansion</span>
                        <p className="text-xs text-zinc-500">Territory can extend into neighboring states within the radius</p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Capacity Limits */}
                <div className="border-t border-zinc-800 pt-4">
                  <h3 className="text-lg font-semibold text-white mb-4">Capacity Limits</h3>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-white mb-2">
                        Subcontractors per Trade
                      </label>
                      <input
                        type="number"
                        value={formSubsPerTrade}
                        onChange={(e) => setFormSubsPerTrade(parseInt(e.target.value) || 0)}
                        min="1"
                        max="20"
                        className="w-full px-4 py-3 bg-[#0F0F0F] border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white mb-2">
                        Total Vendors
                      </label>
                      <input
                        type="number"
                        value={formVendorLimit}
                        onChange={(e) => setFormVendorLimit(parseInt(e.target.value) || 0)}
                        min="1"
                        max="50"
                        className="w-full px-4 py-3 bg-[#0F0F0F] border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white mb-2">
                        Total Advertisers
                      </label>
                      <input
                        type="number"
                        value={formAdvertiserLimit}
                        onChange={(e) => setFormAdvertiserLimit(parseInt(e.target.value) || 0)}
                        min="1"
                        max="50"
                        className="w-full px-4 py-3 bg-[#0F0F0F] border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg mt-4">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-white font-medium mb-1">Territory Coverage</p>
                      <p className="text-xs text-zinc-400">
                        This territory will cover a {formRadius}-mile radius from the ZIP code center point.
                        Maximum capacity: {CAPACITY_LIMITS.total} members (excluding trade/role limits above).
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="border-t border-zinc-800 p-6 flex items-center justify-end gap-3">
                <button
                  onClick={() => {
                    setShowCreateTerritoryModal(false);
                    setEditingTerritory(null);
                  }}
                  className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (!formName || !formZipCode || !formCity || !formState) {
                      toast.error('Please fill in all required fields');
                      return;
                    }

                    if (formRadius < 1 || formRadius > 100) {
                      toast.error('Radius must be between 1 and 100 miles');
                      return;
                    }

                    // Calculate coverage area based on location and cross-state setting
                    const { coveredCities, coveredStates } = calculateCoverageArea(
                      formCity,
                      formState,
                      formRadius,
                      formAllowCrossState
                    );

                    if (editingTerritory) {
                      // Update existing territory
                      setTerritories(prev => prev.map(t =>
                        t.id === editingTerritory.id
                          ? {
                              ...t,
                              name: formName,
                              zipCode: formZipCode,
                              city: formCity,
                              state: formState,
                              address: formAddress,
                              radius: formRadius,
                              active: formActive,
                              allowCrossState: formAllowCrossState,
                              coveredCities,
                              coveredStates,
                              foundingMemberLimits: {
                                subcontractorsPerTrade: formSubsPerTrade,
                                totalVendors: formVendorLimit,
                                totalAdvertisers: formAdvertiserLimit
                              }
                            }
                          : t
                      ));
                      toast.success(`Territory updated! Now covers ${coveredCities.length} cities${formAllowCrossState ? ` across ${coveredStates.length} state(s)` : ''}`);
                    } else {
                      // Create new territory
                      const newTerritory: Territory = {
                        id: `TERR-${Date.now()}`,
                        name: formName,
                        zipCode: formZipCode,
                        city: formCity,
                        state: formState,
                        address: formAddress,
                        radius: formRadius,
                        active: formActive,
                        allowCrossState: formAllowCrossState,
                        coveredCities,
                        coveredStates,
                        createdDate: new Date().toISOString().split('T')[0],
                        subcontractorsByTrade: {},
                        vendors: [],
                        advertisers: [],
                        foundingMemberLimits: {
                          subcontractorsPerTrade: formSubsPerTrade,
                          totalVendors: formVendorLimit,
                          totalAdvertisers: formAdvertiserLimit
                        }
                      };
                      setTerritories(prev => [newTerritory, ...prev]);
                      toast.success(`Territory created! Covers ${coveredCities.length} cities${formAllowCrossState ? ` across ${coveredStates.length} state(s)` : ''}`);
                    }

                    setShowCreateTerritoryModal(false);
                    setEditingTerritory(null);
                  }}
                  className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  {editingTerritory ? (
                    <>
                      <Save className="w-5 h-5" />
                      Update Territory
                    </>
                  ) : (
                    <>
                      <Plus className="w-5 h-5" />
                      Create Territory
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
      )}

      {/* Founding Member Limits Modal */}
      {showFoundingLimitsModal && editingFoundingLimitsFor && (() => {
        const territory = territories.find(t => t.id === editingFoundingLimitsFor);
        if (!territory) return null;
        
        const founderSubCount = Object.values(territory.subcontractorsByTrade)
          .flat()
          .filter(m => m.isFounder).length;
        const founderVendorCount = territory.vendors.filter(v => v.isFounder).length;
        const founderAdvertiserCount = territory.advertisers.filter(a => a.isFounder).length;

        return (
          <FoundingMemberLimitsModal
            isOpen={showFoundingLimitsModal}
            onClose={() => {
              setShowFoundingLimitsModal(false);
              setEditingFoundingLimitsFor(null);
            }}
            territoryId={territory.id}
            territoryName={territory.name}
            currentLimits={territory.foundingMemberLimits || {
              subcontractorsPerTrade: 3,
              totalVendors: 10,
              totalAdvertisers: 5,
            }}
            onSave={(limits) => {
              setTerritories(territories.map(t =>
                t.id === territory.id
                  ? { ...t, foundingMemberLimits: limits }
                  : t
              ));
            }}
            currentCounts={{
              founderSubcontractors: founderSubCount,
              founderVendors: founderVendorCount,
              founderAdvertisers: founderAdvertiserCount,
            }}
          />
        );
      })()}
    </div>
  );
}