import { ArrowLeft, CheckCircle, Store, TrendingUp, Users, Target, BarChart3, ShoppingCart, Package, Megaphone, Globe, Star } from 'lucide-react';

interface VendorMarketingProps {
  onNavigate?: (page: string) => void;
}

export default function VendorMarketing({ onNavigate }: VendorMarketingProps) {
  const handleNavigate = (page: string) => {
    if (onNavigate) {
      onNavigate(page);
    } else {
      window.location.href = `/${page}`;
    }
  };

  const features = [
    {
      icon: Store,
      title: 'Digital Storefront',
      description: 'Create a professional online presence with your own vendor portal and product catalog.',
      gradient: 'from-purple-600 to-pink-600'
    },
    {
      icon: ShoppingCart,
      title: 'Order Management',
      description: 'Process orders, manage inventory, and track shipments all from one central dashboard.',
      gradient: 'from-blue-600 to-cyan-600'
    },
    {
      icon: Megaphone,
      title: 'Advertising Platform',
      description: 'Promote your products directly to contractors, property managers, and homeowners.',
      gradient: 'from-orange-600 to-red-600'
    },
    {
      icon: Users,
      title: 'Customer Network',
      description: 'Connect with thousands of verified contractors and businesses in your area.',
      gradient: 'from-green-600 to-emerald-600'
    },
    {
      icon: BarChart3,
      title: 'Sales Analytics',
      description: 'Track sales performance, customer trends, and ROI with detailed analytics.',
      gradient: 'from-indigo-600 to-purple-600'
    },
    {
      icon: Package,
      title: 'Bulk Ordering',
      description: 'Enable volume pricing, quote requests, and special pricing for preferred customers.',
      gradient: 'from-yellow-600 to-orange-600'
    }
  ];

  const benefits = [
    'Reach qualified buyers actively looking for your products',
    'Increase visibility with featured listings and ads',
    'Build direct relationships with contractors',
    'Reduce overhead with digital order processing',
    'Access detailed customer insights and preferences',
    'Join the fastest-growing construction marketplace'
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 border-b border-purple-500/30">
        <div className="max-w-5xl mx-auto px-6 py-12">
          <button
            onClick={() => handleNavigate('landing-page')}
            className="flex items-center gap-2 text-white/80 hover:text-white transition-colors mb-6"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Home
          </button>
          <div className="max-w-4xl">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              Grow Your Vendor Business
            </h1>
            <p className="text-xl md:text-2xl text-white/90 mb-8">
              Connect with thousands of contractors and businesses. Showcase your products, manage orders, and increase sales through our comprehensive vendor platform.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => handleNavigate('vendor-application')}
                className="px-8 py-4 bg-white text-purple-600 rounded-xl font-bold text-lg hover:bg-gray-100 transition-all shadow-xl"
              >
                Apply Now
              </button>
              <button
                onClick={() => handleNavigate('pricing')}
                className="px-8 py-4 bg-white/10 backdrop-blur-sm text-white rounded-xl font-bold text-lg hover:bg-white/20 transition-all border border-white/20"
              >
                View Pricing
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
            Everything You Need to Sell More
          </h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            From building materials to specialty tools - grow your business with our vendor platform
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-8 hover:border-purple-500/50 transition-all group"
              >
                <div className={`w-16 h-16 rounded-xl bg-gradient-to-r ${feature.gradient} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                  <Icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                <p className="text-gray-400">{feature.description}</p>
              </div>
            );
          })}
        </div>

        {/* Benefits Section */}
        <div className="bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-purple-500/10 rounded-2xl border border-purple-500/20 p-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                Why Top Vendors Choose Our Platform
              </h2>
              <p className="text-lg text-gray-300 mb-8">
                Join successful vendors who are expanding their reach and increasing sales through our marketplace.
              </p>
              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <CheckCircle className="w-6 h-6 text-purple-400 flex-shrink-0 mt-0.5" />
                    <p className="text-gray-300">{benefit}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-8">
              <div className="text-center mb-6">
                <div className="inline-block p-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl mb-4">
                  <Globe className="w-12 h-12 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Vendor Partnership Plans</h3>
                <p className="text-gray-400">Flexible options for businesses of all sizes</p>
              </div>

              <div className="space-y-4 mb-8">
                <div className="p-4 bg-[#0A0A0A] rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-semibold">Basic Listing</span>
                    <span className="text-2xl font-bold text-white">Free</span>
                  </div>
                  <p className="text-sm text-gray-400">Perfect for getting started</p>
                </div>
                <div className="p-4 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-lg border border-purple-500/30">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="text-white font-semibold block">Premium Plus</span>
                      <span className="text-sm text-purple-300">Most Popular</span>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-bold text-white">$199</span>
                      <span className="text-gray-400 block text-sm">/month</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-300">Featured placement + advertising credits</p>
                </div>
                <div className="p-4 bg-[#0A0A0A] rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-semibold">Enterprise</span>
                    <span className="text-white">Custom</span>
                  </div>
                  <p className="text-sm text-gray-400">Dedicated support & unlimited products</p>
                </div>
              </div>

              <button
                onClick={() => handleNavigate('vendor-application')}
                className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold text-lg hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg shadow-purple-500/20"
              >
                Become a Vendor
              </button>
              <p className="text-center text-sm text-gray-500 mt-4">30-day money-back guarantee</p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center mt-20">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Expand Your Reach?
          </h2>
          <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
            Join our vendor network today and start connecting with thousands of potential customers
          </p>
          <button
            onClick={() => handleNavigate('vendor-application')}
            className="px-12 py-5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold text-xl hover:from-purple-700 hover:to-pink-700 transition-all shadow-2xl shadow-purple-500/20"
          >
            Apply to Become a Vendor
          </button>
        </div>
      </div>
    </div>
  );
}
