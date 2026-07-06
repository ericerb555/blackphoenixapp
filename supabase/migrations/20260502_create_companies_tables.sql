-- Create companies table for permanent data storage
CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Basic Info
  company_name text NOT NULL,
  company_legal_name text,
  company_tagline text,
  slug text UNIQUE,

  -- Contact Info
  email text,
  phone text,
  fax text,
  website text,

  -- Address
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  zip_code text,
  country text DEFAULT 'United States',

  -- Branding
  logo_url text,
  primary_color text DEFAULT '#ea580c',
  secondary_color text DEFAULT '#dc2626',
  accent_color text DEFAULT '#ea580c',

  -- Business Details
  industry text,
  description text,
  tax_id text,
  tax_label text DEFAULT 'Tax ID',

  -- Banking (encrypted in production)
  bank_name text,
  bank_account_name text,
  bank_account_number text,
  bank_routing_number text,

  -- Additional
  license_number text,
  insurance_number text,
  payment_terms text DEFAULT 'Net 30',

  -- Metadata
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),

  -- Constraints
  CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' OR email IS NULL)
);

-- Create company_documents table
CREATE TABLE IF NOT EXISTS company_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,

  -- Document Info
  name text NOT NULL,
  type text NOT NULL,
  description text,

  -- File Info
  file_url text NOT NULL,
  file_name text NOT NULL,
  file_size integer,

  -- Dates
  uploaded_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone,

  -- Visibility
  is_public boolean DEFAULT false,

  -- Metadata
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),

  -- Constraints
  CONSTRAINT valid_document_type CHECK (type IN ('license', 'insurance', 'certification', 'contract', 'policy', 'other'))
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_companies_user_id ON companies(user_id);
CREATE INDEX IF NOT EXISTS idx_companies_slug ON companies(slug);
CREATE INDEX IF NOT EXISTS idx_company_documents_company_id ON company_documents(company_id);
CREATE INDEX IF NOT EXISTS idx_company_documents_type ON company_documents(type);

-- Enable Row Level Security (RLS)
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for companies table
CREATE POLICY "Users can view their own companies"
  ON companies FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own companies"
  ON companies FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own companies"
  ON companies FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own companies"
  ON companies FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for company_documents table
CREATE POLICY "Users can view documents of their companies"
  ON company_documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = company_documents.company_id
      AND companies.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert documents to their companies"
  ON company_documents FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = company_documents.company_id
      AND companies.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update documents of their companies"
  ON company_documents FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = company_documents.company_id
      AND companies.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete documents of their companies"
  ON company_documents FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = company_documents.company_id
      AND companies.user_id = auth.uid()
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to auto-update updated_at
CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_company_documents_updated_at
  BEFORE UPDATE ON company_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create automatic backup function (runs daily)
CREATE OR REPLACE FUNCTION backup_companies_to_storage()
RETURNS void AS $$
BEGIN
  -- This will be called by a scheduled function to backup data
  -- Implementation will use Supabase Storage API
  RAISE NOTICE 'Backup function placeholder - implement in application layer';
END;
$$ language 'plpgsql';

-- Grant permissions (for service role)
GRANT ALL ON companies TO postgres;
GRANT ALL ON company_documents TO postgres;
GRANT ALL ON companies TO authenticated;
GRANT ALL ON company_documents TO authenticated;
