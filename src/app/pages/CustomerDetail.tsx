import { useState, useEffect } from 'react';
import {
  ArrowLeft, Edit2, Mail, Phone, MapPin, Calendar,
  Building2, Tag, FileText, DollarSign, TrendingUp,
  Activity, Star, User, Globe, MessageSquare, Briefcase
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface CustomerDetailProps {
  customerId: string;
  onBack: () => void;
  onEdit: (customerId: string) => void;
}

interface Customer {
  id: string;
  customer_number: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  company?: string;
  status: 'lead' | 'active' | 'inactive' | 'vip';
  total_spent: number;
  project_count: number;
  tags?: string[];
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  notes?: string;
  source?: string;
  assigned_to?: string;
  created_at: string;
  updated_at: string;
}

export default function CustomerDetail({ customerId, onBack, onEdit }: CustomerDetailProps) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCustomer();
  }, [customerId]);

  const loadCustomer = async () => {
    try {
      setLoading(true);
      // In a real app, fetch from API
      // For now, using mock data
      const mockCustomer: Customer = {
        id: customerId,
        customer_number: 'CUST-001',
        first_name: 'John',
        last_name: 'Smith',
        email: 'john.smith@example.com',
        phone: '(555) 123-4567',
        company: 'Smith Construction Inc.',
        status: 'active',
        total_spent: 125000,
        project_count: 8,
        tags: ['VIP', 'Commercial', 'Repeat Customer'],
        address_line1: '123 Main Street',
        city: 'Austin',
        state: 'TX',
        zip_code: '78701',
        country: 'USA',
        notes: 'Prefers email communication. Large commercial projects.',
        source: 'Referral',
        assigned_to: 'Mike Johnson',
        created_at: '2024-01-15T10:30:00Z',
        updated_at: '2026-03-10T14:20:00Z',
      };
      setCustomer(mockCustomer);
    } catch (error) {
      console.error('Error loading customer:', error);
      toast.error('Failed to load customer details');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'lead': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'vip': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'inactive': return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
      default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#2A2A2A] border-t-[#ea580c] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading customer...</p>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">Customer not found</p>
        <button
          onClick={onBack}
          className="mt-4 px-4 py-2 bg-[#1A1A1A] hover:bg-[#2A2A2A] text-gray-300 rounded-lg transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-[#1A1A1A] rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">
              {customer.first_name} {customer.last_name}
            </h1>
            <p className="text-gray-400">{customer.customer_number}</p>
          </div>
        </div>
        <button
          onClick={() => onEdit(customer.id)}
          className="flex items-center gap-2 px-4 py-2 bg-[#ea580c] hover:bg-[#ea580c]/90 text-white rounded-lg transition-colors"
        >
          <Edit2 className="w-4 h-4" />
          Edit Customer
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-400 text-sm">Status</p>
            <Activity className="w-4 h-4 text-gray-500" />
          </div>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(customer.status)}`}>
            {customer.status.toUpperCase()}
          </span>
        </div>

        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-400 text-sm">Total Spent</p>
            <DollarSign className="w-4 h-4 text-green-500" />
          </div>
          <p className="text-2xl font-bold text-white">
            ${customer.total_spent.toLocaleString()}
          </p>
        </div>

        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-400 text-sm">Projects</p>
            <Briefcase className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-white">{customer.project_count}</p>
        </div>

        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-400 text-sm">Avg. Project</p>
            <TrendingUp className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-2xl font-bold text-white">
            ${Math.round(customer.total_spent / customer.project_count).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Contact & Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Information */}
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Contact Information</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-[#ea580c]" />
                <div>
                  <p className="text-sm text-gray-400">Email</p>
                  <a href={`mailto:${customer.email}`} className="text-white hover:text-[#ea580c]">
                    {customer.email}
                  </a>
                </div>
              </div>
              {customer.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-[#ea580c]" />
                  <div>
                    <p className="text-sm text-gray-400">Phone</p>
                    <a href={`tel:${customer.phone}`} className="text-white hover:text-[#ea580c]">
                      {customer.phone}
                    </a>
                  </div>
                </div>
              )}
              {customer.company && (
                <div className="flex items-center gap-3">
                  <Building2 className="w-5 h-5 text-[#ea580c]" />
                  <div>
                    <p className="text-sm text-gray-400">Company</p>
                    <p className="text-white">{customer.company}</p>
                  </div>
                </div>
              )}
              {customer.address_line1 && (
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-[#ea580c] mt-1" />
                  <div>
                    <p className="text-sm text-gray-400">Address</p>
                    <p className="text-white">
                      {customer.address_line1}
                      {customer.address_line2 && <>, {customer.address_line2}</>}
                      <br />
                      {customer.city}, {customer.state} {customer.zip_code}
                      {customer.country && <><br />{customer.country}</>}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          {customer.notes && (
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#ea580c]" />
                Notes
              </h2>
              <p className="text-gray-300">{customer.notes}</p>
            </div>
          )}
        </div>

        {/* Right Column - Additional Info */}
        <div className="space-y-6">
          {/* Tags */}
          {customer.tags && customer.tags.length > 0 && (
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Tag className="w-5 h-5 text-[#ea580c]" />
                Tags
              </h2>
              <div className="flex flex-wrap gap-2">
                {customer.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-[#2A2A2A] text-gray-300 rounded-full text-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Additional Details */}
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Details</h2>
            <div className="space-y-3">
              {customer.source && (
                <div>
                  <p className="text-sm text-gray-400">Source</p>
                  <p className="text-white">{customer.source}</p>
                </div>
              )}
              {customer.assigned_to && (
                <div>
                  <p className="text-sm text-gray-400">Assigned To</p>
                  <p className="text-white flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-500" />
                    {customer.assigned_to}
                  </p>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-400">Created</p>
                <p className="text-white">
                  {new Date(customer.created_at).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Last Updated</p>
                <p className="text-white">
                  {new Date(customer.updated_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
