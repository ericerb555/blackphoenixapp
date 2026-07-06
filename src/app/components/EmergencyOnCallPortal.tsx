/**
 * Emergency On-Call Portal
 * Integrated emergency response system with AI monitoring
 * Can be embedded in any portal (Handyman, Property Manager, Landlord, Subcontractor)
 */

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert, Phone, MapPin, Clock, AlertTriangle, CheckCircle,
  Radio, Activity, Zap, Navigation, User, Building2, FileText,
  MessageSquare, Camera, Send, Eye, X, TrendingUp, Gauge,
  AlertCircle, Bell, PhoneCall, Video, Image as ImageIcon, ChevronRight
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface EmergencyCall {
  id: string;
  type: 'emergency' | 'urgent' | 'routine';
  category: string;
  caller: string;
  phone: string;
  address: string;
  property: string; // Which property this emergency is from
  organizationId: string; // Which organization owns this property
  description: string;
  timestamp: string;
  status: 'new' | 'acknowledged' | 'enroute' | 'onsite' | 'resolved';
  priority: number;
  aiAnalysis?: string;
  estimatedResponse?: string;
  distance?: string;
}

interface EmergencyOnCallPortalProps {
  userRole: 'handyman' | 'property-manager' | 'landlord' | 'subcontractor';
  userName: string;
  userId: string;
  // Scoping information
  scopeType?: 'global' | 'organization' | 'property' | 'custom';
  scopedOrganizations?: string[]; // IDs of organizations this user covers
  scopedProperties?: string[]; // IDs of properties this user covers
}

