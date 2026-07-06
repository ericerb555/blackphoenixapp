/**
 * Branding Hub - Shared Type Definitions
 * MAX SIZE: 50 lines | ISO20022 Compliant
 * 
 * This file contains all TypeScript interfaces and types
 * used across the Branding Hub component system.
 */

export type BrandingSubTab = 'identity' | 'assets' | 'import' | 'documents';

export interface Logo {
  id: string;
  name: string;
  description?: string;
  url?: string;
  isDefault: boolean;
}

export interface Color {
  name: string;
  hex: string;
  usage?: string;
}

export interface ColorPalette {
  id: string;
  name: string;
  colors: Color[];
  isDefault: boolean;
}

export interface FontPairing {
  id: string;
  name: string;
  heading: string;
  body: string;
  isActive: boolean;
}

export interface Typography {
  headingFont: string;
  bodyFont: string;
  fontPairings: FontPairing[];
}

export interface Asset {
  id: string;
  name: string;
  url?: string;
  categoryId: string;
  usageCount: number;
  uploadedAt?: string;
}

export interface AssetCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  assets: Asset[];
}

export interface BrandingSettings {
  companyName: string;
  tagline?: string;
  logos: Logo[];
  colorPalettes: ColorPalette[];
  typography: Typography;
}

export interface AssetLibrarySettings {
  categories: AssetCategory[];
}

export interface BrandingHubProps {
  settings: {
    branding: BrandingSettings;
    assetLibrary: AssetLibrarySettings;
  };
  updateSettings: (section: string, updates: any) => void;
  updateAssets: (category: string, updates: any) => void;
}
