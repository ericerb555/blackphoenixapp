-- ============================================================
-- Black Phoenix App — Marketplace Migration
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- 1. Marketplace Products
-- Stores all digital products (ebooks, templates, calculators, etc.)
CREATE TABLE IF NOT EXISTS marketplace_products (
  id               TEXT PRIMARY KEY,
  category         TEXT NOT NULL CHECK (category IN ('ebook','template','calculator','ai_report','maintenance','bundle')),
  title            TEXT NOT NULL,
  subtitle         TEXT,
  description      TEXT,
  features         JSONB DEFAULT '[]',
  price            INTEGER NOT NULL,           -- cents
  original_price   INTEGER,                    -- cents (for sale items)
  pricing_model    TEXT DEFAULT 'one_time',
  audience         JSONB DEFAULT '[]',
  rating           NUMERIC(3,1) DEFAULT 4.8,
  reviews          INTEGER DEFAULT 0,
  color            TEXT DEFAULT 'text-orange-400',
  badge            TEXT,
  nh_relevant      BOOLEAN DEFAULT TRUE,
  popular          BOOLEAN DEFAULT FALSE,
  preview          TEXT,
  file_types       JSONB DEFAULT '[]',
  pages            INTEGER,
  delivery_method  TEXT DEFAULT 'download',
  visible          BOOLEAN DEFAULT TRUE,
  sort_order       INTEGER DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Marketplace Orders
-- Records every Stripe checkout; updated when webhook fires.
CREATE TABLE IF NOT EXISTS marketplace_orders (
  id                TEXT PRIMARY KEY,
  stripe_session_id TEXT UNIQUE,
  customer_email    TEXT NOT NULL,
  customer_name     TEXT,
  items             JSONB DEFAULT '[]',        -- array of { id, title, price, quantity }
  total             INTEGER NOT NULL,          -- cents
  status            TEXT DEFAULT 'pending' CHECK (status IN ('pending','paid','refunded')),
  download_sent     BOOLEAN DEFAULT FALSE,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  fulfilled_at      TIMESTAMPTZ
);

-- 3. Enable Row Level Security (RLS) — Edge Function uses service key, so it bypasses.
--    These policies let anonymous users read visible products, but nothing else.
ALTER TABLE marketplace_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_orders   ENABLE ROW LEVEL SECURITY;

-- Public can read visible products
CREATE POLICY "public_read_products" ON marketplace_products
  FOR SELECT USING (visible = TRUE);

-- Only service role (Edge Function) can write products / orders
CREATE POLICY "service_write_products" ON marketplace_products
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "service_all_orders" ON marketplace_orders
  FOR ALL USING (auth.role() = 'service_role');

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_mkt_products_visible   ON marketplace_products (visible, sort_order);
CREATE INDEX IF NOT EXISTS idx_mkt_orders_session     ON marketplace_orders (stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_mkt_orders_email       ON marketplace_orders (customer_email);
CREATE INDEX IF NOT EXISTS idx_mkt_orders_status      ON marketplace_orders (status);

-- ============================================================
-- After running this:
-- 1. Go to MarketplaceAdmin → click "Push to DB" to seed products
-- 2. Set these secrets in Supabase Dashboard → Edge Functions → Secrets:
--      STRIPE_SECRET_KEY
--      STRIPE_WEBHOOK_SECRET
--      RESEND_API_KEY   (or SENDGRID_API_KEY)
--      FROM_EMAIL       (e.g. noreply@blackphoenixpm.com)
-- 3. Register Stripe webhook endpoint:
--      https://<your-project-id>.supabase.co/functions/v1/make-server-57095a78/payments/webhook
--      Events: checkout.session.completed
-- ============================================================
