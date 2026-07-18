/**
 * Create User Modal Component
 * Complete user creation form with validation and Supabase integration
 */

import { useState, FormEvent } from 'react';
import { Shield, Mail, Phone, User, Briefcase, Calendar, AlertCircle, Key } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import UserService, { UserFormData, ValidationError } from '../../lib/services/userService';
import { TextInput } from '../ui/input/TextInput';
import { TextArea } from '../ui/input/TextArea';
import { Select } from '../ui/input/Select';
import { Checkbox } from '../ui/input/Checkbox';
import { FormModal } from '../ui/modal';

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserCreated: (user: any) => void;
}

export default function CreateUserModal({ isOpen, onClose, onUserCreated }: CreateUserModalProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);

  // Form state
  const [formData, setFormData] = useState<UserFormData>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    role: 'employee',
    department: '',
    job_title: '',
    status: 'active',
    employee_id: '',
    hire_date: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    zip_code: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relationship: '',
    notes: '',
    internal_notes: '',
    send_invitation_email: true,
    temporary_password: ''
  });

  const roles = [
    { value: 'business_owner', label: 'Business Owner - Full system access' },
    { value: 'administrator', label: 'Administrator - Admin access with user management' },
    { value: 'manager', label: 'Manager - Team management and oversight' },
    { value: 'supervisor', label: 'Supervisor - Supervise team operations' },
    { value: 'employee', label: 'Employee - Standard employee access' },
    { value: 'field_tech', label: 'Field Technician - Field operations access' }
  ];

  const handleInputChange = (field: keyof UserFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear validation error for this field
    setValidationErrors(prev => prev.filter(e => e.field !== field));
  };

  const handleSubmit = async (e: FormEvent) => {
    try {
      setIsSaving(true);
      setValidationErrors([]);

      // Validate before saving
      const validation = UserService.validateUser(formData);
      if (!validation.isValid) {
        setValidationErrors(validation.errors);
        toast.error('Please fix the errors before saving');
        return;
      }

      // Create user in Supabase
      const { data, error } = await UserService.createUser(formData);

      if (error) {
        throw error;
      }

      if (data) {
        toast.success('User created successfully!', {
          description: formData.send_invitation_email 
            ? `Invitation email sent to ${formData.email}` 
            : 'User can now log in with their credentials'
        });
        onUserCreated(data);
        onClose();
      }
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast.error(error.message || 'Failed to create user');
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
      title="Create New User"
      subtitle="Add a new team member to your organization"
      icon={User}
      submitText="Create User"
      isLoading={isSaving}
      size="xl"
    >
      <div className="space-y-6">
        {/* Personal Information */}
        <div>
          <h4 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <User className="w-4 h-4 text-orange-400" />
            Personal Information
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <TextInput
              label={
                <>
                  First Name <span className="text-orange-400">*</span>
                </>
              }
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
          <h4 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Mail className="w-4 h-4 text-orange-400" />
            Contact Information
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <TextInput
              label={
                <>
                  Email <span className="text-orange-400">*</span>
                </>
              }
              type="email"
              value={formData.email}
              onChange={(value) => handleInputChange('email', value)}
              placeholder="john.smith@company.com"
              disabled={isSaving}
              error={getFieldError('email')}
            />
            <TextInput
              label="Phone"
              type="tel"
              value={formData.phone}
              onChange={(value) => handleInputChange('phone', value)}
              placeholder="(555) 123-4567"
              disabled={isSaving}
              error={getFieldError('phone')}
            />
          </div>
        </div>

        {/* Role & Department */}
        <div>
          <h4 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Shield className="w-4 h-4 text-orange-400" />
            Role & Department
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <Select
              label={
                <>
                  Role <span className="text-orange-400">*</span>
                </>
              }
              value={formData.role}
              onChange={(value) => handleInputChange('role', value)}
              options={roles}
              disabled={isSaving}
            />
            <TextInput
              label="Department"
              value={formData.department}
              onChange={(value) => handleInputChange('department', value)}
              placeholder="Engineering"
              disabled={isSaving}
            />
          </div>
        </div>

        {/* Employment Details */}
        <div>
          <h4 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-orange-400" />
            Employment Details
          </h4>
          <div className="grid grid-cols-3 gap-4">
            <TextInput
              label="Job Title"
              value={formData.job_title}
              onChange={(value) => handleInputChange('job_title', value)}
              placeholder="Senior Manager"
              disabled={isSaving}
            />
            <TextInput
              label="Employee ID"
              value={formData.employee_id}
              onChange={(value) => handleInputChange('employee_id', value)}
              placeholder="EMP-001"
              disabled={isSaving}
            />
            <TextInput
              label={
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Hire Date
                </div>
              }
              type="date"
              value={formData.hire_date}
              onChange={(value) => handleInputChange('hire_date', value)}
              disabled={isSaving}
            />
          </div>
        </div>

        {/* Login Settings */}
        <div>
          <h4 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Key className="w-4 h-4 text-orange-400" />
            Login Settings
          </h4>
          <div className="space-y-4">
            <Checkbox
              label="Send invitation email with login credentials"
              checked={formData.send_invitation_email}
              onChange={(checked) => handleInputChange('send_invitation_email', checked)}
              disabled={isSaving}
            />

            {!formData.send_invitation_email && (
              <div className="bg-orange-600/10 border border-orange-500/30 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-orange-300 font-medium">Manual Password Setup Required</p>
                    <p className="text-xs text-orange-400/80 mt-1">
                      You'll need to manually provide the user with their temporary password.
                    </p>
                    <div className="mt-3">
                      <TextInput
                        label={<span className="text-orange-400 text-xs">Temporary Password (optional)</span>}
                        value={formData.temporary_password}
                        onChange={(value) => handleInputChange('temporary_password', value)}
                        placeholder="Leave blank for auto-generated password"
                        disabled={isSaving}
                        helperText="If left blank, a secure password will be generated automatically"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Notes */}
        <TextArea
          label="Notes"
          value={formData.notes}
          onChange={(value) => handleInputChange('notes', value)}
          rows={3}
          placeholder="Add any additional notes about this user..."
          disabled={isSaving}
        />
      </div>
    </FormModal>
  );
}
