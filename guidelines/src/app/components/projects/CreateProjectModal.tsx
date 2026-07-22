import { useState, useEffect } from 'react';
import { X, Briefcase, Calendar, DollarSign, MapPin, User, Tag, AlertCircle } from 'lucide-react';
import { createProject, type CreateProjectInput } from '../../lib/services/projectService';
import { searchCustomers } from '../../lib/services/customerService';
import { toast } from 'sonner@2.0.3';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preSelectedCustomerId?: string;
}

export default function CreateProjectModal({ 
  isOpen, 
  onClose, 
  onSuccess,
  preSelectedCustomerId 
}: CreateProjectModalProps) {
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [formData, setFormData] = useState<CreateProjectInput>({
    customer_id: preSelectedCustomerId || '',
    title: '',
    description: '',
    status: 'pending',
    priority: 'medium',
    type: '',
    scheduled_date: '',
    estimated_hours: undefined,
    estimated_cost: undefined,
    location_address: '',
    location_city: '',
    location_state: '',
    location_zip: '',
    special_instructions: '',
    materials_needed: [],
    tags: [],
  });
  const [materialInput, setMaterialInput] = useState('');
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    if (preSelectedCustomerId) {
      setFormData(prev => ({ ...prev, customer_id: preSelectedCustomerId }));
    }
  }, [preSelectedCustomerId]);

  useEffect(() => {
    if (searchTerm.length >= 2) {
      searchCustomersDebounced();
    } else {
      setSearchResults([]);
    }
  }, [searchTerm]);

  const searchCustomersDebounced = async () => {
    setSearchLoading(true);
    try {
      const results = await searchCustomers(searchTerm);
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching customers:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.customer_id) {
      toast.error('Please select a customer');
      return;
    }
    
    if (!formData.title) {
      toast.error('Please enter a project title');
      return;
    }

    setLoading(true);
    try {
      await createProject(formData);
      toast.success('Project created successfully!');
      onSuccess();
      handleClose();
    } catch (error: any) {
      console.error('Error creating project:', error);
      toast.error(error.message || 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      customer_id: '',
      title: '',
      description: '',
      status: 'pending',
      priority: 'medium',
      type: '',
      scheduled_date: '',
      estimated_hours: undefined,
      estimated_cost: undefined,
      location_address: '',
      location_city: '',
      location_state: '',
      location_zip: '',
      special_instructions: '',
      materials_needed: [],
      tags: [],
    });
    setSearchTerm('');
    setSearchResults([]);
    setMaterialInput('');
    setTagInput('');
    onClose();
  };

  const addMaterial = () => {
    if (materialInput.trim() && !formData.materials_needed?.includes(materialInput.trim())) {
      setFormData({
        ...formData,
        materials_needed: [...(formData.materials_needed || []), materialInput.trim()],
      });
      setMaterialInput('');
    }
  };

  const removeMaterial = (material: string) => {
    setFormData({
      ...formData,
      materials_needed: formData.materials_needed?.filter(m => m !== material) || [],
    });
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags?.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        tags: [...(formData.tags || []), tagInput.trim()],
      });
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setFormData({
      ...formData,
      tags: formData.tags?.filter(t => t !== tag) || [],
    });
  };

  const selectCustomer = (customer: any) => {
    setFormData({ ...formData, customer_id: customer.id });
    setSearchTerm(`${customer.first_name} ${customer.last_name} (${customer.email})`);
    setSearchResults([]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-orange-600 to-orange-700 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Create New Project</h2>
              <p className="text-sm text-orange-100">Create a work order or project</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-lg hover:bg-white/20 flex items-center justify-center transition"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Customer Selection */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-orange-400" />
              Customer <span className="text-red-400">*</span>
            </h3>
            {!preSelectedCustomerId ? (
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50"
                  placeholder="Search for customer by name or email..."
                />
                {searchLoading && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
                {searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl overflow-hidden max-h-60 overflow-y-auto z-10">
                    {searchResults.map((customer) => (
                      <button
                        key={customer.id}
                        type="button"
                        onClick={() => selectCustomer(customer)}
                        className="w-full px-4 py-3 text-left hover:bg-[#1A1A1A] transition flex items-center justify-between"
                      >
                        <div>
                          <p className="font-semibold text-white">
                            {customer.first_name} {customer.last_name}
                          </p>
                          <p className="text-sm text-gray-400">{customer.email}</p>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          customer.status === 'vip' ? 'bg-orange-500/10 text-orange-400' :
                          customer.status === 'active' ? 'bg-green-500/10 text-green-400' :
                          'bg-blue-500/10 text-blue-400'
                        }`}>
                          {customer.status.toUpperCase()}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="px-4 py-3 bg-orange-500/10 border border-orange-500/20 rounded-xl text-orange-400">
                Customer pre-selected
              </div>
            )}
          </div>

          {/* Project Details */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-orange-400" />
              Project Details
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Project Title <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50"
                  placeholder="HVAC System Maintenance"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 resize-none"
                  placeholder="Detailed description of the project..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50"
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="on_hold">On Hold</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Type</label>
                  <input
                    type="text"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50"
                    placeholder="HVAC, Plumbing, etc."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Scheduled Date</label>
                  <input
                    type="datetime-local"
                    value={formData.scheduled_date}
                    onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Estimates */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-orange-400" />
              Estimates
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Estimated Hours</label>
                <input
                  type="number"
                  step="0.5"
                  value={formData.estimated_hours || ''}
                  onChange={(e) => setFormData({ ...formData, estimated_hours: parseFloat(e.target.value) })}
                  className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50"
                  placeholder="4.5"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Estimated Cost ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.estimated_cost || ''}
                  onChange={(e) => setFormData({ ...formData, estimated_cost: parseFloat(e.target.value) })}
                  className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50"
                  placeholder="500.00"
                />
              </div>
            </div>
          </div>

          {/* Location */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-orange-400" />
              Location
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Address</label>
                <input
                  type="text"
                  value={formData.location_address}
                  onChange={(e) => setFormData({ ...formData, location_address: e.target.value })}
                  className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50"
                  placeholder="123 Main Street"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">City</label>
                  <input
                    type="text"
                    value={formData.location_city}
                    onChange={(e) => setFormData({ ...formData, location_city: e.target.value })}
                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50"
                    placeholder="New York"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">State</label>
                  <input
                    type="text"
                    value={formData.location_state}
                    onChange={(e) => setFormData({ ...formData, location_state: e.target.value })}
                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50"
                    placeholder="NY"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">ZIP</label>
                  <input
                    type="text"
                    value={formData.location_zip}
                    onChange={(e) => setFormData({ ...formData, location_zip: e.target.value })}
                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50"
                    placeholder="10001"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Materials & Tags */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Materials Needed</h3>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={materialInput}
                  onChange={(e) => setMaterialInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addMaterial())}
                  className="flex-1 px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50"
                  placeholder="Add material"
                />
                <button
                  type="button"
                  onClick={addMaterial}
                  className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-semibold transition"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.materials_needed?.map((material) => (
                  <span
                    key={material}
                    className="px-3 py-1 bg-[#0A0A0A] border border-orange-500/20 text-orange-400 rounded-full text-sm font-semibold flex items-center gap-2"
                  >
                    {material}
                    <button
                      type="button"
                      onClick={() => removeMaterial(material)}
                      className="hover:text-orange-300 transition"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Tag className="w-5 h-5 text-orange-400" />
                Tags
              </h3>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  className="flex-1 px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50"
                  placeholder="Add tag"
                />
                <button
                  type="button"
                  onClick={addTag}
                  className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-semibold transition"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.tags?.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-[#0A0A0A] border border-orange-500/20 text-orange-400 rounded-full text-sm font-semibold flex items-center gap-2"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="hover:text-orange-300 transition"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Special Instructions */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Special Instructions</label>
            <textarea
              value={formData.special_instructions}
              onChange={(e) => setFormData({ ...formData, special_instructions: e.target.value })}
              rows={3}
              className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 resize-none"
              placeholder="Any special instructions or notes for the technician..."
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-4 pt-6 border-t border-[#2A2A2A]">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="px-6 py-3 bg-[#0A0A0A] hover:bg-[#2A2A2A] border border-[#2A2A2A] text-gray-300 rounded-xl font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white rounded-xl font-semibold transition shadow-lg shadow-orange-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
