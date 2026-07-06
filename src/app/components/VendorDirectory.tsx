// Vendor Directory
// Browse all vendor storefronts
import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Store,
  Search,
  MapPin,
  Star,
  Package,
  TrendingUp,
  CheckCircle,
  ChevronRight,
  Filter,
  Award
} from 'lucide-react';
import { StandardButton } from './ui/button/StandardButton';
import VendorStorefront from './VendorStorefront';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface Vendor {
  vendorKey: string;
  companyName: string;
  email: string;
  description?: string;
  logo?: string;
  rating?: number;
  totalReviews?: number;
  verified?: boolean;
  yearsInBusiness?: number;
  productCount?: number;
  address?: string;
}

export default function VendorDirectory() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVendor, setSelectedVendor] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'featured' | 'rating' | 'products' | 'name'>('featured');

  useEffect(() => {
    loadVendors();
  }, []);

  const loadVendors = async () => {
    try {
      setLoading(true);

      // Load all vendors from vendor portal
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-57095a78/vendor-directory`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const text = await response.text();
      let data;
      
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error('Failed to parse response as JSON:', text);
        throw new Error('Invalid JSON response from server');
      }
      
      if (data.success) {
        setVendors(data.vendors || []);
      } else {
        // Fallback: create demo vendors
        setVendors([
          {
            vendorKey: 'VEN-1234567890',
            companyName: 'ABC Building Supplies',
            email: 'contact@abcbuilding.com',
            description: 'Quality building materials and supplies for contractors',
            rating: 4.8,
            totalReviews: 124,
            verified: true,
            yearsInBusiness: 15,
            productCount: 45,
            address: '123 Main St, City, ST 12345'
          },
          {
            vendorKey: 'VEN-0987654321',
            companyName: 'Pro Tools & Equipment',
            email: 'sales@protools.com',
            description: 'Professional grade tools and equipment',
            rating: 4.6,
            totalReviews: 89,
            verified: true,
            yearsInBusiness: 8,
            productCount: 32,
            address: '456 Oak Ave, City, ST 12345'
          }
        ]);
      }
    } catch (error) {
      console.error('Error loading vendors:', error);
      // On error, use demo vendors
      setVendors([
        {
          vendorKey: 'VEN-1234567890',
          companyName: 'ABC Building Supplies',
          email: 'contact@abcbuilding.com',
          description: 'Quality building materials and supplies for contractors',
          rating: 4.8,
          totalReviews: 124,
          verified: true,
          yearsInBusiness: 15,
          productCount: 45,
          address: '123 Main St, City, ST 12345'
        },
        {
          vendorKey: 'VEN-0987654321',
          companyName: 'Pro Tools & Equipment',
          email: 'sales@protools.com',
          description: 'Professional grade tools and equipment',
          rating: 4.6,
          totalReviews: 89,
          verified: true,
          yearsInBusiness: 8,
          productCount: 32,
          address: '456 Oak Ave, City, ST 12345'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // If a vendor is selected, show their storefront
  if (selectedVendor) {
    return (
      <VendorStorefront
        vendorId={selectedVendor}
        onBack={() => setSelectedVendor(null)}
      />
    );
  }

  const filteredVendors = vendors
    .filter(vendor => {
      if (searchQuery === '') return true;
      return (
        vendor.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vendor.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vendor.address?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          return (b.rating || 0) - (a.rating || 0);
        case 'products':
          return (b.productCount || 0) - (a.productCount || 0);
        case 'name':
          return a.companyName.localeCompare(b.companyName);
        case 'featured':
        default:
          return (b.verified ? 1 : 0) - (a.verified ? 1 : 0);
      }
    });

  return (
    <div className="min-h-screen bg-[#0A0A0A] py-12">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-3 flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#ea580c] to-orange-700 flex items-center justify-center">
              <Store className="w-7 h-7 text-white" />
            </div>
            Vendor Marketplace
          </h1>
          <p className="text-gray-400 text-lg">
            Browse storefronts from verified vendors and discover quality products
          </p>
        </div>

        {/* Search & Filters */}
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search vendors by name, description, or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#ea580c]"
              />
            </div>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
            >
              <option value="featured">Featured First</option>
              <option value="rating">Highest Rated</option>
              <option value="products">Most Products</option>
              <option value="name">Name (A-Z)</option>
            </select>
          </div>

          {/* Stats */}
          <div className="mt-4 pt-4 border-t border-[#2A2A2A] flex items-center justify-between">
            <div className="text-sm text-gray-400">
              Showing <span className="text-white font-semibold">{filteredVendors.length}</span> vendor{filteredVendors.length !== 1 ? 's' : ''}
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <div className="flex items-center gap-1">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span>{vendors.filter(v => v.verified).length} verified</span>
              </div>
              <div className="flex items-center gap-1">
                <Package className="w-4 h-4 text-[#ea580c]" />
                <span>{vendors.reduce((sum, v) => sum + (v.productCount || 0), 0)} products</span>
              </div>
            </div>
          </div>
        </div>

        {/* Vendors Grid */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ea580c]"></div>
          </div>
        ) : filteredVendors.length === 0 ? (
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-12 text-center">
            <Store className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Vendors Found</h3>
            <p className="text-gray-400">Try adjusting your search</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVendors.map(vendor => (
              <VendorCard
                key={vendor.vendorKey}
                vendor={vendor}
                onView={() => setSelectedVendor(vendor.vendorKey)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Vendor Card Component
function VendorCard({ 
  vendor, 
  onView 
}: { 
  vendor: Vendor;
  onView: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -4 }}
      className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl overflow-hidden hover:border-[#ea580c] transition-all group cursor-pointer"
      onClick={onView}
    >
      {/* Logo/Header */}
      <div className="relative h-32 bg-gradient-to-br from-[#ea580c]/20 to-orange-700/20">
        {vendor.verified && (
          <div className="absolute top-3 right-3 px-2 py-1 bg-green-500/20 border border-green-500/30 rounded-full flex items-center gap-1">
            <CheckCircle className="w-3 h-3 text-green-400" />
            <span className="text-xs text-green-400 font-semibold">Verified</span>
          </div>
        )}
        
        <div className="absolute -bottom-8 left-6">
          <div className="w-16 h-16 rounded-xl bg-white border-4 border-[#1A1A1A] shadow-xl overflow-hidden">
            {vendor.logo ? (
              <img src={vendor.logo} alt={vendor.companyName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#ea580c] to-orange-700">
                <Store className="w-8 h-8 text-white" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 pt-12">
        <h3 className="text-xl font-bold text-white mb-2 group-hover:text-[#ea580c] transition-colors">
          {vendor.companyName}
        </h3>

        {vendor.description && (
          <p className="text-gray-400 text-sm mb-4 line-clamp-2 min-h-[40px]">
            {vendor.description}
          </p>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {vendor.rating && (
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-400 fill-current" />
              <div>
                <div className="text-white font-semibold text-sm">{vendor.rating.toFixed(1)}</div>
                <div className="text-xs text-gray-400">Rating</div>
              </div>
            </div>
          )}

          {vendor.productCount !== undefined && (
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-[#ea580c]" />
              <div>
                <div className="text-white font-semibold text-sm">{vendor.productCount}</div>
                <div className="text-xs text-gray-400">Products</div>
              </div>
            </div>
          )}

          {vendor.totalReviews !== undefined && vendor.totalReviews > 0 && (
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-400" />
              <div>
                <div className="text-white font-semibold text-sm">{vendor.totalReviews}</div>
                <div className="text-xs text-gray-400">Reviews</div>
              </div>
            </div>
          )}

          {vendor.yearsInBusiness && (
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-purple-400" />
              <div>
                <div className="text-white font-semibold text-sm">{vendor.yearsInBusiness}y</div>
                <div className="text-xs text-gray-400">Experience</div>
              </div>
            </div>
          )}
        </div>

        {/* Location */}
        {vendor.address && (
          <div className="flex items-start gap-2 text-gray-400 text-xs mb-4">
            <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
            <span className="line-clamp-1">{vendor.address}</span>
          </div>
        )}

        {/* View Button */}
        <StandardButton
          variant="primary"
          onClick={(e) => {
            e.stopPropagation();
            onView();
          }}
          icon={<ChevronRight className="w-4 h-4" />}
          className="w-full"
        >
          Visit Storefront
        </StandardButton>
      </div>
    </motion.div>
  );
}