export default function EmergencyOnCallPortal({
  userRole,
  userName,
  userId,
  scopeType = 'global',
  scopedOrganizations = [],
  scopedProperties = []
}: EmergencyOnCallPortalProps) {
  const [activeTab, setActiveTab] = useState<'active' | 'queue' | 'resolved' | 'ai-monitor'>('active');
  
  // All emergency calls in the system (would come from backend)
  const allEmergencyCalls: EmergencyCall[] = [
    {
      id: 'EMG-001',
      type: 'emergency',
      category: 'Water Emergency',
      caller: 'Sarah Martinez',
      phone: '(555) 234-9876',
      address: 'Unit 405, Sunset Towers',
      property: 'Sunset Towers',
      organizationId: 'org-001',
      description: 'Major water leak from ceiling - water flooding apartment',
      timestamp: '2 min ago',
      status: 'new',
      priority: 10,
      aiAnalysis: 'Critical: Water damage detected. Immediate response required. Estimated severity: HIGH',
      estimatedResponse: '15 min',
      distance: '2.3 miles'
    },
    {
      id: 'EMG-002',
      type: 'urgent',
      category: 'No Heat',
      caller: 'Robert Chen',
      phone: '(555) 876-5432',
      address: 'Unit 215, Beach View Condos',
      property: 'Beach View Condos',
      organizationId: 'org-001',
      description: 'Heating system not working - temperature dropping',
      timestamp: '8 min ago',
      status: 'acknowledged',
      priority: 8,
      aiAnalysis: 'Urgent: HVAC system failure. Temperature: 52°F. Response within 1 hour recommended.',
      estimatedResponse: '25 min',
      distance: '4.1 miles'
    },
    {
      id: 'EMG-003',
      type: 'urgent',
      category: 'Electrical Issue',
      caller: 'Jennifer Park',
      phone: '(555) 345-6789',
      address: 'Unit 78, Green Valley Phase 1',
      property: 'Green Valley Phase 1',
      organizationId: 'org-002',
      description: 'Power outage in half of the house - breaker keeps tripping',
      timestamp: '15 min ago',
      status: 'acknowledged',
      priority: 7,
      aiAnalysis: 'Urgent: Electrical fault detected. Safety concern. Professional assessment needed.',
      estimatedResponse: '30 min',
      distance: '5.8 miles'
    },
    {
      id: 'EMG-004',
      type: 'emergency',
      category: 'Lock Out',
      caller: 'Mike Johnson',
      phone: '(555) 111-2222',
      address: 'Unit 12, Downtown Apartments',
      property: 'Downtown Apartments',
      organizationId: 'org-003',
      description: 'Tenant locked out with child inside - emergency access needed',
      timestamp: '5 min ago',
      status: 'new',
      priority: 9,
      aiAnalysis: 'Critical: Child safety concern. Immediate response required.',
      estimatedResponse: '10 min',
      distance: '1.8 miles'
    }
  ];

  // Filter emergency calls based on scoping
  const filterCallsByScope = (calls: EmergencyCall[]): EmergencyCall[] => {
    if (scopeType === 'global') {
      // Global scope: see all emergencies
      return calls;
    } else if (scopeType === 'organization' && scopedOrganizations.length > 0) {
      // Organization scope: only see calls from specified organizations
      return calls.filter(call => scopedOrganizations.includes(call.organizationId));
    } else if (scopeType === 'property' && scopedProperties.length > 0) {
      // Property scope: only see calls from specified properties
      // In real implementation, we'd match against property IDs
      // For demo, we're using property names
      return calls.filter(call => scopedProperties.includes(call.property));
    } else {
      // No valid scope: return empty
      return [];
    }
  };

  const [emergencyCalls, setEmergencyCalls] = useState<EmergencyCall[]>(filterCallsByScope(allEmergencyCalls));

  const [selectedCall, setSelectedCall] = useState<EmergencyCall | null>(null);
  const [showCallDetail, setShowCallDetail] = useState(false);
  const [responseNote, setResponseNote] = useState('');

  // AI Monitoring Stats
  const [aiStats] = useState({
    callsMonitored: 247,
    avgResponseTime: '18 min',
    resolutionRate: '96%',
    activeAlerts: 3
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-red-600/20 text-red-400 border-red-500/30';
      case 'acknowledged': return 'bg-orange-600/20 text-orange-400 border-orange-500/30';
      case 'enroute': return 'bg-blue-600/20 text-blue-400 border-blue-500/30';
      case 'onsite': return 'bg-purple-600/20 text-purple-400 border-purple-500/30';
      case 'resolved': return 'bg-green-600/20 text-green-400 border-green-500/30';
      default: return 'bg-gray-600/20 text-gray-400 border-gray-500/30';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'emergency': return 'bg-red-600 text-white';
      case 'urgent': return 'bg-orange-600 text-white';
      case 'routine': return 'bg-blue-600 text-white';
      default: return 'bg-gray-600 text-white';
    }
  };

  const handleAcknowledge = (callId: string) => {
    setEmergencyCalls(prev =>
      prev.map(call =>
        call.id === callId ? { ...call, status: 'acknowledged' as const } : call
      )
    );
    toast.success('Emergency call acknowledged!');
  };

  const handleEnroute = (callId: string) => {
    setEmergencyCalls(prev =>
      prev.map(call =>
        call.id === callId ? { ...call, status: 'enroute' } : call
      )
    );
    toast.success('Status updated to En Route');
  };

  const handleOnsite = (callId: string) => {
    setEmergencyCalls(prev =>
      prev.map(call =>
        call.id === callId ? { ...call, status: 'onsite' } : call
      )
    );
    toast.success('Status updated to On Site');
  };

  const handleResolve = (callId: string) => {
    setEmergencyCalls(prev =>
      prev.map(call =>
        call.id === callId ? { ...call, status: 'resolved' } : call
      )
    );
    setShowCallDetail(false);
    setSelectedCall(null);
    toast.success('Emergency call resolved!');
  };

  const handleCallPhone = (phone: string) => {
    toast.success(`Calling ${phone}...`);
  };

  const handleGetDirections = (address: string) => {
    toast.success('Opening navigation...');
  };

  const filteredCalls = emergencyCalls.filter(call => {
    if (activeTab === 'active') return call.status !== 'resolved';
    if (activeTab === 'queue') return call.status === 'new';
    if (activeTab === 'resolved') return call.status === 'resolved';
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-6 py-6">
      {/* Emergency Stats Dashboard */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-red-600/20 to-red-700/20 border border-red-500/30 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <ShieldAlert className="w-8 h-8 text-red-400" />
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
          </div>
          <div className="text-3xl font-bold text-white mb-1">
            {emergencyCalls.filter(c => c.status === 'new').length}
          </div>
          <div className="text-sm text-red-400 font-medium">New Emergencies</div>
        </div>

        <div className="bg-gradient-to-br from-orange-600/20 to-orange-700/20 border border-orange-500/30 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <Activity className="w-8 h-8 text-orange-400" />
            <span className="text-xs font-bold text-orange-400">ACTIVE</span>
          </div>
          <div className="text-3xl font-bold text-white mb-1">
            {emergencyCalls.filter(c => c.status !== 'resolved' && c.status !== 'new').length}
          </div>
          <div className="text-sm text-orange-400 font-medium">In Progress</div>
        </div>

        <div className="bg-gradient-to-br from-blue-600/20 to-blue-700/20 border border-blue-500/30 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <Clock className="w-8 h-8 text-blue-400" />
            <Gauge className="w-5 h-5 text-blue-400" />
          </div>
          <div className="text-3xl font-bold text-white mb-1">{aiStats.avgResponseTime}</div>
          <div className="text-sm text-blue-400 font-medium">Avg Response Time</div>
        </div>

        <div className="bg-gradient-to-br from-green-600/20 to-green-700/20 border border-green-500/30 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <CheckCircle className="w-8 h-8 text-green-400" />
            <TrendingUp className="w-5 h-5 text-green-400" />
          </div>
          <div className="text-3xl font-bold text-white mb-1">{aiStats.resolutionRate}</div>
          <div className="text-sm text-green-400 font-medium">Resolution Rate</div>
        </div>
      </div>

      {/* Scope Coverage Indicator */}
      {scopeType !== 'global' && (
        <div className="bg-purple-600/10 border border-purple-500/30 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-3">
            <Building2 className="w-5 h-5 text-purple-400" />
            <div className="flex-1">
              <p className="text-sm font-bold text-purple-400 mb-0.5">
                Coverage Scope: {scopeType === 'organization' ? 'Organization Level' : 'Property Level'}
              </p>
              <p className="text-sm text-gray-300">
                {scopeType === 'organization' && scopedOrganizations.length > 0 && (
                  <>Viewing emergencies from {scopedOrganizations.length} organization(s)</>
                )}
                {scopeType === 'property' && scopedProperties.length > 0 && (
                  <>Viewing emergencies from {scopedProperties.length} property(ies): {scopedProperties.join(', ')}</>
                )}
              </p>
            </div>
            <div className="px-3 py-1.5 bg-purple-600/20 border border-purple-500/40 rounded-lg">
              <p className="text-sm font-bold text-purple-300">{emergencyCalls.length} Active in Scope</p>
            </div>
          </div>
        </div>
      )}

      {scopeType === 'global' && (
        <div className="bg-gradient-to-r from-yellow-600/10 to-orange-600/10 border border-yellow-500/30 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 text-yellow-400" />
            <div className="flex-1">
              <p className="text-sm font-bold text-yellow-400 mb-0.5">
                Global Coverage Active
              </p>
              <p className="text-sm text-gray-300">
                You are on-call for ALL properties across ALL organizations
              </p>
            </div>
            <div className="px-3 py-1.5 bg-yellow-600/20 border border-yellow-500/40 rounded-lg">
              <p className="text-sm font-bold text-yellow-300">{emergencyCalls.length} Total Emergencies</p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="bg-[#0F0F0F] border border-[#2A2A2A] rounded-xl p-2 mb-6">
        <div className="flex gap-2">
          {[
            { id: 'active', label: 'Active Calls', badge: emergencyCalls.filter(c => c.status !== 'resolved').length },
            { id: 'queue', label: 'Queue', badge: emergencyCalls.filter(c => c.status === 'new').length },
            { id: 'resolved', label: 'Resolved', badge: emergencyCalls.filter(c => c.status === 'resolved').length },
            { id: 'ai-monitor', label: 'AI Monitor', icon: Zap }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 px-4 py-3 rounded-lg font-bold transition ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-[#1A1A1A]'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                {tab.icon && <tab.icon className="w-4 h-4" />}
                {tab.label}
                {tab.badge !== undefined && (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                    activeTab === tab.id ? 'bg-white/20' : 'bg-red-600 text-white'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Emergency Calls List */}
      {activeTab !== 'ai-monitor' && (
        <div className="space-y-4">
          {filteredCalls.length === 0 ? (
            <div className="bg-[#0F0F0F] border border-[#2A2A2A] rounded-2xl p-12 text-center">
              <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">All Clear!</h3>
              <p className="text-gray-400">No emergency calls in this category</p>
            </div>
          ) : (
            filteredCalls.map(call => (
              <div
                key={call.id}
                className={`bg-[#0F0F0F] border-2 rounded-2xl p-6 transition hover:shadow-lg ${
                  call.status === 'new' 
                    ? 'border-red-500/50 hover:border-red-500 shadow-red-500/20' 
                    : 'border-[#2A2A2A] hover:border-orange-500/50'
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Priority Indicator */}
                  <div className="flex flex-col items-center gap-2">
                    <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${
                      call.type === 'emergency' ? 'bg-red-600' : call.type === 'urgent' ? 'bg-orange-600' : 'bg-blue-600'
                    }`}>
                      <AlertTriangle className="w-8 h-8 text-white" />
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-white">{call.priority}</div>
                      <div className="text-xs text-gray-400">Priority</div>
                    </div>
                  </div>

                  {/* Call Details */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-xl font-bold text-white">{call.category}</h3>
                          <span className={`px-3 py-1 rounded-lg text-xs font-bold ${getTypeColor(call.type)}`}>
                            {call.type.toUpperCase()}
                          </span>
                          <span className={`px-3 py-1 rounded-lg text-xs font-bold border ${getStatusColor(call.status)}`}>
                            {call.status.toUpperCase()}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-400 mb-2">
                          <span className="flex items-center gap-1">
                            <FileText className="w-4 h-4" />
                            {call.id}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {call.timestamp}
                          </span>
                          {call.distance && (
                            <span className="flex items-center gap-1">
                              <Navigation className="w-4 h-4" />
                              {call.distance}
                            </span>
                          )}
                          {call.estimatedResponse && (
                            <span className="flex items-center gap-1 text-orange-400 font-medium">
                              <Gauge className="w-4 h-4" />
                              ETA: {call.estimatedResponse}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4 mb-3">
                      <div className="grid grid-cols-3 gap-3 mb-3">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-purple-400" />
                          <div>
                            <div className="text-xs text-gray-500">Property</div>
                            <div className="text-purple-400 font-bold">{call.property}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <div>
                            <div className="text-xs text-gray-500">Caller</div>
                            <div className="text-white font-bold">{call.caller}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-gray-400" />
                          <div>
                            <div className="text-xs text-gray-500">Phone</div>
                            <div className="text-white font-bold">{call.phone}</div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-start gap-2 mb-3">
                        <MapPin className="w-4 h-4 text-gray-400 mt-1" />
                        <div>
                          <div className="text-xs text-gray-500">Address</div>
                          <div className="text-white font-medium">{call.address}</div>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-gray-400 mt-1" />
                        <div>
                          <div className="text-xs text-gray-500">Description</div>
                          <div className="text-white">{call.description}</div>
                        </div>
                      </div>
                    </div>

                    {/* AI Analysis */}
                    {call.aiAnalysis && (
                      <div className="bg-gradient-to-r from-purple-600/10 to-blue-600/10 border border-purple-500/30 rounded-xl p-4 mb-3">
                        <div className="flex items-start gap-2">
                          <Zap className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <div className="text-xs font-bold text-purple-400 mb-1">AI ANALYSIS</div>
                            <div className="text-white text-sm">{call.aiAnalysis}</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                      {call.status === 'new' && (
                        <>
                          <button
                            onClick={() => handleAcknowledge(call.id)}
                            className="flex-1 px-4 py-3 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 rounded-xl text-white font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20"
                          >
                            <CheckCircle className="w-5 h-5" />
                            Acknowledge
                          </button>
                          <button
                            onClick={() => handleCallPhone(call.phone)}
                            className="px-4 py-3 bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 rounded-xl text-green-400 font-bold transition flex items-center gap-2"
                          >
                            <PhoneCall className="w-5 h-5" />
                            Call
                          </button>
                        </>
                      )}
                      {call.status === 'acknowledged' && (
                        <>
                          <button
                            onClick={() => handleEnroute(call.id)}
                            className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-xl text-white font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
                          >
                            <Navigation className="w-5 h-5" />
                            En Route
                          </button>
                          <button
                            onClick={() => handleGetDirections(call.address)}
                            className="px-4 py-3 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded-xl text-blue-400 font-bold transition flex items-center gap-2"
                          >
                            <MapPin className="w-5 h-5" />
                            Directions
                          </button>
                        </>
                      )}
                      {call.status === 'enroute' && (
                        <button
                          onClick={() => handleOnsite(call.id)}
                          className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 rounded-xl text-white font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20"
                        >
                          <CheckSquare className="w-5 h-5" />
                          Arrived On Site
                        </button>
                      )}
                      {call.status === 'onsite' && (
                        <button
                          onClick={() => handleResolve(call.id)}
                          className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 rounded-xl text-white font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-green-500/20"
                        >
                          <CheckCircle className="w-5 h-5" />
                          Mark Resolved
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setSelectedCall(call);
                          setShowCallDetail(true);
                        }}
                        className="px-4 py-3 bg-[#2A2A2A] hover:bg-[#3A3A3A] border border-[#3A3A3A] rounded-xl text-white font-bold transition flex items-center gap-2"
                      >
                        <Eye className="w-5 h-5" />
                        Details
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* AI Monitor Tab */}
      {activeTab === 'ai-monitor' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-purple-600/20 to-blue-600/20 border border-purple-500/30 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">AI Emergency Monitor</h2>
                <p className="text-purple-400">Real-time intelligent call analysis and routing</p>
              </div>
              <div className="ml-auto">
                <div className="flex items-center gap-2 px-4 py-2 bg-green-600/20 border border-green-500/30 rounded-xl">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-green-400 font-bold">ACTIVE</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
                <div className="text-sm text-gray-400 mb-1">Calls Monitored</div>
                <div className="text-3xl font-bold text-white">{aiStats.callsMonitored}</div>
              </div>
              <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
                <div className="text-sm text-gray-400 mb-1">Active Alerts</div>
                <div className="text-3xl font-bold text-orange-400">{aiStats.activeAlerts}</div>
              </div>
              <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
                <div className="text-sm text-gray-400 mb-1">Success Rate</div>
                <div className="text-3xl font-bold text-green-400">{aiStats.resolutionRate}</div>
              </div>
            </div>

            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
              <h3 className="text-white font-bold mb-3">AI Capabilities</h3>
              <ul className="space-y-2 text-gray-400">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  Automatic severity assessment and prioritization
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  Smart routing to nearest available responder
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  Real-time ETA calculations and updates
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  Predictive maintenance alerts and recommendations
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  24/7 monitoring with intelligent escalation
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Call Detail Modal */}
      {showCallDetail && selectedCall && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-[#1A1A1A] rounded-2xl border border-orange-500/30 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-[#1A1A1A] border-b border-[#2A2A2A] p-6 z-10">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">{selectedCall.category}</h2>
                  <p className="text-gray-400">{selectedCall.id}</p>
                </div>
                <button
                  onClick={() => setShowCallDetail(false)}
                  className="p-2 hover:bg-[#2A2A2A] rounded-lg transition"
                >
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Full call details would go here */}
              <div className="bg-[#0F0F0F] border border-[#2A2A2A] rounded-xl p-4">
                <h3 className="text-white font-bold mb-3">Emergency Details</h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-gray-400">Caller:</span>
                    <span className="text-white ml-2 font-medium">{selectedCall.caller}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Phone:</span>
                    <span className="text-white ml-2 font-medium">{selectedCall.phone}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Address:</span>
                    <span className="text-white ml-2 font-medium">{selectedCall.address}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Description:</span>
                    <span className="text-white ml-2">{selectedCall.description}</span>
                  </div>
                </div>
              </div>

              {/* Add response notes */}
              <div className="bg-[#0F0F0F] border border-[#2A2A2A] rounded-xl p-4">
                <h3 className="text-white font-bold mb-3">Response Notes</h3>
                <textarea
                  value={responseNote}
                  onChange={(e) => setResponseNote(e.target.value)}
                  placeholder="Add notes about the emergency response..."
                  rows={4}
                  className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 resize-none"
                />
                <button className="mt-3 px-4 py-2 bg-orange-600/20 hover:bg-orange-600/30 border border-orange-500/30 rounded-lg text-orange-400 font-medium transition flex items-center gap-2">
                  <Send className="w-4 h-4" />
                  Save Note
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
