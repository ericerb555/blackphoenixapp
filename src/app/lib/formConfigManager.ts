/**
 * Form Configuration Manager
 * Manages work request form structure and customization
 */

export interface FormFieldConfig {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'number' | 'textarea' | 'select' | 'multiselect' | 'checkbox' | 'date' | 'file' | 'video';
  placeholder?: string;
  helpText?: string;
  required: boolean;
  visible: boolean;
  options?: string[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
  conditionalLogic?: {
    showIf: {
      field: string;
      value: any;
    };
  };
  defaultValue?: any;
  order: number;
}

export interface FormStepConfig {
  id: string;
  name: string;
  title: string;
  description: string;
  icon: string;
  visible: boolean;
  order: number;
  fields: FormFieldConfig[];
}

export interface FormConfiguration {
  id: string;
  name: string;
  version: string;
  active: boolean;
  steps: FormStepConfig[];
  createdAt: string;
  updatedAt: string;
}

// Default form configuration matching the current ClientWorkRequestForm
export const DEFAULT_FORM_CONFIG: FormConfiguration = {
  id: 'default',
  name: 'Standard Work Request Form',
  version: '1.0.0',
  active: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  steps: [
    {
      id: 'ai-guide',
      name: 'AI Guide',
      title: 'AI-Guided Project Setup',
      description: 'Smart project type detection and recommendations',
      icon: 'Brain',
      visible: true,
      order: 1,
      fields: [
        {
          id: 'ai_project_type',
          name: 'projectType',
          label: 'What type of project are you planning?',
          type: 'select',
          placeholder: 'Select project type',
          helpText: 'Our AI will customize the form based on your selection',
          required: true,
          visible: true,
          order: 1,
          options: [
            'New Construction',
            'Full Renovation',
            'Kitchen Renovation',
            'Bathroom Renovation',
            'Addition',
            'Deck/Patio',
            'Basement Finish',
            'Other'
          ]
        }
      ]
    },
    {
      id: 'project',
      name: 'Project Basics',
      title: 'Project Information',
      description: 'Tell us about your project and property',
      icon: 'Building2',
      visible: true,
      order: 2,
      fields: [
        {
          id: 'project_name',
          name: 'projectName',
          label: 'Project Name',
          type: 'text',
          placeholder: 'e.g., Smith Kitchen Remodel',
          helpText: 'Give your project a memorable name',
          required: true,
          visible: true,
          order: 1
        },
        {
          id: 'client_name',
          name: 'clientName',
          label: 'Your Name',
          type: 'text',
          placeholder: 'Full name',
          required: true,
          visible: true,
          order: 2
        },
        {
          id: 'client_email',
          name: 'clientEmail',
          label: 'Email Address',
          type: 'text',
          placeholder: 'email@example.com',
          required: true,
          visible: true,
          order: 3,
          validation: {
            pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$',
            message: 'Please enter a valid email address'
          }
        },
        {
          id: 'client_phone',
          name: 'clientPhone',
          label: 'Phone Number',
          type: 'text',
          placeholder: '(555) 123-4567',
          required: true,
          visible: true,
          order: 4
        },
        {
          id: 'site_address',
          name: 'siteAddress',
          label: 'Property Address',
          type: 'text',
          placeholder: 'Street address',
          required: true,
          visible: true,
          order: 5
        },
        {
          id: 'city',
          name: 'city',
          label: 'City',
          type: 'text',
          placeholder: 'City',
          required: true,
          visible: true,
          order: 6
        },
        {
          id: 'state',
          name: 'state',
          label: 'State',
          type: 'text',
          placeholder: 'State',
          required: true,
          visible: true,
          order: 7
        },
        {
          id: 'zip_code',
          name: 'zipCode',
          label: 'ZIP Code',
          type: 'text',
          placeholder: '12345',
          required: true,
          visible: true,
          order: 8
        },
        {
          id: 'property_type',
          name: 'propertyType',
          label: 'Property Type',
          type: 'select',
          required: true,
          visible: true,
          order: 9,
          options: [
            'Single Family Home',
            'Condo',
            'Apartment',
            'Townhouse',
            'Commercial'
          ]
        },
        {
          id: 'year_built',
          name: 'yearBuilt',
          label: 'Year Built',
          type: 'number',
          placeholder: '2000',
          required: false,
          visible: true,
          order: 10,
          validation: {
            min: 1800,
            max: new Date().getFullYear(),
            message: 'Please enter a valid year'
          }
        }
      ]
    },
    {
      id: 'design',
      name: 'Design Requirements',
      title: 'Room & Layout Requirements',
      description: 'Define your space requirements and layout preferences',
      icon: 'Layers',
      visible: true,
      order: 3,
      fields: [
        {
          id: 'total_floors',
          name: 'totalFloors',
          label: 'Number of Floors',
          type: 'number',
          placeholder: '1',
          required: true,
          visible: true,
          order: 1,
          validation: {
            min: 1,
            max: 10,
            message: 'Please enter a valid number of floors'
          }
        },
        {
          id: 'lot_width',
          name: 'lotWidth',
          label: 'Lot Width (feet)',
          type: 'number',
          placeholder: '50',
          required: false,
          visible: true,
          order: 2
        },
        {
          id: 'lot_depth',
          name: 'lotDepth',
          label: 'Lot Depth (feet)',
          type: 'number',
          placeholder: '100',
          required: false,
          visible: true,
          order: 3
        }
      ]
    },
    {
      id: 'style',
      name: 'Style Preferences',
      title: 'Design Style & Aesthetics',
      description: 'Choose your preferred design style and aesthetic',
      icon: 'Palette',
      visible: true,
      order: 4,
      fields: [
        {
          id: 'design_style',
          name: 'designStyle',
          label: 'Preferred Design Style',
          type: 'select',
          helpText: 'Select the style that best matches your vision',
          required: true,
          visible: true,
          order: 1,
          options: [
            'Modern',
            'Contemporary',
            'Traditional',
            'Transitional',
            'Farmhouse',
            'Industrial',
            'Scandinavian',
            'Mid-Century Modern',
            'Mediterranean',
            'Craftsman'
          ]
        },
        {
          id: 'color_preferences',
          name: 'colorPreferences',
          label: 'Color Preferences',
          type: 'multiselect',
          helpText: 'Select your preferred color palette (multiple selections allowed)',
          required: false,
          visible: true,
          order: 2,
          options: [
            'Neutral (White, Beige, Gray)',
            'Warm (Brown, Tan, Cream)',
            'Cool (Blue, Green)',
            'Bold (Red, Orange, Yellow)',
            'Dark (Black, Charcoal)',
            'Earth Tones'
          ]
        }
      ]
    },
    {
      id: 'kitchen',
      name: 'Kitchen Details',
      title: 'Kitchen Specifications',
      description: 'Detailed kitchen requirements and preferences',
      icon: 'UtensilsCrossed',
      visible: true,
      order: 5,
      fields: [
        {
          id: 'kitchen_length',
          name: 'existingKitchenLength',
          label: 'Kitchen Length (feet)',
          type: 'number',
          placeholder: '12',
          required: false,
          visible: true,
          order: 1,
          conditionalLogic: {
            showIf: {
              field: 'projectType',
              value: 'Kitchen Renovation'
            }
          }
        },
        {
          id: 'kitchen_width',
          name: 'existingKitchenWidth',
          label: 'Kitchen Width (feet)',
          type: 'number',
          placeholder: '10',
          required: false,
          visible: true,
          order: 2,
          conditionalLogic: {
            showIf: {
              field: 'projectType',
              value: 'Kitchen Renovation'
            }
          }
        },
        {
          id: 'layout_goals',
          name: 'layoutChangeGoals',
          label: 'Layout Goals',
          type: 'multiselect',
          helpText: 'What changes would you like to make?',
          required: false,
          visible: true,
          order: 3,
          options: [
            'Open Concept',
            'Add Island',
            'Expand Space',
            'Better Flow',
            'More Storage',
            'Modern Appliances'
          ]
        }
      ]
    },
    {
      id: 'structural',
      name: 'Structural Information',
      title: 'Existing Conditions',
      description: 'Current structural details and dimensions',
      icon: 'Ruler',
      visible: true,
      order: 6,
      fields: [
        {
          id: 'existing_layout',
          name: 'existingLayoutDescription',
          label: 'Current Layout Description',
          type: 'textarea',
          placeholder: 'Describe the current layout and any notable features...',
          helpText: 'Include details about room configuration, walls, windows, doors',
          required: false,
          visible: true,
          order: 1
        },
        {
          id: 'load_bearing_walls',
          name: 'loadBearingWallLocations',
          label: 'Load-Bearing Wall Locations',
          type: 'textarea',
          placeholder: 'Describe where load-bearing walls are located...',
          required: false,
          visible: true,
          order: 2
        },
        {
          id: 'window_locations',
          name: 'windowLocations',
          label: 'Window Locations',
          type: 'textarea',
          placeholder: 'Describe window locations and sizes...',
          required: false,
          visible: true,
          order: 3
        }
      ]
    },
    {
      id: 'rendering',
      name: 'Rendering Preferences',
      title: 'Visualization Options',
      description: 'How would you like to see your project visualized?',
      icon: 'Eye',
      visible: true,
      order: 7,
      fields: [
        {
          id: 'rendering_style',
          name: 'renderingStyle',
          label: 'Preferred Rendering Style',
          type: 'select',
          helpText: 'Choose how you want to visualize the final design',
          required: false,
          visible: true,
          order: 1,
          options: [
            'Photorealistic',
            'Artistic',
            'Sketch',
            'Blueprint',
            '3D Model'
          ]
        },
        {
          id: 'views_needed',
          name: 'viewsNeeded',
          label: 'Views Needed',
          type: 'multiselect',
          required: false,
          visible: true,
          order: 2,
          options: [
            'Floor Plan',
            'Exterior Views',
            'Interior Rooms',
            '360° Tour',
            'Elevation Views'
          ]
        }
      ]
    },
    {
      id: 'media',
      name: 'Media Upload',
      title: 'Photos & Videos',
      description: 'Upload photos and videos of your existing space',
      icon: 'Camera',
      visible: true,
      order: 8,
      fields: [
        {
          id: 'project_photos',
          name: 'projectPhotos',
          label: 'Project Photos',
          type: 'file',
          helpText: 'Upload photos of the existing space',
          required: false,
          visible: true,
          order: 1
        },
        {
          id: 'project_videos',
          name: 'projectVideos',
          label: 'Project Videos',
          type: 'video',
          helpText: 'Record or upload videos for AI analysis',
          required: false,
          visible: true,
          order: 2
        }
      ]
    },
    {
      id: 'budget',
      name: 'Budget & Timeline',
      title: 'Budget & Schedule',
      description: 'Project budget and timeline expectations',
      icon: 'DollarSign',
      visible: true,
      order: 9,
      fields: [
        {
          id: 'budget_range',
          name: 'budgetRange',
          label: 'Budget Range',
          type: 'select',
          required: true,
          visible: true,
          order: 1,
          options: [
            'Under $10,000',
            '$10,000 - $25,000',
            '$25,000 - $50,000',
            '$50,000 - $100,000',
            '$100,000 - $250,000',
            '$250,000 - $500,000',
            'Over $500,000'
          ]
        },
        {
          id: 'timeline',
          name: 'desiredTimeline',
          label: 'Desired Timeline',
          type: 'select',
          required: true,
          visible: true,
          order: 2,
          options: [
            'ASAP',
            '1-3 months',
            '3-6 months',
            '6-12 months',
            'Over 1 year',
            'Flexible'
          ]
        },
        {
          id: 'start_date',
          name: 'preferredStartDate',
          label: 'Preferred Start Date',
          type: 'date',
          required: false,
          visible: true,
          order: 3
        }
      ]
    },
    {
      id: 'review',
      name: 'Review & Submit',
      title: 'Review Your Request',
      description: 'Review all information before submitting',
      icon: 'CheckCircle',
      visible: true,
      order: 10,
      fields: [
        {
          id: 'additional_notes',
          name: 'additionalNotes',
          label: 'Additional Notes or Special Requests',
          type: 'textarea',
          placeholder: 'Any additional information you would like to share...',
          required: false,
          visible: true,
          order: 1
        }
      ]
    }
  ]
};

export class FormConfigManager {
  private static STORAGE_KEY = 'work_request_form_config';

