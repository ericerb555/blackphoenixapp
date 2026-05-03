import { ArrowLeft, CheckCircle, Briefcase, FileText, Users, Calendar, DollarSign, Shield, Award, TrendingUp, Clock, MessageSquare, Star } from 'lucide-react';

interface SubcontractorMarketingProps {
  onNavigate?: (page: string) => void;
}

export default function SubcontractorMarketing({ onNavigate }: SubcontractorMarketingProps) {
  const handleNavigate = (page: string) => {
    if (onNavigate) {
      onNavigate(page);
    } else {
      window.location.href = `/${page}`;
    }
  };

  const features = [
    {
      icon: Briefcase,
      title: 'Project Bidding',
      description: 'Access exclusive subcontracting opportunities and submit competitive bids directly to general contractors.',
      gradient: 'from-blue-600 to-cyan-600'
    },
    {
      icon: FileText,
      title: 'Contract Management',
      description: 'Create, sign, and manage contracts digitally with integrated e-signature and document storage.',
      gradient: 'from-green-600 to-emerald-600'
    },
    {
      icon: Calendar,
      title: 'Schedule Coordination',
      description: 'Sync with GC schedules, manage your crew availability, and prevent scheduling conflicts.',
      gradient: 'from-orange-600 to-red-600'
    },
    {
      icon: DollarSign,
      title: 'Payment Tracking',
      description: 'Track invoices, progress payments, and retainage with automated payment reminders.',
      gradient: 'from-purple-600 to-pink-600'
    },
    {
      icon: Shield,
      title: 'License & Insurance',
      description: 'Store and share certifications, licenses, and insurance docs with contractors who need them.',
      gradient: 'from-indigo-600 to-purple-600'
    },
    {
      icon: Award,
      title: 'Reputation Building',
      description: 'Collect reviews, showcase past projects, and build credibility with verified work history.',
      gradient: 'from-yellow-600 to-orange-600'
    }
  ];

  const benefits = [
    'Get matched with general contractors looking for your specialty',
    'Reduce administrative work with automated workflows',
    'Access project opportunities before they go to bid',
    'Build long-term relationships with reliable GCs',
    'Get paid faster with integrated payment processing',
    'Professional tools at contractor-friendly pricing'
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-600 border-b border-blue-500/30">
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
              Elevate Your Subcontracting Business
            </h1>
            <p className="text-xl md:text-2xl text-white/90 mb-8">
              Win more bids, manage projects efficiently, and get paid on time. The all-in-one platform built specifically for subcontractors.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => handleNavigate('signup')}
                className="px-8 py-4 bg-white text-blue-600 rounded-xl font-bold text-lg hover:bg-gray-100 transition-all shadow-xl"
              >
                Get Started Free
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
            Built for Specialty Contractors
          </h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            From electrical to plumbing, HVAC to framing - streamline your subcontracting work
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-8 hover:border-blue-500/50 transition-all group"
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
        <div className="bg-gradient-to-r from-blue-500/10 via-cyan-500/10 to-blue-500/10 rounded-2xl border border-blue-500/20 p-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                Why Subcontractors Trust Our Platform
              </h2>
              <p className="text-lg text-gray-300 mb-8">
                Join thousands of successful subcontractors who have streamlined their operations and increased their bottom line.
              </p>
              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <CheckCircle className="w-6 h-6 text-blue-400 flex-shrink-0 mt-0.5" />
                    <p className="text-gray-300">{benefit}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-8">
              <div className="text-center mb-6">
                <div className="inline-block p-4 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl mb-4">
                  <Star className="w-12 h-12 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Special Contractor Pricing</h3>
                <p className="text-gray-400">Built for teams of all sizes</p>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex items-center justify-between p-4 bg-[#0A0A0A] rounded-lg">
                  <div>
                    <span className="text-white font-semibold block">Solo Contractor</span>
                    <span className="text-sm text-gray-400">1-5 employees</span>
                  </div>
                  <div className="text-right">
                    <span className="text-gray-500 line-through mr-2">$59</span>
                    <span className="text-2xl font-bold text-white">$39</span>
                    <span className="text-gray-400 block text-sm">/month</span>
                  </div>
                </div>
                <div className="p-4 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-lg border border-blue-500/30">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="text-white font-semibold block">Growing Team</span>
                      <span className="text-sm text-blue-300">Most Popular • 6-20 employees</span>
                    </div>
                    <div className="text-right">
                      <span className="text-gray-500 line-through mr-2">$149</span>
                      <span className="text-2xl font-bold text-white">$99</span>
                      <span className="text-gray-400 block text-sm">/month</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 bg-[#0A0A0A] rounded-lg">
                  <div>
                    <span className="text-white font-semibold block">Enterprise</span>
                    <span className="text-sm text-gray-400">20+ employees</span>
                  </div>
                  <span className="text-white font-semibold">Custom</span>
                </div>
              </div>

              <button
                onClick={() => handleNavigate('signup')}
                className="w-full py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-bold text-lg hover:from-blue-700 hover:to-cyan-700 transition-all shadow-lg shadow-blue-500/20"
              >
                Start Your Free Trial
              </button>
              <p className="text-center text-sm text-gray-500 mt-4">14 days free • No credit card required</p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center mt-20">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Join the Subcontractor Network
          </h2>
          <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
            Start winning more bids and managing projects more efficiently today
          </p>
          <button
            onClick={() => handleNavigate('signup')}
            className="px-12 py-5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-bold text-xl hover:from-blue-700 hover:to-cyan-700 transition-all shadow-2xl shadow-blue-500/20"
          >
            Get Started Now
          </button>
        </div>
      </div>
    </div>
  );
}
