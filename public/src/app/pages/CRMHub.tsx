import { useState } from 'react';
import { Users, Building2, Plus, Grid, ArrowLeft, Zap } from 'lucide-react';
import { CRMManagement } from '../components/crm/CRMManagement';
import SubCRMSystemBuilder from '../components/SubCRMSystemBuilder';
import CondoAssociationCRM from '../components/CondoAssociationCRM';
import PortfolioManagementCRM from '../components/PortfolioManagementCRM';
import { BackToDashboard } from '../components/BackToDashboard';

type ViewType = 'hub' | 'main-crm' | 'sub-crm-builder' | 'condo-crm' | 'portfolio-crm';

export default function CRMHub() {
  const [activeView, setActiveView] = useState<ViewType>('hub');

  const renderView = () => {
    switch (activeView) {
      case 'main-crm':
        return <CRMManagement />;
      case 'sub-crm-builder':
        return <SubCRMSystemBuilder />;
      case 'condo-crm':
        return <CondoAssociationCRM />;
      case 'portfolio-crm':
        return <PortfolioManagementCRM />;
      default:
        return null;
    }
  };

  // If viewing a specific CRM, don't show the hub interface
  if (activeView !== 'hub') {
    return (
      <div className="min-h-screen bg-[#0A0A0A]">
        <div className="bg-[#0F0F0F] border-b border-[#2A2A2A] p-4">
          <button
            onClick={() => setActiveView('hub')}
            className="flex items-center gap-2 px-4 py-2 bg-[#1A1A1A] border border-[#2A2A2A] hover:border-orange-500/50 text-gray-300 hover:text-white rounded-lg transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to CRM Hub
          </button>
        </div>
        {renderView()}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <BackToDashboard />
      
      {/* Header */}
      <div className="bg-[#0A0A0A] border-b-2 border-orange-500/50 p-8 shadow-2xl">
        <div className="max-w-[1800px] mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-600 to-orange-700 flex items-center justify-center shadow-lg shadow-orange-500/30">
              <Users className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">🎯 CRM Command Center</h1>
              <p className="text-gray-400">Manage all customer relationship systems and custom CRM solutions</p>
            </div>
          </div>
        </div>
      </div>

      {/* CRM Options Grid */}
      <div className="max-w-[1800px] mx-auto p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Main CRM System */}
          <button
            onClick={() => setActiveView('main-crm')}
            className="group relative p-8 rounded-2xl border-2 border-[#2A2A2A] bg-gradient-to-br from-[#1A1A1A] to-[#0F0F0F] hover:border-blue-500/50 hover:shadow-xl hover:shadow-blue-500/20 transition-all duration-300 text-left"
          >
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            <div className="relative">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-blue-500/30">
                <Users className="w-8 h-8 text-white" />
              </div>
              
              <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-blue-300 transition-colors">
                Main CRM System
              </h3>
              <p className="text-gray-400 mb-4">
                Standard CRM with contacts, companies, pipeline, activities, tasks, and analytics
              </p>
              
              <div className="flex items-center gap-2 text-blue-400 font-semibold">
                <span>Open CRM</span>
                <ArrowLeft className="w-5 h-5 rotate-180 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </button>

          {/* SubCRM System Builder */}
          <button
            onClick={() => setActiveView('sub-crm-builder')}
            className="group relative p-8 rounded-2xl border-2 border-orange-500/50 bg-gradient-to-br from-orange-600/20 to-orange-700/10 hover:border-orange-500 hover:shadow-xl hover:shadow-orange-500/30 transition-all duration-300 text-left"
          >
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-orange-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            <div className="relative">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-orange-600 to-orange-700 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-orange-500/30">
                <Plus className="w-8 h-8 text-white" />
              </div>
              
              <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-orange-300 transition-colors">
                SubCRM System Builder
              </h3>
              <p className="text-gray-400 mb-4">
                Create custom CRM systems for specific business verticals and use cases
              </p>
              
              <div className="px-3 py-1 rounded-full bg-orange-500/20 border border-orange-500/30 text-orange-300 text-sm font-bold inline-block mb-4">
                🔥 FEATURED
              </div>
              
              <div className="flex items-center gap-2 text-orange-400 font-semibold">
                <span>Build Custom CRM</span>
                <ArrowLeft className="w-5 h-5 rotate-180 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </button>

          {/* Condo Association CRM */}
          <button
            onClick={() => setActiveView('condo-crm')}
            className="group relative p-8 rounded-2xl border-2 border-[#2A2A2A] bg-gradient-to-br from-[#1A1A1A] to-[#0F0F0F] hover:border-cyan-500/50 hover:shadow-xl hover:shadow-cyan-500/20 transition-all duration-300 text-left"
          >
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            <div className="relative">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-cyan-600 to-cyan-700 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-cyan-500/30">
                <Building2 className="w-8 h-8 text-white" />
              </div>
              
              <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-cyan-300 transition-colors">
                Condo Association CRM
              </h3>
              <p className="text-gray-400 mb-4">
                Property management CRM for condo associations with maintenance tracking and unit management
              </p>
              
              <div className="flex items-center gap-2 text-cyan-400 font-semibold">
                <span>Open CRM</span>
                <ArrowLeft className="w-5 h-5 rotate-180 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </button>

          {/* Portfolio Management CRM */}
          <button
            onClick={() => setActiveView('portfolio-crm')}
            className="group relative p-8 rounded-2xl border-2 border-[#2A2A2A] bg-gradient-to-br from-[#1A1A1A] to-[#0F0F0F] hover:border-purple-500/50 hover:shadow-xl hover:shadow-purple-500/20 transition-all duration-300 text-left"
          >
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            <div className="relative">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-purple-600 to-purple-700 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-purple-500/30">
                <Grid className="w-8 h-8 text-white" />
              </div>
              
              <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-purple-300 transition-colors">
                Portfolio Management CRM
              </h3>
              <p className="text-gray-400 mb-4">
                Investment portfolio tracking with property management, tenant relationships, and ROI analytics
              </p>
              
              <div className="flex items-center gap-2 text-purple-400 font-semibold">
                <span>Open CRM</span>
                <ArrowLeft className="w-5 h-5 rotate-180 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </button>

          {/* Coming Soon - More CRMs */}
          <div className="relative p-8 rounded-2xl border-2 border-[#2A2A2A] bg-gradient-to-br from-[#1A1A1A] to-[#0F0F0F] opacity-60">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-gray-600 to-gray-700 flex items-center justify-center mb-4 shadow-lg">
              <Plus className="w-8 h-8 text-white" />
            </div>
            
            <h3 className="text-2xl font-bold text-white mb-2">
              More CRM Systems
            </h3>
            <p className="text-gray-400 mb-4">
              Create unlimited custom CRM systems using the SubCRM Builder
            </p>
            
            <div className="px-3 py-1 rounded-full bg-gray-500/20 border border-gray-500/30 text-gray-400 text-sm font-bold inline-block">
              COMING SOON
            </div>
          </div>

        </div>

        {/* Info Section */}
        <div className="mt-8 p-6 rounded-2xl border-2 border-orange-500/30 bg-gradient-to-br from-orange-600/10 to-orange-700/5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-600 to-orange-700 flex items-center justify-center flex-shrink-0">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white mb-2">💡 CRM System Builder</h3>
              <p className="text-gray-400 mb-3">
                Use the <strong className="text-orange-400">SubCRM System Builder</strong> to create unlimited custom CRM systems 
                tailored to your specific business verticals, customer segments, or use cases.
              </p>
              <p className="text-gray-400">
                Each custom CRM includes customizable tabs, fields, workflows, manager portals, and customer group segmentation.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}