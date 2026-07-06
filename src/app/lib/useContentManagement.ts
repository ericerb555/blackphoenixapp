import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { useCompany } from '../contexts/CompanyContext';

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
  const { currentCompany } = useCompany();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all content pieces
  const fetchContentPieces = async (status?: string): Promise<ContentPiece[]> => {
    if (!currentCompany?.id) return [];
    
    setLoading(true);
    setError(null);
    
    try {
      let query = supabase
        .from('content_pieces')
        .select('*')
        .eq('company_id', currentCompany.id)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      return data || [];
    } catch (err: any) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Fetch single content piece with related data
  const fetchContentPiece = async (id: string) => {
    if (!currentCompany?.id) return null;
    
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: fetchError } = await supabase
        .from('content_pieces')
        .select('*')
        .eq('id', id)
        .eq('company_id', currentCompany.id)
        .single();

      if (fetchError) throw fetchError;
      return data;
    } catch (err: any) {
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
      const { data, error: fetchError } = await supabase
        .from('content_templates')
        .select('*')
        .eq('company_id', currentCompany.id)
        .eq('is_active', true)
        .order('usage_count', { ascending: false });

      if (fetchError) throw fetchError;
      return data || [];
    } catch (err: any) {
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
      const { data, error: fetchError } = await supabase
        .from('brand_guidelines')
        .select('*')
        .eq('company_id', currentCompany.id)
        .eq('is_active', true)
        .order('priority', { ascending: false });

      if (fetchError) throw fetchError;
      return data || [];
    } catch (err: any) {
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
      const { data, error: fetchError } = await supabase
        .from('content_workflows')
        .select('*')
        .eq('company_id', currentCompany.id)
        .eq('is_active', true)
        .order('is_default', { ascending: false });

      if (fetchError) throw fetchError;
      return data || [];
    } catch (err: any) {
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
      const { data, error: fetchError } = await supabase
        .from('content_channels')
        .select('*')
        .eq('company_id', currentCompany.id)
        .order('channel_name');

      if (fetchError) throw fetchError;
      return data || [];
    } catch (err: any) {
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
      const { data, error: fetchError } = await supabase
        .from('content_distribution')
        .select('*')
        .eq('content_piece_id', contentPieceId);

      if (fetchError) throw fetchError;
      return data || [];
    } catch (err: any) {
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
      const { data, error: fetchError } = await supabase
        .from('content_approvals')
        .select('*')
        .eq('content_piece_id', contentPieceId)
        .order('workflow_stage');

      if (fetchError) throw fetchError;
      return data || [];
    } catch (err: any) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Create content piece
  const createContentPiece = async (contentData: Partial<ContentPiece>, overrideCompanyId?: string) => {
    console.log('🔧 createContentPiece called with overrideCompanyId:', overrideCompanyId);
    console.log('🔧 currentCompany?.id:', currentCompany?.id);
    const companyId = overrideCompanyId || currentCompany?.id;
    console.log('🔧 Final companyId to use:', companyId);
    if (!companyId) throw new Error('No company selected');
    
    setLoading(true);
    setError(null);
    
    try {
      const { data: user } = await supabase.auth.getUser();
      
      const { data, error: createError } = await supabase
        .from('content_pieces')
        .insert({
          ...contentData,
          company_id: companyId,
          created_by: user?.user?.id,
        })
        .select()
        .single();

      if (createError) throw createError;
      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Update content piece
  const updateContentPiece = async (id: string, updates: Partial<ContentPiece>) => {
    if (!currentCompany?.id) throw new Error('No company selected');
    
    setLoading(true);
    setError(null);
    
    try {
      const { data: user } = await supabase.auth.getUser();
      
      const { data, error: updateError } = await supabase
        .from('content_pieces')
        .update({
          ...updates,
          updated_by: user?.user?.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('company_id', currentCompany.id)
        .select()
        .single();

      if (updateError) throw updateError;
      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Delete content piece
  const deleteContentPiece = async (id: string) => {
    if (!currentCompany?.id) throw new Error('No company selected');
    
    setLoading(true);
    setError(null);
    
    try {
      const { error: deleteError } = await supabase
        .from('content_pieces')
        .delete()
        .eq('id', id)
        .eq('company_id', currentCompany.id);

      if (deleteError) throw deleteError;
    } catch (err: any) {
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
      const { data, error: createError } = await supabase
        .from('content_approvals')
        .insert(approvalData)
        .select()
        .single();

      if (createError) throw createError;
      return data;
    } catch (err: any) {
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
      const { data: user } = await supabase.auth.getUser();
      
      const { data, error: updateError } = await supabase
        .from('content_approvals')
        .update({
          ...updates,
          reviewed_by: user?.user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;
      return data;
    } catch (err: any) {
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
      const { data, error: createError } = await supabase
        .from('content_distribution')
        .insert(distributionData)
        .select()
        .single();

      if (createError) throw createError;
      return data;
    } catch (err: any) {
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
      const { data, error: updateError } = await supabase
        .from('content_distribution')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;
      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Increment template usage
  const incrementTemplateUsage = async (templateId: string) => {
    try {
      await supabase.rpc('increment_template_usage', { template_id: templateId });
    } catch (err) {
      console.error('Error incrementing template usage:', err);
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