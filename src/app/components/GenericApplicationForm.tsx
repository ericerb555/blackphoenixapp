import React, { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, Send, Check, Upload, X } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';

export interface ApplicationField {
  id: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'textarea' | 'url' | 'number' | 'checkbox' | 'file' | 'select' | 'skill';
  placeholder?: string;
  required?: boolean;
  icon?: any;
  rows?: number;
  accept?: string;
  multiple?: boolean;
  options?: string[];
  dragDrop?: boolean; // Enable drag-and-drop for file uploads
  skills?: SkillItem[]; // For skill type fields
  disabled?: boolean; // Make field read-only
  defaultValue?: string; // Default value for the field
}

export interface SkillItem {
  id: string;
  label: string;
  description: string;
}

export interface ApplicationOption {
  id: string;
  label: string;
  icon?: any;
  description?: string;
  value?: string;
}

export interface ApplicationStep {
  title: string;
  description: string;
  icon: any;
  fields?: ApplicationField[];
  fieldId?: string;
  multiSelect?: boolean;
  required?: boolean;
  options?: ApplicationOption[];
}

export interface ApplicationConfig {
  title: string;
  description: string;
  color?: string;
  icon?: any;
  apiEndpoint?: string;
  endpoint?: string;
  steps?: ApplicationStep[];
  fields?: ApplicationField[];
  applicationType?: string;
  onSuccess?: (result: any) => void;
}

interface GenericApplicationFormProps {
  config: ApplicationConfig;
  onNavigate?: (page: string) => void;
}

