// Create Stakeholder Modal
// Created: 2026-01-27
import { useState, useEffect, FormEvent } from 'react';
import { User, Mail, Phone, MapPin, Tag, FileText, Building2, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner@2.0.3';
import { TextInput } from './ui/input/TextInput';
import { TextArea } from './ui/input/TextArea';
import { Select } from './ui/input/Select';
import { FormModal } from './ui/modal';

interface StakeholderType {
  id: string;
  name: string;
  display_name: string;
  icon: string;
  color: string;
}

interface CreateStakeholderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateStakeholderModal({ isOpen, onClose, onSuccess }: CreateStakeholderModalProps) {
  const [stakeholderTypes, setStakeholderTypes] = useState<StakeholderType[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    type: '',
    name: '',
    display_name: '',
    email: '',
    phone: '',
    address: '',
    status: 'active',
    tags: '',
    notes: '',
    company_name: '',
    contact_person: '',
    website: '',
    tax_id: ''
  });

  useEffect(() => {
    if (isOpen) {
      loadStakeholderTypes();
    }
  }, [isOpen]);

  const loadStakeholderTypes = async () => {
    const { data, error } = await supabase
      .from('stakeholder_types')
      .select('*')
      .eq('is_active', true)
      .order('display_name');

    if (error) {
      console.error('Error loading types:', error);
      toast.error('Failed to load stakeholder types');
    } else {
      setStakeholderTypes(data || []);
      if (data && data.length > 0) {
        setFormData(prev => ({ ...prev, type: data[0].name }));
      }
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    // Validation
    if (!formData.type) {
      toast.error('Please select a stakeholder type');
      return;
    }
    if (!formData.name.trim()) {
      toast.error('Please enter a name');
      return;
    }
    if (formData.email && !formData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setLoading(true);

    try {
      // Prepare metadata
      const metadata: any = {};
      if (formData.company_name) metadata.company_name = formData.company_name;
      if (formData.contact_person) metadata.contact_person = formData.contact_person;
      if (formData.website) metadata.website = formData.website;
      if (formData.tax_id) metadata.tax_id = formData.tax_id;

      // Parse tags
      const tags = formData.tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      // Insert stakeholder
      const { data: stakeholder, error: stakeholderError } = await supabase
        .from('stakeholders')
        .insert({
          type: formData.type,
          name: formData.name.trim(),
          display_name: formData.display_name.trim() || formData.name.trim(),
          email: formData.email.trim() || null,
          phone: formData.phone.trim() || null,
          address: formData.address.trim() || null,
          status: formData.status,
          tags: tags,
          notes: formData.notes.trim() || null,
          metadata: metadata
        })
        .select()
        .single();

      if (stakeholderError) throw stakeholderError;

      // Create default portal configuration
      const { error: portalError } = await supabase
        .from('stakeholder_portals')
        .insert({
          stakeholder_id: stakeholder.id,
          enabled: false,
          modules: {
            folders: true,
            workflows: true,
            designs: true,
            social: false,
            communication: true
          }
        });

      if (portalError) {
        console.error('Error creating portal config:', portalError);
        // Non-fatal, continue
      }

      // Create default permissions
      const defaultModules = ['folders', 'portal', 'workflows', 'designs', 'communication'];
      const permissionInserts = defaultModules.map(module => ({
        stakeholder_id: stakeholder.id,
        module: module,
        permissions: {
          enabled: true,
          view: true,
          create: module === 'folders',
          edit: false,
          delete: false,
          download: true,
          upload: module === 'folders',
          share: false
        },
        limits: module === 'folders' ? { storage_quota_gb: 5, max_file_size_mb: 50 } : {}
      }));

      const { error: permError } = await supabase
        .from('stakeholder_permissions')
        .insert(permissionInserts);

      if (permError) {
        console.error('Error creating permissions:', permError);
        // Non-fatal, continue
      }

      toast.success(`${formData.name} created successfully!`);
      onSuccess();
      onClose();
      
      // Reset form
      setFormData({
        type: stakeholderTypes[0]?.name || '',
        name: '',
        display_name: '',
        email: '',
        phone: '',
        address: '',
        status: 'active',
        tags: '',
        notes: '',
        company_name: '',
        contact_person: '',
        website: '',
        tax_id: ''
      });

    } catch (error: any) {
      console.error('Error creating stakeholder:', error);
      toast.error(error.message || 'Failed to create stakeholder');
    } finally {
      setLoading(false);
    }
  };

  const selectedType = stakeholderTypes.find(t => t.name === formData.type);

  const statusOptions = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'pending', label: 'Pending' },
    { value: 'suspended', label: 'Suspended' }
  ];

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      title="Add New Stakeholder"
      subtitle={`Create a new ${selectedType?.display_name.toLowerCase() || 'stakeholder'} record`}
      icon={Users}
      submitText="Create Stakeholder"
      isLoading={loading}
      size="xl"
    >
      <div className="space-y-6">
        {/* Stakeholder Type */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-3">
            Stakeholder Type <span className="text-orange-400">*</span>
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {stakeholderTypes.map((type) => (
              <button
                key={type.id}
                type="button"
                onClick={() => setFormData({ ...formData, type: type.name })}
                className={`p-4 rounded-lg border transition-all ${
                  formData.type === type.name
                    ? 'border-[#ea580c] bg-[#ea580c]/10'
                    : 'border-white/10 bg-white/5 hover:bg-white/10'
                }`}
              >
                <div className="text-center">
                  <div className="text-2xl mb-1">{type.icon === 'Package' ? '📦' : 
                    type.icon === 'Wrench' ? '🔨' : 
                    type.icon === 'Briefcase' ? '💼' : 
                    type.icon === 'DollarSign' ? '💰' : 
                    type.icon === 'Home' ? '🏠' : 
                    type.icon === 'Building2' ? '🏢' : 
                    type.icon === 'Megaphone' ? '📢' : '👥'}</div>
                  <div className="text-xs font-medium text-white">{type.display_name}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <User size={18} />
            Basic Information
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextInput
              label={
                <>
                  Name <span className="text-orange-400">*</span>
                </>
              }
              value={formData.name}
              onChange={(value) => setFormData({ ...formData, name: value })}
              placeholder="e.g., ABC Corporation"
              disabled={loading}
              required
            />

            <TextInput
              label="Display Name"
              value={formData.display_name}
              onChange={(value) => setFormData({ ...formData, display_name: value })}
              placeholder="Leave blank to use Name"
              disabled={loading}
            />

            <TextInput
              label={
                <div className="flex items-center gap-1">
                  <Mail size={14} />
                  Email
                </div>
              }
              type="email"
              value={formData.email}
              onChange={(value) => setFormData({ ...formData, email: value })}
              placeholder="contact@example.com"
              disabled={loading}
            />

            <TextInput
              label={
                <div className="flex items-center gap-1">
                  <Phone size={14} />
                  Phone
                </div>
              }
              type="tel"
              value={formData.phone}
              onChange={(value) => setFormData({ ...formData, phone: value })}
              placeholder="(555) 123-4567"
              disabled={loading}
            />

            <div className="md:col-span-2">
              <TextInput
                label={
                  <div className="flex items-center gap-1">
                    <MapPin size={14} />
                    Address
                  </div>
                }
                value={formData.address}
                onChange={(value) => setFormData({ ...formData, address: value })}
                placeholder="123 Main Street, City, State, ZIP"
                disabled={loading}
              />
            </div>

            <Select
              label="Status"
              value={formData.status}
              onChange={(value) => setFormData({ ...formData, status: value })}
              options={statusOptions}
              disabled={loading}
            />

            <TextInput
              label={
                <div className="flex items-center gap-1">
                  <Tag size={14} />
                  Tags (comma-separated)
                </div>
              }
              value={formData.tags}
              onChange={(value) => setFormData({ ...formData, tags: value })}
              placeholder="preferred, reliable, local"
              disabled={loading}
            />
          </div>
        </div>

        {/* Additional Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Building2 size={18} />
            Additional Information
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextInput
              label="Company Name"
              value={formData.company_name}
              onChange={(value) => setFormData({ ...formData, company_name: value })}
              placeholder="Official company name"
              disabled={loading}
            />

            <TextInput
              label="Contact Person"
              value={formData.contact_person}
              onChange={(value) => setFormData({ ...formData, contact_person: value })}
              placeholder="John Smith"
              disabled={loading}
            />

            <TextInput
              label="Website"
              type="url"
              value={formData.website}
              onChange={(value) => setFormData({ ...formData, website: value })}
              placeholder="https://example.com"
              disabled={loading}
            />

            <TextInput
              label="Tax ID / EIN"
              value={formData.tax_id}
              onChange={(value) => setFormData({ ...formData, tax_id: value })}
              placeholder="12-3456789"
              disabled={loading}
            />
          </div>
        </div>

        {/* Notes */}
        <TextArea
          label={
            <div className="flex items-center gap-1">
              <FileText size={14} />
              Notes
            </div>
          }
          value={formData.notes}
          onChange={(value) => setFormData({ ...formData, notes: value })}
          rows={4}
          placeholder="Add any additional notes or information..."
          disabled={loading}
        />
      </div>
    </FormModal>
  );
}
