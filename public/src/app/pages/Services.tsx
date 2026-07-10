/**
 * Services Management Page - Comprehensive Service Catalog
 * 
 * Features:
 * - Service catalog management
 * - Category organization
 * - Pricing and duration tracking
 * - Performance metrics
 * - Deep orange dark theme
 */

import { useState, useEffect } from 'react';
import {
  Package, Search, Plus, Edit2, Trash2, DollarSign, Clock, Star,
  TrendingUp, Users, Activity, BarChart3, Filter, Download, RefreshCw,
  ArrowUp, ArrowDown, MoreVertical, Tag, Zap, CheckCircle, Target,
  Calendar, Award, ChevronRight, Eye, Settings, Copy, ArrowLeft
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { useCompany } from '../contexts/CompanyContext';
import { PrimaryButton } from '../components/ui/button/PrimaryButton';
import ServiceFormModal from '../components/services/ServiceFormModal';
import ServiceManager from '../lib/services/serviceManager';
import { ConfirmModal } from '../components/ui/modal';

export default function Services() {
  const companyContext = useCompany();
  const activeCompany = companyContext?.activeCompany || null;
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [editingService, setEditingService] = useState<any>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; serviceId: string | null }>({
    isOpen: false,
    serviceId: null
  });

  const [services, setServices] = useState([
    { id: 'SRV-001', name: 'HVAC Installation', category: 'Installation', price: 3500, duration: '4-6 hours', rating: 4.8, active: true, bookings: 145, revenue: 507500, linkedType: 'work-order', linkedId: 'WO-2024-012', linkedPage: 'work-orders' },
    { id: 'SRV-002', name: 'Plumbing Repair', category: 'Repair', price: 150, duration: '1-2 hours', rating: 4.9, active: true, bookings: 342, revenue: 51300, linkedType: 'work-order', linkedId: 'WO-2024-023', linkedPage: 'work-orders' },
    { id: 'SRV-003', name: 'Electrical Upgrade', category: 'Upgrade', price: 2200, duration: '8-10 hours', rating: 4.7, active: true, bookings: 89, revenue: 195800, linkedType: 'quote', linkedId: 'Q-2024-045', linkedPage: 'quote-creation' },
    { id: 'SRV-004', name: 'Kitchen Renovation', category: 'Renovation', price: 15000, duration: '2-3 weeks', rating: 4.9, active: true, bookings: 47, revenue: 705000, linkedType: 'work-order', linkedId: 'WO-2024-008', linkedPage: 'work-orders' },
    { id: 'SRV-005', name: 'Bathroom Remodel', category: 'Renovation', price: 8500, duration: '1-2 weeks', rating: 4.8, active: true, bookings: 62, revenue: 527000, linkedType: 'work-order', linkedId: 'WO-2024-015', linkedPage: 'work-orders' },
    { id: 'SRV-006', name: 'Flooring Installation', category: 'Installation', price: 4200, duration: '2-3 days', rating: 4.6, active: true, bookings: 78, revenue: 327600, linkedType: 'quote', linkedId: 'Q-2024-067', linkedPage: 'quote-creation' },
    { id: 'SRV-007', name: 'Painting Services', category: 'Maintenance', price: 1200, duration: '1-2 days', rating: 4.7, active: true, bookings: 156, revenue: 187200, linkedType: 'work-order', linkedId: 'WO-2024-031', linkedPage: 'work-orders' },
    { id: 'SRV-008', name: 'Roofing Repair', category: 'Repair', price: 2800, duration: '1-2 days', rating: 4.8, active: true, bookings: 94, revenue: 263200, linkedType: 'quote', linkedId: 'Q-2024-089', linkedPage: 'quote-creation' },
    { id: 'SRV-009', name: 'Garage & Yard Cleanout', category: 'Cleanout', price: 499, duration: '4-8 hours', rating: 5.0, active: true, bookings: 0, revenue: 0, linkedType: 'quote', linkedId: 'Q-2024-NEW', linkedPage: 'quote-creation', description: 'Starting at $499 for basic cleanouts. Price varies by quantity and type of removal. Subscriber discounts available.' }
  ]);

  // Stats
  const stats = [
    {
      label: 'Total Services',
      value: '9',
      change: 12.5,
      trend: 'up',
      icon: Package,
      color: 'text-orange-400',
      bgColor: 'bg-orange-600/20'
    },
    {
      label: 'Total Revenue',
      value: '$2.76M',
      change: 18.3,
      trend: 'up',
      icon: DollarSign,
      color: 'text-green-400',
      bgColor: 'bg-green-600/20'
    },
    {
      label: 'Total Bookings',
      value: '1,013',
      change: 24.7,
      trend: 'up',
      icon: Calendar,
      color: 'text-blue-400',
      bgColor: 'bg-blue-600/20'
    },
    {
      label: 'Avg Rating',
      value: '4.8',
      change: 5.2,
      trend: 'up',
      icon: Star,
      color: 'text-purple-400',
      bgColor: 'bg-purple-600/20'
    }
  ];

  // Categories
  const categories = [
    { name: 'All Services', count: 9, icon: Package, color: 'orange' },
    { name: 'Installation', count: 2, icon: Zap, color: 'blue' },
    { name: 'Repair', count: 2, icon: Settings, color: 'green' },
    { name: 'Renovation', count: 2, icon: Award, color: 'purple' },
    { name: 'Maintenance', count: 1, icon: CheckCircle, color: 'cyan' },
    { name: 'Cleanout', count: 1, icon: Trash2, color: 'amber' },
    { name: 'Upgrade', count: 1, icon: TrendingUp, color: 'yellow' }
  ];

  // Top performers
  const topPerformers = [
    { name: 'Kitchen Renovation', revenue: '$705K', bookings: 47, rating: 4.9 },
    { name: 'Bathroom Remodel', revenue: '$527K', bookings: 62, rating: 4.8 },
    { name: 'HVAC Installation', revenue: '$508K', bookings: 145, rating: 4.8 }
  ];

  // Recent activity
  const recentActivity = [
    { service: 'Plumbing Repair', action: 'Booked', time: '5 min ago', type: 'success' },
    { service: 'HVAC Installation', action: 'Completed', time: '12 min ago', type: 'success' },
    { service: 'Kitchen Renovation', action: 'In Progress', time: '23 min ago', type: 'info' },
    { service: 'Electrical Upgrade', action: 'Scheduled', time: '45 min ago', type: 'info' },
    { service: 'Painting Services', action: 'Completed', time: '1 hour ago', type: 'success' }
  ];

  // Load services from database
  useEffect(() => {
    if (activeCompany) {
      loadServices();
    }
  }, [activeCompany]);
  
  const loadServices = async () => {
    setLoading(true);
    try {
      const result = await ServiceManager.getServices(activeCompany?.id || '', false);
      if (result.success && result.data) {
        setServices(result.data);
      }
    } catch (error) {
      console.error('Error loading services:', error);
      toast.error('Failed to load services');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadServices();
    setRefreshing(false);
    toast.success('Services refreshed');
  };
  
  const handleCreateService = () => {
    setEditingService(null);
    setModalMode('create');
    setShowServiceModal(true);
  };

  const handleEditService = (service: any) => {
    setEditingService(service);
    setModalMode('edit');
    setShowServiceModal(true);
  };

  const handleDeleteService = async (serviceId: string) => {
    setDeleteConfirm({ isOpen: true, serviceId });
  };
  
  const confirmDeleteService = async () => {
    if (!deleteConfirm.serviceId) return;
    
    const result = await ServiceManager.deleteService(deleteConfirm.serviceId);
    if (result.success) {
      toast.success('Service deleted successfully');
      await loadServices();
    } else {
      toast.error(result.error || 'Failed to delete service');
    }
    
    setDeleteConfirm({ isOpen: false, serviceId: null });
  };
  
  const handleDuplicateService = async (serviceId: string) => {
    const result = await ServiceManager.duplicateService(serviceId);
    if (result.success) {
      toast.success('Service duplicated successfully');
      await loadServices();
    } else {
      toast.error(result.error || 'Failed to duplicate service');
    }
  };
  
  const handleSaveService = async (serviceData: any) => {
    const data = {
      ...serviceData,
      company_id: activeCompany?.id || ''
    };
    
    let result;
    if (modalMode === 'create') {
      result = await ServiceManager.createService(data);
    } else {
      result = await ServiceManager.updateService(editingService?.id, data);
    }
    
    if (result.success) {
      await loadServices();
      setShowServiceModal(false);
    } else {
      throw new Error(result.error || 'Failed to save service');
    }
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
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
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Package className="w-8 h-8 text-orange-400" />
              Services
            </h1>
          </div>
          <p className="text-gray-400 ml-14">Manage your service catalog and pricing</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 bg-[#1A1A1A] hover:bg-[#2A2A2A] border border-[#2A2A2A] rounded-xl transition"
          >
            <RefreshCw className={`w-5 h-5 text-gray-400 ${refreshing ? 'animate-spin' : ''}`} />
          </button>

          <PrimaryButton icon={<Download className="w-4 h-4" />}>
            Export
          </PrimaryButton>

          <PrimaryButton 
            onClick={handleCreateService}
            icon={<Plus className="w-4 h-4" />}
          >
            Add Service
          </PrimaryButton>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          const borderColor = stat.color.replace('text-', 'border-').replace('400', '500/20');
          return (
            <div
              key={index}
              className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6 hover:border-orange-500/30 transition group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl ${stat.bgColor} ${borderColor} border flex items-center justify-center group-hover:scale-110 transition`}>
                  <Icon className={`w-6 h-6 ${stat.color}`} />
                </div>
                <button className="p-1 opacity-0 group-hover:opacity-100 transition">
                  <MoreVertical className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              <div className="mb-2">
                <p className="text-sm text-gray-400 mb-1">{stat.label}</p>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
              </div>

              <div className="flex items-center gap-2">
                {stat.trend === 'up' ? (
                  <div className="flex items-center gap-1 px-2 py-1 bg-green-600/20 rounded-lg">
                    <ArrowUp className="w-3 h-3 text-green-400" />
                    <span className="text-sm font-semibold text-green-400">+{stat.change}%</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 px-2 py-1 bg-red-600/20 rounded-lg">
                    <ArrowDown className="w-3 h-3 text-red-400" />
                    <span className="text-sm font-semibold text-red-400">{stat.change}%</span>
                  </div>
                )}
                <span className="text-sm text-gray-500">vs last month</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Search and Filter */}
      <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-4">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              placeholder="Search services..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#0F0F0F] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/50"
            />
          </div>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-4 py-2 bg-[#0F0F0F] border border-[#2A2A2A] rounded-xl text-white text-sm focus:outline-none focus:border-orange-500/50"
          >
            <option value="all">All Categories</option>
            <option value="installation">Installation</option>
            <option value="repair">Repair</option>
            <option value="renovation">Renovation</option>
            <option value="maintenance">Maintenance</option>
            <option value="upgrade">Upgrade</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Categories Sidebar */}
        <div className="space-y-4">
          <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6">
            <h2 className="text-lg font-bold text-white mb-4">Categories</h2>
            <div className="space-y-2">
              {categories.map((category, index) => {
                const Icon = category.icon;
                const colorClasses = {
                  orange: { bg: 'bg-orange-600/20', border: 'border-orange-500/20', text: 'text-orange-400' },
                  blue: { bg: 'bg-blue-600/20', border: 'border-blue-500/20', text: 'text-blue-400' },
                  green: { bg: 'bg-green-600/20', border: 'border-green-500/20', text: 'text-green-400' },
                  purple: { bg: 'bg-purple-600/20', border: 'border-purple-500/20', text: 'text-purple-400' },
                  cyan: { bg: 'bg-cyan-600/20', border: 'border-cyan-500/20', text: 'text-cyan-400' },
                  yellow: { bg: 'bg-yellow-600/20', border: 'border-yellow-500/20', text: 'text-yellow-400' }
                }[category.color] || { bg: 'bg-orange-600/20', border: 'border-orange-500/20', text: 'text-orange-400' };
                
                return (
                  <button
                    key={index}
                    className="w-full p-3 bg-[#0F0F0F] hover:bg-[#2A2A2A] border border-[#2A2A2A] hover:border-orange-500/30 rounded-xl transition text-left group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg ${colorClasses.bg} border ${colorClasses.border} flex items-center justify-center`}>
                          <Icon className={`w-5 h-5 ${colorClasses.text}`} />
                        </div>
                        <p className="text-sm font-semibold text-white group-hover:text-orange-400 transition">
                          {category.name}
                        </p>
                      </div>
                      <span className={`px-2 py-1 rounded-lg text-sm font-bold ${colorClasses.bg} ${colorClasses.text}`}>
                        {category.count}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Top Performers */}
          <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Award className="w-5 h-5 text-purple-400" />
              Top Performers
            </h2>
            <div className="space-y-3">
              {topPerformers.map((service, index) => (
                <div key={index} className="p-3 bg-[#0F0F0F] rounded-xl border border-[#2A2A2A]">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center">
                      <span className="text-sm font-bold text-white">#{index + 1}</span>
                    </div>
                    <p className="text-sm font-semibold text-white flex-1">{service.name}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <p className="text-gray-400">Revenue</p>
                      <p className="text-white font-bold">{service.revenue}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Bookings</p>
                      <p className="text-white font-bold">{service.bookings}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Rating</p>
                      <p className="text-purple-400 font-bold">★ {service.rating}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Services Grid */}
        <div className="lg:col-span-2 space-y-4">
          {services.map((service) => (
            <div key={service.id} className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6 hover:border-orange-500/30 transition group">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-orange-600/20 to-orange-700/20 flex items-center justify-center border border-orange-500/20">
                    <Package className="w-7 h-7 text-orange-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-bold text-white group-hover:text-orange-400 transition">{service.name}</h3>
                      <span className="px-2 py-0.5 rounded-md text-sm font-semibold bg-green-600/20 text-green-400 border border-green-500/20">
                        ACTIVE
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-gray-400">{service.category} • {service.id}</p>
                      {service.linkedId && (
                        <span className="px-2 py-0.5 rounded-md text-sm font-semibold bg-blue-600/20 text-blue-400 border border-blue-500/20 flex items-center gap-1">
                          <ChevronRight className="w-3 h-3" />
                          {service.linkedId}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button className="p-2 opacity-0 group-hover:opacity-100 hover:bg-[#2A2A2A] rounded-lg transition">
                  <MoreVertical className="w-4 h-4 text-gray-400" />
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                <div className="p-3 bg-[#0F0F0F] rounded-xl border border-[#2A2A2A]">
                  <div className="flex items-center gap-2 mb-1">
                    <DollarSign className="w-4 h-4 text-green-400" />
                    <p className="text-sm text-gray-400">Price</p>
                  </div>
                  <p className="font-bold text-white">${service.price.toLocaleString()}</p>
                </div>
                <div className="p-3 bg-[#0F0F0F] rounded-xl border border-[#2A2A2A]">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-4 h-4 text-blue-400" />
                    <p className="text-sm text-gray-400">Duration</p>
                  </div>
                  <p className="text-sm text-white">{service.duration}</p>
                </div>
                <div className="p-3 bg-[#0F0F0F] rounded-xl border border-[#2A2A2A]">
                  <div className="flex items-center gap-2 mb-1">
                    <Star className="w-4 h-4 text-purple-400" />
                    <p className="text-sm text-gray-400">Rating</p>
                  </div>
                  <p className="font-bold text-white">{service.rating} ★</p>
                </div>
                <div className="p-3 bg-[#0F0F0F] rounded-xl border border-[#2A2A2A]">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="w-4 h-4 text-orange-400" />
                    <p className="text-sm text-gray-400">Bookings</p>
                  </div>
                  <p className="font-bold text-white">{service.bookings}</p>
                </div>
                <div className="p-3 bg-[#0F0F0F] rounded-xl border border-[#2A2A2A]">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="w-4 h-4 text-cyan-400" />
                    <p className="text-sm text-gray-400">Revenue</p>
                  </div>
                  <p className="font-bold text-white">${(service.revenue / 1000).toFixed(0)}K</p>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-4 border-t border-[#2A2A2A]">
                <button 
                  onClick={() => handleEditService(service)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-orange-600/10 hover:bg-orange-600/20 rounded-lg text-orange-400 text-sm font-semibold transition border border-orange-500/20"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit Service
                </button>
                <button 
                  onClick={() => handleDuplicateService(service.id)}
                  className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-600/10 hover:bg-blue-600/20 rounded-lg text-blue-400 text-sm font-semibold transition border border-blue-500/20"
                  title="Duplicate Service"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => handleDeleteService(service.id)}
                  className="flex items-center justify-center gap-2 px-3 py-2 bg-red-600/10 hover:bg-red-600/20 rounded-lg text-red-400 text-sm font-semibold transition border border-red-500/20"
                  title="Delete Service"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-orange-400" />
          Recent Activity
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {recentActivity.map((activity, index) => (
            <div key={index} className="p-4 bg-[#0F0F0F] rounded-xl border border-[#2A2A2A] hover:border-orange-500/30 transition cursor-pointer">
              <p className="text-sm font-semibold text-white mb-1">{activity.service}</p>
              <p className="text-sm text-gray-400 mb-2">{activity.action}</p>
              <p className="text-sm text-gray-500">{activity.time}</p>
            </div>
          ))}
        </div>
      </div>
      
      {/* Service Form Modal */}
      <ServiceFormModal
        isOpen={showServiceModal}
        onClose={() => setShowServiceModal(false)}
        onSave={handleSaveService}
        editingService={editingService}
        mode={modalMode}
      />
      
      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, serviceId: null })}
        onConfirm={confirmDeleteService}
        title="Delete Service"
        message="Are you sure you want to delete this service? It will be marked as inactive."
        variant="danger"
      />
    </div>
  );
}