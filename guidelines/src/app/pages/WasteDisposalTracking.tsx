/**
 * Waste & Material Disposal Tracking System
 * Track construction waste, dump runs, recycling, hazardous materials, and costs
 */

import { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import {
  Trash2, TruckIcon, Recycle, AlertTriangle, DollarSign, Calendar,
  MapPin, Plus, Search, Filter, Download, Eye, Edit, BarChart3,
  CheckCircle, Clock, XCircle, FileText, Package, Leaf, Droplet,
  Wind, Zap, Building2, Home, ChevronDown, ChevronRight, ArrowUp,
  ArrowDown, TrendingUp, PieChart, Activity, AlertCircle, Settings, ArrowLeft
} from 'lucide-react';
import { StandardButton } from '../components/ui/button/StandardButton';
import { TextInput } from '../components/ui/input/TextInput';
import { Select } from '../components/ui/input/Select';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../components/ui/modal';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface WasteEntry {
  id: string;
  projectId: string;
  projectName: string;
  wasteType: 'construction' | 'demolition' | 'hazardous' | 'recyclable' | 'organic' | 'mixed';
  material: string;
  quantity: number;
  unit: 'tons' | 'cubic_yards' | 'pounds' | 'bags' | 'loads';
  disposalMethod: 'landfill' | 'recycling' | 'donation' | 'hazmat_facility' | 'composting';
  cost: number;
  dumpLocation: string;
  dumpLocationAddress: string;
  scheduledDate: string;
  completedDate?: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  truckNumber?: string;
  driverName?: string;
  ticketNumber?: string;
  ticketPhoto?: string;
  notes?: string;
  environmentalCompliance: boolean;
  recyclingPercentage?: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface DumpRun {
  id: string;
  date: string;
  truckNumber: string;
  driverName: string;
  entries: WasteEntry[];
  totalCost: number;
  totalWeight: number;
  route: string[];
  status: 'planned' | 'active' | 'completed';
  startTime?: string;
  endTime?: string;
}

interface WasteStats {
  totalWaste: number;
  totalCost: number;
  recyclingRate: number;
  costPerProject: number;
  hazardousWaste: number;
  complianceRate: number;
  trendsVsPreviousMonth: {
    waste: number;
    cost: number;
    recycling: number;
  };
}

const WASTE_TYPES = [
  { value: 'construction', label: 'Construction Debris', icon: Building2, color: 'orange' },
  { value: 'demolition', label: 'Demolition Waste', icon: Home, color: 'red' },
  { value: 'hazardous', label: 'Hazardous Materials', icon: AlertTriangle, color: 'yellow' },
  { value: 'recyclable', label: 'Recyclable Materials', icon: Recycle, color: 'green' },
  { value: 'organic', label: 'Organic Waste', icon: Leaf, color: 'emerald' },
  { value: 'mixed', label: 'Mixed Waste', icon: Package, color: 'gray' }
];

const DISPOSAL_METHODS = [
  { value: 'landfill', label: 'Landfill', description: 'General waste disposal' },
  { value: 'recycling', label: 'Recycling Center', description: 'Materials recovery' },
  { value: 'donation', label: 'Donation Center', description: 'Reusable materials' },
  { value: 'hazmat_facility', label: 'Hazmat Facility', description: 'Hazardous waste disposal' },
  { value: 'composting', label: 'Composting', description: 'Organic waste processing' }
];

const COMMON_MATERIALS = [
  'Drywall', 'Wood Scraps', 'Concrete', 'Asphalt', 'Metal', 'Glass',
  'Plastic', 'Cardboard', 'Insulation', 'Roofing Materials', 'Carpet',
  'Tile', 'Paint', 'Solvents', 'Adhesives', 'Soil', 'Vegetation',
  'Mixed Debris', 'Other'
];

export default function WasteDisposalTracking({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-57095a78`;

  const [activeTab, setActiveTab] = useState<'entries' | 'runs' | 'reports' | 'compliance'>('entries');
  const [wasteEntries, setWasteEntries] = useState<WasteEntry[]>([]);
  const [dumpRuns, setDumpRuns] = useState<DumpRun[]>([]);
  const [stats, setStats] = useState<WasteStats | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'scheduled' | 'completed'>('all');
  const [filterWasteType, setFilterWasteType] = useState<string>('all');
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'quarter' | 'year'>('month');

  // Modals
  const [showAddEntryModal, setShowAddEntryModal] = useState(false);
  const [showScheduleRunModal, setShowScheduleRunModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<WasteEntry | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    projectId: '',
    projectName: '',
    wasteType: 'construction' as WasteEntry['wasteType'],
    material: '',
    quantity: '',
    unit: 'cubic_yards' as WasteEntry['unit'],
    disposalMethod: 'landfill' as WasteEntry['disposalMethod'],
    cost: '',
    dumpLocation: '',
    dumpLocationAddress: '',
    scheduledDate: new Date().toISOString().split('T')[0],
    truckNumber: '',
    driverName: '',
    notes: '',
    environmentalCompliance: true,
    recyclingPercentage: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load waste entries
      const entriesRes = await fetch(`${API_BASE}/waste-entries`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` }
      });
      if (entriesRes.ok) {
        const data = await entriesRes.json();
        setWasteEntries(data);
      }

      // Load dump runs
      const runsRes = await fetch(`${API_BASE}/dump-runs`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` }
      });
      if (runsRes.ok) {
        const data = await runsRes.json();
        setDumpRuns(data);
      }

      // Calculate stats
      calculateStats();
    } catch (error) {
      console.error('Error loading waste data:', error);
      toast.error('Failed to load waste tracking data');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = () => {
    // Mock stats calculation - in production, fetch from backend
    setStats({
      totalWaste: 487.5,
      totalCost: 12450,
      recyclingRate: 42,
      costPerProject: 1850,
      hazardousWaste: 12.3,
      complianceRate: 98,
      trendsVsPreviousMonth: {
        waste: -8,
        cost: -12,
        recycling: 5
      }
    });
  };

  const handleAddEntry = async () => {
    try {
      const entry: Partial<WasteEntry> = {
        ...formData,
        quantity: parseFloat(formData.quantity),
        cost: parseFloat(formData.cost),
        recyclingPercentage: formData.recyclingPercentage ? parseFloat(formData.recyclingPercentage) : undefined,
        status: 'scheduled',
        createdBy: 'Current User',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const response = await fetch(`${API_BASE}/waste-entries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify(entry)
      });

      if (response.ok) {
        toast.success('Waste entry created successfully');
        setShowAddEntryModal(false);
        resetForm();
        loadData();
      } else {
        toast.error('Failed to create waste entry');
      }
    } catch (error) {
      console.error('Error creating entry:', error);
      toast.error('Failed to create waste entry');
    }
  };

  const handleUpdateStatus = async (entryId: string, status: WasteEntry['status']) => {
    try {
      const response = await fetch(`${API_BASE}/waste-entries/${entryId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({ 
          status,
          completedDate: status === 'completed' ? new Date().toISOString() : undefined,
          updatedAt: new Date().toISOString()
        })
      });

      if (response.ok) {
        toast.success(`Waste entry marked as ${status}`);
        loadData();
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const resetForm = () => {
    setFormData({
      projectId: '',
      projectName: '',
      wasteType: 'construction',
      material: '',
      quantity: '',
      unit: 'cubic_yards',
      disposalMethod: 'landfill',
      cost: '',
      dumpLocation: '',
      dumpLocationAddress: '',
      scheduledDate: new Date().toISOString().split('T')[0],
      truckNumber: '',
      driverName: '',
      notes: '',
      environmentalCompliance: true,
      recyclingPercentage: ''
    });
  };

  const filteredEntries = wasteEntries.filter(entry => {
    if (filterStatus !== 'all' && entry.status !== filterStatus) return false;
    if (filterWasteType !== 'all' && entry.wasteType !== filterWasteType) return false;
    if (searchQuery && !entry.projectName.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !entry.material.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-400';
      case 'in_progress': return 'text-blue-400';
      case 'scheduled': return 'text-yellow-400';
      case 'cancelled': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getWasteTypeIcon = (type: string) => {
    const wasteType = WASTE_TYPES.find(t => t.value === type);
    return wasteType ? wasteType.icon : Package;
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-4 mb-2">
              <button
                onClick={() => {
                  window.location.href = '/unified-dashboard';
                }}
                className="p-2 hover:bg-[#2A2A2A] rounded-lg transition-colors text-gray-400 hover:text-white"
                title="Back to Unified Dashboard"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                  <Recycle className="w-6 h-6 text-white" />
                </div>
                Waste & Disposal Tracking
              </h1>
            </div>
            <p className="text-gray-400 ml-16">Track construction waste, dump runs, and environmental compliance</p>
          </div>
          <div className="flex gap-3">
            <StandardButton
              onClick={() => setShowScheduleRunModal(true)}
              variant="secondary"
              leftIcon={<TruckIcon className="w-4 h-4" />}
            >
              Schedule Dump Run
            </StandardButton>
            <StandardButton
              onClick={() => setShowAddEntryModal(true)}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Log Waste Entry
            </StandardButton>
          </div>
        </div>

        {/* Stats Dashboard */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <Package className="w-5 h-5 text-gray-400" />
                <span className={`text-sm flex items-center gap-1 ${stats.trendsVsPreviousMonth.waste < 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {stats.trendsVsPreviousMonth.waste < 0 ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />}
                  {Math.abs(stats.trendsVsPreviousMonth.waste)}%
                </span>
              </div>
              <div className="text-2xl font-bold mb-1">{stats.totalWaste} tons</div>
              <div className="text-sm text-gray-400">Total Waste</div>
            </div>

            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="w-5 h-5 text-gray-400" />
                <span className={`text-sm flex items-center gap-1 ${stats.trendsVsPreviousMonth.cost < 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {stats.trendsVsPreviousMonth.cost < 0 ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />}
                  {Math.abs(stats.trendsVsPreviousMonth.cost)}%
                </span>
              </div>
              <div className="text-2xl font-bold mb-1">${stats.totalCost.toLocaleString()}</div>
              <div className="text-sm text-gray-400">Disposal Costs</div>
            </div>

            <div className="bg-[#1A1A1A] border border-green-500/20 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <Recycle className="w-5 h-5 text-green-400" />
                <span className={`text-sm flex items-center gap-1 text-green-400`}>
                  <ArrowUp className="w-3 h-3" />
                  {stats.trendsVsPreviousMonth.recycling}%
                </span>
              </div>
              <div className="text-2xl font-bold mb-1 text-green-400">{stats.recyclingRate}%</div>
              <div className="text-sm text-gray-400">Recycling Rate</div>
            </div>

            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <Building2 className="w-5 h-5 text-gray-400" />
              </div>
              <div className="text-2xl font-bold mb-1">${stats.costPerProject.toLocaleString()}</div>
              <div className="text-sm text-gray-400">Avg Cost/Project</div>
            </div>

            <div className="bg-[#1A1A1A] border border-yellow-500/20 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <AlertTriangle className="w-5 h-5 text-yellow-400" />
              </div>
              <div className="text-2xl font-bold mb-1 text-yellow-400">{stats.hazardousWaste} tons</div>
              <div className="text-sm text-gray-400">Hazardous Waste</div>
            </div>

            <div className="bg-[#1A1A1A] border border-green-500/20 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
              </div>
              <div className="text-2xl font-bold mb-1 text-green-400">{stats.complianceRate}%</div>
              <div className="text-sm text-gray-400">Compliance Rate</div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 border-b border-[#2A2A2A]">
          {[
            { id: 'entries', label: 'Waste Entries', icon: Trash2 },
            { id: 'runs', label: 'Dump Runs', icon: TruckIcon },
            { id: 'reports', label: 'Reports', icon: BarChart3 },
            { id: 'compliance', label: 'Compliance', icon: CheckCircle }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-3 flex items-center gap-2 border-b-2 transition-all ${
                activeTab === tab.id
                  ? 'border-[#ea580c] text-white'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Waste Entries Tab */}
      {activeTab === 'entries' && (
        <div>
          {/* Filters */}
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <TextInput
                placeholder="Search by project or material..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                startIcon={<Search className="w-4 h-4" />}
              />
              <Select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
              >
                <option value="all">All Statuses</option>
                <option value="scheduled">Scheduled</option>
                <option value="completed">Completed</option>
              </Select>
              <Select
                value={filterWasteType}
                onChange={(e) => setFilterWasteType(e.target.value)}
              >
                <option value="all">All Waste Types</option>
                {WASTE_TYPES.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </Select>
              <Select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as any)}
              >
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="quarter">This Quarter</option>
                <option value="year">This Year</option>
              </Select>
            </div>
          </div>

          {/* Entries List */}
          <div className="space-y-3">
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block w-8 h-8 border-4 border-[#ea580c] border-t-transparent rounded-full animate-spin"></div>
                <p className="text-gray-400 mt-4">Loading waste entries...</p>
              </div>
            ) : filteredEntries.length === 0 ? (
              <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-12 text-center">
                <Trash2 className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No waste entries found</h3>
                <p className="text-gray-400 mb-6">Start tracking construction waste and disposal activities</p>
                <StandardButton onClick={() => setShowAddEntryModal(true)} leftIcon={<Plus className="w-4 h-4" />}>
                  Log First Entry
                </StandardButton>
              </div>
            ) : (
              filteredEntries.map((entry) => {
                const WasteIcon = getWasteTypeIcon(entry.wasteType);
                return (
                  <div key={entry.id} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5 hover:border-[#ea580c]/30 transition-all">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        <div className={`w-12 h-12 rounded-xl bg-${WASTE_TYPES.find(t => t.value === entry.wasteType)?.color}-500/10 border border-${WASTE_TYPES.find(t => t.value === entry.wasteType)?.color}-500/20 flex items-center justify-center`}>
                          <WasteIcon className={`w-6 h-6 text-${WASTE_TYPES.find(t => t.value === entry.wasteType)?.color}-400`} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold">{entry.material}</h3>
                            <span className={`px-2 py-1 rounded-lg text-sm font-medium ${getStatusColor(entry.status)} bg-current/10`}>
                              {entry.status.replace('_', ' ').toUpperCase()}
                            </span>
                            {entry.wasteType === 'hazardous' && (
                              <span className="px-2 py-1 rounded-lg text-sm font-medium bg-yellow-500/10 text-yellow-400 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                HAZMAT
                              </span>
                            )}
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-gray-400">Project:</span>
                              <p className="font-medium">{entry.projectName}</p>
                            </div>
                            <div>
                              <span className="text-gray-400">Quantity:</span>
                              <p className="font-medium">{entry.quantity} {entry.unit.replace('_', ' ')}</p>
                            </div>
                            <div>
                              <span className="text-gray-400">Cost:</span>
                              <p className="font-medium">${entry.cost.toFixed(2)}</p>
                            </div>
                            <div>
                              <span className="text-gray-400">Disposal:</span>
                              <p className="font-medium">{DISPOSAL_METHODS.find(m => m.value === entry.disposalMethod)?.label}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 mt-3 text-sm text-gray-400">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Scheduled: {new Date(entry.scheduledDate).toLocaleDateString()}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {entry.dumpLocation}
                            </span>
                            {entry.truckNumber && (
                              <span className="flex items-center gap-1">
                                <TruckIcon className="w-3 h-3" />
                                Truck #{entry.truckNumber}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {entry.status === 'scheduled' && (
                          <StandardButton
                            size="sm"
                            variant="secondary"
                            onClick={() => handleUpdateStatus(entry.id, 'in_progress')}
                          >
                            Start
                          </StandardButton>
                        )}
                        {entry.status === 'in_progress' && (
                          <StandardButton
                            size="sm"
                            onClick={() => handleUpdateStatus(entry.id, 'completed')}
                          >
                            Complete
                          </StandardButton>
                        )}
                        <StandardButton
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setSelectedEntry(entry);
                            setShowDetailsModal(true);
                          }}
                          leftIcon={<Eye className="w-4 h-4" />}
                        >
                          Details
                        </StandardButton>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Dump Runs Tab */}
      {activeTab === 'runs' && (
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-8 text-center">
          <TruckIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">Dump Run Scheduler</h3>
          <p className="text-gray-400 mb-6">Schedule and track dump truck routes for efficient waste removal</p>
          <StandardButton onClick={() => setShowScheduleRunModal(true)} leftIcon={<Plus className="w-4 h-4" />}>
            Schedule New Dump Run
          </StandardButton>
        </div>
      )}

      {/* Reports Tab */}
      {activeTab === 'reports' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <PieChart className="w-5 h-5 text-[#ea580c]" />
                Waste by Type
              </h3>
              <StandardButton size="sm" variant="secondary" leftIcon={<Download className="w-4 h-4" />}>
                Export
              </StandardButton>
            </div>
            <div className="space-y-3">
              {WASTE_TYPES.map((type, index) => {
                const percentage = Math.floor(Math.random() * 30) + 10;
                return (
                  <div key={type.value}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm flex items-center gap-2">
                        <type.icon className="w-4 h-4" />
                        {type.label}
                      </span>
                      <span className="text-sm font-semibold">{percentage}%</span>
                    </div>
                    <div className="w-full bg-[#0A0A0A] rounded-full h-2">
                      <div 
                        className={`bg-${type.color}-500 h-2 rounded-full transition-all`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#ea580c]" />
                Monthly Trends
              </h3>
              <StandardButton size="sm" variant="secondary" leftIcon={<Download className="w-4 h-4" />}>
                Export
              </StandardButton>
            </div>
            {(() => {
              const monthlyData = wasteEntries.reduce((acc: Record<string, { month: string; cost: number; quantity: number }>, e) => {
                const d = new Date(e.scheduledDate);
                const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                if (!acc[key]) acc[key] = { month: label, cost: 0, quantity: 0 };
                acc[key].cost += e.cost || 0;
                acc[key].quantity += e.quantity || 0;
                return acc;
              }, {});
              const chartData = Object.entries(monthlyData).sort(([a], [b]) => a.localeCompare(b)).slice(-6).map(([, v]) => v);
              if (chartData.length === 0) {
                return <div className="text-center py-8 text-gray-500 text-sm">No data yet — add waste entries to see trends</div>;
              }
              return (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                    <XAxis dataKey="month" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} />
                    <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8, color: '#fff' }} formatter={(v: number, name: string) => [name === 'cost' ? `$${v.toLocaleString()}` : `${v} units`, name === 'cost' ? 'Cost' : 'Quantity']} />
                    <Legend wrapperStyle={{ color: '#9ca3af', fontSize: 12 }} />
                    <Bar dataKey="cost" fill="#ea580c" radius={[4, 4, 0, 0]} name="cost" />
                    <Bar dataKey="quantity" fill="#3b82f6" radius={[4, 4, 0, 0]} name="quantity" />
                  </BarChart>
                </ResponsiveContainer>
              );
            })()}
          </div>

          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-[#ea580c]" />
                Cost Analysis
              </h3>
              <StandardButton size="sm" variant="secondary" leftIcon={<Download className="w-4 h-4" />}>
                Export
              </StandardButton>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-[#0A0A0A] rounded-lg">
                <span className="text-sm text-gray-400">Total Disposal Costs</span>
                <span className="font-semibold">${stats?.totalCost.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-[#0A0A0A] rounded-lg">
                <span className="text-sm text-gray-400">Cost per Ton</span>
                <span className="font-semibold">${stats ? (stats.totalCost / stats.totalWaste).toFixed(2) : '0'}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-[#0A0A0A] rounded-lg">
                <span className="text-sm text-gray-400">Recycling Savings</span>
                <span className="font-semibold text-green-400">$2,340</span>
              </div>
            </div>
          </div>

          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Recycle className="w-5 h-5 text-green-400" />
                Sustainability Metrics
              </h3>
              <StandardButton size="sm" variant="secondary" leftIcon={<Download className="w-4 h-4" />}>
                Export
              </StandardButton>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-[#0A0A0A] rounded-lg">
                <span className="text-sm text-gray-400">CO₂ Offset</span>
                <span className="font-semibold text-green-400">124 tons</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-[#0A0A0A] rounded-lg">
                <span className="text-sm text-gray-400">Materials Recycled</span>
                <span className="font-semibold text-green-400">204 tons</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-[#0A0A0A] rounded-lg">
                <span className="text-sm text-gray-400">Diversion Rate</span>
                <span className="font-semibold text-green-400">42%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Compliance Tab */}
      {activeTab === 'compliance' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-green-500/10 to-emerald-600/10 border border-green-500/20 rounded-xl p-6">
              <CheckCircle className="w-8 h-8 text-green-400 mb-3" />
              <div className="text-3xl font-bold text-green-400 mb-2">98%</div>
              <div className="text-sm text-gray-300">Compliance Rate</div>
            </div>
            <div className="bg-gradient-to-br from-yellow-500/10 to-orange-600/10 border border-yellow-500/20 rounded-xl p-6">
              <AlertTriangle className="w-8 h-8 text-yellow-400 mb-3" />
              <div className="text-3xl font-bold text-yellow-400 mb-2">3</div>
              <div className="text-sm text-gray-300">Pending Reviews</div>
            </div>
            <div className="bg-gradient-to-br from-blue-500/10 to-cyan-600/10 border border-blue-500/20 rounded-xl p-6">
              <FileText className="w-8 h-8 text-blue-400 mb-3" />
              <div className="text-3xl font-bold text-blue-400 mb-2">47</div>
              <div className="text-sm text-gray-300">Compliance Docs</div>
            </div>
          </div>

          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-[#ea580c]" />
              Environmental Compliance Checklist
            </h3>
            <div className="space-y-3">
              {[
                { task: 'Hazardous waste manifest documentation', status: 'complete' },
                { task: 'EPA waste tracking numbers recorded', status: 'complete' },
                { task: 'Disposal facility certifications verified', status: 'complete' },
                { task: 'Monthly waste audit report', status: 'pending' },
                { task: 'Recycling percentage goals met', status: 'complete' },
                { task: 'Asbestos handling documentation', status: 'complete' }
              ].map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-[#0A0A0A] rounded-lg">
                  <span className="text-sm">{item.task}</span>
                  {item.status === 'complete' ? (
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  ) : (
                    <Clock className="w-5 h-5 text-yellow-400" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Add Waste Entry Modal */}
      <Modal
        isOpen={showAddEntryModal}
        onClose={() => {
          setShowAddEntryModal(false);
          resetForm();
        }}
        size="xl"
      >
        <ModalHeader
          title="Log Waste Entry"
          icon={Trash2}
          onClose={() => {
            setShowAddEntryModal(false);
            resetForm();
          }}
        />
        <ModalBody>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <TextInput
                label="Project Name"
                value={formData.projectName}
                onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                placeholder="Enter project name"
                required
              />
              <Select
                label="Waste Type"
                value={formData.wasteType}
                onChange={(e) => setFormData({ ...formData, wasteType: e.target.value as any })}
                required
              >
                {WASTE_TYPES.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Material"
                value={formData.material}
                onChange={(e) => setFormData({ ...formData, material: e.target.value })}
                required
              >
                <option value="">Select material...</option>
                {COMMON_MATERIALS.map(material => (
                  <option key={material} value={material}>{material}</option>
                ))}
              </Select>
              <div className="grid grid-cols-2 gap-2">
                <TextInput
                  label="Quantity"
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  placeholder="0"
                  required
                />
                <Select
                  label="Unit"
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value as any })}
                  required
                >
                  <option value="cubic_yards">Cubic Yards</option>
                  <option value="tons">Tons</option>
                  <option value="pounds">Pounds</option>
                  <option value="bags">Bags</option>
                  <option value="loads">Loads</option>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Disposal Method"
                value={formData.disposalMethod}
                onChange={(e) => setFormData({ ...formData, disposalMethod: e.target.value as any })}
                required
              >
                {DISPOSAL_METHODS.map(method => (
                  <option key={method.value} value={method.value}>
                    {method.label} - {method.description}
                  </option>
                ))}
              </Select>
              <TextInput
                label="Cost ($)"
                type="number"
                value={formData.cost}
                onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                placeholder="0.00"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <TextInput
                label="Dump Location"
                value={formData.dumpLocation}
                onChange={(e) => setFormData({ ...formData, dumpLocation: e.target.value })}
                placeholder="e.g., County Landfill #3"
                required
              />
              <TextInput
                label="Scheduled Date"
                type="date"
                value={formData.scheduledDate}
                onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                required
              />
            </div>

            <TextInput
              label="Dump Location Address"
              value={formData.dumpLocationAddress}
              onChange={(e) => setFormData({ ...formData, dumpLocationAddress: e.target.value })}
              placeholder="Full address for GPS routing"
            />

            <div className="grid grid-cols-2 gap-4">
              <TextInput
                label="Truck Number (Optional)"
                value={formData.truckNumber}
                onChange={(e) => setFormData({ ...formData, truckNumber: e.target.value })}
                placeholder="e.g., T-101"
              />
              <TextInput
                label="Driver Name (Optional)"
                value={formData.driverName}
                onChange={(e) => setFormData({ ...formData, driverName: e.target.value })}
                placeholder="Driver name"
              />
            </div>

            {formData.disposalMethod === 'recycling' && (
              <TextInput
                label="Estimated Recycling Percentage"
                type="number"
                value={formData.recyclingPercentage}
                onChange={(e) => setFormData({ ...formData, recyclingPercentage: e.target.value })}
                placeholder="0-100"
              />
            )}

            <TextInput
              label="Notes (Optional)"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes or special instructions"
            />

            {formData.wasteType === 'hazardous' && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-yellow-400 mb-1">Hazardous Material Notice</h4>
                    <p className="text-sm text-gray-300">
                      Ensure proper EPA documentation and certified hazmat disposal facility. All hazardous waste requires manifest tracking numbers.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ModalBody>
        <ModalFooter
          onCancel={() => {
            setShowAddEntryModal(false);
            resetForm();
          }}
          onConfirm={handleAddEntry}
          confirmText="Log Entry"
          cancelText="Cancel"
        />
      </Modal>

      {/* Entry Details Modal */}
      {selectedEntry && (
        <Modal
          isOpen={showDetailsModal}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedEntry(null);
          }}
          size="lg"
        >
          <ModalHeader
            title="Waste Entry Details"
            icon={Eye}
            onClose={() => {
              setShowDetailsModal(false);
              setSelectedEntry(null);
            }}
          />
          <ModalBody>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-400">Project</label>
                  <p className="font-medium">{selectedEntry.projectName}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Status</label>
                  <p className={`font-medium ${getStatusColor(selectedEntry.status)}`}>
                    {selectedEntry.status.replace('_', ' ').toUpperCase()}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-400">Material</label>
                  <p className="font-medium">{selectedEntry.material}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Quantity</label>
                  <p className="font-medium">{selectedEntry.quantity} {selectedEntry.unit.replace('_', ' ')}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-400">Disposal Cost</label>
                  <p className="font-medium">${selectedEntry.cost.toFixed(2)}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Disposal Method</label>
                  <p className="font-medium">{DISPOSAL_METHODS.find(m => m.value === selectedEntry.disposalMethod)?.label}</p>
                </div>
              </div>
              {selectedEntry.notes && (
                <div>
                  <label className="text-sm text-gray-400">Notes</label>
                  <p className="text-sm mt-1 p-3 bg-[#0A0A0A] rounded-lg">{selectedEntry.notes}</p>
                </div>
              )}
            </div>
          </ModalBody>
          <ModalFooter
            onCancel={() => {
              setShowDetailsModal(false);
              setSelectedEntry(null);
            }}
            cancelText="Close"
          />
        </Modal>
      )}
    </div>
  );
}