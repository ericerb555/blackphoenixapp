/**
 * Property Management Landing Page
 * Portfolio Services for Property Managers, Landlords, and Condo Associations
 */

import { motion } from 'motion/react';
import { Building, ArrowRight, CheckCircle, Sparkles, Users, Key, TrendingUp, User, Home, Shield, Clock, FileText, Wrench, DollarSign, Calendar, MessageSquare, BarChart3, HeartHandshake } from 'lucide-react';
import ServicesGrid from '../components/sections/ServicesGrid';
import TestimonialsSection from '../components/sections/TestimonialsSection';
import { PROPERTY_MANAGEMENT_SERVICES } from '../data/servicesData';
import { getTestimonialsByCategory } from '../data/testimonialsData';
import { getSectionByCohortType } from '../config/directoryLandingSections';

interface PropertyManagementLandingPageProps {
  onNavigate?: (page: string) => void;
}

export default function PropertyManagementLandingPage({ onNavigate }: PropertyManagementLandingPageProps) {
  console.log('🏢 [PropertyManagementLandingPage] Component mounting/rendering');
  console.log('🏢 [PropertyManagementLandingPage] onNavigate prop:', typeof onNavigate, onNavigate ? '✓ present' : '✗ missing');
  const section = getSectionByCohortType('property-management');
  const testimonials = getTestimonialsByCategory('property-management');

  const handleNavigate = (page: string) => {
    console.log('🔄 [PropertyManagementLandingPage] handleNavigate called with page:', page);
    if (onNavigate) {
      console.log('✓ [PropertyManagementLandingPage] Calling onNavigate prop');
      onNavigate(page);
    } else {
      console.error('✗ [PropertyManagementLandingPage] onNavigate prop is missing!');
      // Fallback to window.location if onNavigate is not provided
      window.location.href = `/${page}`;
    }
  };

  const handleGetQuote = () => {
    console.log('💰 [PropertyManagementLandingPage] Get Quote button clicked');
    localStorage.setItem('quote_request_cohort', 'property-management');
    console.log('💾 [PropertyManagementLandingPage] Saved cohort to localStorage:', localStorage.getItem('quote_request_cohort'));
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

              <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-indigo-400 to-blue-400 bg-clip-text text-transparent">
                {section.title}
              </h1>
              <p className="text-xl text-gray-300 mb-6">{section.subtitle}</p>
              <p className="text-gray-400 leading-relaxed mb-8">{section.description}</p>

              <div className="grid grid-cols-2 gap-4 mb-8">
                {section.benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-indigo-400 flex-shrink-0" />
                    <span className="text-sm text-gray-300">{benefit}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={handleGetQuote}
                  className={`flex-1 px-8 py-4 rounded-xl font-bold text-white bg-gradient-to-r ${section.gradient} hover:shadow-lg hover:shadow-indigo-500/50 transition-all flex items-center justify-center gap-2 group`}
                >
                  Get Started
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
                <button
                  onClick={() => handleNavigate('property-manager-portal')}
                  className="flex-1 px-8 py-4 rounded-xl font-bold text-white bg-white/10 hover:bg-white/20 border border-white/20 transition-all flex items-center justify-center gap-2"
                >
                  <User className="w-5 h-5" />
                  View Portal
                </button>
              </div>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6 hover:border-indigo-500/50 transition-all">
                <Users className="w-10 h-10 text-indigo-400 mb-4" />
                <h4 className="font-bold text-white mb-2">Multi-Property</h4>
                <p className="text-sm text-gray-400">Manage multiple properties from one dashboard</p>
              </div>
              <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6 hover:border-indigo-500/50 transition-all">
                <Key className="w-10 h-10 text-indigo-400 mb-4" />
                <h4 className="font-bold text-white mb-2">Tenant Portal</h4>
                <p className="text-sm text-gray-400">Streamline tenant communication and requests</p>
              </div>
              <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6 hover:border-indigo-500/50 transition-all">
                <TrendingUp className="w-10 h-10 text-indigo-400 mb-4" />
                <h4 className="font-bold text-white mb-2">ROI Tracking</h4>
                <p className="text-sm text-gray-400">Monitor expenses and maximize returns</p>
              </div>
              <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6 hover:border-indigo-500/50 transition-all">
                <Sparkles className="w-10 h-10 text-indigo-400 mb-4" />
                <h4 className="font-bold text-white mb-2">Priority Service</h4>
                <p className="text-sm text-gray-400">24/7 emergency response for tenants</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Detailed Offerings by Cohort */}
      <section className="py-20 px-4 bg-[#0A0A0A]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Tailored Solutions for Every Client</h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              We understand that condo associations, landlords, and property managers all have unique needs. Our services are customized to help you succeed.
            </p>
          </div>

          <div className="space-y-12">
            {/* Condo Association Services */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="bg-gradient-to-br from-[#1A1A1A] to-[#0F0F0F] rounded-2xl border border-[#2A2A2A] p-8 md:p-12"
            >
              <div className="flex items-start gap-6 mb-8">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center flex-shrink-0">
                  <Building className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-white mb-3">Condo Association Management</h3>
                  <p className="text-lg text-gray-300">
                    Comprehensive maintenance and management services designed specifically for condo associations and HOAs
                  </p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] p-6 hover:border-blue-500/50 transition-all">
                  <Shield className="w-10 h-10 text-blue-400 mb-4" />
                  <h4 className="font-bold text-white mb-2">Common Area Maintenance</h4>
                  <p className="text-sm text-gray-400">Regular upkeep of lobbies, hallways, parking areas, and shared facilities to maintain property value</p>
                </div>
                <div className="bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] p-6 hover:border-blue-500/50 transition-all">
                  <Clock className="w-10 h-10 text-blue-400 mb-4" />
                  <h4 className="font-bold text-white mb-2">Emergency Response</h4>
                  <p className="text-sm text-gray-400">24/7 availability for urgent issues like water leaks, heating failures, or security concerns</p>
                </div>
                <div className="bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] p-6 hover:border-blue-500/50 transition-all">
                  <FileText className="w-10 h-10 text-blue-400 mb-4" />
                  <h4 className="font-bold text-white mb-2">Board Meeting Support</h4>
                  <p className="text-sm text-gray-400">Detailed maintenance reports, budget planning assistance, and vendor coordination for board meetings</p>
                </div>
                <div className="bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] p-6 hover:border-blue-500/50 transition-all">
                  <Users className="w-10 h-10 text-blue-400 mb-4" />
                  <h4 className="font-bold text-white mb-2">Unit Owner Portal</h4>
                  <p className="text-sm text-gray-400">Dedicated portal for owners to submit requests, track work orders, and communicate with management</p>
                </div>
                <div className="bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] p-6 hover:border-blue-500/50 transition-all">
                  <Wrench className="w-10 h-10 text-blue-400 mb-4" />
                  <h4 className="font-bold text-white mb-2">Capital Projects</h4>
                  <p className="text-sm text-gray-400">Major renovations, roof replacements, siding updates, and infrastructure improvements</p>
                </div>
                <div className="bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] p-6 hover:border-blue-500/50 transition-all">
                  <DollarSign className="w-10 h-10 text-blue-400 mb-4" />
                  <h4 className="font-bold text-white mb-2">Budget-Friendly Plans</h4>
                  <p className="text-sm text-gray-400">Monthly service packages designed to keep HOA fees predictable and maintenance costs under control</p>
                </div>
              </div>

              <div className="mt-8 flex justify-center">
                <button
                  onClick={() => handleNavigate('condo-manager-portal')}
                  className="px-8 py-4 rounded-xl font-bold text-white bg-gradient-to-r from-blue-600 to-cyan-600 hover:shadow-lg hover:shadow-blue-500/50 transition-all flex items-center gap-2 group"
                >
                  <User className="w-5 h-5" />
                  View Condo Association Portal
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </motion.div>

            {/* Landlord Services */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="bg-gradient-to-br from-[#1A1A1A] to-[#0F0F0F] rounded-2xl border border-[#2A2A2A] p-8 md:p-12"
            >
              <div className="flex items-start gap-6 mb-8">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-600 to-emerald-600 flex items-center justify-center flex-shrink-0">
                  <Home className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-white mb-3">Landlord Services</h3>
                  <p className="text-lg text-gray-300">
                    Reliable maintenance and repair services to keep your rental properties in top condition and tenants satisfied
                  </p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] p-6 hover:border-green-500/50 transition-all">
                  <Calendar className="w-10 h-10 text-green-400 mb-4" />
                  <h4 className="font-bold text-white mb-2">Turnover Services</h4>
                  <p className="text-sm text-gray-400">Fast unit turnovers between tenants including painting, repairs, cleaning, and inspections</p>
                </div>
                <div className="bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] p-6 hover:border-green-500/50 transition-all">
                  <MessageSquare className="w-10 h-10 text-green-400 mb-4" />
                  <h4 className="font-bold text-white mb-2">Tenant Request Management</h4>
                  <p className="text-sm text-gray-400">Handle all tenant maintenance requests promptly to keep satisfaction high and turnover low</p>
                </div>
                <div className="bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] p-6 hover:border-green-500/50 transition-all">
                  <Shield className="w-10 h-10 text-green-400 mb-4" />
                  <h4 className="font-bold text-white mb-2">Preventive Maintenance</h4>
                  <p className="text-sm text-gray-400">Scheduled inspections and maintenance to catch issues early and avoid costly emergency repairs</p>
                </div>
                <div className="bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] p-6 hover:border-green-500/50 transition-all">
                  <Key className="w-10 h-10 text-green-400 mb-4" />
                  <h4 className="font-bold text-white mb-2">Move-In/Move-Out Inspections</h4>
                  <p className="text-sm text-gray-400">Detailed documentation and photo reports to protect your security deposit and property condition</p>
                </div>
                <div className="bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] p-6 hover:border-green-500/50 transition-all">
                  <DollarSign className="w-10 h-10 text-green-400 mb-4" />
                  <h4 className="font-bold text-white mb-2">Transparent Pricing</h4>
                  <p className="text-sm text-gray-400">Upfront quotes, detailed invoices, and landlord-friendly payment terms with no surprise charges</p>
                </div>
                <div className="bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] p-6 hover:border-green-500/50 transition-all">
                  <Clock className="w-10 h-10 text-green-400 mb-4" />
                  <h4 className="font-bold text-white mb-2">Same-Day Response</h4>
                  <p className="text-sm text-gray-400">Priority scheduling for urgent repairs to minimize vacancy time and maintain rental income</p>
                </div>
              </div>

              <div className="mt-8 flex justify-center">
                <button
                  onClick={() => handleNavigate('landlord-portal')}
                  className="px-8 py-4 rounded-xl font-bold text-white bg-gradient-to-r from-green-600 to-emerald-600 hover:shadow-lg hover:shadow-green-500/50 transition-all flex items-center gap-2 group"
                >
                  <User className="w-5 h-5" />
                  View Landlord Portal
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </motion.div>

            {/* Property Management Company Services */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-gradient-to-br from-[#1A1A1A] to-[#0F0F0F] rounded-2xl border border-[#2A2A2A] p-8 md:p-12"
            >
              <div className="flex items-start gap-6 mb-8">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-white mb-3">Property Management Companies</h3>
                  <p className="text-lg text-gray-300">
                    Enterprise solutions for property management firms managing large portfolios across multiple locations
                  </p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] p-6 hover:border-purple-500/50 transition-all">
                  <BarChart3 className="w-10 h-10 text-purple-400 mb-4" />
                  <h4 className="font-bold text-white mb-2">Portfolio Dashboard</h4>
                  <p className="text-sm text-gray-400">Unified dashboard to manage maintenance across all properties with real-time status updates</p>
                </div>
                <div className="bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] p-6 hover:border-purple-500/50 transition-all">
                  <DollarSign className="w-10 h-10 text-purple-400 mb-4" />
                  <h4 className="font-bold text-white mb-2">Volume Discounts</h4>
                  <p className="text-sm text-gray-400">Preferred pricing for property management companies with multiple units or properties</p>
                </div>
                <div className="bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] p-6 hover:border-purple-500/50 transition-all">
                  <FileText className="w-10 h-10 text-purple-400 mb-4" />
                  <h4 className="font-bold text-white mb-2">Detailed Reporting</h4>
                  <p className="text-sm text-gray-400">Comprehensive maintenance reports, expense tracking, and analytics for owner presentations</p>
                </div>
                <div className="bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] p-6 hover:border-purple-500/50 transition-all">
                  <HeartHandshake className="w-10 h-10 text-purple-400 mb-4" />
                  <h4 className="font-bold text-white mb-2">Dedicated Account Manager</h4>
                  <p className="text-sm text-gray-400">Single point of contact who understands your portfolio and ensures consistent service quality</p>
                </div>
                <div className="bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] p-6 hover:border-purple-500/50 transition-all">
                  <Users className="w-10 h-10 text-purple-400 mb-4" />
                  <h4 className="font-bold text-white mb-2">Multi-User Access</h4>
                  <p className="text-sm text-gray-400">Team accounts with role-based permissions for staff, owners, and property managers</p>
                </div>
                <div className="bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] p-6 hover:border-purple-500/50 transition-all">
                  <Sparkles className="w-10 h-10 text-purple-400 mb-4" />
                  <h4 className="font-bold text-white mb-2">API Integration</h4>
                  <p className="text-sm text-gray-400">Connect with your property management software for seamless work order and billing integration</p>
                </div>
              </div>

              <div className="mt-8 flex justify-center">
                <button
                  onClick={() => handleNavigate('property-manager-portal')}
                  className="px-8 py-4 rounded-xl font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:shadow-lg hover:shadow-purple-500/50 transition-all flex items-center gap-2 group"
                >
                  <User className="w-5 h-5" />
                  View Property Manager Portal
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <ServicesGrid services={PROPERTY_MANAGEMENT_SERVICES} title="Property Management Services" subtitle="Comprehensive solutions for landlords and property managers" />
      <TestimonialsSection testimonials={testimonials} title="What Property Managers Say" subtitle="Trusted by portfolio owners across New Hampshire" />

      <section className="py-20 px-4 flex justify-center">
        <div className="w-full max-w-4xl">
          <div className="bg-gradient-to-r from-indigo-600/20 via-blue-600/20 to-purple-600/20 border-2 border-indigo-500/30 rounded-2xl p-12 text-center">
            <h3 className="text-3xl md:text-4xl font-bold text-white mb-4">Manage Your Portfolio Better</h3>
            <p className="text-xl text-gray-300 mb-8">Let us handle the maintenance while you focus on growth</p>
            <div className="flex justify-center">
              <button
                onClick={handleGetQuote}
                className="px-12 py-5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-xl font-bold text-xl hover:from-indigo-500 hover:to-indigo-600 transition-all shadow-2xl shadow-indigo-500/30 hover:shadow-indigo-500/50 flex items-center gap-3 group"
              >
                Get Started Today
                <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}