/**
 * Property Management Marketing Components
 * Marketing system for promoting renovation services to condo residents
 */

import React, { useState } from 'react';
import {
  Megaphone, Target, Package, Sparkles, Tag, Zap, Gift, Star, Award,
  Send, Plus, Calendar, Users2, Clock, CheckCircle, Wrench
} from 'lucide-react';

interface MarketingCampaign {
  id: string;
  name: string;
  type: 'renovation' | 'upgrade' | 'seasonal' | 'promotion';
  status: 'draft' | 'active' | 'scheduled' | 'completed';
  targetAudience: string[];
  properties: string[];
  service: string;
  description: string;
  offerDetails: string;
  discount?: number;
  startDate: string;
  endDate: string;
  emailsSent: number;
  opensRate: number;
  clickRate: number;
  conversions: number;
  createdAt: string;
}

interface RenovationService {
  id: string;
  name: string;
  category: 'kitchen' | 'bathroom' | 'flooring' | 'painting' | 'electrical' | 'plumbing' | 'hvac' | 'windows' | 'cabinets' | 'countertops' | 'custom';
  description: string;
  startingPrice: number;
  duration: string;
  images: string[];
  features: string[];
  popular: boolean;
}

interface Property {
  id: string;
  name: string;
  occupiedUnits: number;
}

