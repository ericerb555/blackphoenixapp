// MEP Library (Mechanical, Electrical, Plumbing) - Complete Device & Fixture Library
import { useState } from 'react';
import { Zap, Droplets, X, Search, Layers } from 'lucide-react';

interface MEPItem {
  id: string;
  name: string;
  category: 'electrical' | 'plumbing';
  type: 'electrical' | 'plumbing';
  subtype: string;
  symbol: string;
  width: number;
  height: number;
  color: string;
  description: string;
  connectionPoints?: { id: string; x: number; y: number }[];
  connectedTo?: string[];
}

interface MEPLibraryProps {
  onPlaceItem: (item: MEPItem) => void;
  onClose: () => void;
}

const ELECTRICAL_ITEMS: MEPItem[] = [
  // Outlets & Receptacles
  {
    id: 'outlet-duplex',
    name: 'Duplex Outlet',
    category: 'electrical',
    type: 'electrical',
    subtype: 'outlet',
    symbol: '⏚',
    width: 15,
    height: 15,
    color: '#FFD700',
    description: '120V duplex receptacle'
  },
  {
    id: 'outlet-gfci',
    name: 'GFCI Outlet',
    category: 'electrical',
    type: 'electrical',
    subtype: 'outlet',
    symbol: 'G',
    width: 15,
    height: 15,
    color: '#FFA500',
    description: 'Ground Fault Circuit Interrupter'
  },
  {
    id: 'outlet-220v',
    name: '220V Outlet',
    category: 'electrical',
    type: 'electrical',
    subtype: 'outlet',
    symbol: '⏚⏚',
    width: 20,
    height: 20,
    color: '#FF4500',
    description: '220V appliance outlet'
  },
  {
    id: 'outlet-usb',
    name: 'USB Outlet',
    category: 'electrical',
    type: 'electrical',
    subtype: 'outlet',
    symbol: 'USB',
    width: 15,
    height: 15,
    color: '#32CD32',
    description: 'USB charging outlet'
  },

  // Switches
  {
    id: 'switch-single',
    name: 'Single Switch',
    category: 'electrical',
    type: 'electrical',
    subtype: 'switch',
    symbol: 'S',
    width: 15,
    height: 15,
    color: '#FFD700',
    description: 'Single pole switch'
  },
  {
    id: 'switch-3way',
    name: '3-Way Switch',
    category: 'electrical',
    type: 'electrical',
    subtype: 'switch',
    symbol: 'S3',
    width: 15,
    height: 15,
    color: '#FFA500',
    description: '3-way light switch'
  },
  {
    id: 'switch-dimmer',
    name: 'Dimmer Switch',
    category: 'electrical',
    type: 'electrical',
    subtype: 'switch',
    symbol: 'SD',
    width: 15,
    height: 15,
    color: '#FF8C00',
    description: 'Dimmer control switch'
  },
  {
    id: 'switch-smart',
    name: 'Smart Switch',
    category: 'electrical',
    type: 'electrical',
    subtype: 'switch',
    symbol: 'S⚡',
    width: 15,
    height: 15,
    color: '#00CED1',
    description: 'WiFi smart switch'
  },

  // Light Fixtures
  {
    id: 'light-ceiling',
    name: 'Ceiling Light',
    category: 'electrical',
    type: 'electrical',
    subtype: 'light',
    symbol: '◉',
    width: 30,
    height: 30,
    color: '#FFFF00',
    description: 'Ceiling mounted fixture'
  },
  {
    id: 'light-recessed',
    name: 'Recessed Light',
    category: 'electrical',
    type: 'electrical',
    subtype: 'light',
    symbol: '⦿',
    width: 20,
    height: 20,
    color: '#FFEB3B',
    description: 'Can light / recessed fixture'
  },
  {
    id: 'light-pendant',
    name: 'Pendant Light',
    category: 'electrical',
    type: 'electrical',
    subtype: 'light',
    symbol: '⊙',
    width: 25,
    height: 25,
    color: '#FFD54F',
    description: 'Hanging pendant fixture'
  },
  {
    id: 'light-track',
    name: 'Track Lighting',
    category: 'electrical',
    type: 'electrical',
    subtype: 'light',
    symbol: '━',
    width: 80,
    height: 15,
    color: '#FFC107',
    description: 'Track lighting system'
  },
  {
    id: 'light-wall',
    name: 'Wall Sconce',
    category: 'electrical',
    type: 'electrical',
    subtype: 'light',
    symbol: '◐',
    width: 20,
    height: 20,
    color: '#FFCA28',
    description: 'Wall mounted light'
  },
  {
    id: 'light-chandelier',
    name: 'Chandelier',
    category: 'electrical',
    type: 'electrical',
    subtype: 'light',
    symbol: '◈',
    width: 40,
    height: 40,
    color: '#FFB300',
    description: 'Decorative chandelier'
  },

  // Panels & Boxes
  {
    id: 'panel-main',
    name: 'Main Panel',
    category: 'electrical',
    type: 'electrical',
    subtype: 'panel',
    symbol: 'MP',
    width: 40,
    height: 60,
    color: '#8B0000',
    description: 'Main electrical panel'
  },
  {
    id: 'panel-sub',
    name: 'Sub Panel',
    category: 'electrical',
    type: 'electrical',
    subtype: 'panel',
    symbol: 'SP',
    width: 30,
    height: 45,
    color: '#A52A2A',
    description: 'Sub electrical panel'
  },
  {
    id: 'junction-box',
    name: 'Junction Box',
    category: 'electrical',
    type: 'electrical',
    subtype: 'junction',
    symbol: 'J',
    width: 15,
    height: 15,
    color: '#696969',
    description: 'Wire junction box'
  },
  {
    id: 'breaker-box',
    name: 'Breaker Box',
    category: 'electrical',
    type: 'electrical',
    subtype: 'panel',
    symbol: 'BB',
    width: 35,
    height: 50,
    color: '#800000',
    description: 'Circuit breaker box'
  },

  // Special Devices
  {
    id: 'smoke-detector',
    name: 'Smoke Detector',
    category: 'electrical',
    type: 'electrical',
    subtype: 'device',
    symbol: '◬',
    width: 20,
    height: 20,
    color: '#DC143C',
    description: 'Smoke alarm'
  },
  {
    id: 'co-detector',
    name: 'CO Detector',
    category: 'electrical',
    type: 'electrical',
    subtype: 'device',
    symbol: 'CO',
    width: 20,
    height: 20,
    color: '#FF6347',
    description: 'Carbon monoxide detector'
  },
  {
    id: 'thermostat',
    name: 'Thermostat',
    category: 'electrical',
    type: 'electrical',
    subtype: 'device',
    symbol: 'T',
    width: 18,
    height: 25,
    color: '#4682B4',
    description: 'HVAC thermostat'
  },
  {
    id: 'doorbell',
    name: 'Doorbell',
    category: 'electrical',
    type: 'electrical',
    subtype: 'device',
    symbol: '⍾',
    width: 15,
    height: 20,
    color: '#DAA520',
    description: 'Doorbell button'
  },
  {
    id: 'fan-ceiling',
    name: 'Ceiling Fan',
    category: 'electrical',
    type: 'electrical',
    subtype: 'device',
    symbol: '⚙',
    width: 50,
    height: 50,
    color: '#708090',
    description: 'Ceiling fan with light'
  },
  {
    id: 'exhaust-fan',
    name: 'Exhaust Fan',
    category: 'electrical',
    type: 'electrical',
    subtype: 'device',
    symbol: '⊛',
    width: 25,
    height: 25,
    color: '#778899',
    description: 'Bathroom/kitchen exhaust fan'
  }
];

