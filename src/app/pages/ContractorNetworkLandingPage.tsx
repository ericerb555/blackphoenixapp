/**
 * Contractor Network Landing Page
 * Shows the difference between Vendors and Subcontractors
 */

import { motion } from 'motion/react';
import { Users, Store, Wrench, ArrowRight, CheckCircle, Building2, Package, Hammer, User, Briefcase } from 'lucide-react';

interface ContractorNetworkLandingPageProps {
  onNavigate?: (page: string) => void;
}

export default function ContractorNetworkLandingPage({ onNavigate }: ContractorNetworkLandingPageProps) {
  console.log('🤝 [ContractorNetworkLandingPage] Component mounting/rendering');
  console.log('🤝 [ContractorNetworkLandingPage] onNavigate prop:', typeof onNavigate, onNavigate ? '✓ present' : '✗ missing');

  const handleNavigate = (page: string) => {
    console.log('🔄 [ContractorNetworkLandingPage] handleNavigate called with page:', page);
    if (onNavigate) {
      console.log('✓ [ContractorNetworkLandingPage] Calling onNavigate prop');
      onNavigate(page);
    } else {
      console.error('✗ [ContractorNetworkLandingPage] onNavigate prop is missing!');
      // Fallback to window.location if onNavigate is not provided
      window.location.href = `/${page}`;
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1521791136064-7986c2920216?w=800&q=80"
            alt="Contractor Network"
            className="w-full h-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0A] via-[#0A0A0A]/95 to-[#0A0A0A]" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 mb-6 mx-auto">
            <Users className="w-10 h-10 text-white" />
          </div>

          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
            Join Our Contractor Network
          </h1>
          <p className="text-xl text-gray-300 mb-4 max-w-3xl mx-auto">
            Connect with homeowners, property managers, and businesses looking for quality products and professional services
          </p>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Whether you're a vendor selling products, a subcontractor providing specialized services, or a service provider offering professional expertise, we have opportunities for you to grow your business
          </p>
        </div>
      </section>

      {/* Three Options Section */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Vendors Option */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="bg-[#1A1A1A] border-2 border-[#2A2A2A] rounded-2xl p-8 hover:border-green-500/50 transition-all"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-green-600 to-emerald-600 flex items-center justify-center">
                  <Store className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-white">Vendors</h2>
                  <p className="text-green-400">Sell Products & Materials</p>
                </div>
              </div>

              <p className="text-gray-300 mb-6 leading-relaxed">
                Perfect for suppliers, manufacturers, and distributors who want to sell construction materials, tools, equipment, and home improvement products to our network.
              </p>

              <div className="space-y-3 mb-8">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-white">Product Catalog Management</div>
                    <div className="text-sm text-gray-400">List and manage your entire product inventory</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-white">API Integration</div>
                    <div className="text-sm text-gray-400">Connect your existing inventory system</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-white">Direct Orders</div>
                    <div className="text-sm text-gray-400">Receive orders from contractors and customers</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-white">Bulk Pricing</div>
                    <div className="text-sm text-gray-400">Offer contractor and volume discounts</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-white">Payment Processing</div>
                    <div className="text-sm text-gray-400">Secure and automated payment handling</div>
                  </div>
                </div>
              </div>

              <div className="bg-[#0A0A0A] border border-green-500/30 rounded-xl p-4 mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="w-5 h-5 text-green-400" />
                  <div className="font-bold text-white">Best For:</div>
                </div>
                <p className="text-sm text-gray-300">
                  Material suppliers, tool distributors, equipment rental companies, hardware stores, lumber yards, and product manufacturers
                </p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => handleNavigate('vendor-application')}
                  className="w-full px-8 py-4 rounded-xl font-bold text-white bg-gradient-to-r from-green-600 to-emerald-600 hover:shadow-lg hover:shadow-green-500/50 transition-all flex items-center justify-center gap-2 group"
                >
                  Apply as a Vendor
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
                <button
                  onClick={() => handleNavigate('vendor-portal')}
                  className="w-full px-8 py-4 rounded-xl font-bold text-white bg-white/10 hover:bg-white/20 border border-white/20 transition-all flex items-center justify-center gap-2"
                >
                  <User className="w-5 h-5" />
                  View Vendor Portal
                </button>
              </div>
            </motion.div>

            {/* Subcontractors Option */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="bg-[#1A1A1A] border-2 border-[#2A2A2A] rounded-2xl p-8 hover:border-blue-500/50 transition-all"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center">
                  <Hammer className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-white">Subcontractors</h2>
                  <p className="text-blue-400">Provide Specialized Services</p>
                </div>
              </div>

              <p className="text-gray-300 mb-6 leading-relaxed">
                Perfect for licensed professionals and specialty contractors who provide specific construction and renovation services to our projects and clients.
              </p>

              <div className="space-y-3 mb-8">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-white">Project Opportunities</div>
                    <div className="text-sm text-gray-400">Access to ongoing construction projects</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-white">Bid Management</div>
                    <div className="text-sm text-gray-400">Submit and track bids on available work</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-white">Verified Licensing</div>
                    <div className="text-sm text-gray-400">Showcase your credentials and certifications</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-white">Guaranteed Payment</div>
                    <div className="text-sm text-gray-400">Secure payment upon project completion</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-white">Professional Network</div>
                    <div className="text-sm text-gray-400">Connect with general contractors and builders</div>
                  </div>
                </div>
              </div>

              <div className="bg-[#0A0A0A] border border-blue-500/30 rounded-xl p-4 mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <Wrench className="w-5 h-5 text-blue-400" />
                  <div className="font-bold text-white">Best For:</div>
                </div>
                <p className="text-sm text-gray-300">
                  Electricians, plumbers, HVAC specialists, roofers, framers, drywallers, painters, flooring installers, and other licensed trade professionals
                </p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => handleNavigate('subcontractor-application')}
                  className="w-full px-8 py-4 rounded-xl font-bold text-white bg-gradient-to-r from-blue-600 to-cyan-600 hover:shadow-lg hover:shadow-blue-500/50 transition-all flex items-center justify-center gap-2 group"
                >
                  Apply as a Subcontractor
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
                <button
                  onClick={() => handleNavigate('subcontractor-portal')}
                  className="w-full px-8 py-4 rounded-xl font-bold text-white bg-white/10 hover:bg-white/20 border border-white/20 transition-all flex items-center justify-center gap-2"
                >
                  <User className="w-5 h-5" />
                  View Subcontractor Portal
                </button>
              </div>
            </motion.div>

            {/* Service Providers Option */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-[#1A1A1A] border-2 border-[#2A2A2A] rounded-2xl p-8 hover:border-orange-500/50 transition-all"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-orange-600 to-amber-600 flex items-center justify-center">
                  <Briefcase className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-white">Service Providers</h2>
                  <p className="text-orange-400">Offer Professional Services</p>
                </div>
              </div>

              <p className="text-gray-300 mb-6 leading-relaxed">
                Perfect for professional service providers offering consulting, design, inspection, permitting, and other specialized expertise to support construction and renovation projects.
              </p>

              <div className="space-y-3 mb-8">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-white">Service Listings</div>
                    <div className="text-sm text-gray-400">Showcase your professional services and expertise</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-white">Direct Client Connections</div>
                    <div className="text-sm text-gray-400">Connect directly with clients needing your expertise</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-white">Project Collaboration</div>
                    <div className="text-sm text-gray-400">Work alongside contractors and builders</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-white">Flexible Scheduling</div>
                    <div className="text-sm text-gray-400">Set your availability and rates</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-white">Portfolio Showcase</div>
                    <div className="text-sm text-gray-400">Display your past projects and credentials</div>
                  </div>
                </div>
              </div>

              <div className="bg-[#0A0A0A] border border-orange-500/30 rounded-xl p-4 mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <Briefcase className="w-5 h-5 text-orange-400" />
                  <div className="font-bold text-white">Best For:</div>
                </div>
                <p className="text-sm text-gray-300">
                  Architects, engineers, interior designers, building inspectors, permit expeditors, project managers, estimators, and professional consultants
                </p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => handleNavigate('service-provider-application')}
                  className="w-full px-8 py-4 rounded-xl font-bold text-white bg-gradient-to-r from-orange-600 to-amber-600 hover:shadow-lg hover:shadow-orange-500/50 transition-all flex items-center justify-center gap-2 group"
                >
                  Apply as a Service Provider
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
                <button
                  onClick={() => handleNavigate('service-provider-portal')}
                  className="w-full px-8 py-4 rounded-xl font-bold text-white bg-white/10 hover:bg-white/20 border border-white/20 transition-all flex items-center justify-center gap-2"
                >
                  <User className="w-5 h-5" />
                  View Service Provider Portal
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4 bg-[#0A0A0A]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Why Join Our Network?</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Whether you're a vendor or subcontractor, you'll get access to these platform benefits
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center mx-auto mb-4">
                <Building2 className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Growing Customer Base</h3>
              <p className="text-gray-400">
                Access to homeowners, property managers, and construction companies actively looking for your services
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Streamlined Operations</h3>
              <p className="text-gray-400">
                Modern tools for managing orders, bids, invoices, and customer communication all in one place
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Professional Community</h3>
              <p className="text-gray-400">
                Join a vetted network of quality professionals committed to excellence and customer satisfaction
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 flex justify-center">
        <div className="w-full max-w-4xl">
          <div className="bg-gradient-to-r from-purple-600/20 via-indigo-600/20 to-blue-600/20 border-2 border-purple-500/30 rounded-2xl p-12 text-center">
            <h3 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Ready to Grow Your Business?
            </h3>
            <p className="text-xl text-gray-300 mb-8 mx-auto max-w-2xl">
              Choose your path and start connecting with customers today
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center flex-wrap">
              <button
                onClick={() => handleNavigate('vendor-application')}
                className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold hover:from-green-500 hover:to-emerald-500 transition-all shadow-lg shadow-green-500/30 hover:shadow-green-500/50"
              >
                Apply as Vendor
              </button>
              <button
                onClick={() => handleNavigate('subcontractor-application')}
                className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-bold hover:from-blue-500 hover:to-cyan-500 transition-all shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50"
              >
                Apply as Subcontractor
              </button>
              <button
                onClick={() => handleNavigate('service-provider-application')}
                className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-xl font-bold hover:from-orange-500 hover:to-amber-500 transition-all shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50"
              >
                Apply as Service Provider
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}