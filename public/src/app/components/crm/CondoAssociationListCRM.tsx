/**
 * Condo Association CRM - Simplified List View
 * 
 * Features:
 * - List view showing all condo associations
 * - Click row to see details panel
 * - Association info, unit list, documents, communication tabs
 * - Add Association modal
 */

import { useState } from 'react';
import {
  Building, Users, Phone, Mail, MapPin, Plus, Search, X,
  ChevronRight, FileText, MessageSquare, Calendar, Edit2,
  Trash2, Home, User, CheckCircle, XCircle, Clock, DollarSign
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { PrimaryButton } from '../ui/button/PrimaryButton';
import { SecondaryButton } from '../ui/button/SecondaryButton';
import { TextInput } from '../ui/input/TextInput';
import { TextArea } from '../ui/input/TextArea';
import { Select } from '../ui/input/Select';
import { ConfirmModal } from '../ui/modal/ConfirmModal';

interface CondoUnit {
  id: string;
  unitNumber: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  status: 'owner-occupied' | 'rented' | 'vacant';
  sqft: number;
}

interface Document {
  id: string;
  name: string;
  type: string;
  uploadedDate: string;
  size: string;
}

interface Communication {
  id: string;
  date: string;
  type: 'email' | 'call' | 'meeting';
  subject: string;
  notes: string;
}

interface CondoAssociation {
  id: string;
  name: string;
  unitsCount: number;
  contactPerson: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  status: 'active' | 'inactive' | 'prospect';
  units: CondoUnit[];
  documents: Document[];
  communications: Communication[];
}

interface CondoAssociationListCRMProps {
  onClose?: () => void;
}

export default function CondoAssociationListCRM({ onClose }: CondoAssociationListCRMProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAssociation, setSelectedAssociation] = useState<CondoAssociation | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'units' | 'documents' | 'communications'>('info');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [associationToDelete, setAssociationToDelete] = useState<string | null>(null);

  // Sample data
  const [associations, setAssociations] = useState<CondoAssociation[]>([
    {
      id: '1',
      name: 'Sunset Towers',
      unitsCount: 156,
      contactPerson: 'Jane Smith',
      contactEmail: 'jane@sunsettowers.com',
      contactPhone: '(305) 555-0100',
      address: '123 Ocean Drive, Miami, FL 33139',
      status: 'active',
      units: [
        {
          id: 'u1',
          unitNumber: '12B',
          ownerName: 'John Doe',
          ownerEmail: 'john@email.com',
          ownerPhone: '(305) 555-1234',
          status: 'owner-occupied',
          sqft: 1200
        },
        {
          id: 'u2',
          unitNumber: '8A',
          ownerName: 'Sarah Johnson',
          ownerEmail: 'sarah@email.com',
          ownerPhone: '(305) 555-5678',
          status: 'rented',
          sqft: 950
        }
      ],
      documents: [
        {
          id: 'd1',
          name: 'HOA Bylaws 2024.pdf',
          type: 'PDF',
          uploadedDate: '2024-01-15',
          size: '2.3 MB'
        },
        {
          id: 'd2',
          name: 'Budget Report Q1.xlsx',
          type: 'Excel',
          uploadedDate: '2024-01-20',
          size: '1.1 MB'
        }
      ],
      communications: [
        {
          id: 'c1',
          date: '2024-01-25',
          type: 'email',
          subject: 'Q1 Budget Review',
          notes: 'Discussed budget allocation for maintenance projects'
        },
        {
          id: 'c2',
          date: '2024-01-18',
          type: 'meeting',
          subject: 'Board Meeting',
          notes: 'Quarterly board meeting with association leadership'
        }
      ]
    },
    {
      id: '2',
      name: 'Harbor View Condos',
      unitsCount: 88,
      contactPerson: 'Michael Chen',
      contactEmail: 'michael@harborview.com',
      contactPhone: '(305) 555-0200',
      address: '456 Marina Blvd, Miami, FL 33140',
      status: 'active',
      units: [],
      documents: [],
      communications: []
    },
    {
      id: '3',
      name: 'Palm Gardens',
      unitsCount: 224,
      contactPerson: 'Lisa Rodriguez',
      contactEmail: 'lisa@palmgardens.com',
      contactPhone: '(305) 555-0300',
      address: '789 Palm Avenue, Miami, FL 33141',
      status: 'active',
      units: [],
      documents: [],
      communications: []
    },
    {
      id: '4',
      name: 'Oceanfront Plaza',
      unitsCount: 45,
      contactPerson: 'David Wilson',
      contactEmail: 'david@oceanfront.com',
      contactPhone: '(305) 555-0400',
      address: '321 Beach Road, Miami, FL 33142',
      status: 'prospect',
      units: [],
      documents: [],
      communications: []
    }
  ]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-600/20 text-green-400 border-green-500/30';
      case 'inactive':
        return 'bg-gray-600/20 text-gray-400 border-gray-500/30';
      case 'prospect':
        return 'bg-blue-600/20 text-blue-400 border-blue-500/30';
      default:
        return 'bg-gray-600/20 text-gray-400 border-gray-500/30';
    }
  };

  const getUnitStatusColor = (status: string) => {
    switch (status) {
      case 'owner-occupied':
        return 'bg-green-600/20 text-green-400 border-green-500/30';
      case 'rented':
        return 'bg-blue-600/20 text-blue-400 border-blue-500/30';
      case 'vacant':
        return 'bg-yellow-600/20 text-yellow-400 border-yellow-500/30';
      default:
        return 'bg-gray-600/20 text-gray-400 border-gray-500/30';
    }
  };

  const getCommunicationIcon = (type: string) => {
    switch (type) {
      case 'email':
        return Mail;
      case 'call':
        return Phone;
      case 'meeting':
        return Calendar;
      default:
        return MessageSquare;
    }
  };

  const filteredAssociations = associations.filter(assoc =>
    assoc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    assoc.contactPerson.toLowerCase().includes(searchQuery.toLowerCase()) ||
    assoc.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddAssociation = () => {
    toast.success('Association added successfully!');
    setShowAddModal(false);
  };

  const handleDeleteAssociation = (id: string) => {
    setAssociations(associations.filter(a => a.id !== id));
    toast.success('Association deleted successfully');
    setShowDeleteConfirm(false);
    setAssociationToDelete(null);
    if (selectedAssociation?.id === id) {
      setSelectedAssociation(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 bg-[#1A1A1A] hover:bg-[#2A2A2A] border border-[#2A2A2A] text-gray-300 rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            )}
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-600 to-cyan-700 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Building className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white mb-1">Condo Association CRM</h1>
              <p className="text-gray-400">Manage condo associations and units</p>
            </div>
          </div>

          <PrimaryButton
            onClick={() => setShowAddModal(true)}
            icon={Plus}
          >
            Add Association
          </PrimaryButton>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* List View */}
          <div className={selectedAssociation ? 'col-span-5' : 'col-span-12'}>
            {/* Search */}
            <div className="mb-4 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search associations..."
                className="w-full pl-12 pr-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none transition"
              />
            </div>

            {/* Associations List */}
            <div className="space-y-3">
              {filteredAssociations.map((association) => (
                <button
                  key={association.id}
                  onClick={() => setSelectedAssociation(association)}
                  className={`w-full text-left p-4 rounded-2xl border transition ${
                    selectedAssociation?.id === association.id
                      ? 'bg-cyan-600/10 border-cyan-500/50'
                      : 'bg-[#1A1A1A] border-[#2A2A2A] hover:border-cyan-500/30'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-bold text-white text-lg mb-1">{association.name}</h3>
                      <p className="text-sm text-gray-400 flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        {association.unitsCount} units
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-lg text-xs font-semibold border ${getStatusColor(association.status)}`}>
                        {association.status}
                      </span>
                      <ChevronRight className="w-5 h-5 text-gray-500" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-sm text-gray-300 flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-500" />
                      {association.contactPerson}
                    </p>
                    <p className="text-sm text-gray-400 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-500" />
                      {association.address}
                    </p>
                  </div>
                </button>
              ))}

              {filteredAssociations.length === 0 && (
                <div className="text-center py-12 bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A]">
                  <Building className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400">No associations found</p>
                </div>
              )}
            </div>
          </div>

          {/* Details Panel */}
          {selectedAssociation && (
            <div className="col-span-7 bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6">
              {/* Details Header */}
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">{selectedAssociation.name}</h2>
                  <span className={`px-3 py-1 rounded-lg text-sm font-semibold border ${getStatusColor(selectedAssociation.status)}`}>
                    {selectedAssociation.status}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button className="p-2 bg-[#0A0A0A] hover:bg-[#2A2A2A] border border-[#2A2A2A] text-gray-300 rounded-xl transition">
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => {
                      setAssociationToDelete(selectedAssociation.id);
                      setShowDeleteConfirm(true);
                    }}
                    className="p-2 bg-[#0A0A0A] hover:bg-red-600/20 border border-[#2A2A2A] hover:border-red-500/30 text-gray-300 hover:text-red-400 rounded-xl transition"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setSelectedAssociation(null)}
                    className="p-2 bg-[#0A0A0A] hover:bg-[#2A2A2A] border border-[#2A2A2A] text-gray-300 rounded-xl transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-2 mb-6 border-b border-[#2A2A2A] pb-2">
                {[
                  { id: 'info' as const, label: 'Association Info', icon: Building },
                  { id: 'units' as const, label: 'Units', icon: Home, count: selectedAssociation.units.length },
                  { id: 'documents' as const, label: 'Documents', icon: FileText, count: selectedAssociation.documents.length },
                  { id: 'communications' as const, label: 'Communications', icon: MessageSquare, count: selectedAssociation.communications.length }
                ].map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`px-4 py-2 rounded-lg font-semibold transition flex items-center gap-2 ${
                        activeTab === tab.id
                          ? 'bg-cyan-600 text-white'
                          : 'text-gray-400 hover:text-white hover:bg-[#0A0A0A]'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {tab.label}
                      {tab.count !== undefined && (
                        <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs">
                          {tab.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Tab Content */}
              <div className="max-h-[600px] overflow-y-auto">
                {/* Association Info Tab */}
                {activeTab === 'info' && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-semibold text-gray-400 mb-2 block">Contact Person</label>
                      <p className="text-white font-medium">{selectedAssociation.contactPerson}</p>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-400 mb-2 block">Email</label>
                      <p className="text-white flex items-center gap-2">
                        <Mail className="w-4 h-4 text-gray-500" />
                        {selectedAssociation.contactEmail}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-400 mb-2 block">Phone</label>
                      <p className="text-white flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-500" />
                        {selectedAssociation.contactPhone}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-400 mb-2 block">Address</label>
                      <p className="text-white flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-gray-500" />
                        {selectedAssociation.address}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-400 mb-2 block">Total Units</label>
                      <p className="text-white flex items-center gap-2">
                        <Building className="w-4 h-4 text-gray-500" />
                        {selectedAssociation.unitsCount} units
                      </p>
                    </div>
                  </div>
                )}

                {/* Units Tab */}
                {activeTab === 'units' && (
                  <div className="space-y-3">
                    {selectedAssociation.units.length > 0 ? (
                      selectedAssociation.units.map((unit) => (
                        <div key={unit.id} className="p-4 bg-[#0A0A0A] rounded-xl border border-[#2A2A2A]">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h4 className="font-bold text-white mb-1">Unit {unit.unitNumber}</h4>
                              <p className="text-sm text-gray-400">{unit.sqft} sqft</p>
                            </div>
                            <span className={`px-2 py-1 rounded-lg text-xs font-semibold border ${getUnitStatusColor(unit.status)}`}>
                              {unit.status.replace('-', ' ')}
                            </span>
                          </div>
                          <div className="space-y-1 text-sm">
                            <p className="text-gray-300 flex items-center gap-2">
                              <User className="w-4 h-4 text-gray-500" />
                              {unit.ownerName}
                            </p>
                            <p className="text-gray-400 flex items-center gap-2">
                              <Mail className="w-4 h-4 text-gray-500" />
                              {unit.ownerEmail}
                            </p>
                            <p className="text-gray-400 flex items-center gap-2">
                              <Phone className="w-4 h-4 text-gray-500" />
                              {unit.ownerPhone}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <Home className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                        <p className="text-gray-400">No units added yet</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Documents Tab */}
                {activeTab === 'documents' && (
                  <div className="space-y-3">
                    {selectedAssociation.documents.length > 0 ? (
                      selectedAssociation.documents.map((doc) => (
                        <div key={doc.id} className="p-4 bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
                              <FileText className="w-5 h-5 text-blue-400" />
                            </div>
                            <div>
                              <p className="font-semibold text-white">{doc.name}</p>
                              <p className="text-sm text-gray-400">{doc.size} • {new Date(doc.uploadedDate).toLocaleDateString()}</p>
                            </div>
                          </div>
                          <button className="px-4 py-2 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-400 rounded-lg transition font-semibold text-sm border border-cyan-500/30">
                            Download
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <FileText className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                        <p className="text-gray-400">No documents uploaded yet</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Communications Tab */}
                {activeTab === 'communications' && (
                  <div className="space-y-3">
                    {selectedAssociation.communications.length > 0 ? (
                      selectedAssociation.communications.map((comm) => {
                        const Icon = getCommunicationIcon(comm.type);
                        return (
                          <div key={comm.id} className="p-4 bg-[#0A0A0A] rounded-xl border border-[#2A2A2A]">
                            <div className="flex items-start gap-3 mb-2">
                              <div className="w-10 h-10 rounded-lg bg-purple-600/20 border border-purple-500/30 flex items-center justify-center">
                                <Icon className="w-5 h-5 text-purple-400" />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-1">
                                  <h4 className="font-semibold text-white">{comm.subject}</h4>
                                  <span className="text-xs text-gray-500">{new Date(comm.date).toLocaleDateString()}</span>
                                </div>
                                <p className="text-sm text-gray-400 mb-2">{comm.notes}</p>
                                <span className="px-2 py-1 bg-purple-600/20 text-purple-400 border border-purple-500/30 rounded text-xs font-semibold">
                                  {comm.type}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-8">
                        <MessageSquare className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                        <p className="text-gray-400">No communications logged yet</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Association Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] max-w-2xl w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Add Condo Association</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 hover:bg-[#2A2A2A] rounded-lg transition"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <TextInput
                label="Association Name"
                placeholder="Enter association name"
                required
              />
              <TextInput
                label="Total Units"
                type="number"
                placeholder="Enter number of units"
                required
              />
              <TextInput
                label="Contact Person"
                placeholder="Enter contact person name"
                required
              />
              <TextInput
                label="Email"
                type="email"
                placeholder="Enter email address"
                required
              />
              <TextInput
                label="Phone"
                type="tel"
                placeholder="Enter phone number"
                required
              />
              <TextArea
                label="Address"
                placeholder="Enter full address"
                rows={3}
                required
              />
              <Select
                label="Status"
                required
              >
                <option value="prospect">Prospect</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Select>
            </div>

            <div className="flex gap-3">
              <PrimaryButton onClick={handleAddAssociation} className="flex-1">
                Add Association
              </PrimaryButton>
              <SecondaryButton onClick={() => setShowAddModal(false)} className="flex-1">
                Cancel
              </SecondaryButton>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && associationToDelete && (
        <ConfirmModal
          isOpen={showDeleteConfirm}
          onClose={() => {
            setShowDeleteConfirm(false);
            setAssociationToDelete(null);
          }}
          onConfirm={() => handleDeleteAssociation(associationToDelete)}
          title="Delete Association"
          message="Are you sure you want to delete this condo association? This action cannot be undone."
          confirmText="Delete"
          confirmVariant="danger"
        />
      )}
    </div>
  );
}
