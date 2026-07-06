/**
 * Active Company Context
 * Manages which company is currently active and provides its branding throughout the app
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { CompanyDatabaseService, Company } from '../lib/services/companyDatabaseService';

interface ActiveCompanyContextType {
  activeCompany: Company | null;
  allCompanies: Company[];
  setActiveCompany: (companyId: string) => void;
  refreshCompanies: () => Promise<void>;
  loading: boolean;
}

const ActiveCompanyContext = createContext<ActiveCompanyContextType | undefined>(undefined);

export function ActiveCompanyProvider({ children }: { children: ReactNode }) {
  const [activeCompany, setActiveCompanyState] = useState<Company | null>(null);
  const [allCompanies, setAllCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  // Load companies on mount
  useEffect(() => {
    loadCompanies();

    // Listen for company saves from anywhere in the app
    const handleCompanySaved = () => {
      console.log('🔄 Company saved event detected - refreshing...');
      loadCompanies();
    };

    window.addEventListener('companySaved', handleCompanySaved);

    return () => {
      window.removeEventListener('companySaved', handleCompanySaved);
    };
  }, []);

  const loadCompanies = async () => {
    try {
      setLoading(true);
      const { data: companies } = await CompanyDatabaseService.getCompanies();

      if (companies && companies.length > 0) {
        setAllCompanies(companies);

        // Check if there's a saved active company
        const savedActiveId = localStorage.getItem('active_company_id');
        let activeComp: Company | undefined;

        if (savedActiveId) {
          activeComp = companies.find(c => c.id === savedActiveId);
        }

        // If no saved active or it doesn't exist, use first company
        if (!activeComp) {
          activeComp = companies[0];
        }

        setActiveCompanyState(activeComp);
        console.log('✅ Active company:', activeComp.company_name);
      } else {
        setAllCompanies([]);
        setActiveCompanyState(null);
      }
    } catch (error) {
      console.error('Error loading companies:', error);
    } finally {
      setLoading(false);
    }
  };

  const setActiveCompany = (companyId: string) => {
    const company = allCompanies.find(c => c.id === companyId);
    if (company) {
      setActiveCompanyState(company);
      localStorage.setItem('active_company_id', companyId);
      console.log('✅ Switched to company:', company.company_name);

      // Dispatch event so other components can react
      window.dispatchEvent(new CustomEvent('activeCompanyChanged', { detail: company }));
    }
  };

  const refreshCompanies = async () => {
    await loadCompanies();
  };

  return (
    <ActiveCompanyContext.Provider
      value={{
        activeCompany,
        allCompanies,
        setActiveCompany,
        refreshCompanies,
        loading,
      }}
    >
      {children}
    </ActiveCompanyContext.Provider>
  );
}

export function useActiveCompany() {
  const context = useContext(ActiveCompanyContext);
  if (context === undefined) {
    throw new Error('useActiveCompany must be used within an ActiveCompanyProvider');
  }
  return context;
}
