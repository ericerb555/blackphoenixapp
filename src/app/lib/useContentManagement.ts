import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { useCompany } from '../contexts/CompanyContext';
import { projectId, publicAnonKey } from '../utils/supabase/info';

export interface ContentPiece {
  id: string;
  company_id: string;
  template_id?: string;
  category_id?: string;
  workflow_id?: string;
  title: string;
  content_body: string;
  content_format: string;
  excerpt?: string;
  featured_image_url?: string;
  status: 'draft' | 'pending_review' | 'approved' | 'published' | 'archived' | 'rejected';
  current_workflow_stage: number;
  is_ai_generated: boolean;
  ai_generation_metadata?: any;
  brand_compliance_score?: number;
  compliance_issues?: any[];
  scheduled_publish_at?: string;
  published_at?: string;
  archived_at?: string;
  total_impressions: number;
  total_clicks: number;
  total_engagement: number;
  total_conversions: number;
  created_by?: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
}

export interface ContentTemplate {
  id: string;
  company_id: string;
  category_id?: string;
  name: string;
  description?: string;
  content_type: string;
  template_body: string;
  variables: any[];
  ai_prompt?: string;
  suggested_channels: string[];
  target_word_count_min?: number;
  target_word_count_max?: number;
  brand_guideline_ids: string[];
  usage_count: number;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface BrandGuideline {
  id: string;
  company_id: string;
  guideline_type: string;
  name: string;
  description?: string;
  rules: any;
  examples?: any[];
  prohibited_terms: string[];
  required_terms: string[];
  is_mandatory: boolean;
  priority: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ContentWorkflow {
  id: string;
  company_id: string;
  name: string;
  description?: string;
  workflow_type: string;
  stages: any[];
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ContentChannel {
  id: string;
  company_id: string;
  channel_type: string;
  channel_name: string;
  description?: string;
  api_credentials?: any;
  api_endpoint?: string;
  channel_config: any;
  auto_publish: boolean;
  max_posts_per_day?: number;
  min_gap_between_posts?: number;
  posting_schedule?: any;
  content_restrictions?: any;
  is_active: boolean;
  last_published_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ContentDistribution {
  id: string;
  content_piece_id: string;
  channel_id: string;
  distribution_status: 'pending' | 'scheduled' | 'published' | 'failed' | 'cancelled';
  scheduled_for?: string;
  published_at?: string;
  external_url?: string;
  external_id?: string;
  channel_metadata?: any;
  impressions: number;
  clicks: number;
  engagement: number;
  conversions: number;
  error_message?: string;
  retry_count: number;
  last_retry_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ContentApproval {
  id: string;
  content_piece_id: string;
  workflow_stage: number;
  assigned_to?: string;
  assigned_role?: string;
  status: 'pending' | 'approved' | 'rejected' | 'changes_requested';
  decision?: string;
  comments?: string;
  assigned_at: string;
  due_at?: string;
  reviewed_at?: string;
  reviewed_by?: string;
  created_at: string;
}

export function useContentManagement() {
  const companyContext = useCompany();
  const currentCompany = companyContext?.activeCompany || companyContext?.currentCompany || null;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);


  const CMS_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/cms`;

  // Shared fetch helper: attaches the user's access token when available, otherwise
  // falls back to the public anon key. Throws with contextual info on failure.
  const cmsFetch = async (path: string, init: RequestInit = {}) => {
    let token = publicAnonKey;
    try {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.access_token) token = data.session.access_token;
    } catch {
      // No session — fall back to anon key
    }
    const res = await fetch(`${CMS_BASE}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(init.headers || {}),
      },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`CMS request failed (${res.status}) for ${path}: ${text}`);
    }
    return res.json();
  };

