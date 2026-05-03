-- Add multiple logo fields to companies table
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS logo_primary text,
ADD COLUMN IF NOT EXISTS logo_secondary text,
ADD COLUMN IF NOT EXISTS logo_icon text,
ADD COLUMN IF NOT EXISTS logo_square text,
ADD COLUMN IF NOT EXISTS logo_horizontal text,
ADD COLUMN IF NOT EXISTS logo_vertical text,
ADD COLUMN IF NOT EXISTS logo_white text,
ADD COLUMN IF NOT EXISTS logo_black text;

-- Update existing logo_url data to logo_primary
UPDATE companies
SET logo_primary = logo_url
WHERE logo_url IS NOT NULL AND logo_url != '' AND logo_primary IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN companies.logo_primary IS 'Main logo used across the platform';
COMMENT ON COLUMN companies.logo_secondary IS 'Alternative logo for different contexts';
COMMENT ON COLUMN companies.logo_icon IS 'Small icon for browser tabs and mobile apps (512x512px recommended)';
COMMENT ON COLUMN companies.logo_square IS 'Square format for social media profiles';
COMMENT ON COLUMN companies.logo_horizontal IS 'Wide format for headers and banners';
COMMENT ON COLUMN companies.logo_vertical IS 'Tall format for sidebars and narrow spaces';
COMMENT ON COLUMN companies.logo_white IS 'Logo for dark backgrounds';
COMMENT ON COLUMN companies.logo_black IS 'Logo for light backgrounds';