// Marketing View Component
export function MarketingView({
  campaigns,
  services,
  residents,
  properties,
  onCreateCampaign,
  onViewServices,
  selectedCampaign,
  onSelectCampaign,
  onLaunchCampaign,
  onSendToResidents
}: any) {
  const [activeTab, setActiveTab] = useState<'campaigns' | 'services'>('campaigns');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-500 rounded-xl p-6 border border-purple-400/20">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
              <Megaphone className="w-8 h-8" />
              Marketing & Promotions
            </h2>
            <p className="text-purple-100">Promote renovation services to condo residents</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onViewServices}
              className="bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white px-6 py-3 rounded-lg font-semibold transition-all flex items-center gap-2"
            >
              <Package className="w-5 h-5" />
              Service Catalog
            </button>
            <button
              onClick={onCreateCampaign}
              className="bg-white hover:bg-purple-50 text-purple-600 px-6 py-3 rounded-lg font-semibold transition-all flex items-center gap-2 shadow-lg"
            >
              <Plus className="w-5 h-5" />
              New Campaign
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mt-6">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <Zap className="w-5 h-5 text-yellow-300" />
              <span className="text-2xl font-bold text-white">{campaigns.filter((c: MarketingCampaign) => c.status === 'active').length}</span>
            </div>
            <p className="text-purple-100 text-sm">Active Campaigns</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <Target className="w-5 h-5 text-green-300" />
              <span className="text-2xl font-bold text-white">{residents.length}</span>
            </div>
            <p className="text-purple-100 text-sm">Target Audience</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <Package className="w-5 h-5 text-blue-300" />
              <span className="text-2xl font-bold text-white">{services.length}</span>
            </div>
            <p className="text-purple-100 text-sm">Available Services</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <Award className="w-5 h-5 text-orange-300" />
              <span className="text-2xl font-bold text-white">
                {campaigns.reduce((acc: number, c: MarketingCampaign) => acc + c.conversions, 0)}
              </span>
            </div>
            <p className="text-purple-100 text-sm">Total Conversions</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('campaigns')}
          className={`px-6 py-3 rounded-lg font-semibold transition-all ${
            activeTab === 'campaigns'
              ? 'bg-purple-600 text-white'
              : 'bg-zinc-800 text-gray-400 hover:text-white'
          }`}
        >
          Marketing Campaigns
        </button>
        <button
          onClick={() => setActiveTab('services')}
          className={`px-6 py-3 rounded-lg font-semibold transition-all ${
            activeTab === 'services'
              ? 'bg-purple-600 text-white'
              : 'bg-zinc-800 text-gray-400 hover:text-white'
          }`}
        >
          Renovation Services
        </button>
      </div>

      {activeTab === 'campaigns' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Campaigns List */}
          <div className="lg:col-span-2 space-y-4">
            {campaigns.map((campaign: MarketingCampaign) => (
              <div
                key={campaign.id}
                onClick={() => onSelectCampaign(campaign)}
                className={`bg-zinc-900 border rounded-xl p-6 cursor-pointer transition-all ${
                  selectedCampaign?.id === campaign.id
                    ? 'border-purple-500 shadow-lg shadow-purple-500/20'
                    : 'border-zinc-800 hover:border-purple-500/50'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-white">{campaign.name}</h3>
                      <CampaignStatusBadge status={campaign.status} />
                      <CampaignTypeBadge type={campaign.type} />
                    </div>
                    <p className="text-gray-400 mb-3">{campaign.description}</p>
                    <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-3 mb-3">
                      <p className="text-sm text-purple-400 font-semibold mb-1">Offer Details:</p>
                      <p className="text-white">{campaign.offerDetails}</p>
                      {campaign.discount && (
                        <div className="mt-2 flex items-center gap-2">
                          <Tag className="w-4 h-4 text-green-400" />
                          <span className="text-green-400 font-bold">{campaign.discount}% OFF</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Emails Sent</p>
                    <p className="text-lg font-bold text-white">{campaign.emailsSent}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Open Rate</p>
                    <p className="text-lg font-bold text-blue-400">{campaign.opensRate}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Click Rate</p>
                    <p className="text-lg font-bold text-purple-400">{campaign.clickRate}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Conversions</p>
                    <p className="text-lg font-bold text-green-400">{campaign.conversions}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {new Date(campaign.startDate).toLocaleDateString()} - {new Date(campaign.endDate).toLocaleDateString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users2 className="w-4 h-4" />
                    {campaign.properties.join(', ')}
                  </span>
                </div>

                {campaign.status === 'draft' && (
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onLaunchCampaign(campaign);
                      }}
                      className="flex-1 bg-green-600 hover:bg-green-500 text-white py-2 rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
                    >
                      <Zap className="w-4 h-4" />
                      Launch Campaign
                    </button>
                  </div>
                )}

                {campaign.status === 'active' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSendToResidents(campaign);
                    }}
                    className="w-full bg-purple-600 hover:bg-purple-500 text-white py-2 rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    Send to Residents
                  </button>
                )}
              </div>
            ))}

            {campaigns.length === 0 && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-12 text-center">
                <Megaphone className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">No Campaigns Yet</h3>
                <p className="text-gray-400 mb-4">Create your first marketing campaign to promote renovations</p>
                <button
                  onClick={onCreateCampaign}
                  className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-lg font-semibold transition-all"
                >
                  Create Campaign
                </button>
              </div>
            )}
          </div>

          {/* Campaign Details Panel */}
          <div className="lg:col-span-1">
            {selectedCampaign ? (
              <CampaignDetailsPanel campaign={selectedCampaign} />
            ) : (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center">
                <Target className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">Select a campaign to view details</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <RenovationServicesGrid services={services} />
      )}
    </div>
  );
}

// Campaign Status Badge
function CampaignStatusBadge({ status }: { status: string }) {
  const config = {
    draft: { bg: 'bg-gray-500/20', text: 'text-gray-400', label: 'Draft' },
    active: { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Active' },
    scheduled: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Scheduled' },
    completed: { bg: 'bg-purple-500/20', text: 'text-purple-400', label: 'Completed' },
  };

  const { bg, text, label } = config[status as keyof typeof config];
  return (
    <span className={`${bg} ${text} text-xs px-3 py-1 rounded-full font-semibold`}>
      {label}
    </span>
  );
}

// Campaign Type Badge
function CampaignTypeBadge({ type }: { type: string }) {
  const config = {
    renovation: { icon: Wrench, color: 'text-orange-400' },
    upgrade: { icon: Sparkles, color: 'text-blue-400' },
    seasonal: { icon: Calendar, color: 'text-green-400' },
    promotion: { icon: Gift, color: 'text-purple-400' },
  };

  const { icon: Icon, color } = config[type as keyof typeof config];
  return (
    <span className={`${color} text-xs flex items-center gap-1`}>
      <Icon className="w-3 h-3" />
      {type}
    </span>
  );
}

// Campaign Details Panel
function CampaignDetailsPanel({ campaign }: { campaign: MarketingCampaign }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
      <h3 className="text-xl font-bold text-white mb-4">Campaign Details</h3>

      <div>
        <p className="text-xs text-gray-500 mb-1">Service</p>
        <p className="text-white font-semibold">{campaign.service}</p>
      </div>

      <div>
        <p className="text-xs text-gray-500 mb-1">Target Audience</p>
        <div className="flex flex-wrap gap-2 mt-1">
          {campaign.targetAudience.map((audience, idx) => (
            <span key={idx} className="bg-purple-500/20 text-purple-400 text-xs px-2 py-1 rounded">
              {audience}
            </span>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs text-gray-500 mb-1">Properties</p>
        <div className="flex flex-wrap gap-2 mt-1">
          {campaign.properties.map((property, idx) => (
            <span key={idx} className="bg-blue-500/20 text-blue-400 text-xs px-2 py-1 rounded">
              {property}
            </span>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs text-gray-500 mb-1">Duration</p>
        <p className="text-white">
          {new Date(campaign.startDate).toLocaleDateString()} - {new Date(campaign.endDate).toLocaleDateString()}
        </p>
      </div>

      {campaign.discount && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
          <p className="text-xs text-green-400 mb-1">Special Discount</p>
          <p className="text-2xl font-bold text-green-400">{campaign.discount}% OFF</p>
        </div>
      )}

      <div className="pt-4 border-t border-zinc-700">
        <p className="text-xs text-gray-500 mb-2">Performance Metrics</p>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Emails Sent</span>
            <span className="text-white font-semibold">{campaign.emailsSent}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Open Rate</span>
            <span className="text-blue-400 font-semibold">{campaign.opensRate}%</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Click Rate</span>
            <span className="text-purple-400 font-semibold">{campaign.clickRate}%</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Conversions</span>
            <span className="text-green-400 font-semibold">{campaign.conversions}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Renovation Services Grid
function RenovationServicesGrid({ services }: { services: RenovationService[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {services.map((service) => (
        <div key={service.id} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden hover:border-purple-500/50 transition-all">
          {/* Service Image Placeholder */}
          <div className="h-48 bg-gradient-to-br from-purple-600/20 to-orange-600/20 flex items-center justify-center">
            <Package className="w-16 h-16 text-purple-400" />
          </div>

          <div className="p-6">
            <div className="flex items-start justify-between mb-3">
              <h3 className="text-xl font-bold text-white">{service.name}</h3>
              {service.popular && (
                <span className="bg-orange-500/20 text-orange-400 text-xs px-2 py-1 rounded-full font-semibold flex items-center gap-1">
                  <Star className="w-3 h-3" />
                  Popular
                </span>
              )}
            </div>

            <p className="text-gray-400 text-sm mb-4">{service.description}</p>

            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500">Starting Price</span>
                <span className="text-2xl font-bold text-green-500">${service.startingPrice.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Clock className="w-4 h-4" />
                {service.duration}
              </div>
            </div>

            <div className="mb-4">
              <p className="text-xs text-gray-500 mb-2">Features:</p>
              <div className="space-y-1">
                {service.features.slice(0, 3).map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm text-gray-300">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    {feature}
                  </div>
                ))}
              </div>
            </div>

            <button className="w-full bg-purple-600 hover:bg-purple-500 text-white py-2 rounded-lg font-semibold transition-all">
              Add to Campaign
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// New Campaign Modal
export function NewCampaignModal({ onClose, onSave, properties, services }: any) {
  const [formData, setFormData] = useState({
    name: '',
    type: 'renovation' as 'renovation' | 'upgrade' | 'seasonal' | 'promotion',
    targetAudience: ['all'],
    properties: [properties[0]?.name || ''],
    service: services[0]?.name || '',
    description: '',
    offerDetails: '',
    discount: 0,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
          <Megaphone className="w-6 h-6 text-purple-500" />
          Create Marketing Campaign
        </h2>

        <div className="space-y-4 mb-6">
          <div>
            <label className="text-sm text-gray-400 mb-2 block">Campaign Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Spring Kitchen Renovation Special"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Campaign Type *</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500"
              >
                <option value="renovation">Renovation</option>
                <option value="upgrade">Upgrade</option>
                <option value="seasonal">Seasonal</option>
                <option value="promotion">Promotion</option>
              </select>
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-2 block">Service *</label>
              <select
                value={formData.service}
                onChange={(e) => setFormData({ ...formData, service: e.target.value })}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500"
              >
                {services.map((service: RenovationService) => (
                  <option key={service.id} value={service.name}>{service.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-2 block">Description *</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              placeholder="Brief description of the campaign"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none"
            />
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-2 block">Offer Details *</label>
            <textarea
              value={formData.offerDetails}
              onChange={(e) => setFormData({ ...formData, offerDetails: e.target.value })}
              rows={4}
              placeholder="Detailed information about the offer, pricing, and benefits"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Discount %</label>
              <input
                type="number"
                value={formData.discount}
                onChange={(e) => setFormData({ ...formData, discount: parseFloat(e.target.value) })}
                min="0"
                max="100"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-2 block">Start Date *</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-2 block">End Date *</label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-2 block">Target Properties *</label>
            <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
              {properties.map((property: Property) => (
                <label key={property.id} className="flex items-center gap-2 mb-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.properties.includes(property.name)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData({ ...formData, properties: [...formData.properties, property.name] });
                      } else {
                        setFormData({ ...formData, properties: formData.properties.filter(p => p !== property.name) });
                      }
                    }}
                    className="w-4 h-4 rounded border-zinc-600 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-white">{property.name}</span>
                  <span className="text-gray-500 text-sm">({property.occupiedUnits} units)</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => onSave(formData)}
            className="flex-1 bg-purple-600 hover:bg-purple-500 text-white py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Create Campaign
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-zinc-700 hover:bg-zinc-600 text-white py-3 rounded-lg font-semibold transition-all"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// Service Catalog Modal
export function ServiceCatalogModal({ onClose, services, onAddService }: any) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newService, setNewService] = useState({
    name: '',
    category: 'kitchen' as RenovationService['category'],
    description: '',
    startingPrice: 0,
    duration: '',
    features: ['', '', '']
  });

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Package className="w-6 h-6 text-purple-500" />
            Renovation Service Catalog
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Service
            </button>
            <button
              onClick={onClose}
              className="bg-zinc-700 hover:bg-zinc-600 text-white px-4 py-2 rounded-lg font-semibold transition-all"
            >
              Close
            </button>
          </div>
        </div>

        {showAddForm && (
          <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-bold text-white mb-4">Add New Service</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Service Name</label>
                <input
                  type="text"
                  value={newService.name}
                  onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Category</label>
                <select
                  value={newService.category}
                  onChange={(e) => setNewService({ ...newService, category: e.target.value as any })}
                  className="w-full bg-zinc-900 border border-zinc-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="kitchen">Kitchen</option>
                  <option value="bathroom">Bathroom</option>
                  <option value="flooring">Flooring</option>
                  <option value="painting">Painting</option>
                  <option value="electrical">Electrical</option>
                  <option value="plumbing">Plumbing</option>
                  <option value="hvac">HVAC</option>
                  <option value="windows">Windows</option>
                  <option value="cabinets">Cabinets</option>
                  <option value="countertops">Countertops</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-sm text-gray-400 mb-2 block">Description</label>
                <textarea
                  value={newService.description}
                  onChange={(e) => setNewService({ ...newService, description: e.target.value })}
                  rows={2}
                  className="w-full bg-zinc-900 border border-zinc-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500 resize-none"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Starting Price</label>
                <input
                  type="number"
                  value={newService.startingPrice}
                  onChange={(e) => setNewService({ ...newService, startingPrice: parseFloat(e.target.value) })}
                  className="w-full bg-zinc-900 border border-zinc-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Duration</label>
                <input
                  type="text"
                  value={newService.duration}
                  onChange={(e) => setNewService({ ...newService, duration: e.target.value })}
                  placeholder="e.g., 2-3 weeks"
                  className="w-full bg-zinc-900 border border-zinc-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>
            <button
              onClick={() => {
                onAddService(newService);
                setShowAddForm(false);
                setNewService({
                  name: '',
                  category: 'kitchen',
                  description: '',
                  startingPrice: 0,
                  duration: '',
                  features: ['', '', '']
                });
              }}
              className="mt-4 bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded-lg font-semibold transition-all"
            >
              Add Service
            </button>
          </div>
        )}

        <RenovationServicesGrid services={services} />
      </div>
    </div>
  );
}
