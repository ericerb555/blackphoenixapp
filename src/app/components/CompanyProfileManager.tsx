/**
 * Company Profile Manager
 * Comprehensive company profile with corporation documents and banking
 * Integrates with all existing systems
 */

import { useState, useEffect } from 'react';
import {
  Building2, FileText, Landmark, Upload, Download, Edit2, Save, Plus,
  Trash2, Shield, Check, X, Eye, EyeOff, Copy, AlertCircle, CheckCircle2,
  CreditCard, DollarSign, Globe, Phone, Mail, MapPin, Calendar, Users,
  Briefcase, Award, Lock, Key, RefreshCw, ExternalLink, Image, Sparkles, Palette, Star
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import EnterpriseBrandCreator from './EnterpriseBrandCreator';
import { PrimaryButton } from './ui/button/PrimaryButton';
import { SecondaryButton } from './ui/button/SecondaryButton';
import { copyToClipboard } from '../utils/clipboard';
import { API_BASE_URL } from '../lib/apiConfig';
import * as CompanyStore from '../lib/simpleCompanyStore';

interface CorporationDocument {
  id: string;
  document_type: 'articles_incorporation' | 'operating_agreement' | 'bylaws' | 'ein_letter' | 'business_license' | 'insurance_cert' | 'other';
  document_name: string;
  file_url?: string;
  issue_date?: string;
  expiration_date?: string;
  document_number?: string;
  issuing_authority?: string;
  notes?: string;
  uploaded_at: string;
}

interface BankAccount {
  id: string;
  bank_name: string;
  account_type: 'checking' | 'savings' | 'money_market' | 'business_checking';
  account_number_last4: string;
  routing_number: string;
  is_primary: boolean;
  account_nickname?: string;
  current_balance?: number;
  notes?: string;
  added_at: string;
}

interface CompanyLogo {
  id: string;
  name: string;
  url: string;
  uploaded_at: string;
  is_primary: boolean;
}

export default function CompanyProfileManager() {
  const { user } = useAuth();

  // SIMPLE STORE: Direct localStorage access - no context, no loading states
  const [userCompanies, setUserCompanies] = useState<CompanyStore.Company[]>([]);
  const [activeCompany, setActiveCompany] = useState<CompanyStore.Company | null>(null);
  const [forceUpdate, setForceUpdate] = useState(0);

  // Load companies on mount and when user changes
  useEffect(() => {
    if (user) {
      (async () => {
        const companies = await CompanyStore.getAllCompanies(user.id);
        setUserCompanies(companies);

        const active = await CompanyStore.getActiveCompany(user.id);
        setActiveCompany(active);

        console.log('[CompanyProfileManager] Loaded:', companies.length, 'companies, active:', active?.name);
      })();
    }
  }, [user, forceUpdate]);

  // Helper to refresh data
  const refreshCompanies = () => {
    setForceUpdate(prev => prev + 1);
  };

  // Add Company Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [addModalTab, setAddModalTab] = useState<'basic' | 'documents' | 'branding'>('basic');
  const [formData, setFormData] = useState({
    name: '',
    dba: '',
    slug: '',
    website: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    country: 'United States',
    industry: '',
    description: '',
    founded_date: '',
    employee_count: 0,
    annual_revenue: 0,
    tax_id: '',
    business_license: ''
  });
  const [logoFiles, setLogoFiles] = useState<Array<{ file: File; preview: string; isPrimary: boolean }>>([]);
  const [uploadedDocuments, setUploadedDocuments] = useState<Array<{ file: File; preview: string; type: string }>>([]);

  // DEBUG: Track formData changes
  useEffect(() => {
    console.log('📝 formData changed:', formData);
    console.log('📝 formData.name:', formData.name);
    console.log('📝 Button will be disabled:', !formData.name);
  }, [formData]);

  // DEBUG: Track modal state
  useEffect(() => {
    console.log('🚪 Modal state changed - showAddModal:', showAddModal);
    if (showAddModal) {
      console.log('🚪 Modal OPENED - current formData.name:', formData.name);
    }
  }, [showAddModal]);

  const [activeSection, setActiveSection] = useState<'overview' | 'documents' | 'banking' | 'branding'>('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [showBrandCreator, setShowBrandCreator] = useState(false);
  const [showAddLogo, setShowAddLogo] = useState(false);
  const [editingLogoId, setEditingLogoId] = useState<string | null>(null);
  const [editingLogoName, setEditingLogoName] = useState('');
  
  // Company Profile State
  const [profile, setProfile] = useState({
    // Legal Information
    legal_name: activeCompany?.name || '',
    dba_name: '',
    entity_type: 'LLC' as 'LLC' | 'Corporation' | 'S-Corp' | 'C-Corp' | 'Partnership' | 'Sole Proprietorship',
    state_of_formation: '',
    formation_date: '',
    ein: '',
    
    // Business Information
    industry: '',
    naics_code: '',
    description: '',
    website: '',
    
    // Contact Information
    primary_email: '',
    primary_phone: '',
    
    // Address
    physical_address: '',
    physical_city: '',
    physical_state: '',
    physical_zip: '',
    physical_country: 'United States',
    
    mailing_address: '',
    mailing_city: '',
    mailing_state: '',
    mailing_zip: '',
    mailing_country: 'United States',
    same_as_physical: true,
    
    // Financial
    fiscal_year_end: '',
    annual_revenue: '',
    employee_count: '',
    
    // Compliance
    workers_comp_policy: '',
    general_liability_policy: '',
    professional_liability_policy: '',
    
    // Logo/Branding
    logo_url: activeCompany?.logo_url || '',
    primary_color: '#ea580c',
    secondary_color: '#0A0A0A'
  });
  
  // Documents State
  const [documents, setDocuments] = useState<CorporationDocument[]>([]);
  const [showAddDocument, setShowAddDocument] = useState(false);
  const [editingDocument, setEditingDocument] = useState<CorporationDocument | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{ name: string; url: string } | null>(null);
  const [newDocument, setNewDocument] = useState({
    document_type: 'articles_incorporation' as CorporationDocument['document_type'],
    document_name: '',
    document_number: '',
    issue_date: '',
    expiration_date: '',
    issuing_authority: '',
    notes: ''
  });
  
  // Banking State
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [showAddBank, setShowAddBank] = useState(false);
  const [showBankDetails, setShowBankDetails] = useState<Record<string, boolean>>({});
  
  // Logos State
  const [logos, setLogos] = useState<CompanyLogo[]>([
    {
      id: '1',
      name: 'Primary Logo',
      url: activeCompany?.logo_url || '',
      uploaded_at: new Date().toISOString(),
      is_primary: true
    }
  ]);

  // CRITICAL FIX: Load activeCompany data into profile state when company changes
  useEffect(() => {
    if (activeCompany) {
      console.log('[CompanyProfileManager] Loading company data into profile:', activeCompany.name);
      setProfile({
        legal_name: activeCompany.name || '',
        dba_name: activeCompany.dba || '',
        entity_type: 'LLC',
        state_of_formation: activeCompany.state || '',
        formation_date: activeCompany.founded_date || '',
        ein: activeCompany.tax_id || '',
        industry: activeCompany.industry || '',
        naics_code: '',
        description: activeCompany.description || '',
        website: activeCompany.website || '',
        primary_email: activeCompany.email || '',
        primary_phone: activeCompany.phone || '',
        physical_address: activeCompany.address || '',
        physical_city: activeCompany.city || '',
        physical_state: activeCompany.state || '',
        physical_zip: activeCompany.zip_code || '',
        physical_country: activeCompany.country || 'United States',
        mailing_address: '',
        mailing_city: '',
        mailing_state: '',
        mailing_zip: '',
        mailing_country: 'United States',
        same_as_physical: true,
        annual_revenue: activeCompany.annual_revenue || 0,
        employee_count: activeCompany.employee_count || 0,
        fiscal_year_end: '',
        accounting_method: 'Accrual' as 'Cash' | 'Accrual',
        tax_classification: 'LLC' as 'LLC' | 'S-Corp' | 'C-Corp' | 'Partnership' | 'Sole Proprietorship',
        bank_name: '',
        account_number_last4: '',
        routing_number: '',
        account_type: 'Checking' as 'Checking' | 'Savings',
      });

      // Update logos if company has them
      if (activeCompany.logos && Array.isArray(activeCompany.logos)) {
        setLogos(activeCompany.logos.map((logo: any, index: number) => ({
          id: String(index + 1),
          name: logo.name || 'Company Logo',
          url: logo.preview || logo.url || '',
          uploaded_at: new Date().toISOString(),
          is_primary: logo.isPrimary || index === 0
        })));
      } else if (activeCompany.logo_url) {
        setLogos([{
          id: '1',
          name: 'Primary Logo',
          url: activeCompany.logo_url,
          uploaded_at: new Date().toISOString(),
          is_primary: true
        }]);
      }

      console.log('[CompanyProfileManager] ✅ Company data loaded into profile');
    }
  }, [activeCompany]);

  // Helper Functions for Add Company Modal
  const resetForm = () => {
    setFormData({
      name: '',
      dba: '',
      slug: '',
      website: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      zip_code: '',
      country: 'United States',
      industry: '',
      description: '',
      founded_date: '',
      employee_count: 0,
      annual_revenue: 0,
      tax_id: '',
      business_license: ''
    });
    setLogoFiles([]);
    setUploadedDocuments([]);
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoFiles((prev) => [
          ...prev,
          {
            file,
            preview: reader.result as string,
            isPrimary: prev.length === 0 // First logo is primary
          }
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeLogo = (index: number) => {
    setLogoFiles((prev) => {
      const newLogos = prev.filter((_, i) => i !== index);
      // If we removed the primary logo, make the first one primary
      if (prev[index].isPrimary && newLogos.length > 0) {
        newLogos[0].isPrimary = true;
      }
      return newLogos;
    });
  };

  const setPrimaryLogo = (index: number) => {
    setLogoFiles((prev) =>
      prev.map((logo, i) => ({
        ...logo,
        isPrimary: i === index
      }))
    );
  };

  const handleDocumentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedDocuments((prev) => [
          ...prev,
          {
            file,
            preview: reader.result as string,
            type: file.type
          }
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeDocument = (index: number) => {
    setUploadedDocuments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddCompany = async () => {
    // FIRST LINE - if this doesn't show, function isn't being called
    alert('🚨 CREATE COMPANY CLICKED!');
    console.log('🚨🚨🚨 CREATE COMPANY BUTTON CLICKED! 🚨🚨🚨');
    console.log('User:', user);
    console.log('Form data:', formData);

    setIsSaving(true);

    try {
      // CRITICAL: Test localStorage FIRST
      try {
        const testKey = 'localStorage_test_' + Date.now();
        const testValue = 'test_value_12345';
        localStorage.setItem(testKey, testValue);
        const retrieved = localStorage.getItem(testKey);
        localStorage.removeItem(testKey);

        if (retrieved !== testValue) {
          console.error('❌ CRITICAL: localStorage is NOT working!');
          toast.error('Cannot save - browser storage is disabled or full');
          return;
        }
        console.log('✅ localStorage is working correctly');
      } catch (storageError) {
        console.error('❌ CRITICAL: localStorage test failed:', storageError);
        toast.error('Cannot save - browser storage error: ' + storageError);
        return;
      }

      if (!user) {
        console.error('❌ NO USER - Cannot create company!');
        toast.error('You must be logged in to create a company');
        return;
      }
      console.log('🔘 handleAddCompany called - START');
      console.log('✅ User is logged in:', user.email);

      if (!formData.name) {
        console.error('❌ Company name is required');
        toast.error('Company name is required');
        return;
      }

      console.log('✅ Company name provided:', formData.name);
      const slug = formData.slug || formData.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      console.log('✅ Slug generated:', slug);

      // Generate company ID
      const companyId = `company_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      console.log('✅ Company ID generated:', companyId);

      // Process all logos
      console.log('📝 Processing logos, count:', logoFiles.length);
      const savedLogos = logoFiles.map((logo) => ({
        preview: logo.preview, // Already base64
        isPrimary: logo.isPrimary,
        name: logo.file.name
      }));

      // Get primary logo URL (or first logo if none marked as primary)
      const primaryLogo = savedLogos.find(l => l.isPrimary) || savedLogos[0];
      const logoUrl = primaryLogo?.preview || null;
      console.log('✅ Logos processed, count:', savedLogos.length, 'Primary:', !!primaryLogo);

      // Convert documents to base64 for storage
      console.log('📝 Processing documents, count:', uploadedDocuments.length);
      const savedDocuments = await Promise.all(
        uploadedDocuments.map(async (doc) => {
          return {
            name: doc.file.name,
            type: doc.file.type,
            size: doc.file.size,
            data: doc.preview // Already base64 from FileReader
          };
        })
      );
      console.log('✅ Documents processed, count:', savedDocuments.length);

      const newCompany: CompanyStore.Company = {
        id: companyId,
        name: formData.name,
        dba: formData.dba || undefined,
        slug,
        is_primary: userCompanies.length === 0,
        owner_id: user.id,
        logo_url: logoUrl || undefined,
        logos: savedLogos.length > 0 ? savedLogos : undefined,
        website: formData.website || undefined,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        address: formData.address || undefined,
        city: formData.city || undefined,
        state: formData.state || undefined,
        zip_code: formData.zip_code || undefined,
        country: formData.country || undefined,
        industry: formData.industry || undefined,
        description: formData.description || undefined,
        founded_date: formData.founded_date || undefined,
        employee_count: formData.employee_count || undefined,
        annual_revenue: formData.annual_revenue || undefined,
        tax_id: formData.tax_id || undefined,
        business_license: formData.business_license || undefined,
        documents: savedDocuments.length > 0 ? savedDocuments : undefined,
        created_at: new Date().toISOString()
      };

      console.log('✅ New company object created:', newCompany.name, 'ID:', newCompany.id);

      // SIMPLE STORE: Save to database
      console.log('💾 Calling CompanyStore.addCompany...');
      await CompanyStore.addCompany(newCompany, user.id);
      console.log('✅ CompanyStore.addCompany completed');

      console.log('🔑 Setting active company...');
      CompanyStore.setActiveCompany(newCompany.id, user.id);
      console.log('✅ Active company set');

      // VERIFY IT SAVED - Load it back immediately
      console.log('🔍 Loading companies to verify save...');
      const verifyCompanies = await CompanyStore.getAllCompanies(user.id);
      console.log('✅ Companies loaded for verification');
      console.log('🔍 VERIFICATION: Loaded companies after save:', verifyCompanies.length);
      console.log('🔍 Company names:', verifyCompanies.map(c => c.name));

      const foundCompany = verifyCompanies.find(c => c.id === newCompany.id);
      if (foundCompany) {
        console.log('✅✅✅ SUCCESS! Company found in database:', foundCompany.name);
      } else {
        console.error('❌ CRITICAL: Company NOT found after save!');
        throw new Error('Company was not saved to database');
      }

      // Update local state immediately
      setUserCompanies(verifyCompanies);
      setActiveCompany(foundCompany);

      // Show success
      toast.success(`✅ Company "${formData.name}" created and saved to database!`, { duration: 5000 });

      // Close modal and reset form
      console.log('🚪 Closing modal and resetting form...');
      setShowAddModal(false);
      setAddModalTab('basic');
      resetForm();
      console.log('✅ Modal closed and form reset');

      // Try to sync to database in background (don't wait for it)
      setTimeout(async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const accessToken = session?.access_token;

          if (accessToken) {
            console.log('📡 Syncing to database in background...');
            const response = await fetch(
              `${API_BASE_URL}/make-server-57095a78/companies`,
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${accessToken}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify(newCompany)
              }
            );

            if (response.ok) {
              console.log('✅ Company synced to database');
            } else {
              console.log('💾 Database sync skipped (server offline)');
            }
          }
        } catch (error) {
          console.log('💾 Database sync skipped:', error);
        }
      }, 100);

      // Show final success message
      console.log('✅✅✅ COMPANY CREATED SUCCESSFULLY! Check the company selector in the header!');
      toast.success('Company created! Check your company selector in the header.', {
        duration: 5000
      });

    } catch (error) {
      console.error('❌ CRITICAL ERROR in handleAddCompany:', error);
      toast.error('Failed to add company', {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsSaving(false);
      console.log('🏁 handleAddCompany finished, isSaving set to false');
    }
  };

  // Load data
  useEffect(() => {
    loadCompanyData();
  }, [activeCompany]);

  const loadCompanyData = async () => {
    if (!activeCompany?.id) {
      setIsLoadingData(false);
      return;
    }
    
    setIsLoadingData(true);
    try {
      // Load company profile from KV store - with safe error handling
      try {
        const profileResponse = await fetch(`${API_BASE_URL}/make-server-57095a78/kv/company_profile_${activeCompany.id}`, {
          headers: {
            'Authorization': `Bearer ${(window as any).SUPABASE_ANON_KEY || ''}`
          }
        }).catch(err => null);
        
        if (profileResponse && profileResponse.ok) {
          const savedProfile = await profileResponse.json();
          // savedProfile will be null if the key doesn't exist
          if (savedProfile && typeof savedProfile === 'object' && !Array.isArray(savedProfile)) {
            setProfile({ ...profile, ...savedProfile });
          }
        }
      } catch (e) {
        console.log('[CompanyProfile] Server offline - using defaults');
      }
      
      // Load documents from KV store - with safe error handling
      try {
        const docsResponse = await fetch(`${API_BASE_URL}/make-server-57095a78/kv/company_documents_${activeCompany.id}`, {
          headers: {
            'Authorization': `Bearer ${(window as any).SUPABASE_ANON_KEY || ''}`
          }
        }).catch(err => null);
        
        if (docsResponse && docsResponse.ok) {
          const savedDocs = await docsResponse.json();
          if (savedDocs && Array.isArray(savedDocs)) {
            setDocuments(savedDocs);
          }
        }
      } catch (e) {
        console.log('[CompanyProfile] Server offline - using default documents');
      }
      
      // Load bank accounts from KV store - with safe error handling
      try {
        const banksResponse = await fetch(`${API_BASE_URL}/make-server-57095a78/kv/company_banks_${activeCompany.id}`, {
          headers: {
            'Authorization': `Bearer ${(window as any).SUPABASE_ANON_KEY || ''}`
          }
        }).catch(err => null);
      
        if (banksResponse && banksResponse.ok) {
          const savedBanks = await banksResponse.json();
          if (savedBanks && Array.isArray(savedBanks)) {
            setBankAccounts(savedBanks);
          }
        }
      } catch (e) {
        console.log('[CompanyProfile] Server offline - using default bank accounts');
      }
    } catch (error) {
      console.log('[CompanyProfile] Error loading company data (server offline)');
      // Don't show error toast - this is expected in offline mode
    } finally {
      setIsLoadingData(false);
    }
  };
  
  const handleSave = async () => {
    if (!activeCompany?.id || !user) {
      toast.error('No active company selected');
      return;
    }
    
    console.log('🚨 CompanyProfileManager - SAVE CLICKED');

    setIsSaving(true);
    try {
      // SIMPLE STORE: One function call to update
      await CompanyStore.updateCompany(activeCompany.id, {
        name: profile.legal_name,
        dba: profile.dba_name,
        website: profile.website,
        email: profile.primary_email,
        phone: profile.primary_phone,
        address: profile.physical_address,
        city: profile.physical_city,
        state: profile.physical_state,
        zip_code: profile.physical_zip,
        country: profile.physical_country,
        industry: profile.industry,
        description: profile.description,
        tax_id: profile.ein,
        founded_date: profile.formation_date,
        employee_count: profile.employee_count,
        annual_revenue: profile.annual_revenue,
        profile: profile,
        documents: documents,
        bank_accounts: bankAccounts
      }, user.id);

      console.log('✅ Company updated using SimpleStore');

      // Refresh the UI
      refreshCompanies();

      toast.success('Company profile saved!');
      setIsEditing(false);
    } catch (error) {
      console.error('❌ Error:', error);
      toast.error('Failed to save', {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  const toggleBankDetails = (accountId: string) => {
    setShowBankDetails(prev => ({ ...prev, [accountId]: !prev[accountId] }));
  };
  
  const copyToClipboardHandler = async (text: string, label: string) => {
    const success = await copyToClipboard(text);
    if (success) {
      toast.success(`${label} copied to clipboard`);
    } else {
      toast.error('Failed to copy. Please copy manually.');
    }
  };
  
  const documentTypeLabels: Record<CorporationDocument['document_type'], string> = {
    articles_incorporation: 'Articles of Incorporation',
    operating_agreement: 'Operating Agreement',
    bylaws: 'Corporate Bylaws',
    ein_letter: 'EIN Confirmation Letter',
    business_license: 'Business License',
    insurance_cert: 'Insurance Certificate',
    other: 'Other Document'
  };
  
  const documentTypeIcons: Record<CorporationDocument['document_type'], any> = {
    articles_incorporation: Building2,
    operating_agreement: FileText,
    bylaws: Shield,
    ein_letter: Award,
    business_license: CheckCircle2,
    insurance_cert: Shield,
    other: FileText
  };
  
  // Document handlers
  const handleViewDocument = (doc: CorporationDocument) => {
    if (doc.file_url) {
      window.open(doc.file_url, '_blank');
    } else {
      toast.info('No file attached to this document');
    }
  };
  
  const handleEditDocument = (doc: CorporationDocument) => {
    setEditingDocument(doc);
    setNewDocument({
      document_type: doc.document_type,
      document_name: doc.document_name,
      document_number: doc.document_number || '',
      issue_date: doc.issue_date || '',
      expiration_date: doc.expiration_date || '',
      issuing_authority: doc.issuing_authority || '',
      notes: doc.notes || ''
    });
    setShowAddDocument(true);
  };
  
  const handleDeleteDocument = (docId: string) => {
    if (confirm('Are you sure you want to delete this document?')) {
      setDocuments(documents.filter(d => d.id !== docId));
      toast.success('Document deleted successfully');
    }
  };
  
  const handleSaveDocument = async () => {
    if (!newDocument.document_name) {
      toast.error('Please enter a document name');
      return;
    }
    
    try {
      if (editingDocument) {
        // Update existing document
        setDocuments(documents.map(d => 
          d.id === editingDocument.id 
            ? { 
                ...d, 
                ...newDocument, 
                file_url: uploadedFile?.url || d.file_url,
                uploaded_at: d.uploaded_at 
              }
            : d
        ));
        toast.success('Document updated successfully');
      } else {
        // Add new document
        const newDoc: CorporationDocument = {
          id: Date.now().toString(),
          ...newDocument,
          file_url: uploadedFile?.url,
          uploaded_at: new Date().toISOString()
        };
        setDocuments([...documents, newDoc]);
        toast.success('Document added successfully');
      }
      
      // Save to backend immediately
      if (activeCompany?.id) {
        const updatedDocs = editingDocument 
          ? documents.map(d => 
              d.id === editingDocument.id 
                ? { ...d, ...newDocument, file_url: uploadedFile?.url || d.file_url }
                : d
            )
          : [...documents, {
              id: Date.now().toString(),
              ...newDocument,
              file_url: uploadedFile?.url,
              uploaded_at: new Date().toISOString()
            }];
            
        await fetch(`${API_BASE_URL}/make-server-57095a78/kv/company_documents_${activeCompany.id}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(window as any).SUPABASE_ANON_KEY || ''}`
          },
          body: JSON.stringify(updatedDocs)
        });
      }
      
      setShowAddDocument(false);
      setEditingDocument(null);
      setUploadedFile(null);
      setNewDocument({
        document_type: 'articles_incorporation',
        document_name: '',
        document_number: '',
        issue_date: '',
        expiration_date: '',
        issuing_authority: '',
        notes: ''
      });
    } catch (error) {
      console.error('Error saving document:', error);
      // Don't show error toast - this is expected in offline mode
      console.log('⚠️ Server offline - document not synced to server');
      toast.info('Document saved locally', {
        description: 'Will sync when server is available'
      });
    }
  };
  
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }
    
    setUploadingFile(true);
    
    try {
      // Convert file to base64 for upload
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64 = reader.result as string;
          
          // Upload to server (which will handle Supabase Storage)
          const response = await fetch(`${API_BASE_URL}/make-server-57095a78/upload-document`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${(window as any).SUPABASE_ANON_KEY || ''}`
            },
            body: JSON.stringify({
              file: base64,
              fileName: file.name,
              fileType: file.type,
              companyId: activeCompany?.id
            })
          });
          
          if (!response.ok) {
            throw new Error('Upload failed');
          }
          
          const { url } = await response.json();
          
          setUploadedFile({ name: file.name, url });
          toast.success(`File "${file.name}" uploaded successfully!`);
        } catch (error) {
          // Server offline - gracefully handle
          console.log('📴 Server offline - File upload temporarily unavailable (app works in offline mode)');
          toast.info('File selected (offline mode)', {
            description: 'File uploads work when server is running'
          });
        } finally {
          setUploadingFile(false);
        }
      };
      
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('File read error:', error);
      toast.error('Failed to read file');
      setUploadingFile(false);
    }
  };
  
  // EMERGENCY FIX: Don't trust companyLoading - only use local loading state
  // The context can get stuck loading, so we ignore it
  if (isLoadingData) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-orange-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading company data...</p>
        </div>
      </div>
    );
  }

  // Show empty state if no company selected
  if (!activeCompany) {
    return (
      <>
        <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-12 text-center">
          <Building2 className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">No Company Selected</h3>
          <p className="text-gray-400 mb-6">
            {userCompanies.length === 0
              ? "You haven't created any companies yet. Click the button below to create your first company."
              : "Please select a company from the Business Profiles section below to view and manage its profile."
            }
          </p>
          <button
            onClick={() => {
              console.log('🔘 Add Company button clicked!');
              setShowAddModal(true);
              console.log('✅ Modal should open now, showAddModal:', true);
            }}
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white rounded-xl font-bold transition-all shadow-lg shadow-orange-500/20 hover:scale-105"
          >
            <Plus className="w-5 h-5" />
            Add Company
          </button>
        </div>

        {/* Render modal outside the empty state so it always shows */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" onClick={(e) => {
            // Only close if clicking the backdrop itself and not saving
            if (e.target === e.currentTarget && !isSaving) {
              setShowAddModal(false);
              resetForm();
              setAddModalTab('basic');
            }
          }}>
            <div className="bg-[#0A0A0A] rounded-2xl border-2 border-orange-500/30 w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="bg-[#0A0A0A] border-b border-[#2A2A2A] p-6 rounded-t-2xl flex-shrink-0">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-white">Add New Company</h2>
                    <p className="text-sm text-gray-400 mt-1">Create your company profile</p>
                  </div>
                  <button
                    onClick={() => {
                      if (!isSaving) {
                        setShowAddModal(false);
                        resetForm();
                        setAddModalTab('basic');
                      }
                    }}
                    disabled={isSaving}
                    className="p-2 hover:bg-[#1A1A1A] rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </div>

                {/* Tab Navigation */}
                <div className="flex gap-2 border-b border-[#2A2A2A] -mb-px">
                  <button
                    onClick={() => setAddModalTab('basic')}
                    className={`px-4 py-2 font-semibold transition border-b-2 ${
                      addModalTab === 'basic'
                        ? 'text-orange-400 border-orange-400'
                        : 'text-gray-400 border-transparent hover:text-gray-200'
                    }`}
                  >
                    <Building2 className="w-4 h-4 inline mr-2" />
                    Basic Info
                  </button>
                  <button
                    onClick={() => setAddModalTab('documents')}
                    className={`px-4 py-2 font-semibold transition border-b-2 ${
                      addModalTab === 'documents'
                        ? 'text-orange-400 border-orange-400'
                        : 'text-gray-400 border-transparent hover:text-gray-200'
                    }`}
                  >
                    <FileText className="w-4 h-4 inline mr-2" />
                    Documents
                  </button>
                  <button
                    onClick={() => setAddModalTab('branding')}
                    className={`px-4 py-2 font-semibold transition border-b-2 ${
                      addModalTab === 'branding'
                        ? 'text-orange-400 border-orange-400'
                        : 'text-gray-400 border-transparent hover:text-gray-200'
                    }`}
                  >
                    <Palette className="w-4 h-4 inline mr-2" />
                    Branding & Logos
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6 overflow-y-auto flex-1">
                {/* BASIC INFO TAB */}
                {addModalTab === 'basic' && (
                  <div className="space-y-6">
                {/* Basic Information */}
                <div>
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-orange-400" />
                    Basic Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-white mb-2">
                        Company Name <span className="text-orange-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                        placeholder="Enter company legal name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-white mb-2">
                        DBA (Doing Business As)
                      </label>
                      <input
                        type="text"
                        value={formData.dba}
                        onChange={(e) => setFormData({ ...formData, dba: e.target.value })}
                        className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                        placeholder="Trade name or DBA"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-white mb-2">
                        Company Slug
                      </label>
                      <input
                        type="text"
                        value={formData.slug}
                        onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                        className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                        placeholder="company-slug"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-white mb-2">
                        Industry
                      </label>
                      <input
                        type="text"
                        value={formData.industry}
                        onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                        className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                        placeholder="e.g. Construction, Technology"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-white mb-2">
                        Founded Date
                      </label>
                      <input
                        type="date"
                        value={formData.founded_date}
                        onChange={(e) => setFormData({ ...formData, founded_date: e.target.value })}
                        className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-white mb-2">
                        Employee Count
                      </label>
                      <input
                        type="number"
                        value={formData.employee_count}
                        onChange={(e) => setFormData({ ...formData, employee_count: parseInt(e.target.value) || 0 })}
                        className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                        placeholder="Number of employees"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-white mb-2">
                        Description
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                        placeholder="Brief description of your company"
                        rows={3}
                      />
                    </div>
                  </div>
                </div>

                {/* Contact Information */}
                <div>
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Mail className="w-5 h-5 text-orange-400" />
                    Contact Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-white mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                        placeholder="company@example.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-white mb-2">
                        Phone
                      </label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                        placeholder="(555) 123-4567"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-white mb-2">
                        Website
                      </label>
                      <input
                        type="url"
                        value={formData.website}
                        onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                        className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                        placeholder="https://www.example.com"
                      />
                    </div>
                  </div>
                </div>

                {/* Business Address */}
                <div>
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-orange-400" />
                    Business Address
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-white mb-2">
                        Street Address
                      </label>
                      <input
                        type="text"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                        placeholder="123 Business St"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-white mb-2">
                        City
                      </label>
                      <input
                        type="text"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                        placeholder="City"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-white mb-2">
                        State
                      </label>
                      <input
                        type="text"
                        value={formData.state}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                        className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                        placeholder="State"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-white mb-2">
                        ZIP Code
                      </label>
                      <input
                        type="text"
                        value={formData.zip_code}
                        onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                        className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                        placeholder="12345"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-white mb-2">
                        Country
                      </label>
                      <input
                        type="text"
                        value={formData.country}
                        onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                        className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                        placeholder="United States"
                      />
                    </div>
                  </div>
                </div>

                {/* Financial & Legal Information */}
                <div>
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-orange-400" />
                    Financial & Legal Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-white mb-2">
                        Tax ID / EIN
                      </label>
                      <input
                        type="text"
                        value={formData.tax_id}
                        onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                        className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                        placeholder="XX-XXXXXXX"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-white mb-2">
                        Business License Number
                      </label>
                      <input
                        type="text"
                        value={formData.business_license}
                        onChange={(e) => setFormData({ ...formData, business_license: e.target.value })}
                        className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                        placeholder="License number"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-white mb-2">
                        Annual Revenue
                      </label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                        <input
                          type="number"
                          value={formData.annual_revenue}
                          onChange={(e) => setFormData({ ...formData, annual_revenue: parseInt(e.target.value) || 0 })}
                          className="w-full pl-11 pr-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                          placeholder="0"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                  </div>
                )}

                {/* DOCUMENTS TAB */}
                {addModalTab === 'documents' && (
                  <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-orange-400" />
                    Company Documents
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-white mb-2">
                        Upload Documents
                      </label>
                      <p className="text-xs text-gray-500 mb-3">
                        Upload business license, insurance certificates, W-9, certifications, etc.
                      </p>
                      <label className="cursor-pointer">
                        <div className="px-4 py-8 bg-[#1A1A1A] border-2 border-dashed border-[#2A2A2A] rounded-xl text-gray-400 hover:bg-[#2A2A2A] hover:border-orange-500/30 transition flex flex-col items-center justify-center gap-3">
                          <Upload className="w-8 h-8 text-orange-400" />
                          <div className="text-center">
                            <p className="font-semibold text-white">Click to upload documents</p>
                            <p className="text-sm">or drag and drop</p>
                            <p className="text-xs mt-1">PDF, DOC, DOCX, PNG, JPG (max 10MB each)</p>
                          </div>
                        </div>
                        <input
                          type="file"
                          multiple
                          accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                          onChange={handleDocumentUpload}
                          className="hidden"
                        />
                      </label>
                    </div>

                    {/* Uploaded Documents List */}
                    {uploadedDocuments.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-white">Uploaded Documents ({uploadedDocuments.length})</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {uploadedDocuments.map((doc, index) => (
                            <div
                              key={`doc-${index}-${doc.file.name}`}
                              className="flex items-center gap-3 p-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl"
                            >
                              <div className="flex-shrink-0">
                                {doc.type.startsWith('image/') ? (
                                  <Image className="w-8 h-8 text-orange-400" />
                                ) : (
                                  <FileText className="w-8 h-8 text-orange-400" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-white font-medium truncate">{doc.file.name}</p>
                                <p className="text-xs text-gray-500">
                                  {(doc.file.size / 1024).toFixed(1)} KB
                                </p>
                              </div>
                              <button
                                onClick={() => removeDocument(index)}
                                className="flex-shrink-0 p-1.5 hover:bg-red-500/20 rounded-lg transition"
                              >
                                <X className="w-4 h-4 text-red-400" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                  </div>
                )}

                {/* BRANDING TAB */}
                {addModalTab === 'branding' && (
                  <div className="space-y-6">
                {/* Multiple Logo Upload */}
                <div>
                  <label className="block text-sm font-semibold text-white mb-3">Company Logos</label>
                  <p className="text-xs text-gray-500 mb-3">Upload multiple logo variations (primary, dark mode, icon, etc.)</p>

                  {/* Logo Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                    {logoFiles.map((logo, index) => (
                      <div
                        key={`logo-${index}`}
                        className={`relative group rounded-lg overflow-hidden border-2 ${
                          logo.isPrimary ? 'border-orange-500' : 'border-[#2A2A2A]'
                        }`}
                      >
                        <div className="aspect-square">
                          <img src={logo.preview} alt={`Logo ${index + 1}`} className="w-full h-full object-cover" />
                        </div>

                        {/* Overlay with controls */}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          {!logo.isPrimary && (
                            <button
                              onClick={() => setPrimaryLogo(index)}
                              className="p-2 bg-orange-500 hover:bg-orange-600 rounded-lg transition"
                              title="Set as primary"
                            >
                              <Star className="w-4 h-4 text-white" />
                            </button>
                          )}
                          <button
                            onClick={() => removeLogo(index)}
                            className="p-2 bg-red-500 hover:bg-red-600 rounded-lg transition"
                            title="Remove"
                          >
                            <X className="w-4 h-4 text-white" />
                          </button>
                        </div>

                        {/* Primary badge */}
                        {logo.isPrimary && (
                          <div className="absolute top-2 left-2 px-2 py-1 bg-orange-500 rounded text-xs font-bold text-white flex items-center gap-1">
                            <Star className="w-3 h-3" />
                            Primary
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Add Logo Button */}
                    <label className="aspect-square border-2 border-dashed border-[#2A2A2A] rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-orange-500/50 hover:bg-[#1A1A1A] transition">
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleLogoChange}
                        className="hidden"
                      />
                      <Upload className="w-8 h-8 text-gray-500 mb-2" />
                      <span className="text-xs text-gray-500">Add Logos</span>
                    </label>
                  </div>

                  <p className="text-xs text-gray-400">
                    <Star className="w-3 h-3 inline text-orange-400" /> Click star to set primary logo • PNG, JPG or SVG (max 5MB each)
                  </p>
                </div>
                  </div>
                )}
              </div>

              {/* Footer with Action Buttons */}
              <div className="bg-[#0A0A0A] border-t border-[#2A2A2A] p-6 flex items-center gap-3">
                <button
                  onClick={() => {
                    if (!isSaving) {
                      setShowAddModal(false);
                      resetForm();
                      setAddModalTab('basic');
                    }
                  }}
                  disabled={isSaving}
                  className="px-6 py-3 bg-[#1A1A1A] hover:bg-[#2A2A2A] text-white rounded-xl font-semibold transition flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    console.log('🔴🔴🔴 CREATE COMPANY BUTTON PHYSICALLY CLICKED! 🔴🔴🔴');
                    console.log('Button disabled state:', !formData.name || isSaving);
                    console.log('formData.name value:', formData.name);
                    console.log('isSaving:', isSaving);
                    console.log('Full formData:', formData);
                    handleAddCompany();
                  }}
                  disabled={!formData.name || isSaving}
                  className="px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 disabled:from-gray-600 disabled:to-gray-700 text-white rounded-xl font-semibold transition flex-1 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSaving && <RefreshCw className="w-4 h-4 animate-spin" />}
                  {isSaving ? 'Creating Company...' : 'Create Company'}
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <Building2 className="w-7 h-7 text-orange-400" />
            Company Profile & Documents
          </h2>
          <p className="text-gray-400 mt-1">Manage corporation documents, banking, and company information</p>
        </div>
        <div className="flex items-center gap-3">
          {!isEditing ? (
            <PrimaryButton
              onClick={() => setIsEditing(true)}
              icon={<Edit2 className="w-4 h-4" />}
            >
              Edit Profile
            </PrimaryButton>
          ) : (
            <>
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 bg-[#1A1A1A] hover:bg-[#2A2A2A] text-gray-300 rounded-xl font-semibold transition border border-[#2A2A2A]"
                disabled={isSaving}
              >
                <X className="w-4 h-4 inline mr-2" />
                Cancel
              </button>
              <PrimaryButton
                onClick={handleSave}
                disabled={isSaving}
                icon={isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </PrimaryButton>
            </>
          )}
        </div>
      </div>
      
      {/* Section Tabs */}
      <div className="flex items-center gap-2 border-b border-[#2A2A2A] pb-4">
        {[
          { id: 'overview', label: 'Company Overview', icon: Building2 },
          { id: 'documents', label: 'Corporation Documents', icon: FileText },
          { id: 'banking', label: 'Banking & Finance', icon: Landmark },
          { id: 'branding', label: 'Branding & Assets', icon: Sparkles }
        ].map((section) => {
          const Icon = section.icon;
          return (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id as any)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
                activeSection === section.id
                  ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                  : 'bg-[#1A1A1A] text-gray-400 hover:bg-[#2A2A2A] border border-[#2A2A2A]'
              }`}
            >
              <Icon className="w-4 h-4" />
              {section.label}
            </button>
          );
        })}
      </div>
      
      {/* Overview Section */}
      {activeSection === 'overview' && (
        <div className="space-y-6">
          {/* Legal Information */}
          <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-400" />
              Legal Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Legal Name *</label>
                <input
                  type="text"
                  value={profile.legal_name}
                  onChange={(e) => setProfile({ ...profile, legal_name: e.target.value })}
                  disabled={!isEditing}
                  className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 disabled:opacity-50"
                  placeholder="ABC Corporation, Inc."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">DBA / Trade Name</label>
                <input
                  type="text"
                  value={profile.dba_name}
                  onChange={(e) => setProfile({ ...profile, dba_name: e.target.value })}
                  disabled={!isEditing}
                  className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 disabled:opacity-50"
                  placeholder="Doing Business As"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Entity Type *</label>
                <select
                  value={profile.entity_type}
                  onChange={(e) => setProfile({ ...profile, entity_type: e.target.value as any })}
                  disabled={!isEditing}
                  className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 disabled:opacity-50"
                >
                  <option value="LLC">LLC (Limited Liability Company)</option>
                  <option value="Corporation">Corporation</option>
                  <option value="S-Corp">S-Corporation</option>
                  <option value="C-Corp">C-Corporation</option>
                  <option value="Partnership">Partnership</option>
                  <option value="Sole Proprietorship">Sole Proprietorship</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">State of Formation</label>
                <input
                  type="text"
                  value={profile.state_of_formation}
                  onChange={(e) => setProfile({ ...profile, state_of_formation: e.target.value })}
                  disabled={!isEditing}
                  className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 disabled:opacity-50"
                  placeholder="California"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Formation Date</label>
                <input
                  type="date"
                  value={profile.formation_date}
                  onChange={(e) => setProfile({ ...profile, formation_date: e.target.value })}
                  disabled={!isEditing}
                  className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">EIN (Tax ID) *</label>
                <input
                  type="text"
                  value={profile.ein}
                  onChange={(e) => setProfile({ ...profile, ein: e.target.value })}
                  disabled={!isEditing}
                  maxLength={10}
                  placeholder="12-3456789"
                  className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 disabled:opacity-50"
                />
              </div>
            </div>
          </div>
          
          {/* Business Information */}
          <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-green-400" />
              Business Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Industry</label>
                <input
                  type="text"
                  value={profile.industry}
                  onChange={(e) => setProfile({ ...profile, industry: e.target.value })}
                  disabled={!isEditing}
                  className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 disabled:opacity-50"
                  placeholder="Construction, Technology, etc."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">NAICS Code</label>
                <input
                  type="text"
                  value={profile.naics_code}
                  onChange={(e) => setProfile({ ...profile, naics_code: e.target.value })}
                  disabled={!isEditing}
                  className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 disabled:opacity-50"
                  placeholder="6-digit code"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-400 mb-2">Business Description</label>
                <textarea
                  value={profile.description}
                  onChange={(e) => setProfile({ ...profile, description: e.target.value })}
                  disabled={!isEditing}
                  rows={3}
                  className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 disabled:opacity-50"
                  placeholder="Describe your business..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Website</label>
                <input
                  type="url"
                  value={profile.website}
                  onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                  disabled={!isEditing}
                  className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 disabled:opacity-50"
                  placeholder="https://example.com"
                />
              </div>
            </div>
          </div>
          
          {/* Contact Information */}
          <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Phone className="w-5 h-5 text-purple-400" />
              Contact Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Primary Email</label>
                <input
                  type="email"
                  value={profile.primary_email}
                  onChange={(e) => setProfile({ ...profile, primary_email: e.target.value })}
                  disabled={!isEditing}
                  className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 disabled:opacity-50"
                  placeholder="info@company.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Primary Phone</label>
                <input
                  type="tel"
                  value={profile.primary_phone}
                  onChange={(e) => setProfile({ ...profile, primary_phone: e.target.value })}
                  disabled={!isEditing}
                  className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 disabled:opacity-50"
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>
          </div>
          
          {/* Physical Address */}
          <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-red-400" />
              Physical Address
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-400 mb-2">Street Address</label>
                <input
                  type="text"
                  value={profile.physical_address}
                  onChange={(e) => setProfile({ ...profile, physical_address: e.target.value })}
                  disabled={!isEditing}
                  className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 disabled:opacity-50"
                  placeholder="123 Main Street"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">City</label>
                <input
                  type="text"
                  value={profile.physical_city}
                  onChange={(e) => setProfile({ ...profile, physical_city: e.target.value })}
                  disabled={!isEditing}
                  className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 disabled:opacity-50"
                  placeholder="Los Angeles"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">State</label>
                <input
                  type="text"
                  value={profile.physical_state}
                  onChange={(e) => setProfile({ ...profile, physical_state: e.target.value })}
                  disabled={!isEditing}
                  className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 disabled:opacity-50"
                  placeholder="CA"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">ZIP Code</label>
                <input
                  type="text"
                  value={profile.physical_zip}
                  onChange={(e) => setProfile({ ...profile, physical_zip: e.target.value })}
                  disabled={!isEditing}
                  className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 disabled:opacity-50"
                  placeholder="90001"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Country</label>
                <input
                  type="text"
                  value={profile.physical_country}
                  onChange={(e) => setProfile({ ...profile, physical_country: e.target.value })}
                  disabled={!isEditing}
                  className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 disabled:opacity-50"
                />
              </div>
            </div>
          </div>
          
          {/* Financial Information */}
          <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-yellow-400" />
              Financial Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Fiscal Year End</label>
                <input
                  type="text"
                  value={profile.fiscal_year_end}
                  onChange={(e) => setProfile({ ...profile, fiscal_year_end: e.target.value })}
                  disabled={!isEditing}
                  placeholder="December 31"
                  className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Annual Revenue</label>
                <input
                  type="text"
                  value={profile.annual_revenue}
                  onChange={(e) => setProfile({ ...profile, annual_revenue: e.target.value })}
                  disabled={!isEditing}
                  placeholder="$1M - $5M"
                  className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Employee Count</label>
                <input
                  type="text"
                  value={profile.employee_count}
                  onChange={(e) => setProfile({ ...profile, employee_count: e.target.value })}
                  disabled={!isEditing}
                  placeholder="10-50"
                  className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 disabled:opacity-50"
                />
              </div>
            </div>
          </div>
          
          {/* Insurance & Compliance */}
          <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-cyan-400" />
              Insurance & Compliance
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Workers' Comp Policy #</label>
                <input
                  type="text"
                  value={profile.workers_comp_policy}
                  onChange={(e) => setProfile({ ...profile, workers_comp_policy: e.target.value })}
                  disabled={!isEditing}
                  className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 disabled:opacity-50"
                  placeholder="WC-123456"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">General Liability Policy #</label>
                <input
                  type="text"
                  value={profile.general_liability_policy}
                  onChange={(e) => setProfile({ ...profile, general_liability_policy: e.target.value })}
                  disabled={!isEditing}
                  className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 disabled:opacity-50"
                  placeholder="GL-123456"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Professional Liability Policy #</label>
                <input
                  type="text"
                  value={profile.professional_liability_policy}
                  onChange={(e) => setProfile({ ...profile, professional_liability_policy: e.target.value })}
                  disabled={!isEditing}
                  className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 disabled:opacity-50"
                  placeholder="PL-123456"
                />
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Documents Section */}
      {activeSection === 'documents' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-gray-400">Manage your corporation documents and legal filings</p>
            <PrimaryButton
              onClick={() => setShowAddDocument(true)}
              icon={<Plus className="w-4 h-4" />}
            >
              Add Document
            </PrimaryButton>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {documents.map((doc) => {
              const Icon = documentTypeIcons[doc.document_type];
              return (
                <div key={doc.id} className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6 hover:border-orange-500/30 transition">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-orange-600/20 border border-orange-500/30 flex items-center justify-center">
                        <Icon className="w-6 h-6 text-orange-400" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-white">{doc.document_name}</h4>
                        <p className="text-sm text-gray-400">{documentTypeLabels[doc.document_type]}</p>
                      </div>
                    </div>
                    <button className="p-2 hover:bg-[#2A2A2A] rounded-lg transition">
                      <Download className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    {doc.document_number && (
                      <div className="flex items-center justify-between p-2 bg-[#0A0A0A] rounded-lg">
                        <span className="text-gray-400">Document #:</span>
                        <span className="text-white font-mono">{doc.document_number}</span>
                      </div>
                    )}
                    {doc.issue_date && (
                      <div className="flex items-center justify-between p-2 bg-[#0A0A0A] rounded-lg">
                        <span className="text-gray-400">Issue Date:</span>
                        <span className="text-white">{new Date(doc.issue_date).toLocaleDateString()}</span>
                      </div>
                    )}
                    {doc.expiration_date && (
                      <div className="flex items-center justify-between p-2 bg-[#0A0A0A] rounded-lg">
                        <span className="text-gray-400">Expires:</span>
                        <span className="text-white">{new Date(doc.expiration_date).toLocaleDateString()}</span>
                      </div>
                    )}
                    {doc.issuing_authority && (
                      <div className="flex items-center justify-between p-2 bg-[#0A0A0A] rounded-lg">
                        <span className="text-gray-400">Issued By:</span>
                        <span className="text-white text-xs">{doc.issuing_authority}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 mt-4 pt-4 border-t border-[#2A2A2A]">
                    <button 
                      onClick={() => handleViewDocument(doc)}
                      className="flex-1 px-3 py-2 bg-orange-600/10 hover:bg-orange-600/20 text-orange-400 rounded-lg text-sm font-semibold transition border border-orange-500/20"
                    >
                      <Eye className="w-4 h-4 inline mr-2" />
                      View
                    </button>
                    <button 
                      onClick={() => handleEditDocument(doc)}
                      className="flex-1 px-3 py-2 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 rounded-lg text-sm font-semibold transition border border-blue-500/20"
                    >
                      <Edit2 className="w-4 h-4 inline mr-2" />
                      Edit
                    </button>
                    <button 
                      onClick={() => handleDeleteDocument(doc.id)}
                      className="p-2 bg-red-600/10 hover:bg-red-600/20 text-red-400 rounded-lg transition border border-red-500/20"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          
          {documents.length === 0 && (
            <div className="text-center py-12 bg-[#1A1A1A] rounded-xl border border-[#2A2A2A]">
              <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No Documents Yet</h3>
              <p className="text-gray-400 mb-4">Add your corporation documents to get started</p>
              <PrimaryButton
                onClick={() => setShowAddDocument(true)}
                icon={<Plus className="w-4 h-4" />}
              >
                Add First Document
              </PrimaryButton>
            </div>
          )}
        </div>
      )}
      
      {/* Banking Section */}
      {activeSection === 'banking' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-gray-400">Manage your business banking accounts</p>
            <PrimaryButton
              onClick={() => setShowAddBank(true)}
              icon={<Plus className="w-4 h-4" />}
            >
              Add Bank Account
            </PrimaryButton>
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            {bankAccounts.map((account) => (
              <div key={account.id} className="bg-[#1A1A1A] rounded-xl border-2 border-[#2A2A2A] p-6 hover:border-orange-500/30 transition">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-green-600/20 to-emerald-600/20 border border-green-500/30 flex items-center justify-center">
                      <Landmark className="w-7 h-7 text-green-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-bold text-white text-lg">{account.bank_name}</h4>
                        {account.is_primary && (
                          <span className="px-2 py-1 bg-orange-500/20 text-orange-400 text-xs font-semibold rounded-md border border-orange-500/30">
                            PRIMARY
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-400">{account.account_nickname}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {account.account_type.replace('_', ' ').toUpperCase()}
                      </p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => toggleBankDetails(account.id)}
                    className="p-2 hover:bg-[#2A2A2A] rounded-lg transition"
                  >
                    {showBankDetails[account.id] ? (
                      <EyeOff className="w-5 h-5 text-gray-400" />
                    ) : (
                      <Eye className="w-5 h-5 text-gray-400" />
                    )}
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-4 bg-[#0A0A0A] rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-400">Account Number</span>
                      {showBankDetails[account.id] && (
                        <button
                          onClick={() => copyToClipboardHandler(`****${account.account_number_last4}`, 'Account number')}
                          className="p-1 hover:bg-[#1A1A1A] rounded transition"
                        >
                          <Copy className="w-3 h-3 text-gray-500" />
                        </button>
                      )}
                    </div>
                    <p className="text-white font-mono">
                      {showBankDetails[account.id] ? `****${account.account_number_last4}` : '••••••••'}
                    </p>
                  </div>
                  
                  <div className="p-4 bg-[#0A0A0A] rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-400">Routing Number</span>
                      {showBankDetails[account.id] && (
                        <button
                          onClick={() => copyToClipboardHandler(account.routing_number, 'Routing number')}
                          className="p-1 hover:bg-[#1A1A1A] rounded transition"
                        >
                          <Copy className="w-3 h-3 text-gray-500" />
                        </button>
                      )}
                    </div>
                    <p className="text-white font-mono">
                      {showBankDetails[account.id] ? account.routing_number : '•••••••••'}
                    </p>
                  </div>
                  
                  {account.current_balance !== undefined && (
                    <div className="p-4 bg-[#0A0A0A] rounded-lg">
                      <span className="text-sm text-gray-400 block mb-2">Current Balance</span>
                      <p className="text-white font-bold text-lg">
                        {showBankDetails[account.id] 
                          ? `$${account.current_balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                          : '••••••'
                        }
                      </p>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-[#2A2A2A]">
                  <button className="flex-1 px-3 py-2 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 rounded-lg text-sm font-semibold transition border border-blue-500/20">
                    <Edit2 className="w-4 h-4 inline mr-2" />
                    Edit
                  </button>
                  {!account.is_primary && (
                    <button className="flex-1 px-3 py-2 bg-orange-600/10 hover:bg-orange-600/20 text-orange-400 rounded-lg text-sm font-semibold transition border border-orange-500/20">
                      <CheckCircle2 className="w-4 h-4 inline mr-2" />
                      Set Primary
                    </button>
                  )}
                  <button className="p-2 bg-red-600/10 hover:bg-red-600/20 text-red-400 rounded-lg transition border border-red-500/20">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          {bankAccounts.length === 0 && (
            <div className="text-center py-12 bg-[#1A1A1A] rounded-xl border border-[#2A2A2A]">
              <Landmark className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No Bank Accounts</h3>
              <p className="text-gray-400 mb-4">Add your business banking accounts</p>
              <PrimaryButton
                onClick={() => setShowAddBank(true)}
                icon={<Plus className="w-4 h-4" />}
              >
                Add Bank Account
              </PrimaryButton>
            </div>
          )}
          
          {/* Banking Security Notice */}
          <div className="p-6 bg-orange-600/10 border border-orange-500/30 rounded-xl">
            <div className="flex items-start gap-3">
              <Lock className="w-6 h-6 text-orange-400 flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-semibold text-orange-300 mb-2">Banking Information Security</h4>
                <p className="text-sm text-orange-400/80">
                  All banking information is encrypted at rest and in transit. Account numbers are never fully displayed, 
                  and access is logged for security purposes. Only authorized business owners can view and manage banking information.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Branding Section */}
      {activeSection === 'branding' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-gray-400">Manage your company logo, colors, and brand assets</p>
            <PrimaryButton
              onClick={() => setShowBrandCreator(true)}
              icon={<Sparkles className="w-4 h-4" />}
            >
              AI Brand Creator
            </PrimaryButton>
          </div>
          
          {/* Logo Upload - Multiple Logos */}
          <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Image className="w-5 h-5 text-purple-400" />
                Company Logos
              </h3>
              <button
                onClick={() => setShowAddLogo(true)}
                className="px-4 py-2 bg-orange-600/10 hover:bg-orange-600/20 text-orange-400 rounded-lg text-sm font-semibold transition border border-orange-500/20 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Logo
              </button>
            </div>
            
            <div className="space-y-4">
              {logos.map((logo) => (
                <div key={logo.id} className="flex items-center gap-4 p-4 bg-[#0A0A0A] rounded-lg border border-[#2A2A2A]">
                  {/* Logo Preview */}
                  <div className="w-20 h-20 rounded-lg bg-[#1A1A1A] border border-[#2A2A2A] flex items-center justify-center flex-shrink-0">
                    {logo.url ? (
                      <img src={logo.url} alt={logo.name} className="w-full h-full object-contain rounded-lg" />
                    ) : (
                      <Building2 className="w-8 h-8 text-gray-600" />
                    )}
                  </div>
                  
                  {/* Logo Info */}
                  <div className="flex-1">
                    {editingLogoId === logo.id ? (
                      <input
                        type="text"
                        value={editingLogoName}
                        onChange={(e) => setEditingLogoName(e.target.value)}
                        className="w-full px-3 py-2 bg-[#1A1A1A] border border-orange-500/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                        placeholder="Logo name"
                      />
                    ) : (
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-white">{logo.name}</p>
                          {logo.is_primary && (
                            <span className="px-2 py-0.5 bg-orange-600/20 text-orange-400 rounded text-xs font-bold border border-orange-500/30">
                              Primary
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Uploaded {new Date(logo.uploaded_at).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {editingLogoId === logo.id ? (
                      <>
                        <button
                          onClick={() => {
                            setLogos(logos.map(l => l.id === logo.id ? { ...l, name: editingLogoName } : l));
                            setEditingLogoId(null);
                            setEditingLogoName('');
                            toast.success('Logo name updated');
                          }}
                          className="p-2 bg-green-600/10 hover:bg-green-600/20 text-green-400 rounded-lg transition border border-green-500/20"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingLogoId(null);
                            setEditingLogoName('');
                          }}
                          className="p-2 bg-gray-600/10 hover:bg-gray-600/20 text-gray-400 rounded-lg transition border border-gray-500/20"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setEditingLogoId(logo.id);
                            setEditingLogoName(logo.name);
                          }}
                          className="p-2 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 rounded-lg transition border border-blue-500/20"
                          title="Edit name"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {!logo.is_primary && (
                          <button
                            onClick={() => {
                              setLogos(logos.map(l => ({ ...l, is_primary: l.id === logo.id })));
                              toast.success('Primary logo updated');
                            }}
                            className="p-2 bg-orange-600/10 hover:bg-orange-600/20 text-orange-400 rounded-lg transition border border-orange-500/20"
                            title="Set as primary"
                          >
                            <Star className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setLogos(logos.map(l => l.id === logo.id ? { ...l, url: '' } : l));
                            toast.success('Logo removed');
                          }}
                          className="p-2 bg-orange-600/10 hover:bg-orange-600/20 text-orange-400 rounded-lg transition border border-orange-500/20"
                          title="Change logo"
                        >
                          <Upload className="w-4 h-4" />
                        </button>
                        {logos.length > 1 && !logo.is_primary && (
                          <button
                            onClick={() => {
                              setLogos(logos.filter(l => l.id !== logo.id));
                              toast.success('Logo deleted');
                            }}
                            className="p-2 bg-red-600/10 hover:bg-red-600/20 text-red-400 rounded-lg transition border border-red-500/20"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Add Logo Modal */}
            {showAddLogo && (
              <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6 max-w-md w-full">
                  <h3 className="text-xl font-bold text-white mb-4">Add New Logo</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">Logo Name</label>
                      <input
                        type="text"
                        placeholder="e.g., Light Logo, Dark Logo, Icon Only"
                        className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">Upload Logo</label>
                      <div className="border-2 border-dashed border-[#2A2A2A] rounded-lg p-8 text-center hover:border-orange-500/50 transition cursor-pointer">
                        <Upload className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                        <p className="text-sm text-gray-400">Click to upload or drag and drop</p>
                        <p className="text-xs text-gray-600 mt-1">PNG, JPG, SVG up to 10MB</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 pt-4">
                      <PrimaryButton
                        onClick={() => {
                          const newLogo: CompanyLogo = {
                            id: Date.now().toString(),
                            name: 'New Logo',
                            url: 'https://via.placeholder.com/200',
                            uploaded_at: new Date().toISOString(),
                            is_primary: false
                          };
                          setLogos([...logos, newLogo]);
                          setShowAddLogo(false);
                          toast.success('Logo added successfully');
                        }}
                        fullWidth
                      >
                        Add Logo
                      </PrimaryButton>
                      <SecondaryButton
                        onClick={() => setShowAddLogo(false)}
                        fullWidth
                      >
                        Cancel
                      </SecondaryButton>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Brand Colors */}
          <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Palette className="w-5 h-5 text-pink-400" />
              Brand Colors
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Primary Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={profile.primary_color}
                    onChange={(e) => setProfile({ ...profile, primary_color: e.target.value })}
                    disabled={!isEditing}
                    className="w-16 h-12 rounded-lg border border-[#2A2A2A] cursor-pointer"
                  />
                  <input
                    type="text"
                    value={profile.primary_color}
                    onChange={(e) => setProfile({ ...profile, primary_color: e.target.value })}
                    disabled={!isEditing}
                    className="flex-1 px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white font-mono uppercase focus:outline-none focus:ring-2 focus:ring-orange-500/50 disabled:opacity-50"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Secondary Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={profile.secondary_color}
                    onChange={(e) => setProfile({ ...profile, secondary_color: e.target.value })}
                    disabled={!isEditing}
                    className="w-16 h-12 rounded-lg border border-[#2A2A2A] cursor-pointer"
                  />
                  <input
                    type="text"
                    value={profile.secondary_color}
                    onChange={(e) => setProfile({ ...profile, secondary_color: e.target.value })}
                    disabled={!isEditing}
                    className="flex-1 px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white font-mono uppercase focus:outline-none focus:ring-2 focus:ring-orange-500/50 disabled:opacity-50"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Add/Edit Document Modal */}
      {showAddDocument && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                <FileText className="w-6 h-6 text-orange-400" />
                {editingDocument ? 'Edit Document' : 'Add New Document'}
              </h3>
              <button
                onClick={() => {
                  setShowAddDocument(false);
                  setEditingDocument(null);
                  setUploadedFile(null);
                  setNewDocument({
                    document_type: 'articles_incorporation',
                    document_name: '',
                    document_number: '',
                    issue_date: '',
                    expiration_date: '',
                    issuing_authority: '',
                    notes: ''
                  });
                }}
                className="p-2 hover:bg-[#2A2A2A] rounded-lg transition"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Document Type */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Document Type *</label>
                <select
                  value={newDocument.document_type}
                  onChange={(e) => setNewDocument({ ...newDocument, document_type: e.target.value as any })}
                  className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                >
                  {Object.entries(documentTypeLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              
              {/* Document Name */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Document Name *</label>
                <input
                  type="text"
                  value={newDocument.document_name}
                  onChange={(e) => setNewDocument({ ...newDocument, document_name: e.target.value })}
                  className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                  placeholder="Enter document name"
                />
              </div>
              
              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Upload File</label>
                {uploadedFile ? (
                  <div className="border-2 border-green-500/30 bg-green-500/10 rounded-lg p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-8 h-8 text-green-400" />
                        <div>
                          <p className="text-sm font-semibold text-white">{uploadedFile.name}</p>
                          <p className="text-xs text-green-400">Upload successful</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setUploadedFile(null)}
                        className="p-2 hover:bg-[#2A2A2A] rounded-lg transition"
                      >
                        <X className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-[#2A2A2A] rounded-lg p-6 text-center hover:border-orange-500/50 transition cursor-pointer relative">
                    <input
                      type="file"
                      onChange={handleFileUpload}
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      disabled={uploadingFile}
                    />
                    {uploadingFile ? (
                      <>
                        <RefreshCw className="w-10 h-10 text-orange-400 mx-auto mb-2 animate-spin" />
                        <p className="text-sm text-orange-400">Uploading...</p>
                      </>
                    ) : (
                      <>
                        <Upload className="w-10 h-10 text-gray-600 mx-auto mb-2" />
                        <p className="text-sm text-gray-400">Click to upload or drag and drop</p>
                        <p className="text-xs text-gray-600 mt-1">PDF, DOC, DOCX, JPG, PNG up to 10MB</p>
                      </>
                    )}
                  </div>
                )}
              </div>
              
              {/* Document Number */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Document Number</label>
                <input
                  type="text"
                  value={newDocument.document_number}
                  onChange={(e) => setNewDocument({ ...newDocument, document_number: e.target.value })}
                  className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                  placeholder="e.g., AOI-2024-12345"
                />
              </div>
              
              {/* Date Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Issue Date</label>
                  <input
                    type="date"
                    value={newDocument.issue_date}
                    onChange={(e) => setNewDocument({ ...newDocument, issue_date: e.target.value })}
                    className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Expiration Date</label>
                  <input
                    type="date"
                    value={newDocument.expiration_date}
                    onChange={(e) => setNewDocument({ ...newDocument, expiration_date: e.target.value })}
                    className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                  />
                </div>
              </div>
              
              {/* Issuing Authority */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Issuing Authority</label>
                <input
                  type="text"
                  value={newDocument.issuing_authority}
                  onChange={(e) => setNewDocument({ ...newDocument, issuing_authority: e.target.value })}
                  className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                  placeholder="e.g., State of California"
                />
              </div>
              
              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Notes</label>
                <textarea
                  value={newDocument.notes}
                  onChange={(e) => setNewDocument({ ...newDocument, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                  placeholder="Additional notes..."
                />
              </div>
              
              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-4">
                <PrimaryButton
                  onClick={handleSaveDocument}
                  disabled={!newDocument.document_name || uploadingFile}
                  icon={uploadingFile ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  fullWidth
                >
                  {uploadingFile ? 'Saving...' : (editingDocument ? 'Update Document' : 'Add Document')}
                </PrimaryButton>
                <SecondaryButton
                  onClick={() => {
                    setShowAddDocument(false);
                    setEditingDocument(null);
                    setUploadedFile(null);
                    setNewDocument({
                      document_type: 'articles_incorporation',
                      document_name: '',
                      document_number: '',
                      issue_date: '',
                      expiration_date: '',
                      issuing_authority: '',
                      notes: ''
                    });
                  }}
                  fullWidth
                >
                  Cancel
                </SecondaryButton>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Brand Creator Modal */}
      {showBrandCreator && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <EnterpriseBrandCreator
              companyId={activeCompany?.id || ''}
              companyName={activeCompany?.name || ''}
              onClose={() => setShowBrandCreator(false)}
              onSave={(brandData) => {
                setProfile({ ...profile, logo_url: brandData.logo_url, primary_color: brandData.primary_color });
                setShowBrandCreator(false);
                toast.success('Brand assets updated!');
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}