const PLUMBING_ITEMS: MEPItem[] = [
  // Sinks & Fixtures
  {
    id: 'sink-kitchen',
    name: 'Kitchen Sink',
    category: 'plumbing',
    type: 'plumbing',
    subtype: 'sink',
    symbol: '⊏⊐',
    width: 60,
    height: 40,
    color: '#00BFFF',
    description: 'Kitchen sink with faucet'
  },
  {
    id: 'sink-bath',
    name: 'Bathroom Sink',
    category: 'plumbing',
    type: 'plumbing',
    subtype: 'sink',
    symbol: '○',
    width: 40,
    height: 30,
    color: '#1E90FF',
    description: 'Bathroom vanity sink'
  },
  {
    id: 'sink-utility',
    name: 'Utility Sink',
    category: 'plumbing',
    type: 'plumbing',
    subtype: 'sink',
    symbol: '▭',
    width: 35,
    height: 35,
    color: '#4169E1',
    description: 'Laundry/utility sink'
  },
  {
    id: 'sink-bar',
    name: 'Bar Sink',
    category: 'plumbing',
    type: 'plumbing',
    subtype: 'sink',
    symbol: '◯',
    width: 25,
    height: 25,
    color: '#6495ED',
    description: 'Small bar sink'
  },

  // Toilets & Bidets
  {
    id: 'toilet',
    name: 'Toilet',
    category: 'plumbing',
    type: 'plumbing',
    subtype: 'toilet',
    symbol: '⊓',
    width: 30,
    height: 45,
    color: '#87CEEB',
    description: 'Standard toilet'
  },
  {
    id: 'toilet-wall',
    name: 'Wall-Hung Toilet',
    category: 'plumbing',
    type: 'plumbing',
    subtype: 'toilet',
    symbol: '⊏',
    width: 28,
    height: 40,
    color: '#87CEFA',
    description: 'Wall-mounted toilet'
  },
  {
    id: 'bidet',
    name: 'Bidet',
    category: 'plumbing',
    type: 'plumbing',
    subtype: 'bidet',
    symbol: '⊐',
    width: 30,
    height: 40,
    color: '#ADD8E6',
    description: 'Bidet fixture'
  },

  // Showers & Tubs
  {
    id: 'shower',
    name: 'Shower Stall',
    category: 'plumbing',
    type: 'plumbing',
    subtype: 'shower',
    symbol: '▢',
    width: 80,
    height: 80,
    color: '#00CED1',
    description: 'Shower stall'
  },
  {
    id: 'bathtub',
    name: 'Bathtub',
    category: 'plumbing',
    type: 'plumbing',
    subtype: 'tub',
    symbol: '▬',
    width: 150,
    height: 60,
    color: '#48D1CC',
    description: 'Standard bathtub'
  },
  {
    id: 'tub-shower-combo',
    name: 'Tub/Shower Combo',
    category: 'plumbing',
    type: 'plumbing',
    subtype: 'tub',
    symbol: '▭',
    width: 150,
    height: 75,
    color: '#40E0D0',
    description: 'Combined tub and shower'
  },
  {
    id: 'shower-head',
    name: 'Shower Head',
    category: 'plumbing',
    type: 'plumbing',
    subtype: 'shower',
    symbol: '⚭',
    width: 15,
    height: 15,
    color: '#7FFFD4',
    description: 'Shower head fixture'
  },

  // Appliances
  {
    id: 'dishwasher',
    name: 'Dishwasher',
    category: 'plumbing',
    type: 'plumbing',
    subtype: 'appliance',
    symbol: 'DW',
    width: 60,
    height: 60,
    color: '#5F9EA0',
    description: 'Built-in dishwasher'
  },
  {
    id: 'washing-machine',
    name: 'Washing Machine',
    category: 'plumbing',
    type: 'plumbing',
    subtype: 'appliance',
    symbol: 'W',
    width: 65,
    height: 65,
    color: '#4682B4',
    description: 'Clothes washer'
  },
  {
    id: 'dryer',
    name: 'Dryer',
    category: 'plumbing',
    type: 'plumbing',
    subtype: 'appliance',
    symbol: 'D',
    width: 65,
    height: 65,
    color: '#708090',
    description: 'Clothes dryer'
  },
  {
    id: 'water-heater',
    name: 'Water Heater',
    category: 'plumbing',
    type: 'plumbing',
    subtype: 'heater',
    symbol: 'WH',
    width: 50,
    height: 50,
    color: '#B22222',
    description: 'Hot water heater'
  },

  // Pipes & Valves
  {
    id: 'pipe-hot',
    name: 'Hot Water Line',
    category: 'plumbing',
    type: 'plumbing',
    subtype: 'pipe-hot',
    symbol: '━━',
    width: 100,
    height: 8,
    color: '#FF0000',
    description: 'Hot water supply pipe'
  },
  {
    id: 'pipe-cold',
    name: 'Cold Water Line',
    category: 'plumbing',
    type: 'plumbing',
    subtype: 'pipe-cold',
    symbol: '━━',
    width: 100,
    height: 8,
    color: '#0000FF',
    description: 'Cold water supply pipe'
  },
  {
    id: 'pipe-drain',
    name: 'Drain Line',
    category: 'plumbing',
    type: 'plumbing',
    subtype: 'pipe-drain',
    symbol: '━━',
    width: 100,
    height: 12,
    color: '#808080',
    description: 'Waste drain pipe'
  },
  {
    id: 'pipe-vent',
    name: 'Vent Stack',
    category: 'plumbing',
    type: 'plumbing',
    subtype: 'pipe-vent',
    symbol: '┃',
    width: 10,
    height: 80,
    color: '#A9A9A9',
    description: 'Plumbing vent stack'
  },
  {
    id: 'valve-shutoff',
    name: 'Shutoff Valve',
    category: 'plumbing',
    type: 'plumbing',
    subtype: 'valve',
    symbol: '⊗',
    width: 15,
    height: 15,
    color: '#696969',
    description: 'Water shutoff valve'
  },
  {
    id: 'valve-drain',
    name: 'Floor Drain',
    category: 'plumbing',
    type: 'plumbing',
    subtype: 'drain',
    symbol: '◘',
    width: 20,
    height: 20,
    color: '#2F4F4F',
    description: 'Floor drain'
  },
  {
    id: 'sump-pump',
    name: 'Sump Pump',
    category: 'plumbing',
    type: 'plumbing',
    subtype: 'pump',
    symbol: '⊕',
    width: 30,
    height: 30,
    color: '#556B2F',
    description: 'Sump pump'
  },

  // Outdoor
  {
    id: 'hose-bib',
    name: 'Hose Bib',
    category: 'plumbing',
    type: 'plumbing',
    subtype: 'outdoor',
    symbol: '╪',
    width: 15,
    height: 15,
    color: '#8B4513',
    description: 'Outdoor hose connection'
  },
  {
    id: 'sprinkler',
    name: 'Sprinkler Head',
    category: 'plumbing',
    type: 'plumbing',
    subtype: 'outdoor',
    symbol: '✱',
    width: 12,
    height: 12,
    color: '#228B22',
    description: 'Irrigation sprinkler'
  }
];

