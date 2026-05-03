-- Investment Opportunities System
-- Tables for managing investment opportunities, investor commitments, payouts, and documents

-- ============================================
-- 1. INVESTMENT OPPORTUNITIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS investment_opportunities (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  min_investment DECIMAL NOT NULL,
  max_investment DECIMAL NOT NULL,
  projected_roi DECIMAL NOT NULL,
  term TEXT NOT NULL,
  payout_frequency TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  investors INTEGER DEFAULT 0,
  funded DECIMAL DEFAULT 0,
  target_raise DECIMAL NOT NULL,
  current_commitments DECIMAL DEFAULT 0,
  minimum_to_start DECIMAL,
  highlight TEXT,
  silent_investment BOOLEAN DEFAULT false,
  needs_more_funding BOOLEAN DEFAULT false,
  project_details JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 2. INVESTOR COMMITMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS investor_commitments (
  id TEXT PRIMARY KEY,
  opportunity_id TEXT REFERENCES investment_opportunities(id) ON DELETE CASCADE,
  investor_email TEXT NOT NULL,
  investor_name TEXT NOT NULL,
  investor_phone TEXT,
  commitment_amount DECIMAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, active, completed, cancelled
  commitment_date TIMESTAMP DEFAULT NOW(),
  approval_date TIMESTAMP,
  start_date TIMESTAMP,
  maturity_date TIMESTAMP,
  total_received DECIMAL DEFAULT 0,
  total_roi DECIMAL DEFAULT 0,
  documents_signed BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 3. PAYOUT DISTRIBUTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS payout_distributions (
  id TEXT PRIMARY KEY,
  commitment_id TEXT REFERENCES investor_commitments(id) ON DELETE CASCADE,
  opportunity_id TEXT REFERENCES investment_opportunities(id) ON DELETE CASCADE,
  investor_email TEXT NOT NULL,
  payout_amount DECIMAL NOT NULL,
  payout_date TIMESTAMP NOT NULL,
  payout_period TEXT, -- Q1 2026, January 2026, etc.
  payout_type TEXT NOT NULL, -- interest, principal, dividend, revenue_share
  status TEXT NOT NULL DEFAULT 'scheduled', -- scheduled, processing, completed, failed
  transaction_id TEXT,
  payment_method TEXT, -- bank_transfer, check, ach, wire
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP
);

-- ============================================
-- 4. INVESTMENT DOCUMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS investment_documents (
  id TEXT PRIMARY KEY,
  opportunity_id TEXT REFERENCES investment_opportunities(id) ON DELETE CASCADE,
  commitment_id TEXT, -- NULL for opportunity docs, set for investor-specific docs
  document_type TEXT NOT NULL, -- contract, agreement, disclosure, report, statement
  document_name TEXT NOT NULL,
  document_url TEXT NOT NULL,
  file_size INTEGER,
  uploaded_by TEXT NOT NULL,
  uploaded_at TIMESTAMP DEFAULT NOW(),
  requires_signature BOOLEAN DEFAULT false,
  signed_at TIMESTAMP,
  signed_by TEXT,
  signature_data TEXT, -- Base64 signature image
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_commitments_investor ON investor_commitments(investor_email);
CREATE INDEX IF NOT EXISTS idx_commitments_opportunity ON investor_commitments(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_payouts_investor ON payout_distributions(investor_email);
CREATE INDEX IF NOT EXISTS idx_payouts_commitment ON payout_distributions(commitment_id);
CREATE INDEX IF NOT EXISTS idx_documents_opportunity ON investment_documents(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_documents_commitment ON investment_documents(commitment_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS
ALTER TABLE investment_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE investor_commitments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payout_distributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE investment_documents ENABLE ROW LEVEL SECURITY;

-- Opportunities: Public read, owner write
CREATE POLICY "Anyone can view active opportunities"
  ON investment_opportunities FOR SELECT
  USING (status = 'open');

CREATE POLICY "Service role can manage opportunities"
  ON investment_opportunities FOR ALL
  USING (auth.role() = 'service_role');

-- Commitments: Investors see their own, service role sees all
CREATE POLICY "Investors can view their own commitments"
  ON investor_commitments FOR SELECT
  USING (investor_email = auth.jwt() ->> 'email' OR auth.role() = 'service_role');

CREATE POLICY "Service role can manage commitments"
  ON investor_commitments FOR ALL
  USING (auth.role() = 'service_role');

-- Payouts: Investors see their own, service role sees all
CREATE POLICY "Investors can view their own payouts"
  ON payout_distributions FOR SELECT
  USING (investor_email = auth.jwt() ->> 'email' OR auth.role() = 'service_role');

CREATE POLICY "Service role can manage payouts"
  ON payout_distributions FOR ALL
  USING (auth.role() = 'service_role');

-- Documents: Read based on commitment access, service role manages
CREATE POLICY "Users can view documents for their commitments"
  ON investment_documents FOR SELECT
  USING (
    commitment_id IS NULL OR -- Opportunity-level docs are public
    commitment_id IN (
      SELECT id FROM investor_commitments
      WHERE investor_email = auth.jwt() ->> 'email'
    ) OR
    auth.role() = 'service_role'
  );

CREATE POLICY "Service role can manage documents"
  ON investment_documents FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to update opportunity stats when commitment changes
CREATE OR REPLACE FUNCTION update_opportunity_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE investment_opportunities
  SET
    investors = (
      SELECT COUNT(DISTINCT investor_email)
      FROM investor_commitments
      WHERE opportunity_id = NEW.opportunity_id
        AND status IN ('approved', 'active', 'completed')
    ),
    current_commitments = (
      SELECT COALESCE(SUM(commitment_amount), 0)
      FROM investor_commitments
      WHERE opportunity_id = NEW.opportunity_id
        AND status IN ('approved', 'active', 'completed')
    ),
    funded = ROUND(
      (COALESCE(
        (SELECT SUM(commitment_amount) FROM investor_commitments
         WHERE opportunity_id = NEW.opportunity_id
           AND status IN ('approved', 'active', 'completed')),
        0
      ) / NULLIF(target_raise, 0)) * 100,
      2
    ),
    updated_at = NOW()
  WHERE id = NEW.opportunity_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update opportunity stats
DROP TRIGGER IF EXISTS trigger_update_opportunity_stats ON investor_commitments;
CREATE TRIGGER trigger_update_opportunity_stats
AFTER INSERT OR UPDATE OR DELETE ON investor_commitments
FOR EACH ROW
EXECUTE FUNCTION update_opportunity_stats();

-- Function to update investor total received when payout completes
CREATE OR REPLACE FUNCTION update_investor_totals()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    UPDATE investor_commitments
    SET
      total_received = total_received + NEW.payout_amount,
      total_roi = ROUND(((total_received + NEW.payout_amount) / NULLIF(commitment_amount, 0) - 1) * 100, 2),
      updated_at = NOW()
    WHERE id = NEW.commitment_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update investor totals
DROP TRIGGER IF EXISTS trigger_update_investor_totals ON payout_distributions;
CREATE TRIGGER trigger_update_investor_totals
AFTER UPDATE ON payout_distributions
FOR EACH ROW
EXECUTE FUNCTION update_investor_totals();
