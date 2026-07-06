/**
 * Add Contact Modal Component
 * Complete contact creation form with validation and Supabase integration
 */

import { useState, FormEvent } from 'react';
import { UserPlus } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import ContactService, { ContactFormData, ValidationError } from '../../lib/services/contactService';
import { TextInput } from '../ui/input/TextInput';
import { TextArea } from '../ui/input/TextArea';
import { FormModal } from '../ui/modal';

interface AddContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContactAdded: (contact: any) => void;
}

export default function AddContactModal({ isOpen, onClose, onContactAdded }: AddContactModalProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);

  // Form state
  const [formData, setFormData] = useState<ContactFormData>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    company: '',
    position: '',
    street_address: '',
    city: '',
    state: '',
    zip_code: '',
    status: 'lead',
    customer_type: 'residential',
    preferred_contact_method: 'email',
    tags: [],
    source: '',
    referral_source: '',
    notes: '',
    internal_notes: '',
    next_follow_up_date: ''
  });

  const handleInputChange = (field: keyof ContactFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear validation error for this field
    setValidationErrors(prev => prev.filter(e => e.field !== field));
  };

  const handleSubmit = async (e: FormEvent) => {
    try {
      setIsSaving(true);
      setValidationErrors([]);

      // Validate before saving
      const validation = ContactService.validateContact(formData);
      if (!validation.isValid) {
        setValidationErrors(validation.errors);
        toast.error('Please fix the errors before saving');
        return;
      }

      // Save to Supabase
      const { data, error } = await ContactService.createContact(formData);

      if (error) {
        throw error;
      }

      if (data) {
        toast.success('Contact added successfully!');
        onContactAdded(data);
        onClose();
      }
    } catch (error: any) {
      console.error('Error saving contact:', error);
      toast.error(error.message || 'Failed to save contact');
    } finally {
      setIsSaving(false);
    }
  };

  const getFieldError = (field: string): string | undefined => {
    return validationErrors.find(e => e.field === field)?.message;
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      title="Add New Contact"
      subtitle="Create a new customer contact"
      icon={UserPlus}
      submitText="Add Contact"
      isLoading={isSaving}
      size="lg"
    >
      <div className="space-y-6">
        {/* Personal Information */}
        <div>
          <h4 className="text-sm font-semibold text-white mb-4">Personal Information</h4>
          <div className="grid grid-cols-2 gap-4">
            <TextInput
              label={
                <>
                  First Name <span className="text-orange-400">*</span>
                </>
              }
              type="text"
              value={formData.first_name}
              onChange={(value) => handleInputChange('first_name', value)}
              placeholder="John"
              disabled={isSaving}
              error={getFieldError('first_name')}
            />
            <TextInput
              label={
                <>
                  Last Name <span className="text-orange-400">*</span>
                </>
              }
              type="text"
              value={formData.last_name}
              onChange={(value) => handleInputChange('last_name', value)}
              placeholder="Smith"
              disabled={isSaving}
              error={getFieldError('last_name')}
            />
          </div>
        </div>

        {/* Contact Information */}
        <div>
          <h4 className="text-sm font-semibold text-white mb-4">Contact Information</h4>
          <div className="space-y-4">
            <TextInput
              label={
                <>
                  Email <span className="text-orange-400">*</span>
                </>
              }
              type="email"
              value={formData.email}
              onChange={(value) => handleInputChange('email', value)}
              placeholder="john.smith@email.com"
              disabled={isSaving}
              error={getFieldError('email')}
            />
            <TextInput
              label={
                <>
                  Phone <span className="text-orange-400">*</span>
                </>
              }
              type="tel"
              value={formData.phone}
              onChange={(value) => handleInputChange('phone', value)}
              placeholder="(555) 123-4567"
              disabled={isSaving}
              error={getFieldError('phone')}
            />
            <TextInput
              label="Company"
              type="text"
              value={formData.company}
              onChange={(value) => handleInputChange('company', value)}
              placeholder="Smith Residence"
              disabled={isSaving}
            />
          </div>
        </div>

        {/* Address */}
        <div>
          <h4 className="text-sm font-semibold text-white mb-4">Address</h4>
          <div className="space-y-4">
            <TextInput
              label="Street Address"
              type="text"
              value={formData.street_address}
              onChange={(value) => handleInputChange('street_address', value)}
              placeholder="123 Main Street"
              disabled={isSaving}
            />
            <div className="grid grid-cols-3 gap-4">
              <TextInput
                label="City"
                type="text"
                value={formData.city}
                onChange={(value) => handleInputChange('city', value)}
                placeholder="New York"
                disabled={isSaving}
              />
              <TextInput
                label="State"
                type="text"
                value={formData.state}
                onChange={(value) => handleInputChange('state', value)}
                placeholder="NY"
                disabled={isSaving}
              />
              <TextInput
                label="ZIP Code"
                type="text"
                value={formData.zip_code}
                onChange={(value) => handleInputChange('zip_code', value)}
                placeholder="10001"
                disabled={isSaving}
                error={getFieldError('zip_code')}
              />
            </div>
          </div>
        </div>

        {/* Customer Type */}
        <div>
          <h4 className="text-sm font-semibold text-white mb-4">Customer Status</h4>
          <div className="grid grid-cols-4 gap-3">
            {['lead', 'active', 'vip', 'inactive'].map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => handleInputChange('status', status)}
                disabled={isSaving}
                className={`px-4 py-2 rounded-xl font-medium text-sm transition ${
                  formData.status === status
                    ? 'bg-gradient-to-r from-orange-600/20 to-orange-700/20 border border-orange-500 text-orange-400'
                    : 'bg-[#0A0A0A] border border-[#2A2A2A] text-gray-400 hover:text-white hover:border-orange-500/30'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <TextArea
          label="Notes"
          value={formData.notes}
          onChange={(value) => handleInputChange('notes', value)}
          rows={4}
          placeholder="Add any additional notes about this customer..."
          disabled={isSaving}
        />
      </div>
    </FormModal>
  );
}
