import { ArrowLeft, CheckCircle, Calendar, DollarSign, Briefcase, Users, Star, TrendingUp, MessageSquare, FileText, Clock, Shield } from 'lucide-react';

interface TradesWorkerMarketingProps {
  onNavigate?: (page: string) => void;
}

export default function TradesWorkerMarketing({ onNavigate }: TradesWorkerMarketingProps) {
  const handleNavigate = (page: string) => {
    if (onNavigate) {
      onNavigate(page);
    } else {
      window.location.href = `/${page}`;
    }
  };

  const features = [
    {
      icon: Calendar,
      title: 'Job Scheduling',
      description: 'Manage your work calendar, accept jobs, and track appointments all in one place.',
      gradient: 'from-orange-600 to-red-600'
    },
    {
      icon: DollarSign,
      title: 'Invoice & Payments',
      description: 'Create professional invoices, track payments, and get paid faster with integrated payment processing.',
      gradient: 'from-green-600 to-emerald-600'
    },
    {
      icon: Briefcase,
      title: 'Job History',
      description: 'Keep detailed records of all your jobs, materials used, and customer notes for future reference.',
      gradient: 'from-blue-600 to-cyan-600'
    },
    {
      icon: Users,
      title: 'Customer Management',
      description: 'Build and maintain customer relationships with integrated CRM tools and communication.',
      gradient: 'from-purple-600 to-pink-600'
    },
    {
      icon: FileText,
      title: 'Document Storage',
      description: 'Store licenses, insurance certificates, permits, and other important documents securely.',
      gradient: 'from-yellow-600 to-orange-600'
    },
    {
      icon: TrendingUp,
      title: 'Business Analytics',
      description: 'Track revenue, expenses, and business growth with detailed reports and insights.',
      gradient: 'from-indigo-600 to-purple-600'
    }
  ];

  const benefits = [
    'Get connected with local homeowners and businesses',
    'Build your professional reputation with reviews',
    'Access exclusive training and certification programs',
    'Receive job leads in your area',
    'Professional business tools at affordable prices',
    'Marketing support to grow your business'
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-600 via-red-600 to-orange-600 border-b border-orange-500/30">
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
              Power Your Trades Business
            </h1>
            <p className="text-xl md:text-2xl text-white/90 mb-8">
              Everything you need to manage jobs, get paid, and grow your business - all in one powerful platform designed specifically for trades professionals.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => handleNavigate('signup')}
                className="px-8 py-4 bg-white text-orange-600 rounded-xl font-bold text-lg hover:bg-gray-100 transition-all shadow-xl"
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
            Tools Built for Trades Professionals
          </h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            From plumbers to electricians, HVAC to general contractors - we've got you covered
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-8 hover:border-orange-500/50 transition-all group"
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
        <div className="bg-gradient-to-r from-orange-500/10 via-red-500/10 to-orange-500/10 rounded-2xl border border-orange-500/20 p-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                Why Trades Professionals Choose Us
              </h2>
              <p className="text-lg text-gray-300 mb-8">
                Join thousands of successful trades professionals who have transformed their businesses with our platform.
              </p>
              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <CheckCircle className="w-6 h-6 text-orange-400 flex-shrink-0 mt-0.5" />
                    <p className="text-gray-300">{benefit}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-8">
              <div className="text-center mb-6">
                <div className="inline-block p-4 bg-gradient-to-r from-orange-600 to-red-600 rounded-2xl mb-4">
                  <Star className="w-12 h-12 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Special Launch Offer</h3>
                <p className="text-gray-400">Limited time pricing for early adopters</p>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex items-center justify-between p-4 bg-[#0A0A0A] rounded-lg">
                  <span className="text-gray-400">Monthly Plan</span>
                  <div className="text-right">
                    <span className="text-gray-500 line-through mr-2">$49</span>
                    <span className="text-2xl font-bold text-white">$29</span>
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-orange-500/20 to-red-500/20 rounded-lg border border-orange-500/30">
                  <div>
                    <span className="text-white font-semibold block">Annual Plan</span>
                    <span className="text-sm text-orange-300">Save 40%</span>
                  </div>
                  <div className="text-right">
                    <span className="text-gray-500 line-through mr-2">$490</span>
                    <span className="text-2xl font-bold text-white">$290</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleNavigate('signup')}
                className="w-full py-4 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-xl font-bold text-lg hover:from-orange-700 hover:to-red-700 transition-all shadow-lg shadow-orange-500/20"
              >
                Start Your Free Trial
              </button>
              <p className="text-center text-sm text-gray-500 mt-4">No credit card required • Cancel anytime</p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center mt-20">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Transform Your Business?
          </h2>
          <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
            Join today and get access to all features with our 14-day free trial
          </p>
          <button
            onClick={() => handleNavigate('signup')}
            className="px-12 py-5 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-xl font-bold text-xl hover:from-orange-700 hover:to-red-700 transition-all shadow-2xl shadow-orange-500/20"
          >
            Get Started Now
          </button>
        </div>
      </div>
    </div>
  );
}
