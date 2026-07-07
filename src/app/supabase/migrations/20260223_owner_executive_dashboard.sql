-- Owner Executive Dashboard - Database Migration
-- Creates tables and indexes for owner dashboard functionality
-- Run this after completing Phase 1 Core Data Integration

-- ============================================================================
-- COMPANY METRICS TABLE
-- Stores daily metrics snapshots for each company
-- ============================================================================

CREATE TABLE IF NOT EXISTS company_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  metric_date date NOT NULL DEFAULT CURRENT_DATE,
  
  -- Financial Metrics
  mrr numeric(10, 2) DEFAULT 0,
  total_revenue numeric(12, 2) DEFAULT 0,
  growth_rate numeric(5, 2) DEFAULT 0, -- Percentage
  
  -- User Metrics (stored as JSONB for flexibility)
  user_count jsonb DEFAULT '{
    "total": 0,
    "active": 0,
    "customers": 0,
    "employees": 0,
    "subcontractors": 0,
    "vendors": 0,
    "advertisers": 0
  }'::jsonb,
  
  -- AI Usage Metrics
  ai_usage jsonb DEFAULT '{
    "calls": 0,
    "cost": 0
  }'::jsonb,
  
  -- Health & Status Metrics
  health_score integer DEFAULT 0 CHECK (health_score >= 0 AND health_score <= 100),
  setup_progress integer DEFAULT 0 CHECK (setup_progress >= 0 AND setup_progress <= 100),
  alerts_count integer DEFAULT 0,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Ensure one metric record per company per date
  UNIQUE(company_id, metric_date)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_company_metrics_company ON company_metrics(company_id);
CREATE INDEX IF NOT EXISTS idx_company_metrics_date ON company_metrics(metric_date DESC);
CREATE INDEX IF NOT EXISTS idx_company_metrics_company_date ON company_metrics(company_id, metric_date DESC);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_company_metrics_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER company_metrics_updated_at
  BEFORE UPDATE ON company_metrics
  FOR EACH ROW
  EXECUTE FUNCTION update_company_metrics_timestamp();

-- ============================================================================
-- COMPANY BRANDING TABLE
-- Stores per-company branding configuration
-- ============================================================================

CREATE TABLE IF NOT EXISTS company_branding (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL UNIQUE REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Visual Branding
  logo_url text,
  primary_color text DEFAULT '#ea580c',
  secondary_color text DEFAULT '#0ea5e9',
  accent_color text DEFAULT '#8b5cf6',
  background_color text DEFAULT '#0A0A0A',
  
  -- Typography
  font_primary text DEFAULT 'Inter',
  font_secondary text DEFAULT 'Inter',
  
  -- Domain Configuration
  custom_domain text,
  custom_domain_verified boolean DEFAULT false,
  ssl_enabled boolean DEFAULT false,
  
  -- Template Configuration
  email_templates jsonb DEFAULT '{
    "welcome": {"enabled": false, "customized": false},
    "invoice": {"enabled": false, "customized": false},
    "appointment": {"enabled": false, "customized": false},
    "quote": {"enabled": false, "customized": false},
    "project_update": {"enabled": false, "customized": false},
    "payment_confirmation": {"enabled": false, "customized": false}
  }'::jsonb,
  pdf_template_id text,
  
  -- Setup Status
  setup_complete boolean DEFAULT false,
  customization_percentage integer DEFAULT 0 CHECK (customization_percentage >= 0 AND customization_percentage <= 100),
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_company_branding_company ON company_branding(company_id);
CREATE INDEX IF NOT EXISTS idx_company_branding_custom_domain ON company_branding(custom_domain) WHERE custom_domain IS NOT NULL;

-- Trigger to update updated_at timestamp
CREATE TRIGGER company_branding_updated_at
  BEFORE UPDATE ON company_branding
  FOR EACH ROW
  EXECUTE FUNCTION update_company_metrics_timestamp();

-- ============================================================================
-- OWNER ACCESS LOGS TABLE
-- Audit trail for all owner dashboard actions
-- ============================================================================

CREATE TABLE IF NOT EXISTS owner_access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL,
  action text NOT NULL,
  target_company_id uuid REFERENCES companies(id) ON DELETE SET NULL,
  details jsonb DEFAULT '{}'::jsonb,
  
  -- Request Information
  ip_address text,
  user_agent text,
  
  -- Timestamp
  created_at timestamptz DEFAULT now()
);

