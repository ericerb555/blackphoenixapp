import { useState } from 'react';
import { Eye, Smartphone, Monitor, Tablet, ExternalLink, Play, Megaphone } from 'lucide-react';

interface Portal {
  id: string;
  name: string;
  url: string;
  description: string;
  icon: string;
  status: 'live' | 'preview' | 'development';
  adPlacements: { type: string; location: string; }[];
}

export default function LivePortalPreviews() {
  const [selectedDevice, setSelectedDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [selectedPortal, setSelectedPortal] = useState<string>('customer');

  const portals: Portal[] = [
    {
      id: 'customer',
      name: 'Customer Portal',
      url: '/customer-app',
      description: 'Main customer shopping experience',
      icon: '🛍️',
      status: 'live',
      adPlacements: [
        { type: 'Marquee Banner', location: 'Top Header' },
        { type: 'Product Grid Ads', location: 'Product Listings' },
        { type: 'Sidebar Widget', location: 'Right Sidebar' }
      ]
    },
    {
      id: 'vendor',
      name: 'Vendor Portal',
      url: '/vendor-advertising-hub',
      description: 'Vendor advertising and management',
      icon: '🏢',
      status: 'live',
      adPlacements: [
        { type: 'Logo Marquee', location: 'Top Bar' },
        { type: 'Featured Ads', location: 'Dashboard Cards' },
        { type: 'Promotional Banner', location: 'Footer' }
      ]
    },
    {
      id: 'employee',
      name: 'Employee Portal',
      url: '/employee-portal',
      description: 'Employee management and tasks',
      icon: '👷',
      status: 'live',
      adPlacements: [
        { type: 'Marquee Text', location: 'Header' },
        { type: 'Vendor Feed Widget', location: 'Bottom Right' }
      ]
    },
    {
      id: 'property',
      name: 'Property Manager Portal',
      url: '/mobile-app-hub?portal=property-manager',
      description: 'Property management tools',
      icon: '🏘️',
      status: 'preview',
      adPlacements: [
        { type: 'Banner Ads', location: 'Top Section' },
        { type: 'Service Provider Ads', location: 'Vendor Directory' }
      ]
    },
    {
      id: 'handyman',
      name: 'Handyman Portal',
      url: '/mobile-app-hub?portal=handyman',
      description: 'Service provider interface',
      icon: '🔧',
      status: 'live',
      adPlacements: [
        { type: 'Tool Supplier Ads', location: 'Job Details' },
        { type: 'Material Vendors', location: 'Supply Lists' }
      ]
    },
    {
      id: 'subcontractor',
      name: 'Subcontractor Portal',
      url: '/subcontractor-portal',
      description: 'Subcontractor bidding and projects',
      icon: '📋',
      status: 'live',
      adPlacements: [
        { type: 'Vendor Promotions', location: 'Dashboard Grid' },
        { type: 'Compact Feed', location: 'Bottom Right Widget' },
        { type: 'Marquee Banner', location: 'Top Bar' }
      ]
    }
  ];

  const deviceWidths = {
    desktop: '100%',
    tablet: '768px',
    mobile: '375px'
  };

  const selectedPortalData = portals.find(p => p.id === selectedPortal);

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-[#ea580c] to-[#dc2626] p-6 rounded-xl">
        <h2 className="text-2xl font-bold text-white mb-2">Live Portal Previews</h2>
        <p className="text-orange-100">
          Preview how your ads appear across different portals and ad placements
        </p>
      </div>

      {/* Portal Selection */}
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
        <h3 className="text-lg font-bold text-white mb-4">Select Portal</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {portals.map((portal) => (
            <button
              key={portal.id}
              onClick={() => setSelectedPortal(portal.id)}
              className={`p-4 rounded-lg border transition-all ${
                selectedPortal === portal.id
                  ? 'border-[#ea580c] bg-[#ea580c]/10'
                  : 'border-[#2A2A2A] hover:border-[#ea580c]/50'
              }`}
            >
              <div className="text-3xl mb-2">{portal.icon}</div>
              <div className="text-sm font-semibold text-white mb-1">{portal.name}</div>
              <div className={`text-xs px-2 py-1 rounded-full inline-block ${
                portal.status === 'live' ? 'bg-green-500/20 text-green-400' :
                portal.status === 'preview' ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-blue-500/20 text-blue-400'
              }`}>
                {portal.status}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Device Selection & Preview */}
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">Device Preview</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedDevice('desktop')}
              className={`p-2 rounded-lg transition-colors ${
                selectedDevice === 'desktop'
                  ? 'bg-[#ea580c] text-white'
                  : 'bg-[#2A2A2A] text-gray-400 hover:text-white'
              }`}
            >
              <Monitor className="w-5 h-5" />
            </button>
            <button
              onClick={() => setSelectedDevice('tablet')}
              className={`p-2 rounded-lg transition-colors ${
                selectedDevice === 'tablet'
                  ? 'bg-[#ea580c] text-white'
                  : 'bg-[#2A2A2A] text-gray-400 hover:text-white'
              }`}
            >
              <Tablet className="w-5 h-5" />
            </button>
            <button
              onClick={() => setSelectedDevice('mobile')}
              className={`p-2 rounded-lg transition-colors ${
                selectedDevice === 'mobile'
                  ? 'bg-[#ea580c] text-white'
                  : 'bg-[#2A2A2A] text-gray-400 hover:text-white'
              }`}
            >
              <Smartphone className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Portal Info */}
        {selectedPortalData && (
          <div className="mb-4 p-4 bg-[#0A0A0A] rounded-lg">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="text-white font-semibold mb-1">{selectedPortalData.name}</h4>
                <p className="text-sm text-gray-400 mb-3">{selectedPortalData.description}</p>
                <div className="flex flex-wrap gap-2">
                  {selectedPortalData.adPlacements.map((placement, idx) => (
                    <div key={idx} className="flex items-center gap-1 px-2 py-1 bg-orange-500/10 border border-orange-500/30 rounded text-xs text-orange-400">
                      <Megaphone className="w-3 h-3" />
                      <span>{placement.type}</span>
                      <span className="text-gray-500">•</span>
                      <span className="text-gray-400">{placement.location}</span>
                    </div>
                  ))}
                </div>
              </div>
              <a
                href={selectedPortalData.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 bg-[#ea580c] hover:bg-[#dc2626] text-white rounded-lg transition-colors text-sm flex-shrink-0 ml-4"
              >
                <ExternalLink className="w-4 h-4" />
                Open Portal
              </a>
            </div>
          </div>
        )}

        {/* Live Preview Window */}
        <div className="bg-[#0A0A0A] rounded-lg p-8 flex justify-center">
          <div 
            className="bg-[#0A0A0A] rounded-lg shadow-2xl overflow-hidden transition-all duration-300 border border-[#2A2A2A]"
            style={{ 
              width: deviceWidths[selectedDevice],
              maxWidth: '100%',
              height: '600px'
            }}
          >
            {/* Browser Chrome */}
            <div className="bg-[#1A1A1A] p-3 flex items-center justify-between border-b border-[#2A2A2A]">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
              </div>
              <div className="flex-1 mx-4">
                <div className="bg-[#0A0A0A] rounded px-3 py-1 text-xs text-gray-500 border border-[#2A2A2A]">
                  {selectedPortalData?.url}
                </div>
              </div>
              <div className="text-xs text-gray-500">
                {selectedDevice === 'desktop' ? '1920 x 1080' :
                 selectedDevice === 'tablet' ? '768 x 1024' :
                 '375 x 667'}
              </div>
            </div>
            
            {/* Portal Mockup Content */}
            {selectedPortalData && (
              <div className="h-full bg-gradient-to-br from-[#0F0F0F] to-[#0A0A0A] overflow-auto p-4" style={{ height: 'calc(100% - 56px)' }}>
                {/* Ad Placement Example: Marquee Banner */}
                <div className="bg-gradient-to-r from-orange-600 to-red-600 p-3 rounded-lg mb-4 flex items-center justify-center">
                  <Megaphone className="w-4 h-4 text-white mr-2" />
                  <span className="text-white text-sm font-bold animate-pulse">
                    🎨 Spring Sale - 40% Off Premium Paints • Limited Time Offer • Shop Now!
                  </span>
                </div>

                {/* Portal Header */}
                <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="text-4xl">{selectedPortalData.icon}</div>
                    <div>
                      <h3 className="text-white font-bold">{selectedPortalData.name}</h3>
                      <p className="text-sm text-gray-400">{selectedPortalData.description}</p>
                    </div>
                  </div>
                </div>

                {/* Main Content Area with Ad Placements */}
                <div className="grid grid-cols-12 gap-4">
                  {/* Main Content */}
                  <div className="col-span-12 md:col-span-9">
                    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-4 mb-4">
                      <div className="h-20 bg-[#2A2A2A] rounded animate-pulse"></div>
                    </div>
                    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-4 mb-4">
                      <div className="h-32 bg-[#2A2A2A] rounded animate-pulse"></div>
                    </div>
                    
                    {/* Inline Ad Placement */}
                    <div className="bg-orange-500/10 border-2 border-orange-500 border-dashed rounded-lg p-4 mb-4 relative">
                      <div className="absolute -top-3 left-3 bg-orange-600 px-2 py-0.5 rounded text-xs font-bold text-white">
                        AD PLACEMENT
                      </div>
                      <div className="flex items-center justify-center py-8">
                        <div className="text-center">
                          <Megaphone className="w-12 h-12 text-orange-400 mx-auto mb-2" />
                          <p className="text-orange-400 font-bold">Your Advertisement Here</p>
                          <p className="text-xs text-gray-500 mt-1">Prominent inline placement</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-4">
                      <div className="h-24 bg-[#2A2A2A] rounded animate-pulse"></div>
                    </div>
                  </div>

                  {/* Sidebar with Ad Widget */}
                  <div className="col-span-12 md:col-span-3">
                    <div className="bg-orange-500/10 border-2 border-orange-500 border-dashed rounded-lg p-4 mb-4 relative">
                      <div className="absolute -top-3 left-2 bg-orange-600 px-2 py-0.5 rounded text-xs font-bold text-white">
                        SIDEBAR AD
                      </div>
                      <div className="text-center pt-4">
                        <Megaphone className="w-8 h-8 text-orange-400 mx-auto mb-2" />
                        <p className="text-xs text-orange-400 font-semibold">Vendor Feed Widget</p>
                        <p className="text-xs text-gray-500 mt-1">Always visible</p>
                      </div>
                    </div>
                    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-3">
                      <div className="h-16 bg-[#2A2A2A] rounded animate-pulse mb-2"></div>
                      <div className="h-16 bg-[#2A2A2A] rounded animate-pulse"></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Ad Placement Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-400 mb-2">
            <Eye className="w-5 h-5" />
            <span className="text-sm">Portal Reach</span>
          </div>
          <p className="text-2xl font-bold text-white">12,500</p>
          <p className="text-xs text-gray-500 mt-1">Active users/month</p>
        </div>
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-400 mb-2">
            <Megaphone className="w-5 h-5" />
            <span className="text-sm">Ad Placements</span>
          </div>
          <p className="text-2xl font-bold text-white">{selectedPortalData?.adPlacements.length || 0}</p>
          <p className="text-xs text-gray-500 mt-1">Available slots</p>
        </div>
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-400 mb-2">
            <Smartphone className="w-5 h-5" />
            <span className="text-sm">Mobile Traffic</span>
          </div>
          <p className="text-2xl font-bold text-white">68%</p>
          <p className="text-xs text-gray-500 mt-1">Users on mobile</p>
        </div>
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-400 mb-2">
            <Play className="w-5 h-5" />
            <span className="text-sm">Avg. Engagement</span>
          </div>
          <p className="text-2xl font-bold text-white">8.5 min</p>
          <p className="text-xs text-gray-500 mt-1">Time on portal</p>
        </div>
      </div>
    </div>
  );
}
