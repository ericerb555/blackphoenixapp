// Edit Stakeholder Modal
// Created: 2026-01-27
import { useState, useEffect, FormEvent } from 'react';
import { User, Mail, Phone, MapPin, Tag, FileText, Building2, Trash2, Edit } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner@2.0.3';
import { TextInput } from './ui/input/TextInput';
import { TextArea } from './ui/input/TextArea';
import { Select } from './ui/input/Select';
import { FormModal, ConfirmModal } from './ui/modal';

interface Stakeholder {
  id: string;
  type: string;
  name: string;
  display_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  status: string;
  tags: string[];
  notes?: string;
  metadata: any;
}

interface EditStakeholderModalProps {
  isOpen: boolean;
  stakeholder: Stakeholder | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditStakeholderModal({ isOpen, stakeholder, onClose, onSuccess }: EditStakeholderModalProps) {
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [formData, setFormData] = useState({
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
    if (isOpen && stakeholder) {
      setFormData({
        name: stakeholder.name || '',
        display_name: stakeholder.display_name || '',
        email: stakeholder.email || '',
        phone: stakeholder.phone || '',
        address: stakeholder.address || '',
        status: stakeholder.status || 'active',
        tags: stakeholder.tags?.join(', ') || '',
        notes: stakeholder.notes || '',
        company_name: stakeholder.metadata?.company_name || '',
        contact_person: stakeholder.metadata?.contact_person || '',
        website: stakeholder.metadata?.website || '',
        tax_id: stakeholder.metadata?.tax_id || ''
      });
    }
  }, [isOpen, stakeholder]);

  const handleSubmit = async (e: FormEvent) => {
    if (!stakeholder) return;

    // Validation
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

      // Update stakeholder
      const { error: updateError } = await supabase
        .from('stakeholders')
        .update({
          name: formData.name.trim(),
          display_name: formData.display_name.trim() || formData.name.trim(),
          email: formData.email.trim() || null,
          phone: formData.phone.trim() || null,
          address: formData.address.trim() || null,
          status: formData.status,
          tags: tags,
          notes: formData.notes.trim() || null,
          metadata: metadata,
          updated_at: new Date().toISOString()
        })
        .eq('id', stakeholder.id);

      if (updateError) throw updateError;

      toast.success('Stakeholder updated successfully!');
      onSuccess();
      onClose();

    } catch (error: any) {
      console.error('Error updating stakeholder:', error);
      toast.error(error.message || 'Failed to update stakeholder');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!stakeholder) return;

    setLoading(true);

    try {
      // Delete stakeholder (cascade will handle related records)
      const { error: deleteError } = await supabase
        .from('stakeholders')
        .delete()
        .eq('id', stakeholder.id);

      if (deleteError) throw deleteError;

      toast.success('Stakeholder deleted successfully');
      onSuccess();
      onClose();

    } catch (error: any) {
      console.error('Error deleting stakeholder:', error);
      toast.error(error.message || 'Failed to delete stakeholder');
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  if (!stakeholder) return null;

  const statusOptions = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'pending', label: 'Pending' },
    { value: 'suspended', label: 'Suspended' }
  ];

  return (
    <>
      <FormModal
        isOpen={isOpen}
        onClose={onClose}
        onSubmit={handleSubmit}
        title="Edit Stakeholder"
        subtitle={`Update ${stakeholder.name}`}
        icon={Edit}
        submitText="Save Changes"
        isLoading={loading}
        size="xl"
        headerActions={
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="p-2 hover:bg-red-500/10 text-red-400 rounded-lg transition-colors"
            title="Delete stakeholder"
          >
            <Trash2 size={20} />
          </button>
        }
      >
        <div className="space-y-6">
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
                disabled={loading}
              />

              <TextInput
                label="Contact Person"
                value={formData.contact_person}
                onChange={(value) => setFormData({ ...formData, contact_person: value })}
                disabled={loading}
              />

              <TextInput
                label="Website"
                type="url"
                value={formData.website}
                onChange={(value) => setFormData({ ...formData, website: value })}
                disabled={loading}
              />

              <TextInput
                label="Tax ID / EIN"
                value={formData.tax_id}
                onChange={(value) => setFormData({ ...formData, tax_id: value })}
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
            disabled={loading}
          />
        </div>
      </FormModal>

      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Stakeholder?"
        message={
          <div>
            <p className="mb-4">
              Are you sure you want to delete <span className="text-white font-semibold">{stakeholder.name}</span>? 
              This will also delete:
            </p>
            <ul className="list-disc list-inside text-gray-400 mb-4 space-y-1">
              <li>All files and folders</li>
              <li>Portal configuration</li>
              <li>Permissions</li>
              <li>Activity history</li>
              <li>Messages</li>
            </ul>
            <p className="text-red-400 text-sm">⚠️ This action cannot be undone.</p>
          </div>
        }
        confirmText="Delete Permanently"
        variant="danger"
        isLoading={loading}
      />
    </>
  );
}