-- Indexes for querying logs
CREATE INDEX IF NOT EXISTS idx_owner_access_logs_user ON owner_access_logs(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_owner_access_logs_company ON owner_access_logs(target_company_id);
CREATE INDEX IF NOT EXISTS idx_owner_access_logs_created ON owner_access_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_owner_access_logs_action ON owner_access_logs(action);

-- ============================================================================
-- COMPANY FEATURES TABLE
-- Tracks which features are enabled for each company
-- ============================================================================

CREATE TABLE IF NOT EXISTS company_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  feature_name text NOT NULL,
  is_enabled boolean DEFAULT true,
  is_restricted boolean DEFAULT false, -- Requires special permission
  enabled_at timestamptz DEFAULT now(),
  enabled_by uuid, -- User who enabled the feature
  
  -- Configuration
  feature_config jsonb DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Ensure one record per company-feature combination
  UNIQUE(company_id, feature_name)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_company_features_company ON company_features(company_id);
CREATE INDEX IF NOT EXISTS idx_company_features_name ON company_features(feature_name);
CREATE INDEX IF NOT EXISTS idx_company_features_enabled ON company_features(is_enabled);

-- Trigger to update updated_at timestamp
CREATE TRIGGER company_features_updated_at
  BEFORE UPDATE ON company_features
  FOR EACH ROW
  EXECUTE FUNCTION update_company_metrics_timestamp();

-- ============================================================================
-- UPDATE COMPANIES TABLE
-- Add fields needed for owner dashboard (if not already present)
-- ============================================================================

-- Add status field if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'companies' AND column_name = 'status'
  ) THEN
    ALTER TABLE companies ADD COLUMN status text DEFAULT 'active';
    ALTER TABLE companies ADD CONSTRAINT companies_status_check 
      CHECK (status IN ('active', 'trial', 'suspended', 'inactive'));
  END IF;
END $$;

-- Add plan field if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'companies' AND column_name = 'plan'
  ) THEN
    ALTER TABLE companies ADD COLUMN plan text DEFAULT 'professional';
    ALTER TABLE companies ADD CONSTRAINT companies_plan_check 
      CHECK (plan IN ('starter', 'professional', 'enterprise', 'custom'));
  END IF;
END $$;

-- ============================================================================
-- UPDATE COMPANY_MEMBERS TABLE
-- Add fields for user type classification (if not already present)
-- ============================================================================

-- Add user_type field for better filtering
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'company_members' AND column_name = 'user_type'
  ) THEN
    ALTER TABLE company_members ADD COLUMN user_type text;
    ALTER TABLE company_members ADD CONSTRAINT company_members_user_type_check 
      CHECK (user_type IN ('customer', 'employee', 'subcontractor', 'vendor', 'advertiser', 'admin'));
  END IF;
END $$;

-- Add last_login field for tracking active users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'company_members' AND column_name = 'last_login'
  ) THEN
    ALTER TABLE company_members ADD COLUMN last_login timestamptz;
  END IF;
END $$;

-- ============================================================================
-- HELPER FUNCTIONS
-- Utility functions for owner dashboard
-- ============================================================================

-- Function to update daily company metrics
CREATE OR REPLACE FUNCTION update_company_daily_metrics(p_company_id uuid)
RETURNS void AS $$
DECLARE
  v_user_counts jsonb;
  v_mrr numeric;
  v_total_revenue numeric;
BEGIN
  -- Calculate user counts
  SELECT jsonb_build_object(
    'total', COUNT(*),
    'active', COUNT(*) FILTER (WHERE last_login > now() - interval '7 days'),
    'customers', COUNT(*) FILTER (WHERE user_type = 'customer'),
    'employees', COUNT(*) FILTER (WHERE user_type = 'employee'),
    'subcontractors', COUNT(*) FILTER (WHERE user_type = 'subcontractor'),
    'vendors', COUNT(*) FILTER (WHERE user_type = 'vendor'),
    'advertisers', COUNT(*) FILTER (WHERE user_type = 'advertiser')
  )
  INTO v_user_counts
  FROM company_members
  WHERE company_id = p_company_id AND is_active = true;

  -- Calculate MRR and revenue (you'll need to implement based on your billing system)
  -- This is a placeholder
  v_mrr := 0;
  v_total_revenue := 0;

  -- Upsert today's metrics
  INSERT INTO company_metrics (
    company_id,
    metric_date,
    user_count,
    mrr,
    total_revenue
  ) VALUES (
    p_company_id,
    CURRENT_DATE,
    v_user_counts,
    v_mrr,
    v_total_revenue
  )
  ON CONFLICT (company_id, metric_date) 
  DO UPDATE SET
    user_count = EXCLUDED.user_count,
    mrr = EXCLUDED.mrr,
    total_revenue = EXCLUDED.total_revenue,
    updated_at = now();
END;
$$ LANGUAGE plpgsql;

-- Function to get platform-wide metrics
CREATE OR REPLACE FUNCTION get_platform_metrics()
RETURNS jsonb AS $$
DECLARE
  v_metrics jsonb;
BEGIN
  SELECT jsonb_build_object(
    'totalCompanies', COUNT(DISTINCT c.id),
    'activeCompanies', COUNT(DISTINCT c.id) FILTER (WHERE c.status = 'active'),
    'totalMRR', COALESCE(SUM(cm.mrr), 0),
    'totalRevenue', COALESCE(SUM(cm.total_revenue), 0),
    'totalUsers', COALESCE(SUM((cm.user_count->>'total')::integer), 0),
    'activeUsers', COALESCE(SUM((cm.user_count->>'active')::integer), 0),
    'avgHealthScore', COALESCE(AVG(cm.health_score)::integer, 0)
  )
  INTO v_metrics
  FROM companies c
  LEFT JOIN LATERAL (
    SELECT * FROM company_metrics 
    WHERE company_id = c.id 
    ORDER BY metric_date DESC 
    LIMIT 1
  ) cm ON true;

  RETURN v_metrics;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SEED DEFAULT FEATURES
-- Insert common features that companies can enable
-- ============================================================================

-- This would be run once to populate the features catalog
-- You can add/remove features as needed

CREATE TABLE IF NOT EXISTS platform_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_name text UNIQUE NOT NULL,
  display_name text NOT NULL,
  description text,
  is_restricted boolean DEFAULT false,
  category text,
  created_at timestamptz DEFAULT now()
);

