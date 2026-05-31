import React, { useState, useEffect } from 'react';
import { GenericApplicationForm, ApplicationConfig } from '../components/GenericApplicationForm';
import {
  User, Mail, Phone, MapPin, Building2, DollarSign,
  TrendingUp, Target, FileText, Briefcase, Calendar,
  Home, PieChart, Users, Info
} from 'lucide-react';

export default function InvestorApplication() {
  const [opportunityId, setOpportunityId] = useState<string | null>(null);
  const [opportunityTitle, setOpportunityTitle] = useState<string | null>(null);

  useEffect(() => {
    // Check for opportunity query parameter
    const params = new URLSearchParams(window.location.search);
    const oppId = params.get('opportunity');

    if (oppId) {
      setOpportunityId(oppId);

      // Try to load opportunity details from localStorage
      const stored = localStorage.getItem('investmentOpportunities');
      if (stored) {
        try {
          const opportunities = JSON.parse(stored);
          const opp = opportunities.find((o: any) => o.id === oppId);
          if (opp) {
            setOpportunityTitle(opp.title);
          }
        } catch (e) {
          console.error('Error loading opportunity:', e);
        }
      }
    }
  }, []);

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
          ...(opportunityId ? [{
            id: 'opportunity_interest',
            label: 'Investment Opportunity of Interest',
            type: 'text' as const,
            required: false,
            placeholder: opportunityTitle || opportunityId,
            icon: Target,
            disabled: true,
            defaultValue: opportunityTitle || opportunityId
          }] : []),
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

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Opportunity Interest Banner */}
      {opportunityTitle && (
        <div className="bg-gradient-to-r from-orange-600/20 via-orange-500/10 to-transparent border-b border-orange-500/30">
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-3">
            <Info className="w-5 h-5 text-orange-400 flex-shrink-0" />
            <div>
              <p className="text-white font-semibold">Expressing Interest in Investment Opportunity</p>
              <p className="text-sm text-gray-300">{opportunityTitle}</p>
            </div>
          </div>
        </div>
      )}

      <GenericApplicationForm
        config={investorConfig}
        onNavigate={(page) => {
          if (typeof window !== 'undefined') {
            window.location.href = `/${page}`;
          }
        }}
      />
    </div>
  );
}
