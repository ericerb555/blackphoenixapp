-- Create the key-value store table for Figma Make
-- This table is used to store application data in a flexible JSON format

CREATE TABLE IF NOT EXISTS kv_store_824f083c (
  key TEXT NOT NULL PRIMARY KEY,
  value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for faster prefix searches
CREATE INDEX IF NOT EXISTS idx_kv_store_key_prefix ON kv_store_824f083c (key text_pattern_ops);

-- Add function to auto-update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_kv_store_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-updating updated_at
DROP TRIGGER IF EXISTS update_kv_store_timestamp ON kv_store_824f083c;
CREATE TRIGGER update_kv_store_timestamp
  BEFORE UPDATE ON kv_store_824f083c
  FOR EACH ROW
  EXECUTE FUNCTION update_kv_store_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE kv_store_824f083c ENABLE ROW LEVEL SECURITY;

-- Create policy to allow service role full access
CREATE POLICY "Service role has full access" ON kv_store_824f083c
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create policy to allow anon users to read (for demo purposes)
CREATE POLICY "Anon users can read" ON kv_store_824f083c
  FOR SELECT
  TO anon
  USING (true);

-- Grant necessary permissions
GRANT ALL ON kv_store_824f083c TO service_role;
GRANT SELECT ON kv_store_824f083c TO anon;

-- Add comment
COMMENT ON TABLE kv_store_824f083c IS 'Key-value store for Figma Make application data';