export default function MEPLibrary({ onPlaceItem, onClose }: MEPLibraryProps) {
  const [activeCategory, setActiveCategory] = useState<'electrical' | 'plumbing'>('electrical');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubtype, setSelectedSubtype] = useState<string>('all');

  const items = activeCategory === 'electrical' ? ELECTRICAL_ITEMS : PLUMBING_ITEMS;
  
  // Get unique subtypes for filtering
  const subtypes = ['all', ...new Set(items.map(item => item.subtype))];

  // Filter items based on search and subtype
  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubtype = selectedSubtype === 'all' || item.subtype === selectedSubtype;
    return matchesSearch && matchesSubtype;
  });

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="border-b border-[#2A2A2A] p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <Layers className="w-7 h-7 text-[#ea580c]" />
                MEP Library
              </h2>
              <p className="text-sm text-gray-400 mt-1">
                Electrical, Plumbing & Mechanical Systems
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[#2A2A2A] rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Category Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => {
                setActiveCategory('electrical');
                setSelectedSubtype('all');
              }}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
                activeCategory === 'electrical'
                  ? 'bg-gradient-to-r from-[#ea580c] to-[#dc2626] text-white'
                  : 'bg-[#2A2A2A] text-gray-400 hover:bg-[#3A3A3A]'
              }`}
            >
              <Zap className="w-5 h-5" />
              Electrical ({ELECTRICAL_ITEMS.length})
            </button>
            <button
              onClick={() => {
                setActiveCategory('plumbing');
                setSelectedSubtype('all');
              }}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
                activeCategory === 'plumbing'
                  ? 'bg-gradient-to-r from-[#ea580c] to-[#dc2626] text-white'
                  : 'bg-[#2A2A2A] text-gray-400 hover:bg-[#3A3A3A]'
              }`}
            >
              <Droplets className="w-5 h-5" />
              Plumbing ({PLUMBING_ITEMS.length})
            </button>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="border-b border-[#2A2A2A] p-4 space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#2A2A2A] border border-[#3A3A3A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#ea580c]"
            />
          </div>

          {/* Subtype Filter */}
          <div className="flex gap-2 flex-wrap">
            {subtypes.map((subtype) => (
              <button
                key={subtype}
                onClick={() => setSelectedSubtype(subtype)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  selectedSubtype === subtype
                    ? 'bg-[#ea580c] text-white'
                    : 'bg-[#2A2A2A] text-gray-400 hover:bg-[#3A3A3A]'
                }`}
              >
                {subtype.charAt(0).toUpperCase() + subtype.slice(1).replace('-', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Items Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filteredItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onPlaceItem(item)}
                className="group relative p-4 bg-[#2A2A2A] hover:bg-[#3A3A3A] border border-[#3A3A3A] hover:border-[#ea580c] rounded-xl transition-all"
              >
                {/* Symbol */}
                <div
                  className="w-full aspect-square flex items-center justify-center text-4xl font-bold mb-3 rounded-lg"
                  style={{ 
                    backgroundColor: `${item.color}20`,
                    color: item.color 
                  }}
                >
                  {item.symbol}
                </div>

                {/* Name */}
                <p className="text-sm font-semibold text-white mb-1 text-center">
                  {item.name}
                </p>

                {/* Description */}
                <p className="text-xs text-gray-400 text-center line-clamp-2">
                  {item.description}
                </p>

                {/* Dimensions */}
                <p className="text-xs text-gray-500 text-center mt-2">
                  {item.width}" × {item.height}"
                </p>

                {/* Add Indicator */}
                <div className="absolute top-2 right-2 w-6 h-6 bg-[#ea580c] rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-white text-lg font-bold">+</span>
                </div>
              </button>
            ))}
          </div>

          {/* No Results */}
          {filteredItems.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-400 text-lg mb-2">No items found</p>
              <p className="text-gray-500 text-sm">
                Try adjusting your search or filter
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[#2A2A2A] p-4 bg-[#0A0A0A]">
          <p className="text-xs text-gray-500 text-center">
            Click any item to place it on your floor plan • 
            {activeCategory === 'electrical' ? ' ⚡ Electrical: ' : ' 💧 Plumbing: '}
            {filteredItems.length} items available
          </p>
        </div>
      </div>
    </div>
  );
}