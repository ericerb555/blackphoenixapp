import { Building2, Users, Home, ArrowLeft } from 'lucide-react';

interface PortalDemoSelectorProps {
  onNavigate?: (page: string) => void;
}

export default function PortalDemoSelector({ onNavigate }: PortalDemoSelectorProps) {
  const handleNavigate = (page: string) => {
    if (onNavigate) {
      onNavigate(page);
    } else {
      window.location.href = `/${page}`;
    }
  };

  const portals = [
    {
      id: 'landlord-portal',
      title: 'Landlord Portal',
      description: 'Manage rental properties, tenants, maintenance, and financials',
      icon: Home,
      gradient: 'from-cyan-600 to-blue-600',
      features: [
        'Portfolio tracking & analytics',
        'Budget management',
        'Tenant management',
        'Maintenance requests',
        'Social media marketing',
        'Revenue & expense tracking'
      ]
    },
    {
      id: 'property-manager-portal',
      title: 'Property Manager Portal',
      description: 'Comprehensive property management for multiple properties and owners',
      icon: Building2,
      gradient: 'from-orange-600 to-red-600',
      features: [
        'Multi-property management',
        'Owner reporting',
        'Vendor coordination',
        'Lease management',
        'Financial reporting',
        'Maintenance coordination'
      ]
    },
    {
      id: 'condo-manager-portal',
      title: 'Condo Manager Portal',
      description: 'HOA and condominium association management tools',
      icon: Users,
      gradient: 'from-purple-600 to-pink-600',
      features: [
        'HOA board management',
        'Resident directory',
        'Amenity reservations',
        'Violation tracking',
        'Financial management',
        'Communication tools'
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1A1A1A] via-[#2A2A2A] to-[#1A1A1A] border-b border-[#ea580c]/30">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <button
            onClick={() => handleNavigate('landing-page')}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Home
          </button>
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Explore Portal Demos
            </h1>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Experience our comprehensive property management portals with live demos. Choose a portal below to explore all features.
            </p>
          </div>
        </div>
      </div>

      {/* Portal Grid */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {portals.map((portal) => {
            const Icon = portal.icon;
            return (
              <div
                key={portal.id}
                className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] overflow-hidden hover:border-orange-500/50 transition-all duration-300 group"
              >
                {/* Portal Header */}
                <div className={`bg-gradient-to-r ${portal.gradient} p-8 text-center`}>
                  <div className="w-20 h-20 mx-auto mb-4 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                    <Icon className="w-10 h-10 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2">{portal.title}</h2>
                  <p className="text-white/80 text-sm">{portal.description}</p>
                </div>

                {/* Features List */}
                <div className="p-6">
                  <h3 className="text-sm font-semibold text-gray-400 uppercase mb-4">Key Features</h3>
                  <ul className="space-y-3 mb-6">
                    {portal.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-gray-300">
                        <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1.5 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  {/* CTA Button */}
                  <button
                    onClick={() => handleNavigate(portal.id)}
                    className={`w-full py-3 rounded-xl bg-gradient-to-r ${portal.gradient} text-white font-semibold hover:opacity-90 transition-all duration-300 group-hover:shadow-lg group-hover:shadow-orange-500/20`}
                  >
                    View {portal.title}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Info */}
        <div className="mt-12 bg-gradient-to-r from-orange-500/10 via-orange-600/5 to-transparent rounded-2xl border border-orange-500/20 p-8 text-center">
          <h3 className="text-2xl font-bold text-white mb-3">Need Help Choosing?</h3>
          <p className="text-gray-400 mb-6 max-w-2xl mx-auto">
            Each portal is designed for specific property management needs. Landlords manage their own properties,
            property managers handle multiple properties for different owners, and condo managers oversee HOA communities.
          </p>
          <button
            onClick={() => handleNavigate('landing-page')}
            className="px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-xl font-semibold hover:from-orange-700 hover:to-orange-800 transition-all"
          >
            Contact Us for Guidance
          </button>
        </div>
      </div>
    </div>
  );
}
