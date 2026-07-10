import { useState, useEffect, useMemo } from 'react';
import {
  Users, Building2, Search, Filter, Mail, MessageSquare, Plus,
  Download, Upload, Send, CheckSquare, Tag, UserCheck, Home,
  Briefcase, TrendingUp, Store, Construction, Megaphone, DollarSign,
  ArrowLeft, Phone, Calendar, MapPin, Eye, Edit, Trash2, MoreVertical,
  X, ChevronDown, Map
} from 'lucide-react';

// Contact Types
type ContactType =
  | 'customer'
  | 'property_manager'
  | 'landlord'
  | 'condo'
  | 'subcontractor'
  | 'vendor'
  | 'investor'
  | 'advertiser'
  | 'employee'
  | 'supplier'
  | 'territory';

interface Contact {
  id: string;
  name: string;
  type: ContactType;
  email: string;
  phone: string;
  company?: string;
  location?: string;
  tags: string[];
  lastContact?: string;
  status: 'active' | 'inactive' | 'lead' | 'prospect';
  notes?: string;
  avatar?: string;
}

// Mock data for demonstration
const mockContacts: Contact[] = [
  {
    id: '1',
    name: 'John Smith',
    type: 'customer',
    email: 'john.smith@email.com',
    phone: '(555) 123-4567',
    company: 'Smith Residence',
    location: 'New York, NY',
    tags: ['VIP', 'Repeat Customer'],
    lastContact: '2024-05-15',
    status: 'active'
  },
  {
    id: '2',
    name: 'Sarah Johnson',
    type: 'property_manager',
    email: 'sarah.j@propertymanagement.com',
    phone: '(555) 234-5678',
    company: 'Premier Property Management',
    location: 'Boston, MA',
    tags: ['50+ Units'],
    lastContact: '2024-05-20',
    status: 'active'
  },
  {
    id: '3',
    name: 'Mike Davis',
    type: 'subcontractor',
    email: 'mike@daviselectrical.com',
    phone: '(555) 345-6789',
    company: 'Davis Electrical',
    location: 'Chicago, IL',
    tags: ['Licensed', 'Insured'],
    lastContact: '2024-05-18',
    status: 'active'
  },
  {
    id: '4',
    name: 'Empire Investors LLC',
    type: 'investor',
    email: 'contact@empireinvestors.com',
    phone: '(555) 456-7890',
    company: 'Empire Investors',
    location: 'San Francisco, CA',
    tags: ['High Net Worth', 'Multi-Property'],
    lastContact: '2024-05-22',
    status: 'active'
  },
  {
    id: '5',
    name: 'BuildPro Supply Co',
    type: 'vendor',
    email: 'orders@buildprosupply.com',
    phone: '(555) 567-8901',
    company: 'BuildPro Supply',
    location: 'Atlanta, GA',
    tags: ['Bulk Discount', 'Net 30'],
    lastContact: '2024-05-19',
    status: 'active'
  },
  {
    id: '6',
    name: 'Northwest Territory Group',
    type: 'territory',
    email: 'contact@nwterritory.com',
    phone: '(555) 678-9012',
    company: 'NW Territory Partners',
    location: 'Seattle, WA',
    tags: ['Regional Partner', 'Multi-State'],
    lastContact: '2024-05-21',
    status: 'active'
  }
];