  // Fetch all content pieces
  const fetchContentPieces = async (status?: string): Promise<ContentPiece[]> => {
    if (!currentCompany?.id) return [];
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ companyId: currentCompany.id });
      if (status) params.set('status', status);
      const data = await cmsFetch(`/content-pieces?${params.toString()}`);
      return Array.isArray(data) ? data : [];
    } catch (err: any) {
      console.error(`Error fetching content pieces: ${err.message}`);
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Fetch single content piece
  const fetchContentPiece = async (id: string) => {
    if (!currentCompany?.id) return null;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ companyId: currentCompany.id });
      return await cmsFetch(`/content-pieces/${id}?${params.toString()}`);
    } catch (err: any) {
      console.error(`Error fetching content piece ${id}: ${err.message}`);
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Fetch all templates
  const fetchTemplates = async (): Promise<ContentTemplate[]> => {
    if (!currentCompany?.id) return [];
    setLoading(true);
    setError(null);
    try {
      const data = await cmsFetch(`/templates?companyId=${encodeURIComponent(currentCompany.id)}`);
      return Array.isArray(data) ? data : [];
    } catch (err: any) {
      console.error(`Error fetching templates: ${err.message}`);
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Fetch brand guidelines
  const fetchBrandGuidelines = async (): Promise<BrandGuideline[]> => {
    if (!currentCompany?.id) return [];
    setLoading(true);
    setError(null);
    try {
      const data = await cmsFetch(`/brand-guidelines?companyId=${encodeURIComponent(currentCompany.id)}`);
      return Array.isArray(data) ? data : [];
    } catch (err: any) {
      console.error(`Error fetching brand guidelines: ${err.message}`);
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Fetch workflows
  const fetchWorkflows = async (): Promise<ContentWorkflow[]> => {
    if (!currentCompany?.id) return [];
    setLoading(true);
    setError(null);
    try {
      const data = await cmsFetch(`/workflows?companyId=${encodeURIComponent(currentCompany.id)}`);
      return Array.isArray(data) ? data : [];
    } catch (err: any) {
      console.error(`Error fetching workflows: ${err.message}`);
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Fetch channels
  const fetchChannels = async (): Promise<ContentChannel[]> => {
    if (!currentCompany?.id) return [];
    setLoading(true);
    setError(null);
    try {
      const data = await cmsFetch(`/channels?companyId=${encodeURIComponent(currentCompany.id)}`);
      return Array.isArray(data) ? data : [];
    } catch (err: any) {
      console.error(`Error fetching channels: ${err.message}`);
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Fetch distribution for a content piece
  const fetchDistribution = async (contentPieceId: string): Promise<ContentDistribution[]> => {
    setLoading(true);
    setError(null);
    try {
      const data = await cmsFetch(`/distribution?contentPieceId=${encodeURIComponent(contentPieceId)}`);
      return Array.isArray(data) ? data : [];
    } catch (err: any) {
      console.error(`Error fetching distribution: ${err.message}`);
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Fetch approvals for a content piece
  const fetchApprovals = async (contentPieceId: string): Promise<ContentApproval[]> => {
    setLoading(true);
    setError(null);
    try {
      const data = await cmsFetch(`/approvals?contentPieceId=${encodeURIComponent(contentPieceId)}`);
      return Array.isArray(data) ? data : [];
    } catch (err: any) {
      console.error(`Error fetching approvals: ${err.message}`);
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Create content piece
  const createContentPiece = async (contentData: Partial<ContentPiece>, overrideCompanyId?: string) => {
    const companyId = overrideCompanyId || currentCompany?.id || 'default-company';
    setLoading(true);
    setError(null);
    try {
      let createdBy: string | undefined;
      try {
        const { data: user } = await supabase.auth.getUser();
        createdBy = user?.user?.id;
      } catch {
        // Anonymous — no created_by
      }
      return await cmsFetch(`/content-pieces`, {
        method: 'POST',
        body: JSON.stringify({ ...contentData, company_id: companyId, created_by: createdBy }),
      });
    } catch (err: any) {
      console.error(`Error creating content piece: ${err.message}`);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Update content piece
  const updateContentPiece = async (id: string, updates: Partial<ContentPiece>) => {
    setLoading(true);
    setError(null);
    try {
      let updatedBy: string | undefined;
      try {
        const { data: user } = await supabase.auth.getUser();
        updatedBy = user?.user?.id;
      } catch {
        // Anonymous — no updated_by
      }
      return await cmsFetch(`/content-pieces/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ ...updates, updated_by: updatedBy }),
      });
    } catch (err: any) {
      console.error(`Error updating content piece ${id}: ${err.message}`);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Delete content piece
  const deleteContentPiece = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      await cmsFetch(`/content-pieces/${id}`, { method: 'DELETE' });
    } catch (err: any) {
      console.error(`Error deleting content piece ${id}: ${err.message}`);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Create approval record
  const createApproval = async (approvalData: Partial<ContentApproval>) => {
    setLoading(true);
    setError(null);
    try {
      return await cmsFetch(`/approvals`, { method: 'POST', body: JSON.stringify(approvalData) });
    } catch (err: any) {
      console.error(`Error creating approval: ${err.message}`);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Update approval
  const updateApproval = async (id: string, updates: Partial<ContentApproval>) => {
    setLoading(true);
    setError(null);
    try {
      let reviewedBy: string | undefined;
      try {
        const { data: user } = await supabase.auth.getUser();
        reviewedBy = user?.user?.id;
      } catch {
        // Anonymous
      }
      return await cmsFetch(`/approvals/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ ...updates, reviewed_by: reviewedBy, reviewed_at: new Date().toISOString() }),
      });
    } catch (err: any) {
      console.error(`Error updating approval ${id}: ${err.message}`);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Create distribution
  const createDistribution = async (distributionData: Partial<ContentDistribution>) => {
    setLoading(true);
    setError(null);
    try {
      return await cmsFetch(`/distribution`, { method: 'POST', body: JSON.stringify(distributionData) });
    } catch (err: any) {
      console.error(`Error creating distribution: ${err.message}`);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Update distribution
  const updateDistribution = async (id: string, updates: Partial<ContentDistribution>) => {
    setLoading(true);
    setError(null);
    try {
      return await cmsFetch(`/distribution/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ ...updates, updated_at: new Date().toISOString() }),
      });
    } catch (err: any) {
      console.error(`Error updating distribution ${id}: ${err.message}`);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Increment template usage
  const incrementTemplateUsage = async (templateId: string) => {
    try {
      await cmsFetch(`/templates/${templateId}/increment-usage`, { method: 'POST', body: '{}' });
    } catch (err: any) {
      console.error(`Error incrementing template usage: ${err.message}`);
    }
  };


  return {
    loading,
    error,
    fetchContentPieces,
    fetchContentPiece,
    fetchTemplates,
    fetchBrandGuidelines,
    fetchWorkflows,
    fetchChannels,
    fetchDistribution,
    fetchApprovals,
    createContentPiece,
    updateContentPiece,
    deleteContentPiece,
    createApproval,
    updateApproval,
    createDistribution,
    updateDistribution,
    incrementTemplateUsage,
  };
}