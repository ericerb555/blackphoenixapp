/**
 * Black Phoenix Builds Landing Page
 * Construction & Renovation Services
 */

import { motion } from 'motion/react';
import { Building2, ArrowRight, CheckCircle, Sparkles, User } from 'lucide-react';
import ServicesGrid from '../components/sections/ServicesGrid';
import FeaturedProjectsSection from '../components/sections/FeaturedProjectsSection';
import TestimonialsSection from '../components/sections/TestimonialsSection';
import { CONSTRUCTION_SERVICES } from '../data/servicesData';
import { getProjectsByCategory } from '../data/projectsData';
import { getTestimonialsByCategory } from '../data/testimonialsData';
import { getSectionByCohortType } from '../config/directoryLandingSections';

interface BuildsLandingPageProps {
  onNavigate?: (page: string) => void;
}

export default function BuildsLandingPage({ onNavigate }: BuildsLandingPageProps) {
  console.log('🏗️ [BuildsLandingPage] Component mounting/rendering');
  console.log('🏗️ [BuildsLandingPage] onNavigate prop:', typeof onNavigate, onNavigate ? '✓ present' : '✗ missing');
  const section = getSectionByCohortType('construction');
  const projects = getProjectsByCategory('construction');
  const testimonials = getTestimonialsByCategory('construction');
  console.log('🏗️ [BuildsLandingPage] Section:', section, 'Projects:', projects.length, 'Testimonials:', testimonials.length);

  const handleNavigate = (page: string) => {
    console.log('🔄 [BuildsLandingPage] handleNavigate called with page:', page);
    if (onNavigate) {
      console.log('✓ [BuildsLandingPage] Calling onNavigate prop');
      onNavigate(page);
    } else {
      console.error('✗ [BuildsLandingPage] onNavigate prop is missing!');
      // Fallback to window.location if onNavigate is not provided
      window.location.href = `/${page}`;
    }
  };

  const handleGetQuote = () => {
    console.log('💰 [BuildsLandingPage] Get Quote button clicked');
    localStorage.setItem('quote_request_cohort', 'construction');
    console.log('💾 [BuildsLandingPage] Saved cohort to localStorage:', localStorage.getItem('quote_request_cohort'));
    handleNavigate('request-service');
  };

  if (!section) return null;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <img
            src={section.image}
            alt={section.title}
            className="w-full h-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0A] via-[#0A0A0A]/95 to-[#0A0A0A]" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div>
              <div className={`inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br ${section.gradient} mb-6`}>
                <section.icon className="w-10 h-10 text-white" />
              </div>

              <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
                {section.title}
              </h1>
              <p className="text-xl text-gray-300 mb-6">
                {section.subtitle}
              </p>
              <p className="text-gray-400 leading-relaxed mb-8">
                {section.description}
              </p>

              {/* Benefits */}
              <div className="grid grid-cols-2 gap-4 mb-8">
                {section.benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-orange-400 flex-shrink-0" />
                    <span className="text-sm text-gray-300">{benefit}</span>
                  </div>
                ))}
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={handleGetQuote}
                  className={`flex-1 px-8 py-4 rounded-xl font-bold text-white bg-gradient-to-r ${section.gradient} hover:shadow-lg hover:shadow-orange-500/50 transition-all flex items-center justify-center gap-2 group`}
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

            {/* Right Content - Subscription Plans */}
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-8">
              <div className="flex items-center gap-2 mb-6">
                <Sparkles className="w-6 h-6 text-orange-400" />
                <h3 className="text-2xl font-bold text-white">Subscription Plans</h3>
              </div>
              <p className="text-gray-400 text-sm mb-6">
                Get priority scheduling and discounted rates with our monthly subscription plans
              </p>

              {section.subscriptionPlans && (
                <div className="space-y-4">
                  {section.subscriptionPlans.map((plan, index) => (
                    <div
                      key={index}
                      className="p-4 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl hover:border-orange-500/50 transition-all"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-bold text-white">{plan.name}</div>
                        <div className="text-orange-400 font-bold text-xl">{plan.price}<span className="text-sm text-gray-400">/mo</span></div>
                      </div>
                      <div className="text-sm text-gray-400">{plan.hours} of build time included</div>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={handleGetQuote}
                className="w-full mt-6 px-6 py-3 bg-orange-600/20 hover:bg-orange-600/30 border border-orange-500/50 text-orange-400 font-semibold rounded-xl transition-all"
              >
                View All Plans
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <ServicesGrid
        services={CONSTRUCTION_SERVICES}
        title="Our Construction Services"
        subtitle="From kitchen remodels to ground-up builds, we handle it all"
      />

      {/* Featured Projects */}
      <FeaturedProjectsSection
        projects={projects}
        title="Featured Construction Projects"
        subtitle="See what we've built for our clients"
      />

      {/* Testimonials */}
      <TestimonialsSection
        testimonials={testimonials}
        title="What Our Clients Say"
        subtitle="Real reviews from satisfied customers"
      />

      {/* Bottom CTA */}
      <section className="py-20 px-4 flex justify-center">
        <div className="w-full max-w-4xl">
          <div className="bg-gradient-to-r from-orange-600/20 via-purple-600/20 to-blue-600/20 border-2 border-orange-500/30 rounded-2xl p-12 text-center">
            <h3 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Ready to Start Your Project?
            </h3>
            <p className="text-xl text-gray-300 mb-8">
              Get a free quote and consultation from our expert team
            </p>
            <div className="flex justify-center">
              <button
                onClick={handleGetQuote}
                className="px-12 py-5 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-xl font-bold text-xl hover:from-orange-500 hover:to-orange-600 transition-all shadow-2xl shadow-orange-500/30 hover:shadow-orange-500/50 flex items-center gap-3 group"
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