-- Insert default features
INSERT INTO platform_features (feature_name, display_name, description, is_restricted, category)
VALUES
  ('ai_content_studio', 'AI Content Studio', 'AI-powered content generation', false, 'AI'),
  ('price_automation', 'Price Automation Engine', 'Automated pricing and cost calculations', false, 'AI'),
  ('crm_import', 'CRM Data Import Assistant', 'Import data from external CRM systems', false, 'AI'),
  ('product_catalog', 'AI Product Catalog Assistant', 'AI-assisted product catalog management', false, 'AI'),
  ('ai_diagnostics', 'AI Diagnostics & Control Center', 'Monitor and control all AI systems', true, 'AI'),
  ('cohort_management', 'Advanced Cohort Management', 'Automated pricing engine and cohorts', true, 'Management'),
  ('vendor_advertising', 'Vendor Advertising Hub', 'Vendor ad platform with tiers', false, 'Advertising'),
  ('design_studio_pro', 'Design Studio Pro', 'Professional design and CAD tools', false, 'Design'),
  ('invoice_management', 'Invoice Management & PDF Generation', 'Create and send professional invoices', false, 'Billing'),
  ('custom_domains', 'Custom Domain Management', 'Configure custom domains for portals', true, 'Enterprise')
ON CONFLICT (feature_name) DO NOTHING;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Ensure owners can only access their own companies
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE company_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_branding ENABLE ROW LEVEL SECURITY;
ALTER TABLE owner_access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_features ENABLE ROW LEVEL SECURITY;

-- Policy: Owners can view metrics for their companies
CREATE POLICY owner_view_company_metrics ON company_metrics
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id 
      FROM company_members 
      WHERE user_id = auth.uid() 
      AND role = 'owner' 
      AND is_active = true
    )
  );

-- Policy: Owners can update metrics for their companies
CREATE POLICY owner_update_company_metrics ON company_metrics
  FOR ALL
  USING (
    company_id IN (
      SELECT company_id 
      FROM company_members 
      WHERE user_id = auth.uid() 
      AND role = 'owner' 
      AND is_active = true
    )
  );

-- Policy: Owners can view/edit branding for their companies
CREATE POLICY owner_manage_company_branding ON company_branding
  FOR ALL
  USING (
    company_id IN (
      SELECT company_id 
      FROM company_members 
      WHERE user_id = auth.uid() 
      AND role = 'owner' 
      AND is_active = true
    )
  );

-- Policy: Owners can view their own access logs
CREATE POLICY owner_view_access_logs ON owner_access_logs
  FOR SELECT
  USING (owner_user_id = auth.uid());

-- Policy: Owners can manage features for their companies
CREATE POLICY owner_manage_company_features ON company_features
  FOR ALL
  USING (
    company_id IN (
      SELECT company_id 
      FROM company_members 
      WHERE user_id = auth.uid() 
      AND role = 'owner' 
      AND is_active = true
    )
  );

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE company_metrics IS 'Daily metrics snapshots for each company used in owner dashboard';
COMMENT ON TABLE company_branding IS 'Per-company branding configuration including colors, logos, and templates';
COMMENT ON TABLE owner_access_logs IS 'Audit trail of all owner dashboard actions for compliance';
COMMENT ON TABLE company_features IS 'Tracks which platform features are enabled for each company';
COMMENT ON TABLE platform_features IS 'Catalog of available platform features';

COMMENT ON COLUMN company_metrics.health_score IS 'Overall company health score 0-100 based on activity, revenue, and engagement';
COMMENT ON COLUMN company_branding.customization_percentage IS 'Percentage of branding elements customized (0-100)';
COMMENT ON COLUMN company_features.is_restricted IS 'Whether this feature requires special permission to enable';

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Owner Executive Dashboard migration completed successfully!';
  RAISE NOTICE '📊 Created tables: company_metrics, company_branding, owner_access_logs, company_features, platform_features';
  RAISE NOTICE '🔒 Row Level Security policies enabled';
  RAISE NOTICE '📝 Helper functions created: update_company_daily_metrics(), get_platform_metrics()';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  Next steps:';
  RAISE NOTICE '1. Run update_company_daily_metrics() for each company to populate initial metrics';
  RAISE NOTICE '2. Set up a cron job to run update_company_daily_metrics() daily';
  RAISE NOTICE '3. Configure custom domains in company_branding table';
  RAISE NOTICE '4. Enable features for companies in company_features table';
END $$;
