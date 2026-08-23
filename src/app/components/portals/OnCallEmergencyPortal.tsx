import { useState } from 'react';
import {
  Phone, Clock, AlertTriangle, Users, MapPin, CheckCircle2,
  User, DollarSign, Zap, Wrench, Droplet, Flame,
  Search, Plus, ArrowRight, Gavel, Send
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import SponsoredMarquee from '../SponsoredMarquee';
import AdvertisingMarquee from '../AdvertisingMarquee';
import DealsOffersSection from './DealsOffersSection';
import FeaturedDealsReels from './FeaturedDealsReels';

// Trade color configurations
const tradeColors = {
  'Plumbing': {
    primary: 'from-blue-600 to-cyan-600',
    border: 'border-blue-500',
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
    hover: 'hover:border-blue-400 hover:shadow-blue-500/50',
    icon: Droplet
  },
  'Electrical': {
    primary: 'from-yellow-600 to-orange-600',
    border: 'border-yellow-500',
    bg: 'bg-yellow-500/10',
    text: 'text-yellow-400',
    hover: 'hover:border-yellow-400 hover:shadow-yellow-500/50',
    icon: Zap
  },
  'HVAC': {
    primary: 'from-purple-600 to-pink-600',
    border: 'border-purple-500',
    bg: 'bg-purple-500/10',
    text: 'text-purple-400',
    hover: 'hover:border-purple-400 hover:shadow-purple-500/50',
    icon: Flame
  },
  'General Maintenance': {
    primary: 'from-green-600 to-emerald-600',
    border: 'border-green-500',
    bg: 'bg-green-500/10',
    text: 'text-green-400',
    hover: 'hover:border-green-400 hover:shadow-green-500/50',
    icon: Wrench
  },
  'Emergency Lockout': {
    primary: 'from-red-600 to-rose-600',
    border: 'border-red-500',
    bg: 'bg-red-500/10',
    text: 'text-red-400',
    hover: 'hover:border-red-400 hover:shadow-red-500/50',
    icon: AlertTriangle
  },
  'Structural': {
    primary: 'from-orange-600 to-amber-600',
    border: 'border-orange-500',
    bg: 'bg-orange-500/10',
    text: 'text-orange-400',
    hover: 'hover:border-orange-400 hover:shadow-orange-500/50',
    icon: AlertTriangle
  }
};

// Severity configurations
const severityConfig = {
  critical: { label: 'CRITICAL', color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/30' },
  high: { label: 'HIGH', color: 'text-orange-400', bg: 'bg-orange-500/20', border: 'border-orange-500/30' },
  medium: { label: 'MEDIUM', color: 'text-yellow-400', bg: 'bg-yellow-500/20', border: 'border-yellow-500/30' },
  low: { label: 'LOW', color: 'text-blue-400', bg: 'bg-blue-500/20', border: 'border-blue-500/30' }
};

export default function OnCallEmergencyPortal() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [showBidRoomModal, setShowBidRoomModal] = useState(false);
  const [selectedCallForBid, setSelectedCallForBid] = useState<any>(null);

  // Mock data for emergency calls
  const activeCalls = [
    {
      id: 'EC-2401',
      customer: 'Riverside Apartments',
      contact: 'Mike Johnson',
      phone: '(555) 123-4567',
      address: '789 River Road, Unit 12B',
      category: 'Plumbing',
      severity: 'critical' as const,
      description: 'Burst pipe in basement causing flooding',
      time: '3:45 AM',
      status: 'in-progress',
      contractor: 'John Smith',
      estimatedCompletion: '6:00 AM'
    },
    {
      id: 'EC-2402',
      customer: 'Downtown Lofts',
      contact: 'Sarah Wilson',
      phone: '(555) 234-5678',
      address: '456 Main St, Suite 204',
      category: 'Electrical',
      severity: 'high' as const,
      description: 'Complete power outage affecting 10 units',
      time: '5:20 AM',
      status: 'assigned',
      contractor: 'Mike Davis',
      estimatedCompletion: '8:00 AM'
    },
    {
      id: 'EC-2403',
      customer: 'Oak Street Plaza',
      contact: 'Tom Anderson',
      phone: '(555) 345-6789',
      address: '123 Oak Street',
      category: 'HVAC',
      severity: 'medium' as const,
      description: 'Heating system failure in commercial building',
      time: '6:15 AM',
      status: 'pending',
      contractor: '',
      estimatedCompletion: ''
    },
    {
      id: 'EC-2404',
      customer: 'Sunset Condos',
      contact: 'Lisa Brown',
      phone: '(555) 456-7890',
      address: '321 Sunset Blvd, Unit 5A',
      category: 'Emergency Lockout',
      severity: 'high' as const,
      description: 'Tenant locked out, needs immediate access',
      time: '7:30 AM',
      status: 'pending',
      contractor: '',
      estimatedCompletion: ''
    },
    {
      id: 'EC-2405',
      customer: 'Green Valley Apartments',
      contact: 'Robert Chen',
      phone: '(555) 567-8901',
      address: '654 Valley Drive',
      category: 'General Maintenance',
      severity: 'low' as const,
      description: 'Elevator stuck between floors',
      time: '8:00 AM',
      status: 'assigned',
      contractor: 'Sarah Johnson',
      estimatedCompletion: '9:30 AM'
    },
    {
      id: 'EC-2406',
      customer: 'Harbor View Complex',
      contact: 'Jennifer Martinez',
      phone: '(555) 678-9012',
      address: '987 Harbor Lane',
      category: 'Structural',
      severity: 'critical' as const,
      description: 'Ceiling collapse in parking garage',
      time: '4:15 AM',
      status: 'in-progress',
      contractor: 'Emergency Crew Alpha',
      estimatedCompletion: '12:00 PM'
    }
  ];

  // Filter calls
  const filteredCalls = activeCalls.filter(call => {
    const matchesSearch = call.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         call.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         call.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'all' || call.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  // Get unique categories for filter
  const categories = ['all', ...Array.from(new Set(activeCalls.map(c => c.category)))];

  const handleTakeCall = (callId: string) => {
    toast.success('Call assigned to you!');
  };

  const handleViewDetails = (callId: string) => {
    toast.info('Opening call details...');
  };

  const handleSendToBidRoom = (call: any) => {
    setSelectedCallForBid(call);
    setShowBidRoomModal(true);
  };

  const handleConfirmSendToBidRoom = () => {
    if (!selectedCallForBid) return;

    // Create bid room job from emergency call
    const bidRoomJob = {
      id: `BID-${Date.now()}`,
      title: `${selectedCallForBid.category} - ${selectedCallForBid.customer}`,
      description: selectedCallForBid.description,
      category: selectedCallForBid.category,
      customer: selectedCallForBid.customer,
      contact: selectedCallForBid.contact,
      phone: selectedCallForBid.phone,
      address: selectedCallForBid.address,
      priority: selectedCallForBid.severity,
      status: 'open',
      bids: [],
      createdAt: new Date().toISOString(),
      deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
      sourceCallId: selectedCallForBid.id
    };

    // Save to localStorage (Bid Room will read from here)
    const existingJobs = JSON.parse(localStorage.getItem('bidRoomJobs') || '[]');
    existingJobs.push(bidRoomJob);
    localStorage.setItem('bidRoomJobs', JSON.stringify(existingJobs));

    toast.success('Call sent to Phoenix Exchange successfully!', {
      description: 'Contractors can now submit bids for this job'
    });

    setShowBidRoomModal(false);
    setSelectedCallForBid(null);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] p-6">
      <SponsoredMarquee />
      <AdvertisingMarquee placement="portal-header" dismissible />
      <div className="max-w-7xl mx-auto">
        {/* Demo Banner */}
        <div className="mb-6 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 border-2 border-purple-500/30 rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-1">Demo Mode - 24/7 On-Call Portal</h3>
                <p className="text-gray-300">Experience real-time emergency call management. All data shown is for demonstration purposes.</p>
              </div>
            </div>
            <button
              onClick={() => window.location.href = '/signup'}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-purple-500/20 hover:scale-105 whitespace-nowrap"
            >
              Get Started
            </button>
          </div>
        </div>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">24/7 On-Call Emergency Portal</h1>
              <p className="text-gray-400">Manage emergency service calls in real-time</p>
            </div>
            <button className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-orange-500/20">
              <Plus className="w-5 h-5" />
              New Emergency Call
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm mb-1">Active Calls</p>
                  <p className="text-3xl font-bold text-white">{activeCalls.filter(c => c.status !== 'completed').length}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-400" />
                </div>
              </div>
            </div>
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm mb-1">In Progress</p>
                  <p className="text-3xl font-bold text-white">{activeCalls.filter(c => c.status === 'in-progress').length}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-orange-400" />
                </div>
              </div>
            </div>
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm mb-1">Pending</p>
                  <p className="text-3xl font-bold text-white">{activeCalls.filter(c => c.status === 'pending').length}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                  <Users className="w-6 h-6 text-yellow-400" />
                </div>
              </div>
            </div>
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm mb-1">Assigned</p>
                  <p className="text-3xl font-bold text-white">{activeCalls.filter(c => c.status === 'assigned').length}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-blue-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="text"
                placeholder="Search by customer, description, or call ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setFilterCategory(cat)}
                  className={`px-4 py-3 rounded-xl font-semibold whitespace-nowrap transition-all ${
                    filterCategory === cat
                      ? 'bg-orange-500 text-white'
                      : 'bg-[#1A1A1A] border border-[#2A2A2A] text-gray-400 hover:text-white'
                  }`}
                >
                  {cat === 'all' ? 'All Trades' : cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Emergency Calls Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredCalls.map((call) => {
            const tradeConfig = tradeColors[call.category as keyof typeof tradeColors] || tradeColors['General Maintenance'];
            const severity = severityConfig[call.severity];
            const TradeIcon = tradeConfig.icon;

            return (
              <div
                key={call.id}
                className={`group relative bg-[#1A1A1A] border-2 ${tradeConfig.border} rounded-2xl p-6 transition-all duration-300 ${tradeConfig.hover} hover:shadow-2xl`}
              >
                {/* Glow Effect on Hover */}
                <div className={`absolute inset-0 bg-gradient-to-r ${tradeConfig.primary} opacity-0 group-hover:opacity-10 rounded-2xl transition-opacity duration-300 pointer-events-none`} />

                {/* Content */}
                <div className="relative">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-14 h-14 rounded-xl bg-gradient-to-r ${tradeConfig.primary} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                        <TradeIcon className="w-7 h-7 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white">{call.customer}</h3>
                        <p className={`text-sm font-semibold ${tradeConfig.text}`}>{call.category}</p>
                      </div>
                    </div>
                    <div className={`px-3 py-1 rounded-lg ${severity.bg} ${severity.border} border`}>
                      <span className={`text-xs font-bold ${severity.color}`}>{severity.label}</span>
                    </div>
                  </div>

                  {/* Call Details */}
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center gap-2 text-gray-300">
                      <AlertTriangle className="w-4 h-4 text-gray-500" />
                      <span className="text-sm">{call.description}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-300">
                      <User className="w-4 h-4 text-gray-500" />
                      <span className="text-sm">{call.contact}</span>
                      <span className="text-gray-600">•</span>
                      <Phone className="w-4 h-4 text-gray-500" />
                      <span className="text-sm">{call.phone}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-300">
                      <MapPin className="w-4 h-4 text-gray-500" />
                      <span className="text-sm">{call.address}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-300">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <span className="text-sm">Called at {call.time}</span>
                      {call.estimatedCompletion && (
                        <>
                          <span className="text-gray-600">•</span>
                          <span className="text-sm">ETA: {call.estimatedCompletion}</span>
                        </>
                      )}
                    </div>
                    {call.contractor && (
                      <div className="flex items-center gap-2">
                        <div className={`px-3 py-1 rounded-lg ${tradeConfig.bg} ${tradeConfig.border} border`}>
                          <span className={`text-xs font-semibold ${tradeConfig.text}`}>
                            Assigned to: {call.contractor}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Status Indicator */}
                  <div className="mb-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        call.status === 'in-progress' ? 'bg-orange-400 animate-pulse' :
                        call.status === 'assigned' ? 'bg-blue-400' :
                        'bg-yellow-400'
                      }`} />
                      <span className="text-sm text-gray-400 capitalize">{call.status.replace('-', ' ')}</span>
                    </div>
                  </div>

                  {/* Action Buttons - Lined with Glow */}
                  <div className="grid grid-cols-2 gap-3">
                    {!call.contractor && (
                      <button
                        onClick={() => handleTakeCall(call.id)}
                        className={`flex items-center justify-center gap-2 px-4 py-3 bg-transparent border-2 ${tradeConfig.border} ${tradeConfig.text} rounded-xl font-bold transition-all duration-300 ${tradeConfig.hover} hover:shadow-xl hover:scale-105`}
                      >
                        <CheckCircle2 className="w-5 h-5" />
                        Take Call
                      </button>
                    )}
                    <button
                      onClick={() => handleSendToBidRoom(call)}
                      className="flex items-center justify-center gap-2 px-4 py-3 bg-transparent border-2 border-purple-500 text-purple-400 rounded-xl font-bold transition-all duration-300 hover:border-purple-400 hover:shadow-purple-500/50 hover:shadow-xl hover:scale-105"
                    >
                      <Gavel className="w-5 h-5" />
                      Send to Phoenix Exchange
                    </button>
                    <button
                      onClick={() => handleViewDetails(call.id)}
                      className={`${!call.contractor ? 'col-span-2' : 'col-span-2'} flex items-center justify-center gap-2 px-6 py-3 bg-[#0A0A0A] border-2 border-[#2A2A2A] text-white rounded-xl font-bold hover:border-orange-500 hover:shadow-orange-500/50 hover:shadow-xl transition-all duration-300 hover:scale-105`}
                    >
                      Details
                      <ArrowRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {filteredCalls.length === 0 && (
          <div className="text-center py-12">
            <AlertTriangle className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No calls found</h3>
            <p className="text-gray-400">Try adjusting your search or filters</p>
          </div>
        )}
      </div>

      {/* Send to Phoenix Exchange Modal */}
      {showBidRoomModal && selectedCallForBid && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1A1A1A] border-2 border-purple-500/30 rounded-2xl max-w-2xl w-full p-8 shadow-2xl shadow-purple-500/20">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center">
                  <Gavel className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Send to Phoenix Exchange</h2>
                  <p className="text-sm text-gray-400">Open this call for contractor bidding</p>
                </div>
              </div>
              <button
                onClick={() => setShowBidRoomModal(false)}
                className="w-10 h-10 rounded-lg bg-[#0A0A0A] border border-[#2A2A2A] flex items-center justify-center text-gray-400 hover:text-white hover:border-red-500 transition-all"
              >
                ×
              </button>
            </div>

            {/* Call Details */}
            <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-6 mb-6">
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Customer</p>
                  <p className="text-lg font-semibold text-white">{selectedCallForBid.customer}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">Service Type</p>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-lg bg-purple-500/20 text-purple-400 font-semibold border border-purple-500/30">
                      {selectedCallForBid.category}
                    </span>
                    <span className={`px-3 py-1 rounded-lg font-semibold border ${
                      severityConfig[selectedCallForBid.severity as keyof typeof severityConfig].bg
                    } ${severityConfig[selectedCallForBid.severity as keyof typeof severityConfig].color} ${
                      severityConfig[selectedCallForBid.severity as keyof typeof severityConfig].border
                    }`}>
                      {severityConfig[selectedCallForBid.severity as keyof typeof severityConfig].label}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">Description</p>
                  <p className="text-white">{selectedCallForBid.description}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">Location</p>
                  <p className="text-white">{selectedCallForBid.address}</p>
                </div>
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4 mb-6">
              <div className="flex gap-3">
                <Send className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-white font-semibold mb-1">What happens next?</p>
                  <ul className="text-sm text-gray-300 space-y-1">
                    <li>• This call will be posted to Phoenix Exchange</li>
                    <li>• Qualified contractors can submit competitive bids</li>
                    <li>• You can review and select the best bid</li>
                    <li>• Bidding deadline: 24 hours from now</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={() => setShowBidRoomModal(false)}
                className="flex-1 px-6 py-3 bg-[#0A0A0A] border-2 border-[#2A2A2A] text-white rounded-xl font-bold hover:border-gray-600 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSendToBidRoom}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-purple-500/20 hover:shadow-xl hover:scale-105"
              >
                Confirm & Send to Phoenix Exchange
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
