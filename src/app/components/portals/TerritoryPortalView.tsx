/**
 * Territory Portal - Territory Admin Dashboard
 * Separate app for territory admins with controlled access
 * They manage their own subcontractors/vendors, but owner controls ads and major vendors
 */

import React, { useState } from 'react';
import {
  MapPin,
  Users,
  Package,
  Megaphone,
  DollarSign,
  TrendingUp,
  Settings,
  FileText,
  Calendar,
  MessageSquare,
  BarChart3,
  UserPlus,
  Store,
  Briefcase,
  Shield,
  AlertCircle,
  CheckCircle,
  Clock,
  Search,
  Filter,
  Download,
  Upload,
  Eye,
  Edit,
  Trash2,
} from 'lucide-react';
import { useUser } from '../../lib/user-context';

interface TerritoryPortalViewProps {
  onNavigate: (page: string) => void;
}

export default function TerritoryPortalView({ onNavigate }: TerritoryPortalViewProps) {
  const { user } = useUser();
  const [activeSection, setActiveSection] = useState<'dashboard' | 'vendors' | 'subcontractors' | 'analytics' | 'settings'>('dashboard');

  // Demo territory data
  const territoryData = {
    id: 'TERR-001',
    name: 'Dallas Metro',
    state: 'TX',
    activeVendors: 12,
    activeSubcontractors: 24,
    pendingApprovals: 3,
    monthlyRevenue: 45780,
    totalCustomers: 156,
  };

  // Demo vendors (managed by territory admin)
  const [myVendors] = useState([
    {
      id: 'vendor-001',
      name: 'Local Hardware Store',
      type: 'Retail',
      status: 'active',
      addedBy: 'Territory Admin',
      revenue: 12500,
      joinDate: '2026-01-15',
    },
    {
      id: 'vendor-002',
      name: 'Dallas Plumbing Supply',
      type: 'Wholesale',
      status: 'active',
      addedBy: 'Territory Admin',
      revenue: 8900,
      joinDate: '2026-02-01',
    },
    {
      id: 'vendor-003',
      name: 'Metro Electric Parts',
      type: 'Retail',
      status: 'pending',
      addedBy: 'Territory Admin',
      revenue: 0,
      joinDate: '2026-05-02',
    },
  ]);

  // Demo major vendors (controlled by platform owner - READ ONLY)
  const [majorVendors] = useState([
    {
      id: 'vendor-major-001',
      name: 'Home Depot',
      type: 'National Chain',
      status: 'active',
      addedBy: 'Platform Owner',
      revenue: 125000,
    },
    {
      id: 'vendor-major-002',
      name: "Lowe's",
      type: 'National Chain',
      status: 'active',
      addedBy: 'Platform Owner',
      revenue: 98000,
    },
    {
      id: 'vendor-major-003',
      name: 'Grainger',
      type: 'National Distributor',
      status: 'active',
      addedBy: 'Platform Owner',
      revenue: 67000,
    },
  ]);

  // Demo subcontractors
  const [mySubcontractors] = useState([
    {
      id: 'sub-001',
      name: 'ABC Plumbing Services',
      trade: 'Plumbing',
      status: 'active',
      rating: 4.8,
      completedJobs: 45,
      addedBy: 'Territory Admin',
    },
    {
      id: 'sub-002',
      name: 'Elite Electrical',
      trade: 'Electrical',
      status: 'active',
      rating: 4.9,
      completedJobs: 62,
      addedBy: 'Territory Admin',
    },
    {
      id: 'sub-003',
      name: 'Dallas HVAC Pros',
      trade: 'HVAC',
      status: 'pending',
      rating: 0,
      completedJobs: 0,
      addedBy: 'Territory Admin',
    },
  ]);

  return (
    <div className="w-full min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <MapPin className="w-8 h-8" />
                <div>
                  <h1 className="text-3xl font-bold">{territoryData.name} Territory Portal</h1>
                  <p className="text-purple-100 mt-1">Territory Administrator Dashboard - Manage Your Region</p>
                </div>
              </div>
            </div>
            <button
              onClick={() => onNavigate('unified-dashboard')}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
            >
              Exit Portal
            </button>
          </div>

          {/* Territory Stats */}
          <div className="grid grid-cols-5 gap-4 mt-8">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm">My Vendors</p>
                  <p className="text-2xl font-bold mt-1">{territoryData.activeVendors}</p>
                </div>
                <Store className="w-7 h-7 text-white/80" />
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm">Subcontractors</p>
                  <p className="text-2xl font-bold mt-1">{territoryData.activeSubcontractors}</p>
                </div>
                <Briefcase className="w-7 h-7 text-white/80" />
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm">Customers</p>
                  <p className="text-2xl font-bold mt-1">{territoryData.totalCustomers}</p>
                </div>
                <Users className="w-7 h-7 text-white/80" />
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm">Pending Approvals</p>
                  <p className="text-2xl font-bold mt-1">{territoryData.pendingApprovals}</p>
                </div>
                <Clock className="w-7 h-7 text-white/80" />
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm">Monthly Revenue</p>
                  <p className="text-2xl font-bold mt-1">${(territoryData.monthlyRevenue / 1000).toFixed(1)}k</p>
                </div>
                <DollarSign className="w-7 h-7 text-white/80" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-6">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
              { id: 'vendors', label: 'My Vendors', icon: Store },
              { id: 'subcontractors', label: 'Subcontractors', icon: Briefcase },
              { id: 'analytics', label: 'Analytics', icon: TrendingUp },
              { id: 'settings', label: 'Settings', icon: Settings },
            ].map(section => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id as any)}
                className={`flex items-center gap-2 px-4 py-4 border-b-2 transition-colors ${
                  activeSection === section.id
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <section.icon className="w-5 h-5" />
                {section.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Dashboard */}
        {activeSection === 'dashboard' && (
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="grid grid-cols-4 gap-4">
              <button
                onClick={() => setActiveSection('vendors')}
                className="bg-white border rounded-lg p-6 hover:shadow-md transition-shadow text-left"
              >
                <UserPlus className="w-8 h-8 text-purple-600 mb-3" />
                <p className="font-semibold text-gray-900">Add Vendor</p>
                <p className="text-sm text-gray-600 mt-1">Register new local vendor</p>
              </button>
              <button
                onClick={() => setActiveSection('subcontractors')}
                className="bg-white border rounded-lg p-6 hover:shadow-md transition-shadow text-left"
              >
                <Briefcase className="w-8 h-8 text-blue-600 mb-3" />
                <p className="font-semibold text-gray-900">Add Subcontractor</p>
                <p className="text-sm text-gray-600 mt-1">Onboard new trade professional</p>
              </button>
              <button className="bg-white border rounded-lg p-6 hover:shadow-md transition-shadow text-left">
                <BarChart3 className="w-8 h-8 text-green-600 mb-3" />
                <p className="font-semibold text-gray-900">View Reports</p>
                <p className="text-sm text-gray-600 mt-1">Territory performance metrics</p>
              </button>
              <button className="bg-white border rounded-lg p-6 hover:shadow-md transition-shadow text-left">
                <MessageSquare className="w-8 h-8 text-orange-600 mb-3" />
                <p className="font-semibold text-gray-900">Support</p>
                <p className="text-sm text-gray-600 mt-1">Contact platform support</p>
              </button>
            </div>

            {/* Pending Approvals */}
            <div className="bg-white rounded-lg border p-6">
              <h2 className="text-lg font-semibold mb-4">Pending Approvals</h2>
              <div className="space-y-3">
                {myVendors.filter(v => v.status === 'pending').map(vendor => (
                  <div key={vendor.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                        <Store className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-medium">{vendor.name}</p>
                        <p className="text-sm text-gray-600">{vendor.type} - Applied {vendor.joinDate}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                        Approve
                      </button>
                      <button className="px-4 py-2 border text-gray-700 rounded-lg hover:bg-gray-50">
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
                {mySubcontractors.filter(s => s.status === 'pending').map(sub => (
                  <div key={sub.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <Briefcase className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium">{sub.name}</p>
                        <p className="text-sm text-gray-600">{sub.trade} Contractor</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                        Approve
                      </button>
                      <button className="px-4 py-2 border text-gray-700 rounded-lg hover:bg-gray-50">
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-white rounded-lg border p-6">
                <h2 className="text-lg font-semibold mb-4">Recent Vendor Activity</h2>
                <div className="space-y-3">
                  {myVendors.slice(0, 3).map(vendor => (
                    <div key={vendor.id} className="flex items-center justify-between pb-3 border-b last:border-0">
                      <div>
                        <p className="font-medium">{vendor.name}</p>
                        <p className="text-sm text-gray-600">Revenue: ${vendor.revenue.toLocaleString()}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded ${
                        vendor.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {vendor.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-lg border p-6">
                <h2 className="text-lg font-semibold mb-4">Top Subcontractors</h2>
                <div className="space-y-3">
                  {mySubcontractors.filter(s => s.status === 'active').slice(0, 3).map(sub => (
                    <div key={sub.id} className="flex items-center justify-between pb-3 border-b last:border-0">
                      <div>
                        <p className="font-medium">{sub.name}</p>
                        <p className="text-sm text-gray-600">{sub.completedJobs} jobs completed</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-yellow-500">★</span>
                        <span className="font-medium">{sub.rating}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Vendors Section */}
        {activeSection === 'vendors' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Vendor Management</h2>
              <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2">
                <UserPlus className="w-5 h-5" />
                Add New Vendor
              </button>
            </div>

            {/* My Vendors (Full Control) */}
            <div className="bg-white rounded-lg border">
              <div className="p-6 border-b">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Shield className="w-5 h-5 text-purple-600" />
                  My Vendors (You Control These)
                </h3>
                <p className="text-sm text-gray-600 mt-1">Vendors you've added to your territory</p>
              </div>
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-6 py-3 text-sm font-semibold">Name</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold">Type</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold">Status</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold">Revenue</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold">Join Date</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {myVendors.map(vendor => (
                    <tr key={vendor.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium">{vendor.name}</td>
                      <td className="px-6 py-4">{vendor.type}</td>
                      <td className="px-6 py-4">
                        <span className={`text-xs px-2 py-1 rounded ${
                          vendor.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {vendor.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">${vendor.revenue.toLocaleString()}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{vendor.joinDate}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button className="p-1 hover:bg-gray-100 rounded" title="View">
                            <Eye className="w-4 h-4 text-gray-600" />
                          </button>
                          <button className="p-1 hover:bg-gray-100 rounded" title="Edit">
                            <Edit className="w-4 h-4 text-gray-600" />
                          </button>
                          <button className="p-1 hover:bg-gray-100 rounded" title="Remove">
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Major Vendors (READ ONLY) */}
            <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-lg border-2 border-red-200">
              <div className="p-6 border-b border-red-200">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Shield className="w-5 h-5 text-red-600" />
                  Major Vendors (Platform Owner Controlled - READ ONLY)
                </h3>
                <p className="text-sm text-red-700 mt-1">
                  These vendors are managed by the platform owner. You cannot edit or remove them.
                </p>
              </div>
              <table className="w-full">
                <thead className="bg-red-50 border-b border-red-200">
                  <tr>
                    <th className="text-left px-6 py-3 text-sm font-semibold">Name</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold">Type</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold">Status</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold">Revenue</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold">Managed By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-red-200">
                  {majorVendors.map(vendor => (
                    <tr key={vendor.id} className="bg-white/50">
                      <td className="px-6 py-4 font-medium">{vendor.name}</td>
                      <td className="px-6 py-4">{vendor.type}</td>
                      <td className="px-6 py-4">
                        <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-700">
                          {vendor.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">${vendor.revenue.toLocaleString()}</td>
                      <td className="px-6 py-4">
                        <span className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 font-medium">
                          Platform Owner
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Ads Notice */}
            <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6">
              <div className="flex items-start gap-4">
                <Megaphone className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-yellow-900">Advertising Control</h3>
                  <p className="text-sm text-yellow-800 mt-1">
                    All advertising campaigns and major vendor partnerships are managed exclusively by the Platform Owner.
                    You have view-only access to platform-wide advertising analytics within your territory.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Subcontractors Section */}
        {activeSection === 'subcontractors' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Subcontractor Management</h2>
              <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2">
                <UserPlus className="w-5 h-5" />
                Add New Subcontractor
              </button>
            </div>

            <div className="bg-white rounded-lg border">
              <div className="p-6 border-b">
                <h3 className="text-lg font-semibold">Your Subcontractors</h3>
                <p className="text-sm text-gray-600 mt-1">Manage trade professionals in your territory</p>
              </div>
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-6 py-3 text-sm font-semibold">Name</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold">Trade</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold">Status</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold">Rating</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold">Jobs Completed</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {mySubcontractors.map(sub => (
                    <tr key={sub.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium">{sub.name}</td>
                      <td className="px-6 py-4">{sub.trade}</td>
                      <td className="px-6 py-4">
                        <span className={`text-xs px-2 py-1 rounded ${
                          sub.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {sub.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {sub.rating > 0 ? (
                          <div className="flex items-center gap-1">
                            <span className="text-yellow-500">★</span>
                            <span>{sub.rating}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </td>
                      <td className="px-6 py-4">{sub.completedJobs}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button className="p-1 hover:bg-gray-100 rounded" title="View">
                            <Eye className="w-4 h-4 text-gray-600" />
                          </button>
                          <button className="p-1 hover:bg-gray-100 rounded" title="Edit">
                            <Edit className="w-4 h-4 text-gray-600" />
                          </button>
                          <button className="p-1 hover:bg-gray-100 rounded" title="Remove">
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Analytics Section */}
        {activeSection === 'analytics' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Territory Analytics</h2>

            <div className="grid grid-cols-3 gap-6">
              <div className="bg-white rounded-lg border p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Revenue Trend</h3>
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <p className="text-3xl font-bold text-green-600">+23%</p>
                <p className="text-sm text-gray-600 mt-1">vs last month</p>
              </div>

              <div className="bg-white rounded-lg border p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Active Users</h3>
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <p className="text-3xl font-bold text-blue-600">{territoryData.totalCustomers}</p>
                <p className="text-sm text-gray-600 mt-1">in your territory</p>
              </div>

              <div className="bg-white rounded-lg border p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Avg Response Time</h3>
                  <Clock className="w-5 h-5 text-purple-600" />
                </div>
                <p className="text-3xl font-bold text-purple-600">2.4h</p>
                <p className="text-sm text-gray-600 mt-1">service requests</p>
              </div>
            </div>

            <div className="bg-white rounded-lg border p-6">
              <h3 className="font-semibold mb-4">Performance Overview</h3>
              <p className="text-gray-600">Detailed analytics charts would go here...</p>
            </div>
          </div>
        )}

        {/* Settings Section */}
        {activeSection === 'settings' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Territory Settings</h2>

            <div className="bg-white rounded-lg border p-6">
              <h3 className="font-semibold mb-4">Territory Information</h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Territory Name</label>
                  <input
                    type="text"
                    value={territoryData.name}
                    className="w-full px-4 py-2 border rounded-lg"
                    readOnly
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                  <input
                    type="text"
                    value={territoryData.state}
                    className="w-full px-4 py-2 border rounded-lg"
                    readOnly
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border p-6">
              <h3 className="font-semibold mb-4">Permissions</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="font-medium">Manage Local Vendors</span>
                  </div>
                  <span className="text-sm text-green-700">Enabled</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="font-medium">Manage Subcontractors</span>
                  </div>
                  <span className="text-sm text-green-700">Enabled</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <span className="font-medium">Manage Major Vendors</span>
                  </div>
                  <span className="text-sm text-red-700">Platform Owner Only</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <span className="font-medium">Manage Advertising</span>
                  </div>
                  <span className="text-sm text-red-700">Platform Owner Only</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
