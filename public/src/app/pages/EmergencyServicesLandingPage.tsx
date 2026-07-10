/**
 * 24/7 Emergency Services Landing Page
 * On-Call Support & Rapid Response
 */

import { motion } from 'motion/react';
import {
  PhoneCall, ArrowRight, CheckCircle, Clock, Zap, Shield,
  AlertCircle, Wrench, Home as HomeIcon, Building, Droplets, Flame,
  Wind, Star, Phone, Mail, MapPin, User
} from 'lucide-react';

interface EmergencyServicesLandingPageProps {
  onNavigate?: (page: string) => void;
}

export default function EmergencyServicesLandingPage({ onNavigate }: EmergencyServicesLandingPageProps) {
  console.log('🚨 [EmergencyServicesLandingPage] Component mounting/rendering');
  console.log('🚨 [EmergencyServicesLandingPage] onNavigate prop:', typeof onNavigate, onNavigate ? '✓ present' : '✗ missing');

  const handleNavigate = (page: string) => {
    console.log('🔄 [EmergencyServicesLandingPage] handleNavigate called with page:', page);
    if (onNavigate) {
      console.log('✓ [EmergencyServicesLandingPage] Calling onNavigate prop');
      onNavigate(page);
    } else {
      console.error('✗ [EmergencyServicesLandingPage] onNavigate prop is missing!');
      // Fallback to window.location if onNavigate is not provided
      window.location.href = `/${page}`;
    }
  };

  const handleRequestService = () => {
    console.log('💰 [EmergencyServicesLandingPage] Request Service button clicked');
    localStorage.setItem('quote_request_cohort', 'emergency');
    console.log('💾 [EmergencyServicesLandingPage] Saved cohort to localStorage:', localStorage.getItem('quote_request_cohort'));
    handleNavigate('request-service');
  };

  const emergencyTypes = [
    {
      icon: Droplets,
      title: 'Water Damage',
      description: 'Burst pipes, flooding, water heater failures, and leak emergencies',
      color: 'from-blue-600 to-cyan-600',
      response: '15-30 min'
    },
    {
      icon: Flame,
      title: 'Fire & Smoke Damage',
      description: 'Post-fire cleanup, smoke damage, structural assessment and emergency boarding',
      color: 'from-orange-600 to-red-600',
      response: '20-40 min'
    },
    {
      icon: Wind,
      title: 'Storm Damage',
      description: 'Roof damage, broken windows, fallen trees, and weather-related emergencies',
      color: 'from-purple-600 to-indigo-600',
      response: '30-60 min'
    },
    {
      icon: Zap,
      title: 'Electrical Emergencies',
      description: 'Power outages, exposed wiring, electrical fires, and safety hazards',
      color: 'from-yellow-600 to-orange-600',
      response: '20-45 min'
    },
    {
      icon: Building,
      title: 'Structural Issues',
      description: 'Foundation problems, ceiling collapse, wall damage, and structural failures',
      color: 'from-gray-600 to-slate-600',
      response: '30-60 min'
    },
    {
      icon: Wrench,
      title: 'HVAC Failures',
      description: 'Heating failures in winter, AC breakdowns in summer, gas leaks',
      color: 'from-teal-600 to-green-600',
      response: '30-90 min'
    }
  ];

  const features = [
    {
      icon: Clock,
      title: '24/7 Availability',
      description: 'Round-the-clock emergency response team standing by every day of the year'
    },
    {
      icon: Zap,
      title: 'Rapid Response',
      description: 'Average on-site arrival time of 30-45 minutes for emergency calls'
    },
    {
      icon: Shield,
      title: 'Licensed & Insured',
      description: 'Fully licensed emergency technicians with comprehensive liability coverage'
    },
    {
      icon: Phone,
      title: 'Direct Dispatch',
      description: 'No phone trees - speak directly with emergency dispatch coordinators'
    }
  ];

  const stats = [
    { label: 'Average Response', value: '32 min', subtext: 'On-Site Arrival' },
    { label: 'Availability', value: '24/7/365', subtext: 'Always Ready' },
    { label: 'Customer Rating', value: '4.9/5', subtext: 'Emergency Services' },
    { label: 'Emergencies Handled', value: '2,400+', subtext: 'This Year' }
  ];

  const testimonials = [
    {
      name: 'Jennifer Martinez',
      location: 'Seattle, WA',
      quote: 'Pipe burst at 2 AM flooding our basement. They arrived in 20 minutes and had it under control within an hour. Absolutely incredible service.',
      avatar: 'JM',
      rating: 5
    },
    {
      name: 'David Chen',
      location: 'Portland, OR',
      quote: 'Storm damage to our roof during a holiday weekend. They were on-site within 40 minutes and had emergency tarps up before the next rain.',
      avatar: 'DC',
      rating: 5
    },
    {
      name: 'Lisa Thompson',
      location: 'Boise, ID',
      quote: 'Furnace died in the middle of a cold snap with my elderly parents in the house. They treated it like the emergency it was and had heat back on in 2 hours.',
      avatar: 'LT',
      rating: 5
    }
  ];

  const coverage = [
    { area: 'Residential Properties', icon: HomeIcon },
    { area: 'Commercial Buildings', icon: Building },
    { area: 'Multi-Unit Housing', icon: Building },
    { area: 'Industrial Facilities', icon: Building }
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=800&q=80"
            alt="Emergency Services"
            className="w-full h-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0A] via-[#0A0A0A]/95 to-[#0A0A0A]" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-red-600 to-orange-600 mb-6 animate-pulse">
                <PhoneCall className="w-10 h-10 text-white" />
              </div>

              <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
                24/7 Emergency Services
              </h1>
              <p className="text-xl text-gray-300 mb-6">
                Rapid Response When You Need It Most
              </p>
              <p className="text-gray-400 leading-relaxed mb-8">
                When disaster strikes, every minute counts. Our emergency response team is standing by 24 hours a day, 7 days a week, ready to respond to your urgent property emergencies with rapid dispatch and expert service.
              </p>

              <div className="grid grid-cols-2 gap-4 mb-8">
                {features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                    <span className="text-sm text-gray-300">{feature.title}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={handleRequestService}
                  className="flex-1 px-8 py-4 rounded-xl font-bold text-white bg-gradient-to-r from-red-600 to-orange-600 hover:shadow-lg hover:shadow-red-500/50 transition-all flex items-center justify-center gap-2 group"
                >
                  Request Emergency Service
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
                <button
                  onClick={() => handleNavigate('on-call-portal')}
                  className="flex-1 px-8 py-4 rounded-xl font-bold text-white bg-white/10 hover:bg-white/20 border border-white/20 transition-all flex items-center justify-center gap-2"
                >
                  <User className="w-5 h-5" />
                  View Portal
                </button>
              </div>

              {/* Emergency Hotline */}
              <div className="mt-8 p-6 bg-red-600/10 border border-red-500/30 rounded-xl">
                <div className="flex items-center gap-3 mb-2">
                  <Phone className="w-6 h-6 text-red-400" />
                  <h3 className="text-xl font-bold text-white">Emergency Hotline</h3>
                </div>
                <p className="text-3xl font-bold text-red-400 mb-1">(555) EMERGENCY</p>
                <p className="text-sm text-gray-400">Available 24/7/365 - No Voicemail, Direct Dispatch</p>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              {stats.map((stat, index) => (
                <div key={index} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6 hover:border-red-500/50 transition-all">
                  <div className="text-3xl font-bold text-red-400 mb-2">{stat.value}</div>
                  <div className="text-white font-semibold mb-1">{stat.label}</div>
                  <div className="text-sm text-gray-400">{stat.subtext}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Emergency Types */}
      <section className="py-20 px-4 bg-[#0A0A0A]">
        <div className="max-w-7xl mx-auto">
          <div className="mb-16 flex justify-center">
            <div className="w-full max-w-3xl text-center">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Emergency Services We Handle</h2>
              <p className="text-xl text-gray-400">
                Expert response for all types of property emergencies
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {emergencyTypes.map((emergency, index) => {
              const Icon = emergency.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-8 hover:border-red-500/50 transition-all"
                >
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${emergency.color} flex items-center justify-center mb-6`}>
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">{emergency.title}</h3>
                  <p className="text-gray-400 leading-relaxed mb-4">{emergency.description}</p>
                  <div className="flex items-center gap-2 text-red-400">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm font-semibold">{emergency.response} response</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="mb-12 flex justify-center">
            <div className="w-full max-w-3xl text-center">
              <h2 className="text-4xl font-bold text-white mb-4">How Emergency Response Works</h2>
              <p className="text-gray-400 text-lg">Fast, efficient process from call to resolution</p>
            </div>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-red-600/20 border-2 border-red-500 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-red-400">1</span>
              </div>
              <h4 className="font-bold text-white mb-2">Call Hotline</h4>
              <p className="text-sm text-gray-400">Speak directly with emergency dispatch - no phone trees</p>
            </div>

            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-red-600/20 border-2 border-red-500 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-red-400">2</span>
              </div>
              <h4 className="font-bold text-white mb-2">Rapid Dispatch</h4>
              <p className="text-sm text-gray-400">Nearest available crew deployed immediately</p>
            </div>

            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-red-600/20 border-2 border-red-500 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-red-400">3</span>
              </div>
              <h4 className="font-bold text-white mb-2">On-Site</h4>
              <p className="text-sm text-gray-400">Assessment and immediate action to mitigate damage</p>
            </div>

            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-red-600/20 border-2 border-red-500 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-red-400">4</span>
              </div>
              <h4 className="font-bold text-white mb-2">Resolution</h4>
              <p className="text-sm text-gray-400">Emergency stabilized, full repair plan provided</p>
            </div>
          </div>
        </div>
      </section>

      {/* Coverage Areas */}
      <section className="py-20 px-4 bg-[#0A0A0A]">
        <div className="max-w-5xl mx-auto">
          <div className="mb-12 flex justify-center">
            <div className="w-full max-w-3xl text-center">
              <h2 className="text-4xl font-bold text-white mb-4">Emergency Coverage</h2>
              <p className="text-gray-400 text-lg">We respond to all property types</p>
            </div>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            {coverage.map((item, index) => {
              const Icon = item.icon;
              return (
                <div key={index} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 hover:border-red-500/50 transition-all text-center">
                  <Icon className="w-10 h-10 text-red-400 mx-auto mb-4" />
                  <h4 className="font-bold text-white">{item.area}</h4>
                </div>
              );
            })}
          </div>

          <div className="mt-12 p-6 bg-red-600/10 border border-red-500/30 rounded-xl">
            <div className="flex items-start gap-4">
              <MapPin className="w-6 h-6 text-red-400 flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-bold text-white mb-2">Service Area</h4>
                <p className="text-sm text-gray-300">
                  Currently serving Seattle metro, Portland metro, and Boise regions. Extended service areas available for severe emergencies. Call to confirm availability in your area.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="mb-16 flex justify-center">
            <div className="w-full max-w-3xl text-center">
              <h2 className="text-4xl font-bold text-white mb-4">Emergency Response Stories</h2>
              <p className="text-xl text-gray-400">Real experiences from customers we've helped</p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6 hover:border-red-500/50 transition-all"
              >
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-red-400 text-red-400" />
                  ))}
                </div>

                <p className="text-gray-300 mb-6">"{testimonial.quote}"</p>

                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-600 to-orange-600 flex items-center justify-center">
                    <span className="text-white font-bold">{testimonial.avatar}</span>
                  </div>
                  <div>
                    <div className="text-white font-semibold">{testimonial.name}</div>
                    <div className="text-gray-400 text-sm">{testimonial.location}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 flex justify-center">
        <div className="w-full max-w-4xl">
          <div className="bg-gradient-to-r from-red-600/20 via-orange-600/20 to-red-600/20 border-2 border-red-500/30 rounded-2xl p-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-600/20 border-2 border-red-500 mb-6 animate-pulse">
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>

            <h3 className="text-3xl md:text-4xl font-bold text-white mb-4">Have an Emergency?</h3>
            <p className="text-xl text-gray-300 mb-8">We're standing by to help - available 24/7/365</p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <button
                onClick={handleRequestService}
                className="px-12 py-5 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-xl font-bold text-xl hover:from-red-500 hover:to-orange-500 transition-all shadow-2xl shadow-red-500/30 hover:shadow-red-500/50 flex items-center justify-center gap-3 group"
              >
                Request Emergency Service
                <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            <div className="space-y-3 text-sm text-gray-400">
              <div className="flex items-center justify-center gap-2">
                <Phone className="w-4 h-4 text-red-400" />
                <span className="font-bold text-red-400 text-lg">(555) EMERGENCY</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <Mail className="w-4 h-4" />
                <span>emergency@blackphoenix.com</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}