import { useState } from 'react';
import { 
  Search, Filter, Plus, Download, Upload, MoreVertical,
  Mail, Phone, MapPin, Building2, Star, Eye, Edit, Trash2,
  Calendar, DollarSign, TrendingUp, Users, ExternalLink,
  Folder
} from 'lucide-react';
import { Select } from '../ui/input/Select';
import { PrimaryButton, SecondaryButton } from '../ui/button';
import { DataTable, type DataTableColumn } from '../ui/table';

export function ContactsList() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [selectedContacts, setSelectedContacts] = useState<number[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [companyFilter, setCompanyFilter] = useState('All Companies');
  const [locationFilter, setLocationFilter] = useState('All Locations');
  const [leadScoreFilter, setLeadScoreFilter] = useState('Lead Score: All');

  const contacts = [
    {
      id: 1,
      name: 'Sarah Johnson',
      email: 'sarah.johnson@techsolutions.com',
      phone: '+1 (555) 234-5678',
      company: 'Tech Solutions Inc',
      position: 'VP of Operations',
      location: 'New York, NY',
      status: 'active',
      leadScore: 95,
      deals: 3,
      totalValue: '$145K',
      lastContact: '2 days ago',
      tags: ['VIP', 'Enterprise'],
      avatar: 'SJ',
      hasFolderAccess: true
    },
    {
      id: 2,
      name: 'Michael Chen',
      email: 'mchen@globalent.com',
      phone: '+1 (555) 345-6789',
      company: 'Global Enterprises',
      position: 'Director of IT',
      location: 'San Francisco, CA',
      status: 'active',
      leadScore: 88,
      deals: 2,
      totalValue: '$98K',
      lastContact: '1 week ago',
      tags: ['Hot Lead'],
      avatar: 'MC',
      hasFolderAccess: true
    },
    {
      id: 3,
      name: 'Emily Rodriguez',
      email: 'emily.r@innovationlabs.io',
      phone: '+1 (555) 456-7890',
      company: 'Innovation Labs',
      position: 'CEO',
      location: 'Austin, TX',
      status: 'prospect',
      leadScore: 72,
      deals: 1,
      totalValue: '$67K',
      lastContact: '3 days ago',
      tags: ['Startup', 'Tech'],
      avatar: 'ER',
      hasFolderAccess: true
    },
    {
      id: 4,
      name: 'David Park',
      email: 'dpark@startupxyz.com',
      phone: '+1 (555) 567-8901',
      company: 'StartupXYZ',
      position: 'Founder',
      location: 'Seattle, WA',
      status: 'active',
      leadScore: 91,
      deals: 4,
      totalValue: '$212K',
      lastContact: '5 hours ago',
      tags: ['VIP', 'Startup'],
      avatar: 'DP',
      hasFolderAccess: true
    },
    {
      id: 5,
      name: 'Lisa Anderson',
      email: 'landerson@enterprisecorp.com',
      phone: '+1 (555) 678-9012',
      company: 'Enterprise Corp',
      position: 'Procurement Manager',
      location: 'Chicago, IL',
      status: 'nurture',
      leadScore: 65,
      deals: 1,
      totalValue: '$45K',
      lastContact: '2 weeks ago',
      tags: ['Enterprise'],
      avatar: 'LA',
      hasFolderAccess: true
    },
    {
      id: 6,
      name: 'Robert Taylor',
      email: 'rtaylor@mediacorp.com',
      phone: '+1 (555) 789-0123',
      company: 'Media Corporation',
      position: 'Marketing Director',
      location: 'Los Angeles, CA',
      status: 'active',
      leadScore: 84,
      deals: 2,
      totalValue: '$123K',
      lastContact: '1 day ago',
      tags: ['Media', 'Hot Lead'],
      avatar: 'RT',
      hasFolderAccess: true
    },
  ];

  const statusColors: Record<string, string> = {
    active: 'bg-green-500/20 text-green-400 border border-green-500/30',
    prospect: 'bg-orange-500/20 text-orange-400 border border-orange-500/30',
    nurture: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
    inactive: 'bg-gray-500/20 text-gray-400 border border-gray-500/30',
  };

  const getLeadScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-400';
    if (score >= 70) return 'text-orange-400';
    if (score >= 50) return 'text-amber-400';
    return 'text-red-400';
  };

  const handleSelectAll = () => {
    if (selectedContacts.length === contacts.length) {
      setSelectedContacts([]);
    } else {
      setSelectedContacts(contacts.map(c => c.id));
    }
  };

  const handleSelectContact = (id: number) => {
    setSelectedContacts(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const columns: DataTableColumn<typeof contacts[0]>[] = [
    {
      key: 'select',
      header: '',
      width: '50px',
      headerRender: () => (
        <input
          type="checkbox"
          checked={selectedContacts.length === contacts.length}
          onChange={handleSelectAll}
          className="w-4 h-4 text-orange-600 bg-[#0A0A0A] border-[#2A2A2A] rounded focus:ring-orange-500 focus:ring-offset-0"
        />
      ),
      render: (contact) => (
        <input
          type="checkbox"
          checked={selectedContacts.includes(contact.id)}
          onChange={(e) => {
            e.stopPropagation();
            handleSelectContact(contact.id);
          }}
          onClick={(e) => e.stopPropagation()}
          className="w-4 h-4 text-orange-600 bg-[#0A0A0A] border-[#2A2A2A] rounded focus:ring-orange-500 focus:ring-offset-0"
        />
      )
    },
    {
      key: 'contact',
      header: 'Contact',
      render: (contact) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-600 to-orange-700 text-white flex items-center justify-center font-semibold flex-shrink-0">
            {contact.avatar}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-medium text-white">{contact.name}</p>
              {contact.hasFolderAccess && (
                <Folder className="w-4 h-4 text-orange-400" title="Personal Folder" />
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <MapPin className="w-3 h-3 text-gray-400" />
              <p className="text-sm text-gray-400">{contact.location}</p>
            </div>
          </div>
        </div>
      )
    },
    {
      key: 'company',
      header: 'Company & Position',
      render: (contact) => (
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-gray-400" />
          <div>
            <p className="font-medium text-white">{contact.company}</p>
            <p className="text-sm text-gray-400">{contact.position}</p>
          </div>
        </div>
      )
    },
    {
      key: 'contactInfo',
      header: 'Contact Info',
      render: (contact) => (
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Mail className="w-4 h-4 text-gray-500" />
            {contact.email}
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Phone className="w-4 h-4 text-gray-500" />
            {contact.phone}
          </div>
        </div>
      )
    },
    {
      key: 'status',
      header: 'Status',
      render: (contact) => (
        <div className="space-y-2">
          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-lg ${statusColors[contact.status]}`}>
            {contact.status.charAt(0).toUpperCase() + contact.status.slice(1)}
          </span>
          <div className="flex gap-1">
            {contact.tags.map((tag) => (
              <span key={tag} className="px-2 py-0.5 text-xs bg-[#2A2A2A] text-gray-400 rounded border border-[#3A3A3A]">
                {tag}
              </span>
            ))}
          </div>
        </div>
      )
    },
    {
      key: 'leadScore',
      header: 'Lead Score',
      render: (contact) => (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 bg-[#2A2A2A] rounded-full overflow-hidden">
            <div
              className={`h-full ${contact.leadScore >= 90 ? 'bg-green-500' : contact.leadScore >= 70 ? 'bg-orange-500' : 'bg-amber-500'}`}
              style={{ width: `${contact.leadScore}%` }}
            ></div>
          </div>
          <span className={`text-sm font-semibold ${getLeadScoreColor(contact.leadScore)}`}>
            {contact.leadScore}
          </span>
        </div>
      )
    },
    {
      key: 'deals',
      header: 'Deals',
      render: (contact) => (
        <div>
          <p className="font-medium text-white">{contact.deals} deals</p>
          <p className="text-sm text-gray-400">{contact.totalValue}</p>
        </div>
      )
    },
    {
      key: 'lastContact',
      header: 'Last Contact',
      render: (contact) => (
        <div className="flex items-center gap-1 text-sm text-gray-400">
          <Calendar className="w-4 h-4 text-gray-500" />
          {contact.lastContact}
        </div>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (contact) => (
        <div className="flex items-center justify-end gap-2">
          <button 
            className="p-1.5 text-gray-400 hover:text-orange-400 hover:bg-orange-500/10 rounded transition" 
            title="View Details"
            onClick={(e) => e.stopPropagation()}
          >
            <Eye className="w-4 h-4" />
          </button>
          <button 
            className="p-1.5 text-gray-400 hover:text-orange-400 hover:bg-orange-500/10 rounded transition" 
            title="Open Personal Folder"
            onClick={(e) => e.stopPropagation()}
          >
            <Folder className="w-4 h-4" />
          </button>
          <button 
            className="p-1.5 text-gray-400 hover:text-orange-400 hover:bg-orange-500/10 rounded transition" 
            title="Edit"
            onClick={(e) => e.stopPropagation()}
          >
            <Edit className="w-4 h-4" />
          </button>
          <button 
            className="p-1.5 text-gray-400 hover:text-white hover:bg-[#2A2A2A] rounded transition"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Search and Filters */}
      <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search contacts by name, email, company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2 text-sm font-medium text-gray-300 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl hover:bg-[#2A2A2A] transition flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              Filters
            </button>
            <SecondaryButton
              variant="ghost"
              icon={<Download className="w-4 h-4" />}
              className="border border-[#2A2A2A]"
            >
              Export
            </SecondaryButton>
            <PrimaryButton
              icon={<Plus className="w-4 h-4" />}
              className="shadow-lg shadow-orange-500/20"
            >
              Add Contact
            </PrimaryButton>
          </div>
        </div>

        {showFilters && (
          <div className="mt-4 pt-4 border-t border-[#2A2A2A] grid grid-cols-1 md:grid-cols-4 gap-4">
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: 'All Status', label: 'All Status' },
                { value: 'Active', label: 'Active' },
                { value: 'Prospect', label: 'Prospect' },
                { value: 'Nurture', label: 'Nurture' },
                { value: 'Inactive', label: 'Inactive' }
              ]}
            />
            <Select
              value={companyFilter}
              onChange={setCompanyFilter}
              options={[
                { value: 'All Companies', label: 'All Companies' },
                { value: 'Tech Solutions Inc', label: 'Tech Solutions Inc' },
                { value: 'Global Enterprises', label: 'Global Enterprises' },
                { value: 'Innovation Labs', label: 'Innovation Labs' }
              ]}
            />
            <Select
              value={locationFilter}
              onChange={setLocationFilter}
              options={[
                { value: 'All Locations', label: 'All Locations' },
                { value: 'New York, NY', label: 'New York, NY' },
                { value: 'San Francisco, CA', label: 'San Francisco, CA' },
                { value: 'Austin, TX', label: 'Austin, TX' }
              ]}
            />
            <Select
              value={leadScoreFilter}
              onChange={setLeadScoreFilter}
              options={[
                { value: 'Lead Score: All', label: 'Lead Score: All' },
                { value: '90-100 (Hot)', label: '90-100 (Hot)' },
                { value: '70-89 (Warm)', label: '70-89 (Warm)' },
                { value: '50-69 (Cold)', label: '50-69 (Cold)' }
              ]}
            />
          </div>
        )}
      </div>

      {/* Bulk Actions */}
      {selectedContacts.length > 0 && (
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 flex items-center justify-between">
          <span className="text-sm font-medium text-orange-400">
            {selectedContacts.length} contact{selectedContacts.length > 1 ? 's' : ''} selected
          </span>
          <div className="flex gap-2">
            <button className="px-3 py-1.5 text-sm font-medium text-orange-400 bg-[#1A1A1A] border border-orange-500/30 rounded-lg hover:bg-orange-500/10 transition">
              Send Email
            </button>
            <button className="px-3 py-1.5 text-sm font-medium text-orange-400 bg-[#1A1A1A] border border-orange-500/30 rounded-lg hover:bg-orange-500/10 transition">
              Add Tags
            </button>
            <button className="px-3 py-1.5 text-sm font-medium text-orange-400 bg-[#1A1A1A] border border-orange-500/30 rounded-lg hover:bg-orange-500/10 transition">
              Export Selected
            </button>
            <button className="px-3 py-1.5 text-sm font-medium text-red-400 bg-[#1A1A1A] border border-red-500/30 rounded-lg hover:bg-red-500/10 transition">
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Contacts Table */}
      <DataTable
        columns={columns}
        data={contacts}
        rowHoverEffect={true}
        containerClassName="bg-[#1A1A1A] border-[#2A2A2A]"
      />

      {/* Pagination */}
      <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] px-6 py-4 flex items-center justify-between">
        <p className="text-sm text-gray-400">
          Showing <span className="font-medium text-white">1</span> to <span className="font-medium text-white">6</span> of{' '}
          <span className="font-medium text-white">2,847</span> contacts
        </p>
        <div className="flex gap-2">
          <button className="px-3 py-1.5 text-sm font-medium text-gray-300 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg hover:bg-[#2A2A2A] transition">
            Previous
          </button>
          <button className="px-3 py-1.5 text-sm font-medium text-white bg-gradient-to-r from-orange-600 to-orange-700 rounded-lg shadow-lg shadow-orange-500/20">
            1
          </button>
          <button className="px-3 py-1.5 text-sm font-medium text-gray-300 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg hover:bg-[#2A2A2A] transition">
            2
          </button>
          <button className="px-3 py-1.5 text-sm font-medium text-gray-300 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg hover:bg-[#2A2A2A] transition">
            3
          </button>
          <button className="px-3 py-1.5 text-sm font-medium text-gray-300 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg hover:bg-[#2A2A2A] transition">
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
