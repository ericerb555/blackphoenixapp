/**
 * Branding Hub - Main Orchestrator Component
 * Phase 1: Foundation - Brand Identity & Asset Library
 * MAX SIZE: 120 lines | Modular Architecture Compliant
 */

import { useState } from 'react';
import { Palette, Folder, Upload, FileText } from 'lucide-react';
import { BrandIdentity } from './BrandIdentity';
import { AssetLibrary } from './AssetLibrary';
import { ImportExport } from './ImportExport';
import CompanyDocumentsManager from '../CompanyDocumentsManager';
import type { BrandingHubProps, BrandingSubTab } from './types';

export function BrandingHub({ settings, updateSettings, updateAssets }: BrandingHubProps) {
  const [activeSubTab, setActiveSubTab] = useState<BrandingSubTab>('identity');
  const [selectedCategory, setSelectedCategory] = useState('1');
  const [showDocuments, setShowDocuments] = useState(false);

  // Sub-tabs configuration
  const subTabs = [
    { id: 'identity' as BrandingSubTab, label: 'Brand Identity', icon: Palette, desc: 'Logos, colors, typography' },
    { id: 'assets' as BrandingSubTab, label: 'Asset Library', icon: Folder, desc: 'Marketing assets & media' },
    { id: 'import' as BrandingSubTab, label: 'Import & Export', icon: Upload, desc: 'Import from Figma, export brand kit' },
    { id: 'documents' as BrandingSubTab, label: 'Company Documents', icon: FileText, desc: 'Licenses, insurance, certifications' }
  ];

  // Handle brand identity updates
  const handleBrandingUpdate = (updates: any) => {
    updateSettings('branding', updates);
  };

  // Handle asset library updates
  const handleAssetUpdate = (updates: any) => {
    updateSettings('assetLibrary', updates);
  };

  // Stock photos land in the first asset category so they're immediately usable.
  const handleAddStockAsset = (asset: { name: string; url: string; credit?: string }) => {
    const categories = settings.assetLibrary?.categories || [];
    if (categories.length === 0) return;
    const targetId = categories.some(c => c.id === selectedCategory) ? selectedCategory : categories[0].id;
    updateSettings('assetLibrary', {
      categories: categories.map(category =>
        category.id === targetId
          ? {
              ...category,
              assets: [
                {
                  id: `asset_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                  name: asset.credit ? `${asset.name} (${asset.credit})` : asset.name,
                  url: asset.url,
                  categoryId: category.id,
                  usageCount: 0,
                  uploadedAt: new Date().toISOString(),
                },
                ...(category.assets || []),
              ],
            }
          : category,
      ),
    });
  };

  // Render active sub-tab content
  const renderContent = () => {
    switch (activeSubTab) {
      case 'identity':
        return (
          <BrandIdentity
            settings={settings.branding}
            onUpdate={handleBrandingUpdate}
          />
        );

      case 'assets':
        return (
          <AssetLibrary
            settings={settings.assetLibrary}
            onUpdate={handleAssetUpdate}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
          />
        );

      case 'import':
        return (
          <ImportExport
            settings={settings.branding}
            onUpdate={handleBrandingUpdate}
            onAddAsset={handleAddStockAsset}
          />
        );

      case 'documents':
        return (
          <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-white">Company Documents</h3>
                <p className="text-gray-400 text-sm mt-1">
                  Manage licenses, insurance, certifications, and other company documents
                </p>
              </div>
              <button
                onClick={() => setShowDocuments(true)}
                className="px-4 py-2 bg-[#ea580c] hover:bg-[#dc2626] text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                Manage Documents
              </button>
            </div>
            <div className="text-gray-500 text-sm">
              Click "Manage Documents" to upload and organize your company documentation.
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub-tab Navigation */}
      <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-2">
        <div className="grid grid-cols-4 gap-2">
          {subTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                className={`p-4 rounded-xl transition ${
                  activeSubTab === tab.id
                    ? 'bg-[#ea580c]/20 border-2 border-[#ea580c]/30'
                    : 'bg-[#0A0A0A] border-2 border-transparent hover:border-[#2A2A2A]'
                }`}
              >
                <Icon className={`w-6 h-6 mx-auto mb-2 ${
                  activeSubTab === tab.id ? 'text-[#ea580c]' : 'text-gray-400'
                }`} />
                <p className={`text-sm font-semibold ${
                  activeSubTab === tab.id ? 'text-white' : 'text-gray-400'
                }`}>
                  {tab.label}
                </p>
                <p className="text-xs text-gray-500 mt-1">{tab.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Content */}
      {renderContent()}

      {/* Company Documents Manager Modal */}
      {showDocuments && (
        <CompanyDocumentsManager onClose={() => setShowDocuments(false)} />
      )}
    </div>
  );
}
