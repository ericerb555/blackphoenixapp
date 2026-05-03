import React, { useState } from 'react';
import { GenericApplicationForm, ApplicationConfig } from '../components/GenericApplicationForm';
import { 
  User, Mail, Phone, MapPin, Building2, DollarSign, 
  TrendingUp, Target, FileText, Briefcase, Calendar, 
  Home, PieChart, Users
} from 'lucide-react';

export default function InvestorApplication() {
  const [view, setView] = useState<'landing' | 'form'>('landing');

  const investorConfig: ApplicationConfig = {
    title: "Investor Application",
    description: "Join our network of property investors",
    apiEndpoint: "/investor-applications/submit",
    steps: [
      {
        title: "Personal Information",
        description: "Tell us about yourself",
        icon: User,
        fields: [
          { id: 'full_name', label: 'Full Name', type: 'text', required: true, placeholder: 'John Smith', icon: User },
          { id: 'email', label: 'Email Address', type: 'email', required: true, placeholder: 'john@example.com', icon: Mail },
          { id: 'phone', label: 'Phone Number', type: 'tel', required: true, placeholder: '(603) 555-0123', icon: Phone },
          { id: 'address', label: 'Street Address', type: 'text', required: true, placeholder: '123 Main Street', icon: MapPin },
          { id: 'city', label: 'City', type: 'text', required: true, placeholder: 'Nashua' },
          { id: 'state', label: 'State', type: 'text', required: true, placeholder: 'NH' },
          { id: 'zip', label: 'ZIP Code', type: 'text', required: true, placeholder: '03060' },
        ]
      },
      {
        title: "Investment Profile",
        description: "Your investment experience and preferences",
        icon: TrendingUp,
        fields: [
          { 
            id: 'investor_type', 
            label: 'Investor Type', 
            type: 'select', 
            required: true, 
            icon: Briefcase,
            options: [
              '',
              'Individual Investor',
              'Real Estate Investment Group',
              'Private Equity / Fund',
              'Family Office',
              'Institutional Investor',
              'Angel Investor',
              'Other'
            ]
          },
          { 
            id: 'investment_experience', 
            label: 'Years of Real Estate Investment Experience', 
            type: 'select', 
            required: true,
            icon: Calendar,
            options: [
              '',
              'Less than 1 year (New Investor)',
              '1-3 years',
              '3-5 years',
              '5-10 years',
              '10+ years'
            ]
          },
          { 
            id: 'current_portfolio', 
            label: 'Current Real Estate Portfolio Size', 
            type: 'select', 
            required: true,
            icon: Building2,
            options: [
              '',
              'No properties yet (First investment)',
              '1-2 properties',
              '3-5 properties',
              '6-10 properties',
              '11-20 properties',
              '20+ properties'
            ]
          },
          { 
            id: 'total_investment_value', 
            label: 'Total Portfolio Value', 
            type: 'select', 
            required: true,
            icon: DollarSign,
            options: [
              '',
              'Under $250,000',
              '$250,000 - $500,000',
              '$500,000 - $1,000,000',
              '$1,000,000 - $2,500,000',
              '$2,500,000 - $5,000,000',
              '$5,000,000+'
            ]
          },
        ]
      },
      {
        title: "Investment Goals & Strategy",
        description: "What are you looking to achieve?",
        icon: Target,
        fields: [
          { 
            id: 'investment_strategy', 
            label: 'Primary Investment Strategy', 
            type: 'select', 
            required: true,
            icon: PieChart,
            options: [
              '',
              'Buy and Hold (Long-term rental)',
              'Fix and Flip',
              'BRRRR (Buy, Rehab, Rent, Refinance, Repeat)',
              'Short-term Rentals (Airbnb/VRBO)',
              'Commercial Real Estate',
              'Multi-Family Development',
              'Mixed Portfolio',
              'Other'
            ]
          },
          { 
            id: 'property_types', 
            label: 'Preferred Property Types (Select all that apply)', 
            type: 'textarea',
            placeholder: 'e.g., Single-family homes, Multi-family (2-4 units), Apartment buildings (5+ units), Condos, Commercial properties, Mixed-use, Land development',
            required: true,
            rows: 4,
            icon: Home
          },
          { 
            id: 'target_markets', 
            label: 'Target Markets / Geographic Areas', 
            type: 'textarea',
            placeholder: 'List cities, neighborhoods, or regions you\'re interested in investing',
            required: true,
            rows: 3,
            icon: MapPin
          },
          { 
            id: 'investment_budget', 
            label: 'Investment Budget Per Property', 
            type: 'select', 
            required: true,
            icon: DollarSign,
            options: [
              '',
              'Under $100,000',
              '$100,000 - $250,000',
              '$250,000 - $500,000',
              '$500,000 - $1,000,000',
              '$1,000,000 - $2,500,000',
              '$2,500,000+'
            ]
          },
          { 
            id: 'timeline', 
            label: 'Investment Timeline', 
            type: 'select', 
            required: true,
            icon: Calendar,
            options: [
              '',
              'Ready to invest immediately',
              'Within 1-3 months',
              'Within 3-6 months',
              'Within 6-12 months',
              'Exploring options (1+ year)'
            ]
          },
          { 
            id: 'investment_goals', 
            label: 'Primary Investment Goals', 
            type: 'textarea',
            placeholder: 'Describe your investment objectives (e.g., cash flow, appreciation, tax benefits, portfolio diversification, passive income, retirement planning)',
            required: true,
            rows: 5,
            icon: Target
          },
        ]
      },
      {
        title: "Financing & Resources",
        description: "How do you plan to finance investments?",
        icon: DollarSign,
        fields: [
          { 
            id: 'financing_method', 
            label: 'Primary Financing Method', 
            type: 'select', 
            required: true,
            icon: DollarSign,
            options: [
              '',
              'Cash purchase',
              'Conventional mortgage',
              'Hard money loans',
              'Private lenders',
              'Partnership / Syndication',
              'Self-directed IRA',
              '1031 Exchange',
              'Mix of methods',
              'Other'
            ]
          },
          { 
            id: 'available_capital', 
            label: 'Available Investment Capital', 
            type: 'select', 
            required: true,
            icon: DollarSign,
            options: [
              '',
              'Under $50,000',
              '$50,000 - $100,000',
              '$100,000 - $250,000',
              '$250,000 - $500,000',
              '$500,000 - $1,000,000',
              '$1,000,000+'
            ]
          },
          { 
            id: 'team_resources', 
            label: 'Current Team & Resources', 
            type: 'textarea',
            placeholder: 'List any existing team members (e.g., real estate agent, property manager, contractor, attorney, CPA, lender relationships)',
            required: false,
            rows: 4,
            icon: Users
          },
          { 
            id: 'needs_assistance', 
            label: 'Areas Where You Need Assistance', 
            type: 'textarea',
            placeholder: 'What services would be most valuable? (e.g., property sourcing, due diligence, renovation management, property management, financing connections)',
            required: true,
            rows: 5,
            icon: Briefcase
          },
        ]
      },
      {
        title: "Additional Information",
        description: "Help us understand your needs better",
        icon: FileText,
        fields: [
          { 
            id: 'experience_description', 
            label: 'Describe Your Investment Experience', 
            type: 'textarea',
            placeholder: 'Tell us about your most successful investment, challenges you\'ve faced, and lessons learned',
            required: true,
            rows: 6,
            icon: TrendingUp
          },
          { 
            id: 'why_join', 
            label: 'Why do you want to join our investor network?', 
            type: 'textarea',
            placeholder: 'What specific value or opportunities are you looking for?',
            required: true,
            rows: 5,
            icon: Target
          },
          { 
            id: 'partnership_interest', 
            label: 'Interest in Partnership Opportunities', 
            type: 'select', 
            required: true,
            icon: Users,
            options: [
              '',
              'Very interested in partnerships',
              'Open to partnerships',
              'Prefer solo investments',
              'Only interested in specific partnership types',
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
              'Text message',
              'Video call',
              'In-person meeting'
            ]
          },
          { 
            id: 'best_time', 
            label: 'Best Time to Contact', 
            type: 'text',
            placeholder: 'e.g., Weekday mornings, Afternoons, Evenings, Weekends',
            required: false,
            icon: Calendar
          },
          { 
            id: 'additional_comments', 
            label: 'Additional Comments or Questions', 
            type: 'textarea',
            placeholder: 'Any other information you\'d like to share?',
            required: false,
            rows: 4,
            icon: FileText
          },
        ]
      }
    ]
  };

  if (view === 'form') {
    return (
      <GenericApplicationForm 
        config={investorConfig} 
        onNavigate={(page) => setView('landing')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/20 via-[#0A0A0A] to-[#0A0A0A]" />
        
        {/* Content */}
        <div className="relative max-w-6xl mx-auto px-6 py-20">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full mb-6">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span className="text-sm text-emerald-400 font-medium">Investor Network</span>
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              Join Our
              <span className="block mt-2 bg-gradient-to-r from-emerald-400 to-green-500 bg-clip-text text-transparent">
                Investor Network
              </span>
            </h1>
            
            <p className="text-xl text-gray-400 max-w-3xl mx-auto mb-8">
              Connect with exclusive real estate investment opportunities, renovation projects, and 
              a network of professionals to help you achieve your investment goals.
            </p>
          </div>

          {/* Benefits Grid */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="bg-[#111] border border-white/10 rounded-xl p-6 hover:border-emerald-500/50 transition-colors">
              <div className="w-12 h-12 bg-emerald-500/10 rounded-lg flex items-center justify-center mb-4">
                <Target className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Curated Opportunities</h3>
              <p className="text-gray-400 text-sm">
                Access vetted investment properties and renovation projects matched to your criteria
              </p>
            </div>

            <div className="bg-[#111] border border-white/10 rounded-xl p-6 hover:border-emerald-500/50 transition-colors">
              <div className="w-12 h-12 bg-emerald-500/10 rounded-lg flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Expert Network</h3>
              <p className="text-gray-400 text-sm">
                Connect with contractors, property managers, and industry professionals
              </p>
            </div>

            <div className="bg-[#111] border border-white/10 rounded-xl p-6 hover:border-emerald-500/50 transition-colors">
              <div className="w-12 h-12 bg-emerald-500/10 rounded-lg flex items-center justify-center mb-4">
                <PieChart className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Portfolio Analytics</h3>
              <p className="text-gray-400 text-sm">
                Track ROI, manage multiple properties, and monitor renovation progress in real-time
              </p>
            </div>
          </div>

          {/* What You'll Get */}
          <div className="bg-gradient-to-br from-emerald-900/10 to-transparent border border-emerald-500/20 rounded-2xl p-8 mb-12">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
              <Building2 className="w-7 h-7 text-emerald-400" />
              What You'll Get as an Investor Member
            </h2>
            
            <div className="grid md:grid-cols-2 gap-4">
              {[
                'Priority access to off-market properties',
                'Detailed property analysis and due diligence reports',
                'Renovation cost estimates and project management',
                'Property management service connections',
                'Partnership opportunities with other investors',
                'Market insights and investment trends',
                'Financing and lending partner introductions',
                'Tax strategy and legal referrals',
                'Exclusive investor events and networking',
                'Dedicated account manager support'
              ].map((benefit, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="w-5 h-5 bg-emerald-500/20 rounded flex items-center justify-center flex-shrink-0 mt-0.5">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full" />
                  </div>
                  <span className="text-gray-300">{benefit}</span>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="text-center">
            <button
              onClick={() => setView('form')}
              className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 rounded-xl font-semibold text-lg shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all"
            >
              Start Application
              <TrendingUp className="w-5 h-5" />
            </button>
            <p className="text-sm text-gray-500 mt-4">
              Takes 5-10 minutes • No commitment required
            </p>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="border-t border-white/10 bg-[#0A0A0A]">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-3xl font-bold text-emerald-400 mb-2">$50M+</div>
              <div className="text-sm text-gray-400">Properties Managed</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-emerald-400 mb-2">500+</div>
              <div className="text-sm text-gray-400">Active Investors</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-emerald-400 mb-2">18%</div>
              <div className="text-sm text-gray-400">Avg. Annual ROI</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-emerald-400 mb-2">1,200+</div>
              <div className="text-sm text-gray-400">Deals Closed</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