  static async getActiveConfig(): Promise<FormConfiguration> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading form config:', error);
    }
    return DEFAULT_FORM_CONFIG;
  }

  static async saveConfig(config: FormConfiguration): Promise<void> {
    try {
      config.updatedAt = new Date().toISOString();
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(config));
    } catch (error) {
      console.error('Error saving form config:', error);
      throw error;
    }
  }

  static async resetToDefault(): Promise<FormConfiguration> {
    localStorage.removeItem(this.STORAGE_KEY);
    return DEFAULT_FORM_CONFIG;
  }

  static validateConfig(config: FormConfiguration): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.name || config.name.trim() === '') {
      errors.push('Configuration name is required');
    }

    if (!config.steps || config.steps.length === 0) {
      errors.push('At least one step is required');
    }

    config.steps.forEach((step, stepIndex) => {
      if (!step.name || step.name.trim() === '') {
        errors.push(`Step ${stepIndex + 1}: Name is required`);
      }

      step.fields.forEach((field, fieldIndex) => {
        if (!field.name || field.name.trim() === '') {
          errors.push(`Step ${stepIndex + 1}, Field ${fieldIndex + 1}: Name is required`);
        }
        if (!field.label || field.label.trim() === '') {
          errors.push(`Step ${stepIndex + 1}, Field ${fieldIndex + 1}: Label is required`);
        }
      });
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }
}
