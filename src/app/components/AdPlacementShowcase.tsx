import { useState } from 'react';
import { Eye, MousePointer, Clock, TrendingUp, Layers, MapPin } from 'lucide-react';

interface PlacementOption {
  id: string;
  name: string;
  location: string;
  impressions: string;
  ctr: string;
  price: string;
  image: string;
}

export default function AdPlacementShowcase() {
  const [selectedPlacement, setSelectedPlacement] = useState<string | null>(null);

  const placements: PlacementOption[] = [
    {
      id: 'hero-banner',
      name: 'Hero Banner',
      location: 'Homepage Top',
      impressions: '50K/month',
      ctr: '3.2%',
      price: '$499/mo',
      image: '🎯'
    },
    {
      id: 'sidebar',
      name: 'Sidebar Featured',
      location: 'All Pages',
      impressions: '35K/month',
      ctr: '2.8%',
      price: '$299/mo',
      image: '📌'
    },
    {
      id: 'mobile-banner',
      name: 'Mobile Banner',
      location: 'Mobile App',
      impressions: '40K/month',
      ctr: '4.1%',
      price: '$399/mo',
      image: '📱'
    },
    {
      id: 'search-results',
      name: 'Search Results Sponsored',
      location: 'Search Page',
      impressions: '25K/month',
      ctr: '5.5%',
      price: '$599/mo',
      image: '🔍'
    },
    {
      id: 'product-carousel',
      name: 'Product Carousel',
      location: 'Product Pages',
      impressions: '30K/month',
      ctr: '3.8%',
      price: '$449/mo',
      image: '🛍️'
    },
    {
      id: 'email-newsletter',
      name: 'Email Newsletter',
      location: 'Weekly Email',
      impressions: '15K/month',
      ctr: '6.2%',
      price: '$349/mo',
      image: '📧'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-[#ea580c] to-[#dc2626] p-6 rounded-xl">
        <h2 className="text-2xl font-bold text-white mb-2">Premium Ad Placements</h2>
        <p className="text-orange-100">
          Choose the perfect placement to maximize your reach and engagement
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {placements.map((placement) => (
          <div
            key={placement.id}
            onClick={() => setSelectedPlacement(placement.id)}
            className={`bg-[#1A1A1A] border rounded-xl p-6 cursor-pointer transition-all ${
              selectedPlacement === placement.id
                ? 'border-[#ea580c] shadow-lg shadow-[#ea580c]/20'
                : 'border-[#2A2A2A] hover:border-[#ea580c]/50'
            }`}
          >
            <div className="text-5xl mb-4 text-center">{placement.image}</div>
            
            <h3 className="text-xl font-bold text-white mb-2">{placement.name}</h3>
            
            <div className="flex items-center gap-2 text-gray-400 text-sm mb-4">
              <MapPin className="w-4 h-4" />
              <span>{placement.location}</span>
            </div>

            <div className="space-y-3 mb-4">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-gray-400">
                  <Eye className="w-4 h-4" />
                  <span>Impressions</span>
                </div>
                <span className="text-white font-semibold">{placement.impressions}</span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-gray-400">
                  <MousePointer className="w-4 h-4" />
                  <span>CTR</span>
                </div>
                <span className="text-green-400 font-semibold">{placement.ctr}</span>
              </div>
            </div>

            <div className="pt-4 border-t border-[#2A2A2A]">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-[#ea580c]">{placement.price}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    alert(`Selected ${placement.name}`);
                  }}
                  className="px-4 py-2 bg-[#ea580c] hover:bg-[#dc2626] text-white rounded-lg transition-colors text-sm font-semibold"
                >
                  Select
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedPlacement && (
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
          <h3 className="text-xl font-bold text-white mb-4">Placement Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#0A0A0A] rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-400 mb-2">
                <TrendingUp className="w-5 h-5" />
                <span className="text-sm">Performance</span>
              </div>
              <p className="text-2xl font-bold text-white">High</p>
            </div>
            <div className="bg-[#0A0A0A] rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-400 mb-2">
                <Clock className="w-5 h-5" />
                <span className="text-sm">Duration</span>
              </div>
              <p className="text-2xl font-bold text-white">Monthly</p>
            </div>
            <div className="bg-[#0A0A0A] rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-400 mb-2">
                <Layers className="w-5 h-5" />
                <span className="text-sm">Format</span>
              </div>
              <p className="text-2xl font-bold text-white">Responsive</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
