/**
 * Portal Creation Wizard - TypeScript Types
 * ISO20022 Compliant | App Store Guidelines Compatible
 */

export type PortalType = 
  | 'customer' 
  | 'employee' 
  | 'subcontractor' 
  | 'vendor' 
  | 'property-manager'
  | 'portfolio-manager'
  | 'technician'
  | 'owners'
  | 'professional'
  | 'bank'
  | 'custom';

export type PortalStatus = 'draft' | 'active' | 'inactive' | 'archived';

export interface PortalTemplate {
  id: string;
  name: string;
  type: PortalType;
  description: string;
  icon: any;
  color: string;
  recommendedFor: string[];
  features: string[];
  workflows: string[];
  trackingSystems: string[];
  aiSuggestion?: string;
}

export interface TrackingConfig {
  enabled: boolean;
  prefix: string;
  systems: string[];
}

export interface BrandingConfig {
  primaryColor: string;
  secondaryColor: string;
  logoUrl: string;
  faviconUrl?: string;
  customCss?: string;
}

export interface AccessControl {
  requireLogin: boolean;
  allowSignup: boolean;
  twoFactorAuth: boolean;
  ipWhitelist: string[];
  allowedDomains: string[];
  sessionTimeout?: number;
}

export interface AIConfig {
  enabled: boolean;
  assistedCreation: boolean;
  suggestions: string[];
  recommendedFeatures?: string[];
}

export interface PortalData {
  id?: string;
  portal_id?: string;
  name: string;
  description: string;
  portal_type: PortalType;
  template_id?: string;
  company_name?: string;
  status: PortalStatus;
  url_slug: string;
  enabled_features: Record<string, boolean>;
  enabled_modules: string[];
  workflows: string[];
  tracking_config: TrackingConfig;
  branding: BrandingConfig;
  access_control: AccessControl;
  ai_config?: AIConfig;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface WizardStep {
  id: number;
  name: string;
  description: string;
  icon: any;
  isComplete?: boolean;
}

export interface PortalWizardProps {
  onClose: () => void;
  onComplete: (portalData: PortalData) => void;
  initialData?: Partial<PortalData>;
  editMode?: boolean;
}

export interface WizardStepProps {
  data: Partial<PortalData>;
  onUpdate: (updates: Partial<PortalData>) => void;
  onNext: () => void;
  onPrevious: () => void;
  isFirst: boolean;
  isLast: boolean;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}