export function GenericApplicationForm({ config, onNavigate }: GenericApplicationFormProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  // Initialize form data with default values
  useEffect(() => {
    const initialData: Record<string, any> = {};
    config.steps?.forEach(step => {
      step.fields?.forEach(field => {
        if (field.defaultValue) {
          initialData[field.id] = field.defaultValue;
        }
      });
    });
    if (Object.keys(initialData).length > 0) {
      setFormData(prev => ({ ...initialData, ...prev }));
    }
  }, [config]);

  // Handle both old (fields) and new (steps) config formats
  const steps = config.steps || (config.fields ? [{
    title: config.title,
    description: config.description,
    icon: config.icon,
    fields: config.fields
  }] : []);

  const endpoint = config.endpoint || config.apiEndpoint || '/applications';

  if (!steps || steps.length === 0) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white p-6 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 text-lg">Configuration error: No steps or fields defined</p>
        </div>
      </div>
    );
  }

  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  const requiredFields = steps.flatMap(step => step.fields || []).filter(field => field.required);

  const getEmptyRequiredField = (fields: ApplicationField[]) => fields.find(field => {
    if (!field.required) return false;
    const value = formData[field.id];
    if (field.type === 'checkbox') return value !== true;
    if (field.type === 'skill') return !Array.isArray(value) || value.length === 0;
    if (field.type === 'file') return !value || value.length === 0;
    return value === undefined || value === null || String(value).trim() === '';
  });

  const validateFields = (fields: ApplicationField[]) => {
    const missing = getEmptyRequiredField(fields);
    if (missing) {
      toast.error(`Please complete: ${missing.label}`);
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (!validateFields(currentStepData.fields || [])) return;
    if (currentStep < steps.length - 1) setCurrentStep(currentStep + 1);
  };

  const handlePreview = () => {
    if (!validateFields(requiredFields)) return;
    setPreviewMode(true);
  };

  const serializeValue = (value: any): any => {
    if (typeof FileList !== 'undefined' && value instanceof FileList) {
      return Array.from(value).map(file => ({ name: file.name, size: file.size, type: file.type }));
    }
    if (Array.isArray(value)) return value.map(serializeValue);
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, serializeValue(item)]));
    return value;
  };

  const handleSubmit = async () => {
    if (!validateFields(requiredFields)) {
      setPreviewMode(false);
      return;
    }

    setIsSubmitting(true);
    const applicationType = config.applicationType || (config.title.toLowerCase().includes('field tech') ? 'field_technician' : 'general');
    const payload = {
      ...Object.fromEntries(Object.entries(formData).map(([key, value]) => [key, serializeValue(value)])),
      applicationType,
      applicationTitle: config.title,
      source: 'public_application',
    };

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-57095a78${endpoint}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${publicAnonKey}` },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(15000),
        },
      );
      const result = await response.json().catch(() => ({}));

      if (!response.ok || result.success === false) {
        throw new Error(result.error || `Submission failed (HTTP ${response.status})`);
      }

      toast.success(result.message || 'Application submitted successfully.');
      setFormData({});
      setCurrentStep(0);
      setPreviewMode(false);
      config.onSuccess?.(result);
    } catch (error) {
      const key = `generic_app_pending_${endpoint.replace(/\//g, '_')}`;
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      existing.push({ id: `APP-${Date.now()}`, ...payload, _offline: true, submitted_at: new Date().toISOString() });
      localStorage.setItem(key, JSON.stringify(existing));
      console.error('Application submission failed; queued locally:', error);
      toast.error('We could not reach our application system. Your application is saved on this device and has not been submitted yet. Please try again shortly.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFieldChange = (fieldId: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleOptionToggle = (fieldId: string, optionId: string, multiSelect: boolean) => {
    if (multiSelect) {
      const current = formData[fieldId] || [];
      const newValue = current.includes(optionId)
        ? current.filter((id: string) => id !== optionId)
        : [...current, optionId];
      setFormData(prev => ({ ...prev, [fieldId]: newValue }));
    } else {
      setFormData(prev => ({ ...prev, [fieldId]: optionId }));
    }
  };

  const isOptionSelected = (fieldId: string, optionId: string, multiSelect: boolean) => {
    if (multiSelect) {
      return (formData[fieldId] || []).includes(optionId);
    }
    return formData[fieldId] === optionId;
  };

  if (previewMode) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            {onNavigate && (
              <button
                onClick={() => onNavigate('landing')}
                className="p-2 hover:bg-white/5 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <h1 className="text-2xl font-bold">Application Preview</h1>
          </div>

          <div className="bg-[#111] rounded-lg border border-white/10 p-6 mb-6">
            {steps.map((step, idx) => (
              <div key={idx} className="mb-8 last:mb-0">
                <h2 className="text-xl font-bold mb-4 text-[#ea580c]">{step.title}</h2>
                
                {step.fields && step.fields.map(field => (
                  <div key={field.id} className="mb-4">
                    <p className="text-sm text-gray-400">{field.label}</p>
                    <p className="text-white">{formData[field.id] || 'Not provided'}</p>
                  </div>
                ))}

                {step.fieldId && step.options && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-400">{step.description}</p>
                    <p className="text-white">
                      {step.multiSelect
                        ? (formData[step.fieldId] || []).map((id: string) => 
                            step.options?.find(opt => opt.id === id)?.label
                          ).join(', ') || 'None selected'
                        : step.options.find(opt => opt.id === formData[step.fieldId])?.label || 'Not selected'}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => setPreviewMode(false)}
              className="flex-1 bg-white/5 hover:bg-white/10 text-white font-semibold py-3 rounded-lg transition-colors"
            >
              Edit Application
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 bg-[#ea580c] hover:bg-[#dc2626] disabled:bg-gray-600 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Send className="w-5 h-5" />
              {isSubmitting ? 'Submitting...' : 'Submit Application'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          {onNavigate && (
            <button
              onClick={() => onNavigate('landing')}
              className="p-2 hover:bg-white/5 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h1 className="text-2xl font-bold">{config.title}</h1>
            <p className="text-sm text-gray-400">{config.description}</p>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            {steps.map((_, idx) => (
              <div
                key={idx}
                className={`flex-1 h-2 rounded-full transition-colors ${
                  idx <= currentStep ? 'bg-[#ea580c]' : 'bg-white/10'
                }`}
              />
            ))}
          </div>
          <p className="text-sm text-gray-400">
            Step {currentStep + 1} of {steps.length}
          </p>
        </div>

        {/* Step Content */}
        <div className="bg-[#111] rounded-lg border border-white/10 p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            {currentStepData.icon && (
              <currentStepData.icon className="w-6 h-6 text-[#ea580c]" />
            )}
            <div>
              <h2 className="text-xl font-bold">{currentStepData.title}</h2>
              <p className="text-sm text-gray-400">{currentStepData.description}</p>
            </div>
          </div>

          {/* Regular Fields */}
          {currentStepData.fields && (
            <div className="grid gap-6">
              {currentStepData.fields.map((field) => (
                <div key={field.id}>
                  <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                    {field.icon && <field.icon className="w-4 h-4" />}
                    {field.label}
                    {field.required && <span className="text-[#ea580c]">*</span>}
                  </label>

                  {field.type === 'textarea' ? (
                    <textarea
                      value={formData[field.id] || field.defaultValue || ''}
                      onChange={(e) => handleFieldChange(field.id, e.target.value)}
                      placeholder={field.placeholder}
                      required={field.required}
                      rows={field.rows || 4}
                      disabled={field.disabled}
                      className={`w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-[#ea580c] transition-colors ${field.disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                    />
                  ) : field.type === 'checkbox' ? (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData[field.id] || false}
                        onChange={(e) => handleFieldChange(field.id, e.target.checked)}
                        className="w-4 h-4 rounded border-white/10 bg-black/50 text-[#ea580c] focus:ring-[#ea580c]"
                      />
                      <span className="text-sm text-gray-400">{field.placeholder}</span>
                    </label>
                  ) : field.type === 'file' ? (
                    field.dragDrop ? (
                      <DragDropFileUpload
                        fieldId={field.id}
                        value={formData[field.id]}
                        onChange={(files) => handleFieldChange(field.id, files)}
                        accept={field.accept}
                        multiple={field.multiple}
                        required={field.required}
                      />
                    ) : (
                      <input
                        type="file"
                        onChange={(e) => handleFieldChange(field.id, e.target.files)}
                        placeholder={field.placeholder}
                        required={field.required}
                        className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-[#ea580c] transition-colors"
                        accept={field.accept}
                        multiple={field.multiple}
                      />
                    )
                  ) : field.type === 'select' ? (
                    <select
                      value={formData[field.id] || field.defaultValue || ''}
                      onChange={(e) => handleFieldChange(field.id, e.target.value)}
                      placeholder={field.placeholder}
                      required={field.required}
                      disabled={field.disabled}
                      className={`w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-[#ea580c] transition-colors ${field.disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                      {field.options?.map(option => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  ) : field.type === 'skill' ? (
                    <SkillSelector
                      fieldId={field.id}
                      value={formData[field.id]}
                      onChange={(skills) => handleFieldChange(field.id, skills)}
                      skills={field.skills || []}
                      required={field.required}
                    />
                  ) : (
                    <input
                      type={field.type}
                      value={formData[field.id] || field.defaultValue || ''}
                      onChange={(e) => handleFieldChange(field.id, e.target.value)}
                      placeholder={field.placeholder}
                      required={field.required}
                      disabled={field.disabled}
                      className={`w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-[#ea580c] transition-colors ${field.disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Options (for multi-select or single-select steps) */}
          {currentStepData.fieldId && currentStepData.options && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentStepData.options.map((option) => {
                const selected = isOptionSelected(
                  currentStepData.fieldId!,
                  option.id,
                  currentStepData.multiSelect || false
                );

                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() =>
                      handleOptionToggle(
                        currentStepData.fieldId!,
                        option.id,
                        currentStepData.multiSelect || false
                      )
                    }
                    className={`p-4 rounded-lg border transition-all text-left ${
                      selected
                        ? 'border-[#ea580c] bg-[#ea580c]/10'
                        : 'border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {option.icon && <option.icon className="w-5 h-5 flex-shrink-0 mt-1" />}
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium">{option.label}</h3>
                          {selected && <Check className="w-5 h-5 text-[#ea580c]" />}
                        </div>
                        {option.description && (
                          <p className="text-sm text-gray-400 mt-1">{option.description}</p>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex gap-4">
          {currentStep > 0 && (
            <button
              onClick={handlePrev}
              className="px-6 py-3 bg-white/5 hover:bg-white/10 rounded-lg transition-colors flex items-center gap-2"
            >
              <ArrowLeft className="w-5 h-5" />
              Previous
            </button>
          )}

          {isLastStep ? (
            <button
              onClick={handlePreview}
              className="flex-1 bg-[#ea580c] hover:bg-[#dc2626] text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Check className="w-5 h-5" />
              Review Application
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="flex-1 bg-[#ea580c] hover:bg-[#dc2626] text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              Next
              <ArrowRight className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Drag and Drop File Upload Component
function DragDropFileUpload({ fieldId, value, onChange, accept, multiple, required }: {
  fieldId: string;
  value: FileList | null;
  onChange: (files: FileList | null) => void;
  accept?: string;
  multiple?: boolean;
  required?: boolean;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [filePreviews, setFilePreviews] = useState<Array<{ file: File; preview: string }>>([]);

  // Generate previews when files change
  React.useEffect(() => {
    if (value && value.length > 0) {
      const previews: Array<{ file: File; preview: string }> = [];
      Array.from(value).forEach(file => {
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onloadend = () => {
            previews.push({ file, preview: reader.result as string });
            if (previews.length === value.length) {
              setFilePreviews([...previews]);
            }
          };
          reader.readAsDataURL(file);
        } else {
          previews.push({ file, preview: '' });
        }
      });
    } else {
      setFilePreviews([]);
    }
  }, [value]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFiles(files);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFiles(files);
    }
  };

  const handleFiles = (files: FileList) => {
    onChange(files);
    toast.success(`${files.length} file(s) selected`);
  };

  const removeFile = (index: number) => {
    if (value) {
      const dt = new DataTransfer();
      Array.from(value).forEach((file, i) => {
        if (i !== index) dt.items.add(file);
      });
      const newFiles = dt.files;
      onChange(newFiles.length > 0 ? newFiles : null);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div>
      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
          isDragging
            ? 'border-[#ea580c] bg-[#ea580c]/10 scale-[1.02]'
            : 'border-white/20 bg-black/30 hover:border-[#ea580c]/50 hover:bg-black/40'
        }`}
      >
        <input
          type="file"
          id={fieldId}
          onChange={handleFileInput}
          accept={accept}
          multiple={multiple}
          required={required}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        
        <Upload className={`w-12 h-12 mx-auto mb-4 transition-colors ${isDragging ? 'text-[#ea580c]' : 'text-[#ea580c]/70'}`} />
        <p className="text-lg font-medium mb-2">
          {isDragging ? '✨ Drop your photos here' : 'Drag & drop your photos here'}
        </p>
        <p className="text-sm text-gray-400 mb-4">
          or click anywhere to browse
        </p>
        <p className="text-xs text-gray-500">
          {accept ? `Accepted: ${accept}` : 'All files accepted'}
          {multiple && ' • Multiple files allowed'}
        </p>
      </div>

      {/* Image Thumbnails Grid */}
      {filePreviews.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-300">
              📸 {filePreviews.length} photo{filePreviews.length > 1 ? 's' : ''} uploaded
            </p>
            <button
              type="button"
              onClick={() => onChange(null)}
              className="text-xs text-red-400 hover:text-red-300 transition"
            >
              Clear all
            </button>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {filePreviews.map((item, index) => (
              <div
                key={index}
                className="group relative bg-black/50 border border-white/10 rounded-lg overflow-hidden hover:border-[#ea580c]/50 transition-all duration-200"
              >
                {/* Image Preview */}
                {item.preview ? (
                  <div className="aspect-square relative">
                    <img
                      src={item.preview}
                      alt={item.file.name}
                      className="w-full h-full object-cover"
                    />
                    {/* Overlay on hover */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="p-2 bg-red-500 hover:bg-red-600 rounded-full transition"
                      >
                        <X className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="aspect-square flex items-center justify-center bg-black/30">
                    <Upload className="w-8 h-8 text-gray-500" />
                  </div>
                )}
                
                {/* File Info */}
                <div className="p-2 border-t border-white/10">
                  <p className="text-xs text-gray-400 truncate" title={item.file.name}>
                    {item.file.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(item.file.size)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Skill Selector Component
function SkillSelector({ fieldId, value, onChange, skills, required }: {
  fieldId: string;
  value: any;
  onChange: (skills: any) => void;
  skills: SkillItem[];
  required?: boolean;
}) {
  const [selectedSkills, setSelectedSkills] = useState<Record<string, { checked: boolean; level: string; description: string }>>(value || {});

  const experienceLevels = [
    '',
    'Beginner (0-2 years)',
    'Intermediate (3-5 years)',
    'Advanced (6-10 years)',
    'Expert (10+ years)'
  ];

  const handleSkillCheck = (skillId: string, checked: boolean) => {
    const updated = { ...selectedSkills };
    if (checked) {
      updated[skillId] = { checked: true, level: '', description: '' };
    } else {
      delete updated[skillId];
    }
    setSelectedSkills(updated);
    onChange(updated);
  };

  const handleSkillUpdate = (skillId: string, field: 'level' | 'description', value: string) => {
    const updated = { ...selectedSkills };
    if (updated[skillId]) {
      updated[skillId][field] = value;
      setSelectedSkills(updated);
      onChange(updated);
    }
  };

  return (
    <div className="space-y-4">
      {skills.map(skill => {
        const isChecked = selectedSkills[skill.id]?.checked || false;
        const skillData = selectedSkills[skill.id] || { level: '', description: '' };

        return (
          <div
            key={skill.id}
            className={`border rounded-xl p-4 transition-all ${
              isChecked ? 'border-[#ea580c] bg-[#ea580c]/5' : 'border-white/10 bg-black/30'
            }`}
          >
            {/* Skill Checkbox */}
            <label className="flex items-start gap-3 cursor-pointer mb-3">
              <input
                type="checkbox"
                checked={isChecked}
                onChange={(e) => handleSkillCheck(skill.id, e.target.checked)}
                className="w-5 h-5 mt-0.5 rounded border-white/20 bg-black/50 text-[#ea580c] focus:ring-[#ea580c] focus:ring-offset-0"
              />
              <div className="flex-1">
                <div className="font-medium text-white">{skill.label}</div>
                <div className="text-sm text-gray-400 mt-1">{skill.description}</div>
              </div>
            </label>

            {/* Experience Level & Description (shown when checked) */}
            {isChecked && (
              <div className="ml-8 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                {/* Experience Level Dropdown */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Experience Level <span className="text-[#ea580c]">*</span>
                  </label>
                  <select
                    value={skillData.level}
                    onChange={(e) => handleSkillUpdate(skill.id, 'level', e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#ea580c] transition-colors"
                    required={isChecked}
                  >
                    {experienceLevels.map(level => (
                      <option key={level} value={level}>{level || 'Select level...'}</option>
                    ))}
                  </select>
                </div>

                {/* Description Textarea */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Describe Your Experience <span className="text-[#ea580c]">*</span>
                  </label>
                  <textarea
                    value={skillData.description}
                    onChange={(e) => handleSkillUpdate(skill.id, 'description', e.target.value)}
                    placeholder="Tell us about your experience with this skill, projects you've completed, challenges you've overcome..."
                    rows={3}
                    className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#ea580c] transition-colors"
                    required={isChecked}
                  />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}