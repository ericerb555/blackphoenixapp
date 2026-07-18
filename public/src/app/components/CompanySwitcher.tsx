/**
 * Company Switcher
 * Dropdown to switch between companies and apply their branding
 */

import { useState } from 'react';
import { Building2, ChevronDown, Check } from 'lucide-react';
import { useActiveCompany } from '../contexts/ActiveCompanyContext';

export function CompanySwitcher() {
  const { activeCompany, allCompanies, setActiveCompany, loading } = useActiveCompany();
  const [isOpen, setIsOpen] = useState(false);

  if (loading || !activeCompany) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-[#1A1A1A] rounded-lg border border-[#2A2A2A]">
        <Building2 className="w-4 h-4 text-gray-400" />
        <span className="text-sm text-gray-400">Loading...</span>
      </div>
    );
  }

  if (allCompanies.length <= 1) {
    // Only one company, show as static display
    return (
      <div className="flex items-center gap-3 px-3 py-2 bg-[#1A1A1A] rounded-lg border border-[#2A2A2A]">
        {activeCompany.logo_url && (
          <img
            src={activeCompany.logo_url}
            alt={activeCompany.company_name}
            className="w-6 h-6 rounded object-cover"
          />
        )}
        {!activeCompany.logo_url && <Building2 className="w-4 h-4 text-orange-400" />}
        <span className="text-sm font-medium text-white">{activeCompany.company_name}</span>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-3 py-2 bg-[#1A1A1A] rounded-lg border border-[#2A2A2A] hover:bg-[#2A2A2A] transition"
      >
        {activeCompany.logo_url && (
          <img
            src={activeCompany.logo_url}
            alt={activeCompany.company_name}
            className="w-6 h-6 rounded object-cover"
          />
        )}
        {!activeCompany.logo_url && <Building2 className="w-4 h-4 text-orange-400" />}
        <span className="text-sm font-medium text-white">{activeCompany.company_name}</span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop to close dropdown */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown menu */}
          <div className="absolute top-full mt-2 left-0 w-64 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl shadow-2xl z-50 overflow-hidden">
            <div className="p-2">
              <div className="text-xs font-semibold text-gray-500 uppercase px-3 py-2">
                Switch Company
              </div>
              {allCompanies.map((company) => (
                <button
                  key={company.id}
                  onClick={() => {
                    setActiveCompany(company.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition ${
                    company.id === activeCompany.id
                      ? 'bg-orange-600/20 border border-orange-500/30'
                      : 'hover:bg-[#1A1A1A] border border-transparent'
                  }`}
                >
                  {company.logo_url && (
                    <img
                      src={company.logo_url}
                      alt={company.company_name}
                      className="w-8 h-8 rounded object-cover flex-shrink-0"
                    />
                  )}
                  {!company.logo_url && (
                    <div className="w-8 h-8 rounded bg-[#2A2A2A] flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-4 h-4 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1 text-left min-w-0">
                    <div className="text-sm font-medium text-white truncate">
                      {company.company_name}
                    </div>
                    {company.industry && (
                      <div className="text-xs text-gray-500 truncate">{company.industry}</div>
                    )}
                  </div>
                  {company.id === activeCompany.id && (
                    <Check className="w-4 h-4 text-orange-400 flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
