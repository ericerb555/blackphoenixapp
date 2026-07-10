/**
 * Company Branding Center
 * Central hub for managing logos and documents
 */

import { useState } from 'react';
import { Image as ImageIcon, FileText, Palette, Building2 } from 'lucide-react';
import MultiLogoManager from './MultiLogoManager';
import CompanyDocumentsManager from './CompanyDocumentsManager';

type Tab = 'logos' | 'documents' | 'colors';

export default function CompanyBrandingCenter() {
  const [activeTab, setActiveTab] = useState<Tab>('logos');
  const [showDocuments, setShowDocuments] = useState(false);

  const tabs = [
    {
      id: 'logos' as Tab,
      name: 'Logo Library',
      icon: ImageIcon,
      description: 'Manage multiple logo variants',
    },
    {
      id: 'documents' as Tab,
      name: 'Company Documents',
      icon: FileText,
      description: 'Licenses, insurance, certifications',
    },
  ];

  return (
    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-[#2A2A2A]">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-[#ea580c] to-[#dc2626] rounded-xl flex items-center justify-center">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Company Branding Center</h2>
            <p className="text-gray-400 text-sm">Manage your company's visual identity and documents</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-[#ea580c] text-white'
                    : 'bg-[#0A0A0A] text-gray-400 hover:text-white hover:bg-[#2A2A2A]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <div className="text-left">
                  <div className="font-medium text-sm">{tab.name}</div>
                  <div className={`text-xs ${activeTab === tab.id ? 'text-white/70' : 'text-gray-500'}`}>
                    {tab.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'logos' && <MultiLogoManager />}

        {activeTab === 'documents' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-xl font-bold text-white mb-2">Company Documents</h3>
              <p className="text-gray-400 text-sm mb-4">
                Manage licenses, insurance, certifications, and other important company documents
              </p>
            </div>

            <button
              onClick={() => setShowDocuments(true)}
              className="w-full p-8 border-2 border-dashed border-[#2A2A2A] rounded-xl hover:border-[#ea580c] transition-colors group"
            >
              <div className="flex flex-col items-center gap-3">
                <div className="w-16 h-16 bg-[#ea580c]/10 rounded-full flex items-center justify-center group-hover:bg-[#ea580c]/20 transition-colors">
                  <FileText className="w-8 h-8 text-[#ea580c]" />
                </div>
                <div className="text-center">
                  <h4 className="text-white font-semibold mb-1">Manage Documents</h4>
                  <p className="text-gray-400 text-sm">
                    Upload and organize your company documentation
                  </p>
                </div>
              </div>
            </button>

            {showDocuments && (
              <CompanyDocumentsManager onClose={() => setShowDocuments(false)} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