export default function UnifiedCRMHub({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<ContactType | 'all'>('all');
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>(mockContacts);

  // Modal states
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [showEditContactModal, setShowEditContactModal] = useState(false);
  const [showViewContactModal, setShowViewContactModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [contactToDelete, setContactToDelete] = useState<string | null>(null);

  // Load companies and saved contacts on mount
  useEffect(() => {
    const loadData = () => {
      console.log('[CRM Hub] Loading data...');

      // Load saved CRM contacts from localStorage
      const savedContacts = localStorage.getItem('crm_contacts');
      let loadedContacts: Contact[] = [];

      if (savedContacts) {
        try {
          loadedContacts = JSON.parse(savedContacts);
          console.log(`[CRM Hub] Loaded ${loadedContacts.length} saved contacts`);
        } catch (error) {
          console.error('[CRM Hub] Error parsing saved contacts:', error);
        }
      }

      // Load companies from cache and convert to territory contacts
      const companiesCache = localStorage.getItem('companies_cache');
      if (companiesCache) {
        try {
          const companies = JSON.parse(companiesCache);
          if (Array.isArray(companies) && companies.length > 0) {
            console.log(`[CRM Hub] Loading ${companies.length} companies as territory contacts`);

            const territoryContacts: Contact[] = companies.map((company: any) => ({
              id: `territory-${company.id}`,
              name: company.name || 'Unnamed Company',
              type: 'territory' as ContactType,
              email: company.email || '',
              phone: company.phone || '',
              company: company.dba || company.name || 'Unnamed Company',
              location: company.city && company.state
                ? `${company.city}, ${company.state}`
                : company.address || '',
              tags: [
                company.industry || 'General',
                company.is_primary ? 'Primary' : 'Partner',
                ...(company.employee_count ? [`${company.employee_count} Employees`] : [])
              ].filter(Boolean),
              lastContact: company.updated_at || company.created_at || new Date().toISOString().split('T')[0],
              status: 'active' as const,
              avatar: company.logo_url,
              notes: company.description
            }));

            loadedContacts = [...loadedContacts, ...territoryContacts];
          }
        } catch (error) {
          console.error('[CRM Hub] Error loading companies:', error);
        }
      }

      // If we have loaded contacts, use them; otherwise use mock data
      if (loadedContacts.length > 0) {
        setContacts(loadedContacts);
        console.log(`[CRM Hub] Total contacts loaded: ${loadedContacts.length}`);
      } else {
        console.log('[CRM Hub] No saved data, using mock contacts');
        setContacts(mockContacts);
      }
    };

    loadData();

    // Listen for storage changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'companies_cache' || e.key === 'crm_contacts') {
        console.log('[CRM Hub] Storage updated, reloading data');
        loadData();
      }
    };

    // Listen for custom events
    const handleCompanyUpdate = () => {
      console.log('[CRM Hub] Company update event, reloading data');
      loadData();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('companiesUpdated', handleCompanyUpdate);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('companiesUpdated', handleCompanyUpdate);
    };
  }, []);

  // Contact type configuration
  const contactTypes: { value: ContactType | 'all'; label: string; icon: any; color: string; count: number }[] = [
    { value: 'all', label: 'All Contacts', icon: Users, color: 'gray', count: contacts.length },
    { value: 'customer', label: 'Customers', icon: UserCheck, color: 'blue', count: contacts.filter(c => c.type === 'customer').length },
    { value: 'property_manager', label: 'Property Managers', icon: Building2, color: 'purple', count: contacts.filter(c => c.type === 'property_manager').length },
    { value: 'landlord', label: 'Landlords', icon: Home, color: 'green', count: contacts.filter(c => c.type === 'landlord').length },
    { value: 'condo', label: 'Condo Associations', icon: Building2, color: 'cyan', count: contacts.filter(c => c.type === 'condo').length },
    { value: 'subcontractor', label: 'Subcontractors', icon: Construction, color: 'orange', count: contacts.filter(c => c.type === 'subcontractor').length },
    { value: 'vendor', label: 'Vendors', icon: Store, color: 'indigo', count: contacts.filter(c => c.type === 'vendor').length },
    { value: 'investor', label: 'Investors', icon: TrendingUp, color: 'emerald', count: contacts.filter(c => c.type === 'investor').length },
    { value: 'advertiser', label: 'Advertisers', icon: Megaphone, color: 'pink', count: contacts.filter(c => c.type === 'advertiser').length },
    { value: 'supplier', label: 'Suppliers', icon: Briefcase, color: 'yellow', count: contacts.filter(c => c.type === 'supplier').length },
    { value: 'territory', label: 'Territory Partners', icon: Map, color: 'teal', count: contacts.filter(c => c.type === 'territory').length },
  ];

  // Filter contacts based on search and type
  const filteredContacts = useMemo(() => {
    return contacts.filter(contact => {
      const matchesSearch = searchQuery === '' ||
        contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.phone.includes(searchQuery) ||
        contact.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesType = selectedType === 'all' || contact.type === selectedType;

      return matchesSearch && matchesType;
    });
  }, [contacts, searchQuery, selectedType]);

  // Group contacts by type
  const groupedContacts = useMemo(() => {
    const groups: { [key in ContactType]?: Contact[] } = {};
    filteredContacts.forEach(contact => {
      if (!groups[contact.type]) {
        groups[contact.type] = [];
      }
      groups[contact.type]!.push(contact);
    });
    return groups;
  }, [filteredContacts]);

  // Toggle contact selection
  const toggleContactSelection = (contactId: string) => {
    const newSelection = new Set(selectedContacts);
    if (newSelection.has(contactId)) {
      newSelection.delete(contactId);
    } else {
      newSelection.add(contactId);
    }
    setSelectedContacts(newSelection);
  };

  // Select all contacts
  const selectAllContacts = () => {
    if (selectedContacts.size === filteredContacts.length) {
      setSelectedContacts(new Set());
    } else {
      setSelectedContacts(new Set(filteredContacts.map(c => c.id)));
    }
  };

  // Select all in group
  const selectAllInGroup = (type: ContactType) => {
    const groupContacts = filteredContacts.filter(c => c.type === type);
    const allSelected = groupContacts.every(c => selectedContacts.has(c.id));

    const newSelection = new Set(selectedContacts);
    groupContacts.forEach(contact => {
      if (allSelected) {
        newSelection.delete(contact.id);
      } else {
        newSelection.add(contact.id);
      }
    });
    setSelectedContacts(newSelection);
  };

  // Get color classes for contact type
  const getTypeColor = (type: ContactType) => {
    const typeConfig = contactTypes.find(t => t.value === type);
    const color = typeConfig?.color || 'gray';
    return {
      bg: `bg-${color}-500/10`,
      border: `border-${color}-500/30`,
      text: `text-${color}-400`,
      hover: `hover:border-${color}-500/50`
    };
  };

  // Handle bulk email
  const handleBulkEmail = () => {
    const selectedContactsList = contacts.filter(c => selectedContacts.has(c.id));
    const emails = selectedContactsList.map(c => c.email).filter(e => e).join(', ');
    if (emails) {
      window.location.href = `mailto:${emails}`;
    }
  };

  // Handle bulk message
  const handleBulkMessage = () => {
    const selectedContactsList = contacts.filter(c => selectedContacts.has(c.id));
    setSelectedContact(null); // Bulk message
    setShowMessageModal(true);
  };

  // Handle group email
  const handleGroupEmail = (type: ContactType) => {
    const groupContacts = contacts.filter(c => c.type === type);
    const emails = groupContacts.map(c => c.email).filter(e => e).join(', ');
    if (emails) {
      window.location.href = `mailto:${emails}`;
    }
  };

  // Handle group message
  const handleGroupMessage = (type: ContactType) => {
    const groupContacts = contacts.filter(c => c.type === type);
    setSelectedContact({ type } as Contact); // Store type for group message
    setShowMessageModal(true);
  };

  // Handle add contact
  const handleAddContact = (newContact: Partial<Contact>) => {
    const contact: Contact = {
      id: `contact-${Date.now()}`,
      name: newContact.name || '',
      type: newContact.type || 'customer',
      email: newContact.email || '',
      phone: newContact.phone || '',
      company: newContact.company,
      location: newContact.location,
      tags: newContact.tags || [],
      status: newContact.status || 'active',
      notes: newContact.notes,
      avatar: newContact.avatar,
      lastContact: new Date().toISOString().split('T')[0]
    };
    setContacts([...contacts, contact]);
    setShowAddContactModal(false);

    // Save to localStorage
    localStorage.setItem('crm_contacts', JSON.stringify([...contacts, contact]));
  };

  // Handle edit contact
  const handleEditContact = (updatedContact: Contact) => {
    const updatedContacts = contacts.map(c =>
      c.id === updatedContact.id ? updatedContact : c
    );
    setContacts(updatedContacts);
    setShowEditContactModal(false);
    setSelectedContact(null);

    // Save to localStorage
    localStorage.setItem('crm_contacts', JSON.stringify(updatedContacts));
  };

  // Handle delete contact
  const handleDeleteContact = () => {
    if (contactToDelete) {
      const updatedContacts = contacts.filter(c => c.id !== contactToDelete);
      setContacts(updatedContacts);
      setContactToDelete(null);
      setShowDeleteModal(false);

      // Save to localStorage
      localStorage.setItem('crm_contacts', JSON.stringify(updatedContacts));
    }
  };

  // Handle view contact
  const handleViewContact = (contact: Contact) => {
    setSelectedContact(contact);
    setShowViewContactModal(true);
  };

  // Handle initiate edit
  const handleInitiateEdit = (contact: Contact) => {
    setSelectedContact(contact);
    setShowEditContactModal(true);
  };

  // Handle initiate delete
  const handleInitiateDelete = (contactId: string) => {
    setContactToDelete(contactId);
    setShowDeleteModal(true);
  };

  // Handle initiate message
  const handleInitiateMessage = (contact: Contact) => {
    setSelectedContact(contact);
    setShowMessageModal(true);
  };

  // Handle export
  const handleExport = () => {
    const dataStr = JSON.stringify(contacts, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `crm-contacts-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Handle import
  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const imported = JSON.parse(e.target?.result as string);
          if (Array.isArray(imported)) {
            setContacts([...contacts, ...imported]);
            localStorage.setItem('crm_contacts', JSON.stringify([...contacts, ...imported]));
            alert(`Imported ${imported.length} contacts`);
          }
        } catch (error) {
          alert('Error importing contacts. Please check the file format.');
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {/* Header */}
      <div className="bg-[#0F0F0F] border-b border-[#2A2A2A] px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate?.('unified-dashboard')}
              className="p-2 hover:bg-[#2A2A2A] rounded-lg transition-colors text-gray-400 hover:text-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">CRM Hub</h1>
              <p className="text-sm text-gray-400 mt-1">
                Manage all contacts, relationships, and communications
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-[#1A1A1A] border border-[#2A2A2A] hover:border-gray-500/50 text-gray-300 rounded-lg transition-all flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            <label className="px-4 py-2 bg-[#1A1A1A] border border-[#2A2A2A] hover:border-gray-500/50 text-gray-300 rounded-lg transition-all flex items-center gap-2 cursor-pointer">
              <Upload className="w-4 h-4" />
              Import
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
              />
            </label>
            <button
              onClick={() => setShowAddContactModal(true)}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white rounded-lg transition-all flex items-center gap-2 shadow-lg shadow-blue-500/20"
            >
              <Plus className="w-4 h-4" />
              Add Contact
            </button>
          </div>
        </div>

        {/* Search and Filter Bar */}
        <div className="mt-6 flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search contacts by name, email, company, phone, or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500/50"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-3 border rounded-lg transition-all flex items-center gap-2 ${
              showFilters
                ? 'bg-blue-600/20 border-blue-500/50 text-blue-400'
                : 'bg-[#1A1A1A] border-[#2A2A2A] text-gray-300 hover:border-gray-500/50'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>
          {selectedContacts.size > 0 && (
            <button
              onClick={() => setShowBulkActions(!showBulkActions)}
              className="px-4 py-3 bg-orange-600/20 border border-orange-500/50 hover:border-orange-500 text-orange-400 rounded-lg transition-all flex items-center gap-2"
            >
              <CheckSquare className="w-4 h-4" />
              {selectedContacts.size} Selected
              <ChevronDown className={`w-4 h-4 transition-transform ${showBulkActions ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>

        {/* Bulk Actions Dropdown */}
        {showBulkActions && selectedContacts.size > 0 && (
          <div className="mt-4 p-4 bg-[#1A1A1A] border border-orange-500/30 rounded-lg">
            <div className="flex items-center gap-3">
              <button
                onClick={handleBulkEmail}
                className="px-4 py-2 bg-blue-600/20 border border-blue-500/50 hover:bg-blue-600/30 text-blue-400 rounded-lg transition-all flex items-center gap-2"
              >
                <Mail className="w-4 h-4" />
                Email All ({selectedContacts.size})
              </button>
              <button
                onClick={handleBulkMessage}
                className="px-4 py-2 bg-green-600/20 border border-green-500/50 hover:bg-green-600/30 text-green-400 rounded-lg transition-all flex items-center gap-2"
              >
                <MessageSquare className="w-4 h-4" />
                Message All ({selectedContacts.size})
              </button>
              <button
                onClick={() => setSelectedContacts(new Set())}
                className="px-4 py-2 bg-red-600/20 border border-red-500/50 hover:bg-red-600/30 text-red-400 rounded-lg transition-all flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Clear Selection
              </button>
              <div className="flex-1" />
              <button className="px-4 py-2 bg-[#2A2A2A] border border-[#3A3A3A] hover:border-gray-500/50 text-gray-300 rounded-lg transition-all flex items-center gap-2">
                <Tag className="w-4 h-4" />
                Add Tags
              </button>
              <button className="px-4 py-2 bg-red-600/20 border border-red-500/50 hover:bg-red-600/30 text-red-400 rounded-lg transition-all flex items-center gap-2">
                <Trash2 className="w-4 h-4" />
                Delete Selected
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Contact Type Tabs */}
      <div className="bg-[#0F0F0F] border-b border-[#2A2A2A] px-6 overflow-x-auto">
        <div className="flex items-center gap-2 py-4 min-w-max">
          {contactTypes.map((type) => {
            const Icon = type.icon;
            const isActive = selectedType === type.value;
            return (
              <button
                key={type.value}
                onClick={() => setSelectedType(type.value)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all whitespace-nowrap ${
                  isActive
                    ? `bg-${type.color}-600/20 border border-${type.color}-500/50 text-${type.color}-400`
                    : 'bg-[#1A1A1A] border border-[#2A2A2A] text-gray-400 hover:border-gray-500/50 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                {type.label}
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  isActive ? `bg-${type.color}-500/30` : 'bg-[#2A2A2A]'
                }`}>
                  {type.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        {/* Stats Bar */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Contacts</p>
                <p className="text-2xl font-bold text-white mt-1">{filteredContacts.length}</p>
              </div>
              <Users className="w-8 h-8 text-blue-400" />
            </div>
          </div>
          <div className="p-4 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Selected</p>
                <p className="text-2xl font-bold text-white mt-1">{selectedContacts.size}</p>
              </div>
              <CheckSquare className="w-8 h-8 text-orange-400" />
            </div>
          </div>
          <div className="p-4 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Active</p>
                <p className="text-2xl font-bold text-white mt-1">
                  {filteredContacts.filter(c => c.status === 'active').length}
                </p>
              </div>
              <UserCheck className="w-8 h-8 text-green-400" />
            </div>
          </div>
          <div className="p-4 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Groups</p>
                <p className="text-2xl font-bold text-white mt-1">{Object.keys(groupedContacts).length}</p>
              </div>
              <Building2 className="w-8 h-8 text-purple-400" />
            </div>
          </div>
        </div>

        {/* Contacts List - Grouped by Type */}
        {selectedType === 'all' ? (
          // Show grouped view
          <div className="space-y-6">
            {Object.entries(groupedContacts).map(([type, typeContacts]) => {
              const typeConfig = contactTypes.find(t => t.value === type);
              const Icon = typeConfig?.icon || Users;
              const allSelected = typeContacts.every(c => selectedContacts.has(c.id));

              return (
                <div key={type} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl overflow-hidden">
                  {/* Group Header */}
                  <div className="bg-[#0F0F0F] border-b border-[#2A2A2A] p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg bg-${typeConfig?.color}-600/20 border border-${typeConfig?.color}-500/30 flex items-center justify-center`}>
                        <Icon className={`w-5 h-5 text-${typeConfig?.color}-400`} />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white">{typeConfig?.label}</h3>
                        <p className="text-sm text-gray-400">{typeContacts.length} contacts</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => selectAllInGroup(type as ContactType)}
                        className={`px-3 py-1.5 text-sm rounded-lg transition-all flex items-center gap-2 ${
                          allSelected
                            ? 'bg-orange-600/20 border border-orange-500/50 text-orange-400'
                            : 'bg-[#2A2A2A] border border-[#3A3A3A] text-gray-400 hover:border-gray-500/50'
                        }`}
                      >
                        <CheckSquare className="w-4 h-4" />
                        {allSelected ? 'Deselect All' : 'Select All'}
                      </button>
                      <button className="px-3 py-1.5 text-sm bg-blue-600/20 border border-blue-500/50 text-blue-400 rounded-lg hover:bg-blue-600/30 transition-all flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        Email Group
                      </button>
                      <button className="px-3 py-1.5 text-sm bg-green-600/20 border border-green-500/50 text-green-400 rounded-lg hover:bg-green-600/30 transition-all flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" />
                        Message Group
                      </button>
                    </div>
                  </div>

                  {/* Contacts in Group */}
                  <div className="divide-y divide-[#2A2A2A]">
                    {typeContacts.map((contact) => (
                      <ContactCard
                        key={contact.id}
                        contact={contact}
                        isSelected={selectedContacts.has(contact.id)}
                        onToggleSelect={() => toggleContactSelection(contact.id)}
                        onView={handleViewContact}
                        onEdit={handleInitiateEdit}
                        onDelete={handleInitiateDelete}
                        onMessage={handleInitiateMessage}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          // Show single type view
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl overflow-hidden">
            <div className="bg-[#0F0F0F] border-b border-[#2A2A2A] p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={selectAllContacts}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-all flex items-center gap-2 ${
                    selectedContacts.size === filteredContacts.length
                      ? 'bg-orange-600/20 border border-orange-500/50 text-orange-400'
                      : 'bg-[#2A2A2A] border border-[#3A3A3A] text-gray-400 hover:border-gray-500/50'
                  }`}
                >
                  <CheckSquare className="w-4 h-4" />
                  {selectedContacts.size === filteredContacts.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>
            </div>
            <div className="divide-y divide-[#2A2A2A]">
              {filteredContacts.map((contact) => (
                <ContactCard
                  key={contact.id}
                  contact={contact}
                  isSelected={selectedContacts.has(contact.id)}
                  onToggleSelect={() => toggleContactSelection(contact.id)}
                  onView={handleViewContact}
                  onEdit={handleInitiateEdit}
                  onDelete={handleInitiateDelete}
                  onMessage={handleInitiateMessage}
                />
              ))}
            </div>
          </div>
        )}

        {filteredContacts.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-400 mb-2">No contacts found</h3>
            <p className="text-gray-500">Try adjusting your search or filters</p>
          </div>
        )}
      </div>

      {/* Add/Edit Contact Modal */}
      {(showAddContactModal || showEditContactModal) && (
        <AddEditContactModal
          contact={selectedContact}
          onSave={showEditContactModal ? handleEditContact : handleAddContact}
          onClose={() => {
            setShowAddContactModal(false);
            setShowEditContactModal(false);
            setSelectedContact(null);
          }}
        />
      )}

      {/* View Contact Modal */}
      {showViewContactModal && selectedContact && (
        <ViewContactModal
          contact={selectedContact}
          onClose={() => {
            setShowViewContactModal(false);
            setSelectedContact(null);
          }}
          onEdit={() => {
            setShowViewContactModal(false);
            setShowEditContactModal(true);
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <DeleteConfirmModal
          onConfirm={handleDeleteContact}
          onClose={() => {
            setShowDeleteModal(false);
            setContactToDelete(null);
          }}
        />
      )}

      {/* Message Modal */}
      {showMessageModal && selectedContact && (
        <MessageModal
          contact={selectedContact}
          onClose={() => {
            setShowMessageModal(false);
            setSelectedContact(null);
          }}
        />
      )}
    </div>
  );
}

// Contact Card Component
function ContactCard({
  contact,
  isSelected,
  onToggleSelect,
  onView,
  onEdit,
  onDelete,
  onMessage
}: {
  contact: Contact;
  isSelected: boolean;
  onToggleSelect: () => void;
  onView: (contact: Contact) => void;
  onEdit: (contact: Contact) => void;
  onDelete: (contactId: string) => void;
  onMessage: (contact: Contact) => void;
}) {
  const typeConfig = {
    customer: { color: 'blue', icon: UserCheck },
    property_manager: { color: 'purple', icon: Building2 },
    landlord: { color: 'green', icon: Home },
    condo: { color: 'cyan', icon: Building2 },
    subcontractor: { color: 'orange', icon: Construction },
    vendor: { color: 'indigo', icon: Store },
    investor: { color: 'emerald', icon: TrendingUp },
    advertiser: { color: 'pink', icon: Megaphone },
    employee: { color: 'yellow', icon: Users },
    supplier: { color: 'yellow', icon: Briefcase },
    territory: { color: 'teal', icon: Map },
  }[contact.type];

  return (
    <div className={`p-4 hover:bg-[#1A1A1A] transition-colors ${isSelected ? 'bg-orange-600/10' : ''}`}>
      <div className="flex items-center gap-4">
        {/* Checkbox */}
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
          className="w-5 h-5 rounded border-gray-600 bg-[#2A2A2A] checked:bg-orange-600 checked:border-orange-600 cursor-pointer"
        />

        {/* Avatar */}
        <div className={`w-12 h-12 rounded-lg bg-${typeConfig.color}-600/20 border border-${typeConfig.color}-500/30 flex items-center justify-center flex-shrink-0`}>
          {contact.avatar ? (
            <img src={contact.avatar} alt={contact.name} className="w-full h-full rounded-lg object-cover" />
          ) : (
            <span className={`text-lg font-bold text-${typeConfig.color}-400`}>
              {contact.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
            </span>
          )}
        </div>

        {/* Contact Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-white font-semibold">{contact.name}</h4>
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold bg-${typeConfig.color}-600/20 border border-${typeConfig.color}-500/30 text-${typeConfig.color}-400`}>
              {contact.type.replace('_', ' ')}
            </span>
            {contact.status === 'active' && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-green-600/20 border border-green-500/30 text-green-400">
                Active
              </span>
            )}
          </div>

          <div className="flex items-center gap-4 text-sm text-gray-400">
            {contact.company && (
              <div className="flex items-center gap-1">
                <Building2 className="w-4 h-4" />
                {contact.company}
              </div>
            )}
            {contact.location && (
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {contact.location}
              </div>
            )}
          </div>

          {contact.tags.length > 0 && (
            <div className="flex items-center gap-2 mt-2">
              {contact.tags.map((tag, index) => (
                <span key={index} className="px-2 py-0.5 rounded-full text-xs bg-[#2A2A2A] text-gray-400">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Contact Actions */}
        <div className="flex items-center gap-2">
          <a
            href={`tel:${contact.phone}`}
            className="p-2 bg-[#2A2A2A] hover:bg-blue-600/20 border border-[#3A3A3A] hover:border-blue-500/50 rounded-lg transition-all"
            title="Call"
          >
            <Phone className="w-4 h-4 text-gray-400 hover:text-blue-400" />
          </a>
          <a
            href={`mailto:${contact.email}`}
            className="p-2 bg-[#2A2A2A] hover:bg-blue-600/20 border border-[#3A3A3A] hover:border-blue-500/50 rounded-lg transition-all"
            title="Email"
          >
            <Mail className="w-4 h-4 text-gray-400 hover:text-blue-400" />
          </a>
          <button
            onClick={() => onMessage(contact)}
            className="p-2 bg-[#2A2A2A] hover:bg-green-600/20 border border-[#3A3A3A] hover:border-green-500/50 rounded-lg transition-all"
            title="Message"
          >
            <MessageSquare className="w-4 h-4 text-gray-400 hover:text-green-400" />
          </button>
          <button
            onClick={() => onView(contact)}
            className="p-2 bg-[#2A2A2A] hover:bg-purple-600/20 border border-[#3A3A3A] hover:border-purple-500/50 rounded-lg transition-all"
            title="View Details"
          >
            <Eye className="w-4 h-4 text-gray-400 hover:text-purple-400" />
          </button>
          <button
            onClick={() => onEdit(contact)}
            className="p-2 bg-[#2A2A2A] hover:bg-orange-600/20 border border-[#3A3A3A] hover:border-orange-500/50 rounded-lg transition-all"
            title="Edit"
          >
            <Edit className="w-4 h-4 text-gray-400 hover:text-orange-400" />
          </button>
          <button
            onClick={() => onDelete(contact.id)}
            className="p-2 bg-[#2A2A2A] hover:bg-red-600/20 border border-[#3A3A3A] hover:border-red-500/50 rounded-lg transition-all"
            title="Delete"
          >
            <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-400" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Add/Edit Contact Modal
function AddEditContactModal({
  contact,
  onSave,
  onClose
}: {
  contact: Contact | null;
  onSave: (contact: Contact | Partial<Contact>) => void;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState<Partial<Contact>>(
    contact || {
      name: '',
      type: 'customer',
      email: '',
      phone: '',
      company: '',
      location: '',
      tags: [],
      status: 'active',
      notes: ''
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(contact ? { ...contact, ...formData } : formData);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[#0F0F0F] border border-[#2A2A2A] rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-[#2A2A2A] flex items-center justify-between sticky top-0 bg-[#0F0F0F]">
          <h2 className="text-2xl font-bold text-white">
            {contact ? 'Edit Contact' : 'Add New Contact'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#2A2A2A] rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-blue-500/50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Type *
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as ContactType })}
                className="w-full px-4 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-blue-500/50"
              >
                <option value="customer">Customer</option>
                <option value="property_manager">Property Manager</option>
                <option value="landlord">Landlord</option>
                <option value="condo">Condo Association</option>
                <option value="subcontractor">Subcontractor</option>
                <option value="vendor">Vendor</option>
                <option value="investor">Investor</option>
                <option value="advertiser">Advertiser</option>
                <option value="employee">Employee</option>
                <option value="supplier">Supplier</option>
                <option value="territory">Territory Partner</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Status *
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' | 'lead' | 'prospect' })}
                className="w-full px-4 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-blue-500/50"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="lead">Lead</option>
                <option value="prospect">Prospect</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email *
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-blue-500/50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Phone *
              </label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-blue-500/50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Company
              </label>
              <input
                type="text"
                value={formData.company || ''}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                className="w-full px-4 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-blue-500/50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Location
              </label>
              <input
                type="text"
                value={formData.location || ''}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-4 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-blue-500/50"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Notes
              </label>
              <textarea
                rows={3}
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-4 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-blue-500/50"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white rounded-lg transition-all font-semibold"
            >
              {contact ? 'Save Changes' : 'Add Contact'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 bg-[#1A1A1A] border border-[#2A2A2A] hover:border-gray-500/50 text-gray-300 rounded-lg transition-all"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// View Contact Modal
function ViewContactModal({
  contact,
  onClose,
  onEdit
}: {
  contact: Contact;
  onClose: () => void;
  onEdit: () => void;
}) {
  const typeConfig = {
    customer: { color: 'blue', icon: UserCheck },
    property_manager: { color: 'purple', icon: Building2 },
    landlord: { color: 'green', icon: Home },
    condo: { color: 'cyan', icon: Building2 },
    subcontractor: { color: 'orange', icon: Construction },
    vendor: { color: 'indigo', icon: Store },
    investor: { color: 'emerald', icon: TrendingUp },
    advertiser: { color: 'pink', icon: Megaphone },
    employee: { color: 'yellow', icon: Users },
    supplier: { color: 'yellow', icon: Briefcase },
    territory: { color: 'teal', icon: Map },
  }[contact.type];

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[#0F0F0F] border border-[#2A2A2A] rounded-xl w-full max-w-2xl">
        <div className="p-6 border-b border-[#2A2A2A] flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Contact Details</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#2A2A2A] rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex items-center gap-4">
            <div className={`w-20 h-20 rounded-xl bg-${typeConfig.color}-600/20 border border-${typeConfig.color}-500/30 flex items-center justify-center`}>
              {contact.avatar ? (
                <img src={contact.avatar} alt={contact.name} className="w-full h-full rounded-xl object-cover" />
              ) : (
                <span className={`text-2xl font-bold text-${typeConfig.color}-400`}>
                  {contact.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                </span>
              )}
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white mb-2">{contact.name}</h3>
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-sm font-bold bg-${typeConfig.color}-600/20 border border-${typeConfig.color}-500/30 text-${typeConfig.color}-400`}>
                  {contact.type.replace('_', ' ')}
                </span>
                <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                  contact.status === 'active'
                    ? 'bg-green-600/20 border border-green-500/30 text-green-400'
                    : 'bg-gray-600/20 border border-gray-500/30 text-gray-400'
                }`}>
                  {contact.status}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Email</label>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-400" />
                <a href={`mailto:${contact.email}`} className="text-blue-400 hover:text-blue-300">
                  {contact.email}
                </a>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Phone</label>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-gray-400" />
                <a href={`tel:${contact.phone}`} className="text-blue-400 hover:text-blue-300">
                  {contact.phone}
                </a>
              </div>
            </div>

            {contact.company && (
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Company</label>
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-gray-400" />
                  <span className="text-white">{contact.company}</span>
                </div>
              </div>
            )}

            {contact.location && (
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Location</label>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span className="text-white">{contact.location}</span>
                </div>
              </div>
            )}

            {contact.lastContact && (
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Last Contact</label>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="text-white">{contact.lastContact}</span>
                </div>
              </div>
            )}
          </div>

          {contact.tags.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Tags</label>
              <div className="flex flex-wrap gap-2">
                {contact.tags.map((tag, index) => (
                  <span key={index} className="px-3 py-1 rounded-full text-sm bg-[#2A2A2A] text-gray-300">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {contact.notes && (
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Notes</label>
              <p className="text-white bg-[#1A1A1A] p-4 rounded-lg">{contact.notes}</p>
            </div>
          )}

          <div className="flex items-center gap-3 pt-4">
            <button
              onClick={onEdit}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-500 hover:to-orange-600 text-white rounded-lg transition-all font-semibold flex items-center justify-center gap-2"
            >
              <Edit className="w-4 h-4" />
              Edit Contact
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-[#1A1A1A] border border-[#2A2A2A] hover:border-gray-500/50 text-gray-300 rounded-lg transition-all"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Delete Confirmation Modal
function DeleteConfirmModal({
  onConfirm,
  onClose
}: {
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[#0F0F0F] border border-[#2A2A2A] rounded-xl w-full max-w-md">
        <div className="p-6 border-b border-[#2A2A2A]">
          <h2 className="text-2xl font-bold text-white">Confirm Deletion</h2>
        </div>

        <div className="p-6">
          <p className="text-gray-300 mb-6">
            Are you sure you want to delete this contact? This action cannot be undone.
          </p>

          <div className="flex items-center gap-3">
            <button
              onClick={onConfirm}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white rounded-lg transition-all font-semibold"
            >
              Delete Contact
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-[#1A1A1A] border border-[#2A2A2A] hover:border-gray-500/50 text-gray-300 rounded-lg transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Message Modal
function MessageModal({
  contact,
  onClose
}: {
  contact: Contact;
  onClose: () => void;
}) {
  const [message, setMessage] = useState('');

  const handleSend = () => {
    alert(`Message sent to ${contact.name}:\n\n${message}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[#0F0F0F] border border-[#2A2A2A] rounded-xl w-full max-w-2xl">
        <div className="p-6 border-b border-[#2A2A2A] flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Send Message</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#2A2A2A] rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              To: {contact.name}
            </label>
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <Mail className="w-4 h-4" />
              {contact.email}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Message
            </label>
            <textarea
              rows={6}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message here..."
              className="w-full px-4 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
            />
          </div>

          <div className="flex items-center gap-3 pt-4">
            <button
              onClick={handleSend}
              disabled={!message.trim()}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white rounded-lg transition-all font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
              Send Message
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-[#1A1A1A] border border-[#2A2A2A] hover:border-gray-500/50 text-gray-300 rounded-lg transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
