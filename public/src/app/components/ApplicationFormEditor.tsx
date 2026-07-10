import React, { useState, useEffect } from 'react';
import {
  Save,
  Plus,
  Trash2,
  GripVertical,
  ArrowUp,
  ArrowDown,
  Edit3,
  Settings as SettingsIcon,
  FileText,
  CheckSquare,
  Type
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { motion } from 'motion/react';
import { ApplicationConfig, ApplicationStep, ApplicationField } from './GenericApplicationForm';
import { saveDual, loadDual } from '../lib/database';

const defaultFormConfig: ApplicationConfig = {
  title: "Maintenance & Carpentry Application",
  description: "Join our team of skilled maintenance professionals",
  apiEndpoint: "/applications/submit",
  steps: [
    {
      title: "Personal Information",
      description: "Tell us about yourself",
      icon: null,
      fields: [
        { id: 'name', label: 'Full Name', type: 'text', required: true, placeholder: 'John Smith' },
        { id: 'email', label: 'Email Address', type: 'email', required: true, placeholder: 'john@example.com' },
        { id: 'phone', label: 'Phone Number', type: 'tel', required: true, placeholder: '(603) 555-0123' },
        { id: 'address', label: 'Street Address', type: 'text', required: true, placeholder: '123 Main Street' },
        { id: 'city', label: 'City', type: 'text', required: true, placeholder: 'Nashua' },
        { id: 'state', label: 'State', type: 'text', required: true, placeholder: 'NH' },
        { id: 'zip', label: 'ZIP Code', type: 'text', required: true, placeholder: '03060' },
      ]
    },
    {
      title: "Maintenance Skills & Experience",
      description: "Select skills you have and describe your experience level",
      icon: null,
      fields: [
        {
          id: 'maintenance_skills',
          label: 'Maintenance Man Skills',
          type: 'skill',
          required: false,
          skills: [
            { id: 'roofing_maintenance', label: 'Roofing Maintenance', description: 'Inspect and repair roof leaks, replace shingles, clean gutters' },
            { id: 'plumbing_repairs', label: 'Plumbing Repairs', description: 'Fix leaks, unclog drains, repair or replace faucets and pipes' },
            { id: 'electrical_maintenance', label: 'Electrical Maintenance', description: 'Replace light bulbs, repair wiring, install fixtures' },
            { id: 'hvac_maintenance', label: 'HVAC Maintenance', description: 'Clean and service heating, ventilation, and air conditioning systems' },
            { id: 'pool_maintenance', label: 'Pool Maintenance', description: 'Clean pool filters, check chemical levels, repair pumps and heaters' },
            { id: 'groundskeeping', label: 'Groundskeeping', description: 'Lawn mowing, snow removal, landscaping, trimming bushes' },
            { id: 'painting_walls', label: 'Painting and Wall Repairs', description: 'Patch holes, repaint walls, touch up surfaces' },
            { id: 'carpentry_repairs', label: 'Carpentry Repairs', description: 'Fix doors, windows, cabinets, and furniture' },
            { id: 'general_cleaning', label: 'General Cleaning', description: 'Maintain cleanliness in common areas, remove debris' },
            { id: 'equipment_maintenance', label: 'Equipment Maintenance', description: 'Service machinery and tools used in the facility' },
            { id: 'safety_checks', label: 'Safety Checks', description: 'Inspect fire extinguishers, alarms, emergency exits' },
          ]
        }
      ]
    },
    {
      title: "Carpentry Skills & Experience",
      description: "Select carpentry skills and describe your experience level",
      icon: null,
      fields: [
        {
          id: 'carpentry_skills',
          label: 'Carpenter Skills',
          type: 'skill',
          required: false,
          skills: [
            { id: 'framing', label: 'Framing', description: 'Build structural frames for walls, floors, and roofs' },
            { id: 'roofing', label: 'Roofing', description: 'Install roof trusses, sheathing, and sometimes shingles' },
            { id: 'door_window', label: 'Door and Window Installation', description: 'Measure, order, fit and hang doors and windows' },
            { id: 'cabinetry', label: 'Cabinetry', description: 'Build and install cabinets, shelves, and countertops' },
            { id: 'finish_carpentry', label: 'Finish Carpentry', description: 'Install baseboards, moldings, trim, and decorative woodwork' },
            { id: 'deck_building', label: 'Deck Building', description: 'Construct outdoor decks, patios, and porches' },
            { id: 'furniture', label: 'Furniture Making and Repair', description: 'Build or fix wooden furniture' },
            { id: 'formwork', label: 'Formwork for Concrete', description: 'Build wooden molds for concrete pouring' },
            { id: 'flooring', label: 'Flooring Installation', description: 'Lay hardwood floors, subfloors, or laminate' },
            { id: 'restoration', label: 'Restoration Work', description: 'Repair or restore old wooden structures or features' },
          ]
        }
      ]
    },
    {
      title: "Work Portfolio",
      description: "Drag and drop photos to showcase your work",
      icon: null,
      fields: [
        { id: 'portfolio_photos', label: 'Upload Photos of Your Work (Drag & Drop or Click to Browse)', type: 'file', accept: 'image/*', multiple: true, dragDrop: true },
        { id: 'portfolio_description', label: 'Describe Your Work Portfolio', type: 'textarea', placeholder: 'Tell us about the photos you uploaded. What projects do they represent? What was your role? What challenges did you overcome?', rows: 6, required: true },
        { id: 'years_experience', label: 'Total Years of Experience', type: 'number', required: true, placeholder: '5' },
        { id: 'best_project', label: 'What is your proudest project and why?', type: 'textarea', required: true, placeholder: 'Describe your most impressive or challenging completed project', rows: 5 },
      ]
    },
    {
      title: "Availability & References",
      description: "Your schedule and professional references",
      icon: null,
      fields: [
        { id: 'availability', label: 'Availability', type: 'select', required: true, options: ['', 'Full-time (40+ hours/week)', 'Part-time (20-30 hours/week)', 'Weekends Only', 'Flexible/As Needed'] },
        { id: 'start_date', label: 'Earliest Start Date', type: 'text', required: true, placeholder: 'MM/DD/YYYY' },
        { id: 'transportation', label: 'Reliable Transportation', type: 'select', required: true, options: ['', 'Yes - Own Vehicle', 'Yes - Public Transit', 'Need Assistance'] },
        { id: 'reference_1_name', label: 'Reference 1 - Name', type: 'text', required: true, placeholder: 'Full Name' },
        { id: 'reference_1_phone', label: 'Reference 1 - Phone', type: 'tel', required: true, placeholder: '(603) 555-0123' },
        { id: 'reference_2_name', label: 'Reference 2 - Name', type: 'text', required: true, placeholder: 'Full Name' },
        { id: 'reference_2_phone', label: 'Reference 2 - Phone', type: 'tel', required: true, placeholder: '(603) 555-0123' },
        { id: 'why_join', label: 'Why do you want to join our team?', type: 'textarea', required: true, placeholder: 'Tell us what motivates you', rows: 5 },
      ]
    }
  ]
};

export default function ApplicationFormEditor() {
  const [config, setConfig] = useState<ApplicationConfig>(defaultFormConfig);
  const [selectedStepIndex, setSelectedStepIndex] = useState(0);
  const [editingField, setEditingField] = useState<{ stepIndex: number; fieldIndex: number } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      await loadConfig();
    })();
  }, []);

  const loadConfig = async () => {
    const stored = await loadDual('applicationFormConfig');
    if (stored) {
      try {
        setConfig(stored);
      } catch (error) {
        console.error('Failed to load form config:', error);
      }
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      await saveDual('applicationFormConfig', config);
      toast.success('Application form saved to database successfully!');
    } catch (error) {
      console.error('Failed to save form config:', error);
      toast.error('Failed to save form configuration');
    } finally {
      setSaving(false);
    }
  };

  const updateStep = (index: number, updates: Partial<ApplicationStep>) => {
    const newSteps = [...(config.steps || [])];
    newSteps[index] = { ...newSteps[index], ...updates };
    setConfig({ ...config, steps: newSteps });
  };

  const updateField = (stepIndex: number, fieldIndex: number, updates: Partial<ApplicationField>) => {
    const newSteps = [...(config.steps || [])];
    const fields = [...(newSteps[stepIndex].fields || [])];
    fields[fieldIndex] = { ...fields[fieldIndex], ...updates };
    newSteps[stepIndex] = { ...newSteps[stepIndex], fields };
    setConfig({ ...config, steps: newSteps });
  };

  const addField = (stepIndex: number) => {
    const newSteps = [...(config.steps || [])];
    const newField: ApplicationField = {
      id: `field_${Date.now()}`,
      label: 'New Field',
      type: 'text',
      required: false,
      placeholder: ''
    };
    newSteps[stepIndex].fields = [...(newSteps[stepIndex].fields || []), newField];
    setConfig({ ...config, steps: newSteps });
  };

  const deleteField = (stepIndex: number, fieldIndex: number) => {
    const newSteps = [...(config.steps || [])];
    newSteps[stepIndex].fields = newSteps[stepIndex].fields?.filter((_, i) => i !== fieldIndex);
    setConfig({ ...config, steps: newSteps });
  };

  const moveField = (stepIndex: number, fieldIndex: number, direction: 'up' | 'down') => {
    const newSteps = [...(config.steps || [])];
    const fields = [...(newSteps[stepIndex].fields || [])];
    const newIndex = direction === 'up' ? fieldIndex - 1 : fieldIndex + 1;
    if (newIndex < 0 || newIndex >= fields.length) return;
    [fields[fieldIndex], fields[newIndex]] = [fields[newIndex], fields[fieldIndex]];
    newSteps[stepIndex].fields = fields;
    setConfig({ ...config, steps: newSteps });
  };

  const addStep = () => {
    const newStep: ApplicationStep = {
      title: 'New Step',
      description: 'Step description',
      icon: null,
      fields: []
    };
    setConfig({ ...config, steps: [...(config.steps || []), newStep] });
  };

  const deleteStep = (index: number) => {
    if ((config.steps?.length || 0) <= 1) {
      toast.error('Must have at least one step');
      return;
    }
    const newSteps = config.steps?.filter((_, i) => i !== index) || [];
    setConfig({ ...config, steps: newSteps });
    if (selectedStepIndex >= newSteps.length) {
      setSelectedStepIndex(newSteps.length - 1);
    }
  };

  const selectedStep = config.steps?.[selectedStepIndex];

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {/* Header */}
      <div className="bg-[#1A1A1A] border-b border-[#2A2A2A] sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Job Application Form Editor</h1>
              <p className="text-sm text-gray-400 mt-1">Customize your job application form</p>
            </div>
            <button
              onClick={saveConfig}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2 bg-[#ea580c] hover:bg-[#dc2626] rounded-lg transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Form Title & Description */}
        <div className="bg-[#1A1A1A] rounded-lg border border-[#2A2A2A] p-6 mb-6">
          <h2 className="text-lg font-bold mb-4">Form Settings</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Form Title</label>
              <input
                type="text"
                value={config.title}
                onChange={(e) => setConfig({ ...config, title: e.target.value })}
                className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-[#ea580c]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Form Description</label>
              <input
                type="text"
                value={config.description}
                onChange={(e) => setConfig({ ...config, description: e.target.value })}
                className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-[#ea580c]"
              />
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Steps List */}
          <div className="lg:col-span-1">
            <div className="bg-[#1A1A1A] rounded-lg border border-[#2A2A2A] p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">Form Steps</h2>
                <button
                  onClick={addStep}
                  className="p-2 hover:bg-white/5 rounded-lg transition"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-2">
                {config.steps?.map((step, index) => (
                  <motion.div
                    key={index}
                    className={`p-3 rounded-lg border transition cursor-pointer ${
                      selectedStepIndex === index
                        ? 'border-[#ea580c] bg-[#ea580c]/10'
                        : 'border-white/10 hover:border-white/20'
                    }`}
                    onClick={() => setSelectedStepIndex(index)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-sm">Step {index + 1}</div>
                        <div className="text-xs text-gray-400">{step.title}</div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteStep(index);
                        }}
                        className="p-1 hover:bg-red-500/20 rounded transition"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          {/* Step Editor */}
          <div className="lg:col-span-2">
            {selectedStep && (
              <div className="bg-[#1A1A1A] rounded-lg border border-[#2A2A2A] p-6">
                <h2 className="text-lg font-bold mb-4">Edit Step {selectedStepIndex + 1}</h2>
                
                {/* Step Settings */}
                <div className="space-y-4 mb-6 pb-6 border-b border-white/10">
                  <div>
                    <label className="block text-sm font-medium mb-2">Step Title</label>
                    <input
                      type="text"
                      value={selectedStep.title}
                      onChange={(e) => updateStep(selectedStepIndex, { title: e.target.value })}
                      className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-[#ea580c]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Step Description</label>
                    <input
                      type="text"
                      value={selectedStep.description}
                      onChange={(e) => updateStep(selectedStepIndex, { description: e.target.value })}
                      className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-[#ea580c]"
                    />
                  </div>
                </div>

                {/* Fields */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold">Form Fields</h3>
                    <button
                      onClick={() => addField(selectedStepIndex)}
                      className="flex items-center gap-2 px-3 py-1 bg-[#ea580c] hover:bg-[#dc2626] rounded text-sm transition"
                    >
                      <Plus className="w-4 h-4" />
                      Add Field
                    </button>
                  </div>

                  {selectedStep.fields?.map((field, fieldIndex) => (
                    <div
                      key={fieldIndex}
                      className="bg-black/30 rounded-lg border border-white/10 p-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex flex-col gap-1 pt-2">
                          <button
                            onClick={() => moveField(selectedStepIndex, fieldIndex, 'up')}
                            disabled={fieldIndex === 0}
                            className="p-1 hover:bg-white/5 rounded disabled:opacity-30"
                          >
                            <ArrowUp className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => moveField(selectedStepIndex, fieldIndex, 'down')}
                            disabled={fieldIndex === (selectedStep.fields?.length || 0) - 1}
                            className="p-1 hover:bg-white/5 rounded disabled:opacity-30"
                          >
                            <ArrowDown className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="flex-1 space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Field Label</label>
                              <input
                                type="text"
                                value={field.label}
                                onChange={(e) => updateField(selectedStepIndex, fieldIndex, { label: e.target.value })}
                                className="w-full bg-black/50 border border-white/10 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-[#ea580c]"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Field Type</label>
                              <select
                                value={field.type}
                                onChange={(e) => updateField(selectedStepIndex, fieldIndex, { type: e.target.value as any })}
                                className="w-full bg-black/50 border border-white/10 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-[#ea580c]"
                              >
                                <option value="text">Text</option>
                                <option value="email">Email</option>
                                <option value="tel">Phone</option>
                                <option value="number">Number</option>
                                <option value="textarea">Textarea</option>
                                <option value="select">Dropdown</option>
                                <option value="file">File Upload</option>
                                <option value="checkbox">Checkbox</option>
                              </select>
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs text-gray-400 mb-1">Placeholder</label>
                            <input
                              type="text"
                              value={field.placeholder || ''}
                              onChange={(e) => updateField(selectedStepIndex, fieldIndex, { placeholder: e.target.value })}
                              className="w-full bg-black/50 border border-white/10 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-[#ea580c]"
                            />
                          </div>

                          {field.type === 'select' && (
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Options (one per line)</label>
                              <textarea
                                value={(field.options || []).join('\n')}
                                onChange={(e) => updateField(selectedStepIndex, fieldIndex, { 
                                  options: e.target.value.split('\n').filter(o => o.trim())
                                })}
                                rows={4}
                                className="w-full bg-black/50 border border-white/10 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-[#ea580c]"
                              />
                            </div>
                          )}

                          <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={field.required || false}
                                onChange={(e) => updateField(selectedStepIndex, fieldIndex, { required: e.target.checked })}
                                className="rounded border-white/10 bg-black/50 text-[#ea580c] focus:ring-[#ea580c]"
                              />
                              Required
                            </label>
                            {field.type === 'file' && (
                              <label className="flex items-center gap-2 text-sm">
                                <input
                                  type="checkbox"
                                  checked={field.multiple || false}
                                  onChange={(e) => updateField(selectedStepIndex, fieldIndex, { multiple: e.target.checked })}
                                  className="rounded border-white/10 bg-black/50 text-[#ea580c] focus:ring-[#ea580c]"
                                />
                                Multiple Files
                              </label>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() => deleteField(selectedStepIndex, fieldIndex)}
                          className="p-2 hover:bg-red-500/20 rounded transition"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}