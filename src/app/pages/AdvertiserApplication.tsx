import React, { useState } from 'react';
import { GenericApplicationForm, ApplicationConfig } from '../components/GenericApplicationForm';
import { 
  User, Mail, Phone, MapPin, Building2, DollarSign, 
  Megaphone, Target, FileText, Briefcase, Calendar, 
  TrendingUp, BarChart3, Users
} from 'lucide-react';

export default function AdvertiserApplication() {
  const [view, setView] = useState<'landing' | 'form'>('landing');

  const advertiserConfig: ApplicationConfig = {
    title: "Advertiser Application",
    description: "Join our advertising network",
    apiEndpoint: "/advertiser-applications/submit",
    steps: [
      {
        title: "Contact Information",
        description: "Tell us about yourself and your business",
        icon: User,
        fields: [
          { id: 'contact_name', label: 'Your Name', type: 'text', required: true, placeholder: 'John Smith', icon: User },
          { id: 'email', label: 'Email Address', type: 'email', required: true, placeholder: 'john@company.com', icon: Mail },
          { id: 'phone', label: 'Phone Number', type: 'tel', required: true, placeholder: '(603) 555-0123', icon: Phone },
          { id: 'company_name', label: 'Company Name', type: 'text', required: true, placeholder: 'ABC Construction Supply', icon: Building2 },
          { id: 'title', label: 'Your Title/Position', type: 'text', required: true, placeholder: 'Marketing Director', icon: Briefcase },
          { id: 'website', label: 'Company Website', type: 'url', required: false, placeholder: 'https://www.yourcompany.com', icon: TrendingUp },
        ]
      },
      {
        title: "Company Details",
        description: "Tell us about your business",
        icon: Building2,
        fields: [
          { 
            id: 'business_type', 
            label: 'Type of Business', 
            type: 'select', 
            required: true, 
            icon: Building2,
            options: [
              '',
              'Building Materials Supplier',
              'Tool & Equipment Supplier',
              'Construction Equipment Rental',
              'Home Improvement Retailer',
              'Specialty Trade Supplier',
              'Professional Services (Legal, Accounting, Insurance)',
              'Technology/Software Provider',
              'Training & Education',
              'Safety Equipment & Supplies',
              'Vehicle/Fleet Services',
              'Financial Services',
              'Other'
            ]
          },
          { 
            id: 'industry_experience', 
            label: 'Years in Business', 
            type: 'select', 
            required: true,
            icon: Calendar,
            options: [
              '',
              'Less than 1 year',
              '1-3 years',
              '3-5 years',
              '5-10 years',
              '10-20 years',
              '20+ years'
            ]
          },
          { id: 'company_address', label: 'Company Address', type: 'text', required: true, placeholder: '123 Business Blvd', icon: MapPin },
          { id: 'city', label: 'City', type: 'text', required: true, placeholder: 'Nashua' },
          { id: 'state', label: 'State', type: 'text', required: true, placeholder: 'NH' },
          { id: 'zip', label: 'ZIP Code', type: 'text', required: true, placeholder: '03060' },
          { 
            id: 'company_size', 
            label: 'Company Size', 
            type: 'select', 
            required: true,
            icon: Users,
            options: [
              '',
              'Solo/Self-employed',
              '2-10 employees',
              '11-50 employees',
              '51-200 employees',
              '201-500 employees',
              '500+ employees'
            ]
          },
          { 
            id: 'company_description', 
            label: 'Brief Company Description', 
            type: 'textarea',
            placeholder: 'Describe what your company does, what makes you unique, and your main products/services',
            required: true,
            rows: 5,
            icon: FileText
          },
        ]
      },
      {
        title: "Advertising Goals",
        description: "What do you want to achieve?",
        icon: Target,
        fields: [
          { 
            id: 'advertising_goals', 
            label: 'Primary Advertising Goals (Select all that apply)', 
            type: 'textarea',
            placeholder: 'e.g., Brand awareness, Lead generation, Product launches, Special promotions, Contractor recruitment, Industry positioning',
            required: true,
            rows: 4,
            icon: Target
          },
          { 
            id: 'target_audience', 
            label: 'Target Audience', 
            type: 'select', 
            required: true,
            icon: Users,
            options: [
              '',
              'General Contractors',
              'Specialty Contractors (Electrical, Plumbing, HVAC)',
              'Residential Contractors',
              'Commercial Contractors',
              'Property Managers',
              'Real Estate Investors',
              'Homeowners',
              'All of the above',
              'Other (specify in comments)'
            ]
          },
          { 
            id: 'geographic_target', 
            label: 'Geographic Target Area', 
            type: 'textarea',
            placeholder: 'What cities, regions, or areas do you want to reach?',
            required: true,
            rows: 3,
            icon: MapPin
          },
          { 
            id: 'products_services', 
            label: 'Products/Services to Advertise', 
            type: 'textarea',
            placeholder: 'List the main products or services you want to promote',
            required: true,
            rows: 4,
            icon: Briefcase
          },
          { 
            id: 'unique_value', 
            label: 'What Makes You Different?', 
            type: 'textarea',
            placeholder: 'What sets your company apart from competitors? Special offers, unique products, exceptional service?',
            required: true,
            rows: 5,
            icon: TrendingUp
          },
        ]
      },
      {
        title: "Advertising Budget & Timeline",
        description: "Let's discuss investment",
        icon: DollarSign,
        fields: [
          { 
            id: 'monthly_budget', 
            label: 'Estimated Monthly Advertising Budget', 
            type: 'select', 
            required: true,
            icon: DollarSign,
            options: [
              '',
              'Under $500/month',
              '$500 - $1,000/month',
              '$1,000 - $2,500/month',
              '$2,500 - $5,000/month',
              '$5,000 - $10,000/month',
              '$10,000+/month',
              'Flexible - depends on ROI'
            ]
          },
          { 
            id: 'campaign_duration', 
            label: 'Preferred Campaign Duration', 
            type: 'select', 
            required: true,
            icon: Calendar,
            options: [
              '',
              '1-3 months (Short-term campaign)',
              '3-6 months',
              '6-12 months',
              '12+ months (Long-term partnership)',
              'Ongoing with quarterly reviews',
              'Event-based/Seasonal only'
            ]
          },
          { 
            id: 'start_timeline', 
            label: 'When Would You Like to Start?', 
            type: 'select', 
            required: true,
            icon: Calendar,
            options: [
              '',
              'Immediately',
              'Within 2 weeks',
              'Within 1 month',
              'Within 2-3 months',
              'Just exploring options'
            ]
          },
          { 
            id: 'previous_advertising', 
            label: 'Previous Advertising Experience', 
            type: 'textarea',
            placeholder: 'Have you advertised to contractors before? What worked well? What didn\'t?',
            required: false,
            rows: 5,
            icon: BarChart3
          },
        ]
      },
      {
        title: "Advertising Preferences",
        description: "How do you want to advertise?",
        icon: Megaphone,
        fields: [
          { 
            id: 'ad_formats', 
            label: 'Preferred Advertising Formats', 
            type: 'textarea',
            placeholder: 'e.g., Banner ads, Email campaigns, Sponsored content, Video ads, Product showcases, Event sponsorships, Newsletter features',
            required: true,
            rows: 5,
            icon: Megaphone
          },
          { 
            id: 'tracking_metrics', 
            label: 'Key Metrics You Want to Track', 
            type: 'textarea',
            placeholder: 'e.g., Impressions, Click-through rate, Leads generated, Sales conversions, ROI, Brand awareness',
            required: true,
            rows: 4,
            icon: BarChart3
          },
          { 
            id: 'special_promotions', 
            label: 'Current Promotions or Special Offers', 
            type: 'textarea',
            placeholder: 'Any special deals, discounts, or promotions you\'d like to feature?',
            required: false,
            rows: 4,
            icon: Target
          },
          { 
            id: 'marketing_materials', 
            label: 'Do you have existing marketing materials?', 
            type: 'select', 
            required: true,
            icon: FileText,
            options: [
              '',
              'Yes - logos, images, ad copy ready',
              'Partial - have some materials',
              'No - need help creating materials',
              'Professional agency creates our materials'
            ]
          },
        ]
      },
      {
        title: "Additional Information",
        description: "Final details",
        icon: FileText,
        fields: [
          { 
            id: 'success_stories', 
            label: 'Customer Success Stories or Testimonials', 
            type: 'textarea',
            placeholder: 'Share any testimonials or success stories from contractors who use your products/services',
            required: false,
            rows: 5,
            icon: TrendingUp
          },
          { 
            id: 'partnership_interest', 
            label: 'Interest in Strategic Partnerships', 
            type: 'select', 
            required: true,
            icon: Users,
            options: [
              '',
              'Very interested in co-marketing opportunities',
              'Open to exploring partnerships',
              'Just interested in advertising for now',
              'Would like to discuss options',
              'Not interested in partnerships'
            ]
          },
          { 
            id: 'preferred_contact', 
            label: 'Preferred Contact Method', 
            type: 'select', 
            required: true,
            icon: Phone,
            options: [
              '',
              'Email',
              'Phone call',
              'Video call',
              'In-person meeting'
            ]
          },
          { 
            id: 'best_time', 
            label: 'Best Time to Contact', 
            type: 'text',
            placeholder: 'e.g., Weekday mornings, Afternoons, Any time',
            required: false,
            icon: Calendar
          },
          { 
            id: 'questions_comments', 
            label: 'Questions or Additional Comments', 
            type: 'textarea',
            placeholder: 'Any questions about our advertising platform or additional information you\'d like to share?',
            required: false,
            rows: 5,
            icon: FileText
          },
        ]
      }
    ]
  };

  if (view === 'form') {
    return (
      <GenericApplicationForm 
        config={advertiserConfig} 
        onNavigate={(page) => setView('landing')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-pink-900/20 via-[#0A0A0A] to-[#0A0A0A]" />
        
        {/* Content */}
        <div className="relative max-w-6xl mx-auto px-6 py-20">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-pink-500/10 border border-pink-500/20 rounded-full mb-6">
              <Megaphone className="w-4 h-4 text-pink-400" />
              <span className="text-sm text-pink-400 font-medium">Advertising Network</span>
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              Reach Your
              <span className="block mt-2 bg-gradient-to-r from-pink-400 to-rose-500 bg-clip-text text-transparent">
                Target Audience
              </span>
            </h1>
            
            <p className="text-xl text-gray-400 max-w-3xl mx-auto mb-8">
              Connect with thousands of contractors, property managers, and real estate professionals 
              through our targeted advertising platform.
            </p>
          </div>

          {/* Benefits Grid */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="bg-[#111] border border-white/10 rounded-xl p-6 hover:border-pink-500/50 transition-colors">
              <div className="w-12 h-12 bg-pink-500/10 rounded-lg flex items-center justify-center mb-4">
                <Target className="w-6 h-6 text-pink-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Targeted Reach</h3>
              <p className="text-gray-400 text-sm">
                Get your message in front of contractors actively looking for products and services
              </p>
            </div>

            <div className="bg-[#111] border border-white/10 rounded-xl p-6 hover:border-pink-500/50 transition-colors">
              <div className="w-12 h-12 bg-pink-500/10 rounded-lg flex items-center justify-center mb-4">
                <BarChart3 className="w-6 h-6 text-pink-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Measurable Results</h3>
              <p className="text-gray-400 text-sm">
                Track impressions, clicks, leads, and ROI with detailed analytics dashboards
              </p>
            </div>

            <div className="bg-[#111] border border-white/10 rounded-xl p-6 hover:border-pink-500/50 transition-colors">
              <div className="w-12 h-12 bg-pink-500/10 rounded-lg flex items-center justify-center mb-4">
                <TrendingUp className="w-6 h-6 text-pink-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Flexible Campaigns</h3>
              <p className="text-gray-400 text-sm">
                Choose from multiple ad formats and adjust your campaign based on performance
              </p>
            </div>
          </div>

          {/* Advertising Options */}
          <div className="bg-gradient-to-br from-pink-900/10 to-transparent border border-pink-500/20 rounded-2xl p-8 mb-12">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
              <Megaphone className="w-7 h-7 text-pink-400" />
              Advertising Options Available
            </h2>
            
            <div className="grid md:grid-cols-2 gap-4">
              {[
                'Banner ads on dashboard and portal pages',
                'Featured listings in materials marketplace',
                'Email campaign sponsorships',
                'Newsletter featured placements',
                'Video advertising opportunities',
                'Product showcase sections',
                'Event and webinar sponsorships',
                'Mobile app advertising',
                'Targeted push notifications',
                'Co-branded content opportunities',
                'Seasonal promotion campaigns',
                'Exclusive partner spotlights'
              ].map((option, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="w-5 h-5 bg-pink-500/20 rounded flex items-center justify-center flex-shrink-0 mt-0.5">
                    <div className="w-2 h-2 bg-pink-400 rounded-full" />
                  </div>
                  <span className="text-gray-300">{option}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Who Should Advertise */}
          <div className="bg-[#111] border border-white/10 rounded-2xl p-8 mb-12">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
              <Building2 className="w-7 h-7 text-pink-400" />
              Perfect For
            </h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold mb-3 text-pink-400">Suppliers & Retailers</h3>
                <ul className="space-y-2 text-gray-300">
                  <li>• Building materials suppliers</li>
                  <li>• Tool & equipment vendors</li>
                  <li>• Home improvement stores</li>
                  <li>• Specialty trade suppliers</li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-3 text-pink-400">Service Providers</h3>
                <ul className="space-y-2 text-gray-300">
                  <li>• Financial & insurance services</li>
                  <li>• Professional services (legal, accounting)</li>
                  <li>• Technology & software companies</li>
                  <li>• Training & certification programs</li>
                </ul>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center">
            <button
              onClick={() => setView('form')}
              className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 rounded-xl font-semibold text-lg shadow-lg shadow-pink-500/25 hover:shadow-pink-500/40 transition-all"
            >
              Start Your Advertising Campaign
              <Megaphone className="w-5 h-5" />
            </button>
            <p className="text-sm text-gray-500 mt-4">
              Takes 5-10 minutes • Custom proposals provided • No commitment required
            </p>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="border-t border-white/10 bg-[#0A0A0A]">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-3xl font-bold text-pink-400 mb-2">10K+</div>
              <div className="text-sm text-gray-400">Active Users</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-pink-400 mb-2">500+</div>
              <div className="text-sm text-gray-400">Daily Logins</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-pink-400 mb-2">2M+</div>
              <div className="text-sm text-gray-400">Monthly Impressions</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-pink-400 mb-2">95%</div>
              <div className="text-sm text-gray-400">Advertiser Retention</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
