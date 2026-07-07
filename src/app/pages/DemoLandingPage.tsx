/**
 * Smash & Trash Landing Page
 * Demo & Removal Services
 */

import { motion } from 'motion/react';
import { Trash2, ArrowRight, CheckCircle, AlertCircle, User } from 'lucide-react';
import ServicesGrid from '../components/sections/ServicesGrid';
import TestimonialsSection from '../components/sections/TestimonialsSection';
import { DEMOLITION_SERVICES } from '../data/servicesData';
import { getTestimonialsByCategory } from '../data/testimonialsData';
import { getSectionByCohortType } from '../config/directoryLandingSections';

interface DemoLandingPageProps {
  onNavigate?: (page: string) => void;
}

export default function DemoLandingPage({ onNavigate }: DemoLandingPageProps) {
  console.log('🗑️ [DemoLandingPage] Component mounting/rendering');
  console.log('🗑️ [DemoLandingPage] onNavigate prop:', typeof onNavigate, onNavigate ? '✓ present' : '✗ missing');
  const section = getSectionByCohortType('demolition');
  const testimonials = getTestimonialsByCategory('demolition');

  const handleNavigate = (page: string) => {
    console.log('🔄 [DemoLandingPage] handleNavigate called with page:', page);
    if (onNavigate) {
      console.log('✓ [DemoLandingPage] Calling onNavigate prop');
      onNavigate(page);
    } else {
      console.error('✗ [DemoLandingPage] onNavigate prop is missing!');
      // Fallback to window.location if onNavigate is not provided
      window.location.href = `/${page}`;
    }
  };

  const handleGetQuote = () => {
    console.log('💰 [DemoLandingPage] Get Quote button clicked');
    localStorage.setItem('quote_request_cohort', 'demolition');
    console.log('💾 [DemoLandingPage] Saved cohort to localStorage:', localStorage.getItem('quote_request_cohort'));
    handleNavigate('request-service');
  };

  if (!section) return null;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img src={section.image} alt={section.title} className="w-full h-full object-cover opacity-20" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0A] via-[#0A0A0A]/95 to-[#0A0A0A]" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className={`inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br ${section.gradient} mb-6`}>
                <section.icon className="w-10 h-10 text-white" />
              </div>

              <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-red-400 to-pink-400 bg-clip-text text-transparent">
                {section.title}
              </h1>
              <p className="text-xl text-gray-300 mb-6">{section.subtitle}</p>
              <p className="text-gray-400 leading-relaxed mb-8">{section.description}</p>

              <div className="grid grid-cols-2 gap-4 mb-8">
                {section.benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                    <span className="text-sm text-gray-300">{benefit}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={handleGetQuote}
                  className={`flex-1 px-8 py-4 rounded-xl font-bold text-white bg-gradient-to-r ${section.gradient} hover:shadow-lg hover:shadow-red-500/50 transition-all flex items-center justify-center gap-2 group`}
                >
                  Get a Free Quote
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
                <button
                  onClick={() => handleNavigate('customer-portal')}
                  className="flex-1 px-8 py-4 rounded-xl font-bold text-white bg-white/10 hover:bg-white/20 border border-white/20 transition-all flex items-center justify-center gap-2"
                >
                  <User className="w-5 h-5" />
                  View Portal
                </button>
              </div>
            </div>

            {/* Safety Notice */}
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-8">
              <div className="flex items-center gap-2 mb-6">
                <AlertCircle className="w-6 h-6 text-red-400" />
                <h3 className="text-2xl font-bold text-white">Safety First</h3>
              </div>
              <p className="text-gray-400 text-sm mb-6">
                We follow all safety protocols and environmental regulations
              </p>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-white mb-1">Licensed & Insured</div>
                    <div className="text-sm text-gray-400">Fully licensed demolition contractors with comprehensive insurance</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-white mb-1">Eco-Friendly Disposal</div>
                    <div className="text-sm text-gray-400">We recycle and properly dispose of all materials</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-white mb-1">OSHA Compliant</div>
                    <div className="text-sm text-gray-400">All work follows OSHA safety standards</div>
                  </div>
                </div>
              </div>

              <button
                onClick={handleGetQuote}
                className="w-full mt-6 px-6 py-3 bg-red-600/20 hover:bg-red-600/30 border border-red-500/50 text-red-400 font-semibold rounded-xl transition-all"
              >
                Request a Quote
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Subscription Plans Section */}
      <section className="py-20 px-4 flex justify-center bg-gradient-to-b from-[#0A0A0A] to-[#1A1A1A]">
        <div className="w-full max-w-7xl">
          <div className="text-center mb-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600/20 border border-red-500/50 rounded-full mb-6"
            >
              <Trash2 className="w-4 h-4 text-red-400" />
              <span className="text-sm font-semibold text-red-400">Save 15% with Subscription</span>
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-4xl md:text-5xl font-bold text-white mb-4"
            >
              Trash Removal Subscriptions
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-xl text-gray-400"
            >
              Subscribe and save 15% on all demolition and trash removal quotes
            </motion.p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {section.subscriptionPlans?.map((plan, index) => (
              <motion.div
                key={plan.cohortId}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-[#1A1A1A] border-2 border-[#2A2A2A] hover:border-red-500/50 rounded-2xl p-8 transition-all hover:scale-105 relative overflow-hidden group"
              >
                {/* Discount Badge */}
                <div className="absolute top-4 right-4 px-3 py-1 bg-gradient-to-r from-red-600 to-pink-600 text-white text-sm font-bold rounded-full">
                  Save 15%
                </div>

                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-4xl font-bold text-white">{plan.price}</span>
                    <span className="text-gray-400">/month</span>
                  </div>
                  <p className="text-red-400 font-semibold">{plan.hours}</p>
                </div>

                <div className="space-y-3 mb-8">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                    <span className="text-sm text-gray-300">15% off all quotes</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                    <span className="text-sm text-gray-300">Priority scheduling</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                    <span className="text-sm text-gray-300">Same-day service</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                    <span className="text-sm text-gray-300">Free estimates</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                    <span className="text-sm text-gray-300">Eco-friendly disposal</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    localStorage.setItem('selected_cohort', plan.cohortId);
                    handleNavigate('signup');
                  }}
                  className="w-full py-3 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 group-hover:shadow-lg group-hover:shadow-red-500/50"
                >
                  Subscribe Now
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </motion.div>
            ))}
          </div>

          {/* Benefits Banner */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mt-12 bg-gradient-to-r from-red-600/10 to-pink-600/10 border border-red-500/30 rounded-xl p-6 text-center"
          >
            <p className="text-gray-300 text-lg">
              <span className="font-bold text-red-400">Subscriber Bonus:</span> All quotes automatically receive a 15% discount applied at checkout
            </p>
          </motion.div>
        </div>
      </section>

      <ServicesGrid services={DEMOLITION_SERVICES} title="Our Demolition Services" subtitle="Safe, efficient, and environmentally responsible" />
      <TestimonialsSection testimonials={testimonials} title="What Our Clients Say" subtitle="Trusted by homeowners and contractors alike" />

      <section className="py-20 px-4 flex justify-center">
        <div className="w-full max-w-4xl">
          <div className="bg-gradient-to-r from-red-600/20 via-pink-600/20 to-orange-600/20 border-2 border-red-500/30 rounded-2xl p-12 text-center">
            <h3 className="text-3xl md:text-4xl font-bold text-white mb-4">Need Demolition or Removal?</h3>
            <p className="text-xl text-gray-300 mb-8">Get a free estimate for your project today</p>
            <div className="flex justify-center">
              <button
                onClick={handleGetQuote}
                className="px-12 py-5 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl font-bold text-xl hover:from-red-500 hover:to-red-600 transition-all shadow-2xl shadow-red-500/30 hover:shadow-red-500/50 flex items-center gap-3 group"
              >
                Get Your Free Quote
                <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}