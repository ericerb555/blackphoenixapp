/**
 * Marketing Hub Overview
 * 
 * Central page showcasing all business solutions
 */

import { motion } from 'motion/react';
import { 
  Hammer, Building2, HardHat, ArrowRight, CheckCircle2,
  TrendingUp, Users, DollarSign, Target, Zap, Star,
  Globe, Megaphone, Calendar, Shield, Award, ArrowLeft
} from 'lucide-react';

export default function MarketingHub({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const handleNavigate = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    } else {
      window.location.href = `/${path}`;
    }
  };

  const solutions = [
    {
      id: 'trades-worker',
      icon: Hammer,
      title: 'Trades Worker Portal',
      subtitle: 'For Handymen & Contractors',
      description: 'Run your trade business like a pro with all-in-one management tools',
      color: 'orange',
      stats: [
        { value: '10K+', label: 'Active Users' },
        { value: '3x', label: 'Faster Booking' },
        { value: '40%', label: 'More Revenue' }
      ],
      features: [
        'Smart Scheduling & Calendar',
        'Professional Invoicing',
        'Client Management CRM',
        'Photo Documentation',
        'Business Analytics',
        'Custom Branding'
      ],
      cta: 'Explore Trades Portal',
      route: 'marketing-trades-worker',
      image: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&h=600&fit=crop'
    },
    {
      id: 'vendor',
      icon: Building2,
      title: 'Vendor Advertising Hub',
      subtitle: 'For Suppliers & Manufacturers',
      description: 'Reach 50,000+ active professionals with targeted advertising',
      color: 'purple',
      stats: [
        { value: '285%', label: 'Avg ROI' },
        { value: '50K+', label: 'Active Pros' },
        { value: '94%', label: 'Match Rate' }
      ],
      features: [
        'Product Catalog Management',
        'Banner & Text Advertising',
        'Materials Hub Integration',
        'Analytics Dashboard',
        'Targeted Marketing',
        'Featured Placements'
      ],
      cta: 'Explore Vendor Hub',
      route: 'marketing-vendor',
      image: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&h=600&fit=crop'
    },
    {
      id: 'subcontractor',
      icon: HardHat,
      title: 'Subcontractor Portal',
      subtitle: 'For Specialized Contractors',
      description: 'Win more projects and grow faster with our contractor network',
      color: 'blue',
      stats: [
        { value: '15K+', label: 'Subcontractors' },
        { value: '5x', label: 'More Projects' },
        { value: '$85K', label: 'Added Revenue' }
      ],
      features: [
        'Bid Management System',
        'Contractor Network',
        'Digital Contracts',
        'Payment Tracking',
        'Project Scheduling',
        'Verified Credentials'
      ],
      cta: 'Explore Subcontractor Hub',
      route: 'marketing-subcontractor',
      image: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800&h=600&fit=crop'
    }
  ];

  const comparisonData = [
    { feature: 'Client/Customer Management', trades: true, vendor: true, sub: true },
    { feature: 'Invoicing & Payments', trades: true, vendor: false, sub: true },
    { feature: 'Project Scheduling', trades: true, vendor: false, sub: true },
    { feature: 'Advertising Tools', trades: false, vendor: true, sub: false },
    { feature: 'Product Catalog', trades: false, vendor: true, sub: false },
    { feature: 'Bid Management', trades: false, vendor: false, sub: true },
    { feature: 'Analytics Dashboard', trades: true, vendor: true, sub: true },
    { feature: 'Mobile App Access', trades: true, vendor: true, sub: true },
    { feature: 'Custom Branding', trades: true, vendor: true, sub: true },
    { feature: 'Network Connections', trades: false, vendor: true, sub: true }
  ];

  const getColorClasses = (color: string) => {
    const colors = {
      orange: {
        bg: 'from-orange-500/10 to-red-500/10',
        border: 'border-orange-500/50',
        text: 'text-orange-500',
        button: 'from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500',
        shadow: 'shadow-orange-500/30'
      },
      purple: {
        bg: 'from-purple-500/10 to-pink-500/10',
        border: 'border-purple-500/50',
        text: 'text-purple-500',
        button: 'from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500',
        shadow: 'shadow-purple-500/30'
      },
      blue: {
        bg: 'from-blue-500/10 to-cyan-500/10',
        border: 'border-blue-500/50',
        text: 'text-blue-500',
        button: 'from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500',
        shadow: 'shadow-blue-500/30'
      }
    };
    return colors[color as keyof typeof colors];
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-b border-orange-500/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <Zap className="w-8 h-8 text-orange-500" />
              <span className="text-xl font-bold text-white">Elite Platform</span>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => window.location.href = '/unified-dashboard'}
                className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Unified Dashboard</span>
              </button>
              <button
                onClick={() => handleNavigate('landing')}
                className="text-gray-300 hover:text-white transition-colors"
              >
                Home
              </button>
              <button
                onClick={() => handleNavigate('login')}
                className="px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white transition-colors"
              >
                Sign In
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 text-sm mb-6">
              <Globe className="w-4 h-4" />
              <span>Complete Business Solutions</span>
            </div>
            
            <h1 className="text-5xl lg:text-7xl font-bold text-white mb-6">
              Everything Your Business
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 via-purple-500 to-blue-500">
                Needs to Succeed
              </span>
            </h1>
            
            <p className="text-xl text-gray-300 max-w-4xl mx-auto mb-12">
              Powerful platforms tailored for trades workers, vendors, and subcontractors. 
              Choose the solution that fits your business and start growing today.
            </p>
            
            <div className="flex flex-wrap gap-6 justify-center">
              <div className="text-center">
                <div className="text-4xl font-bold text-white mb-1">75,000+</div>
                <div className="text-gray-400">Active Users</div>
              </div>
              <div className="w-px bg-gray-700"></div>
              <div className="text-center">
                <div className="text-4xl font-bold text-white mb-1">$250M+</div>
                <div className="text-gray-400">Annual Volume</div>
              </div>
              <div className="w-px bg-gray-700"></div>
              <div className="text-center">
                <div className="text-4xl font-bold text-white mb-1">4.9/5</div>
                <div className="text-gray-400">User Rating</div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Solutions Grid */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-black to-gray-900">
        <div className="max-w-7xl mx-auto">
          <div className="space-y-20">
            {solutions.map((solution, index) => {
              const colors = getColorClasses(solution.color);
              const isEven = index % 2 === 0;
              
              return (
                <motion.div
                  key={solution.id}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6 }}
                  className={`grid lg:grid-cols-2 gap-12 items-center ${!isEven ? 'lg:flex-row-reverse' : ''}`}
                >
                  {/* Content */}
                  <div className={isEven ? '' : 'lg:order-2'}>
                    <div className={`inline-flex items-center gap-3 px-4 py-2 rounded-full bg-gradient-to-r ${colors.bg} border ${colors.border} mb-6`}>
                      <solution.icon className={`w-5 h-5 ${colors.text}`} />
                      <span className={`font-semibold ${colors.text}`}>{solution.subtitle}</span>
                    </div>
                    
                    <h2 className="text-4xl lg:text-5xl font-bold text-white mb-4">
                      {solution.title}
                    </h2>
                    
                    <p className="text-xl text-gray-300 mb-8">
                      {solution.description}
                    </p>
                    
                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-6 mb-8">
                      {solution.stats.map((stat, i) => (
                        <div key={i} className="text-center">
                          <div className={`text-3xl font-bold ${colors.text} mb-1`}>
                            {stat.value}
                          </div>
                          <div className="text-sm text-gray-400">{stat.label}</div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Features */}
                    <div className="grid grid-cols-2 gap-3 mb-8">
                      {solution.features.map((feature, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <CheckCircle2 className={`w-5 h-5 ${colors.text} flex-shrink-0`} />
                          <span className="text-gray-300 text-sm">{feature}</span>
                        </div>
                      ))}
                    </div>
                    
                    <button
                      onClick={() => handleNavigate(solution.route)}
                      className={`px-8 py-4 rounded-xl bg-gradient-to-r ${colors.button} text-white font-semibold transition-all duration-300 shadow-lg ${colors.shadow}`}
                    >
                      {solution.cta}
                      <ArrowRight className="inline-block ml-2 w-5 h-5" />
                    </button>
                  </div>
                  
                  {/* Image */}
                  <div className={isEven ? '' : 'lg:order-1'}>
                    <div className={`relative rounded-2xl overflow-hidden border ${colors.border} shadow-2xl ${colors.shadow}`}>
                      <img
                        src={solution.image}
                        alt={solution.title}
                        className="w-full h-auto"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold text-white mb-4">
              Compare <span className="text-orange-500">Solutions</span>
            </h2>
            <p className="text-xl text-gray-300">
              Find the perfect fit for your business needs
            </p>
          </div>
          
          <div className="bg-gray-900/50 border border-gray-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left p-6 text-gray-400 font-semibold">Feature</th>
                    <th className="p-6 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Hammer className="w-6 h-6 text-orange-500" />
                        <span className="text-white font-semibold">Trades</span>
                      </div>
                    </th>
                    <th className="p-6 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Building2 className="w-6 h-6 text-purple-500" />
                        <span className="text-white font-semibold">Vendor</span>
                      </div>
                    </th>
                    <th className="p-6 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <HardHat className="w-6 h-6 text-blue-500" />
                        <span className="text-white font-semibold">Subcontractor</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonData.map((row, index) => (
                    <tr key={index} className="border-b border-gray-800 last:border-b-0">
                      <td className="p-6 text-gray-300">{row.feature}</td>
                      <td className="p-6 text-center">
                        {row.trades ? (
                          <CheckCircle2 className="w-6 h-6 text-orange-500 mx-auto" />
                        ) : (
                          <div className="w-6 h-6 mx-auto rounded-full bg-gray-800"></div>
                        )}
                      </td>
                      <td className="p-6 text-center">
                        {row.vendor ? (
                          <CheckCircle2 className="w-6 h-6 text-purple-500 mx-auto" />
                        ) : (
                          <div className="w-6 h-6 mx-auto rounded-full bg-gray-800"></div>
                        )}
                      </td>
                      <td className="p-6 text-center">
                        {row.sub ? (
                          <CheckCircle2 className="w-6 h-6 text-blue-500 mx-auto" />
                        ) : (
                          <div className="w-6 h-6 mx-auto rounded-full bg-gray-800"></div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-orange-600 via-purple-600 to-blue-600">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">
              Ready to Transform Your Business?
            </h2>
            <p className="text-xl text-white/90 mb-8">
              Join thousands of professionals already growing with our platform
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <button
                onClick={() => handleNavigate('login')}
                className="px-8 py-4 rounded-xl bg-white text-gray-900 font-semibold hover:bg-gray-100 transition-all duration-300 shadow-xl"
              >
                Get Started Free
                <ArrowRight className="inline-block ml-2 w-5 h-5" />
              </button>
              <button
                onClick={() => handleNavigate('landing')}
                className="px-8 py-4 rounded-xl bg-white/10 border-2 border-white text-white font-semibold hover:bg-white/20 transition-all duration-300"
              >
                Back to Home
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 bg-black border-t border-gray-800">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Zap className="w-6 h-6 text-orange-500" />
            <span className="text-lg font-bold text-white">Elite Platform</span>
          </div>
          <p className="text-gray-400">
            © 2026 Elite Platform. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}