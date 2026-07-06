import { useState } from 'react';
import {
  Search, Filter, Plus, Download, Building2, MapPin,
  Users, DollarSign, TrendingUp, Eye, Edit, MoreVertical,
  Star, Phone, Mail, Globe, Calendar, Folder, ExternalLink
} from 'lucide-react';
import { Select } from '../ui/input/Select';

export function CompaniesList() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCompanies, setSelectedCompanies] = useState<number[]>([]);
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [industryFilter, setIndustryFilter] = useState('All Industries');
  const [sizeFilter, setSizeFilter] = useState('All Company Sizes');
  const [locationFilter, setLocationFilter] = useState('All Locations');

  const companies = [
    {
      id: 1,
      name: 'Tech Solutions Inc',
      industry: 'Technology',
      size: '500-1000',
      location: 'New York, NY',
      website: 'www.techsolutions.com',
      phone: '+1 (555) 234-5678',
      email: 'contact@techsolutions.com',
      status: 'customer',
      contacts: 12,
      deals: 8,
      revenue: '$1.2M',
      lastActivity: '2 days ago',
      tags: ['Enterprise', 'VIP'],
      rating: 5,
      hasFolderAccess: true
    },
    {
      id: 2,
      name: 'Global Enterprises',
      industry: 'Consulting',
      size: '1000+',
      location: 'San Francisco, CA',
      website: 'www.globalent.com',
      phone: '+1 (555) 345-6789',
      email: 'info@globalent.com',
      status: 'customer',
      contacts: 18,
      deals: 12,
      revenue: '$2.4M',
      lastActivity: '1 day ago',
      tags: ['Enterprise', 'Strategic'],
      rating: 5,
      hasFolderAccess: true
    },
    {
      id: 3,
      name: 'Innovation Labs',
      industry: 'Software',
      size: '50-100',
      location: 'Austin, TX',
      website: 'www.innovationlabs.io',
      phone: '+1 (555) 456-7890',
      email: 'hello@innovationlabs.io',
      status: 'prospect',
      contacts: 5,
      deals: 2,
      revenue: '$180K',
      lastActivity: '3 days ago',
      tags: ['Startup', 'Tech'],
      rating: 4,
      hasFolderAccess: true
    },
    {
      id: 4,
      name: 'Enterprise Corp',
      industry: 'Manufacturing',
      size: '1000+',
      location: 'Chicago, IL',
      website: 'www.enterprisecorp.com',
      phone: '+1 (555) 678-9012',
      email: 'sales@enterprisecorp.com',
      status: 'customer',
      contacts: 25,
      deals: 15,
      revenue: '$3.1M',
      lastActivity: '1 week ago',
      tags: ['Enterprise', 'Manufacturing'],
      rating: 5,
      hasFolderAccess: true
    },
    {
      id: 5,
      name: 'Media Corporation',
      industry: 'Media & Entertainment',
      size: '100-500',
      location: 'Los Angeles, CA',
      website: 'www.mediacorp.com',
      phone: '+1 (555) 789-0123',
      email: 'contact@mediacorp.com',
      status: 'lead',
      contacts: 8,
      deals: 3,
      revenue: '$450K',
      lastActivity: '4 days ago',
      tags: ['Media', 'Hot Lead'],
      rating: 4,
      hasFolderAccess: true
    },
  ];

  const statusColors: Record<string, string> = {
    customer: 'bg-green-100 text-green-800',
    prospect: 'bg-blue-100 text-blue-800',
    lead: 'bg-yellow-100 text-yellow-800',
    inactive: 'bg-gray-100 text-gray-800',
  };

  const handleSelectAll = () => {
    if (selectedCompanies.length === companies.length) {
      setSelectedCompanies([]);
    } else {
      setSelectedCompanies(companies.map(c => c.id));
    }
  };

  const handleSelectCompany = (id: number) => {
    setSelectedCompanies(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Search and Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search companies by name, industry, location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              Filters
            </button>
            <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export
            </button>
            <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Company
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 md:grid-cols-4 gap-4">
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: 'All Status', label: 'All Status' },
                { value: 'Customer', label: 'Customer' },
                { value: 'Prospect', label: 'Prospect' },
                { value: 'Lead', label: 'Lead' },
                { value: 'Inactive', label: 'Inactive' }
              ]}
            />
            <Select
              value={industryFilter}
              onChange={setIndustryFilter}
              options={[
                { value: 'All Industries', label: 'All Industries' },
                { value: 'Technology', label: 'Technology' },
                { value: 'Consulting', label: 'Consulting' },
                { value: 'Software', label: 'Software' },
                { value: 'Manufacturing', label: 'Manufacturing' },
                { value: 'Media & Entertainment', label: 'Media & Entertainment' }
              ]}
            />
            <Select
              value={sizeFilter}
              onChange={setSizeFilter}
              options={[
                { value: 'All Company Sizes', label: 'All Company Sizes' },
                { value: '1-50', label: '1-50' },
                { value: '50-100', label: '50-100' },
                { value: '100-500', label: '100-500' },
                { value: '500-1000', label: '500-1000' },
                { value: '1000+', label: '1000+' }
              ]}
            />
            <Select
              value={locationFilter}
              onChange={setLocationFilter}
              options={[
                { value: 'All Locations', label: 'All Locations' },
                { value: 'New York, NY', label: 'New York, NY' },
                { value: 'San Francisco, CA', label: 'San Francisco, CA' },
                { value: 'Austin, TX', label: 'Austin, TX' },
                { value: 'Chicago, IL', label: 'Chicago, IL' }
              ]}
            />
          </div>
        )}
      </div>

      {/* Bulk Actions */}
      {selectedCompanies.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
          <span className="text-sm font-medium text-blue-900">
            {selectedCompanies.length} compan{selectedCompanies.length > 1 ? 'ies' : 'y'} selected
          </span>
          <div className="flex gap-2">
            <button className="px-3 py-1.5 text-sm font-medium text-blue-700 bg-white border border-blue-300 rounded hover:bg-blue-50">
              Send Email
            </button>
            <button className="px-3 py-1.5 text-sm font-medium text-blue-700 bg-white border border-blue-300 rounded hover:bg-blue-50">
              Add Tags
            </button>
            <button className="px-3 py-1.5 text-sm font-medium text-blue-700 bg-white border border-blue-300 rounded hover:bg-blue-50">
              Export Selected
            </button>
          </div>
        </div>
      )}

      {/* Companies Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {companies.map((company) => (
          <div key={company.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-4 flex-1">
                  <input
                    type="checkbox"
                    checked={selectedCompanies.includes(company.id)}
                    onChange={() => handleSelectCompany(company.id)}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 mt-1"
                  />
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                    {company.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900 truncate">{company.name}</h3>
                      {company.hasFolderAccess && (
                        <Folder className="w-4 h-4 text-blue-600 flex-shrink-0" title="Personal Folder" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                      <span>{company.industry}</span>
                      <span>•</span>
                      <span>{company.size} employees</span>
                    </div>
                    <div className="flex items-center gap-1 mb-2">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${i < company.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                        />
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusColors[company.status]}`}>
                        {company.status.charAt(0).toUpperCase() + company.status.slice(1)}
                      </span>
                      {company.tags.map((tag) => (
                        <span key={tag} className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded flex-shrink-0">
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  {company.location}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Globe className="w-4 h-4 text-gray-400" />
                  <a href={`https://${company.website}`} className="text-blue-600 hover:underline">
                    {company.website}
                  </a>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone className="w-4 h-4 text-gray-400" />
                  {company.phone}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail className="w-4 h-4 text-gray-400" />
                  {company.email}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 py-4 border-t border-gray-200 mb-4">
                <div>
                  <div className="flex items-center gap-1 text-gray-600 mb-1">
                    <Users className="w-4 h-4" />
                    <span className="text-xs">Contacts</span>
                  </div>
                  <p className="font-semibold text-gray-900">{company.contacts}</p>
                </div>
                <div>
                  <div className="flex items-center gap-1 text-gray-600 mb-1">
                    <TrendingUp className="w-4 h-4" />
                    <span className="text-xs">Deals</span>
                  </div>
                  <p className="font-semibold text-gray-900">{company.deals}</p>
                </div>
                <div>
                  <div className="flex items-center gap-1 text-gray-600 mb-1">
                    <DollarSign className="w-4 h-4" />
                    <span className="text-xs">Revenue</span>
                  </div>
                  <p className="font-semibold text-gray-900">{company.revenue}</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <Calendar className="w-4 h-4" />
                  Last activity: {company.lastActivity}
                </div>
                <div className="flex gap-2">
                  <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded" title="View Details">
                    <Eye className="w-4 h-4" />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded" title="Open Personal Folder">
                    <Folder className="w-4 h-4" />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded" title="Edit">
                    <Edit className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="bg-white rounded-lg border border-gray-200 px-6 py-4 flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Showing <span className="font-medium">1</span> to <span className="font-medium">5</span> of{' '}
          <span className="font-medium">456</span> companies
        </p>
        <div className="flex gap-2">
          <button className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50">
            Previous
          </button>
          <button className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700">
            1
          </button>
          <button className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50">
            2
          </button>
          <button className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50">
            3
          </button>
          <button className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50">
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
