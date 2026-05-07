CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  email_normalized TEXT NOT NULL,
  stripe_customer_id TEXT,
  first_order_id TEXT,
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  total_orders INTEGER NOT NULL DEFAULT 0,
  total_paid_cents INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_customers_email_normalized
  ON customers(email_normalized);
CREATE INDEX IF NOT EXISTS idx_customers_stripe_customer_id
  ON customers(stripe_customer_id);

ALTER TABLE orders ADD COLUMN customer_id TEXT;
ALTER TABLE orders ADD COLUMN order_token_hash TEXT;
ALTER TABLE orders ADD COLUMN package_name TEXT;
ALTER TABLE orders ADD COLUMN amount_cents INTEGER;
ALTER TABLE orders ADD COLUMN currency TEXT DEFAULT 'usd';
ALTER TABLE orders ADD COLUMN stripe_checkout_session_id TEXT;
ALTER TABLE orders ADD COLUMN stripe_payment_intent_id TEXT;
ALTER TABLE orders ADD COLUMN stripe_customer_id TEXT;
ALTER TABLE orders ADD COLUMN stripe_mode TEXT;
ALTER TABLE orders ADD COLUMN customer_email TEXT;
ALTER TABLE orders ADD COLUMN customer_email_normalized TEXT;
ALTER TABLE orders ADD COLUMN client_ip TEXT;
ALTER TABLE orders ADD COLUMN client_ip_hash TEXT;
ALTER TABLE orders ADD COLUMN country TEXT;
ALTER TABLE orders ADD COLUMN user_agent TEXT;
ALTER TABLE orders ADD COLUMN referer TEXT;
ALTER TABLE orders ADD COLUMN utm_source TEXT;
ALTER TABLE orders ADD COLUMN utm_medium TEXT;
ALTER TABLE orders ADD COLUMN utm_campaign TEXT;
ALTER TABLE orders ADD COLUMN landing_path TEXT;
ALTER TABLE orders ADD COLUMN custom_width INTEGER;
ALTER TABLE orders ADD COLUMN custom_height INTEGER;
ALTER TABLE orders ADD COLUMN mood TEXT;
ALTER TABLE orders ADD COLUMN answers_hash TEXT;
ALTER TABLE orders ADD COLUMN preview_created_at TEXT;
ALTER TABLE orders ADD COLUMN final_failed_at TEXT;
ALTER TABLE orders ADD COLUMN final_failure_reason TEXT;
ALTER TABLE orders ADD COLUMN email_send_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN last_email_sent_at TEXT;
ALTER TABLE orders ADD COLUMN download_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN first_downloaded_at TEXT;
ALTER TABLE orders ADD COLUMN last_downloaded_at TEXT;
ALTER TABLE orders ADD COLUMN abandoned_at TEXT;
ALTER TABLE orders ADD COLUMN expired_at TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_package_type ON orders(package_type);
CREATE INDEX IF NOT EXISTS idx_orders_stripe_checkout_session_id
  ON orders(stripe_checkout_session_id);
CREATE INDEX IF NOT EXISTS idx_orders_stripe_payment_intent_id
  ON orders(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_email_normalized
  ON orders(customer_email_normalized);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_paid_at ON orders(paid_at);
CREATE INDEX IF NOT EXISTS idx_orders_client_ip_hash ON orders(client_ip_hash);

ALTER TABLE final_assets ADD COLUMN file_size_bytes INTEGER;
ALTER TABLE final_assets ADD COLUMN generation_status TEXT NOT NULL DEFAULT 'generated';
ALTER TABLE final_assets ADD COLUMN generation_attempt INTEGER DEFAULT 1;
ALTER TABLE final_assets ADD COLUMN openai_image_id TEXT;
ALTER TABLE final_assets ADD COLUMN prompt_hash TEXT;
ALTER TABLE final_assets ADD COLUMN updated_at INTEGER;

CREATE INDEX IF NOT EXISTS idx_final_assets_asset_type ON final_assets(asset_type);
CREATE INDEX IF NOT EXISTS idx_final_assets_generation_status
  ON final_assets(generation_status);

CREATE TABLE IF NOT EXISTS order_events (
  id TEXT PRIMARY KEY,
  order_id TEXT,
  customer_id TEXT,
  event_type TEXT NOT NULL,
  status_before TEXT,
  status_after TEXT,
  package_type TEXT,
  ip_hash TEXT,
  country TEXT,
  user_agent TEXT,
  metadata_json TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_order_events_order_id ON order_events(order_id);
CREATE INDEX IF NOT EXISTS idx_order_events_customer_id ON order_events(customer_id);
CREATE INDEX IF NOT EXISTS idx_order_events_event_type ON order_events(event_type);
CREATE INDEX IF NOT EXISTS idx_order_events_created_at ON order_events(created_at);
CREATE INDEX IF NOT EXISTS idx_order_events_ip_hash ON order_events(ip_hash);

CREATE TABLE IF NOT EXISTS email_events (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  customer_id TEXT,
  recipient_email TEXT,
  recipient_email_normalized TEXT,
  provider TEXT DEFAULT 'brevo',
  provider_message_id TEXT,
  status TEXT NOT NULL,
  failure_reason TEXT,
  attachment_count INTEGER,
  total_attachment_bytes INTEGER,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_email_events_order_id ON email_events(order_id);
CREATE INDEX IF NOT EXISTS idx_email_events_recipient_email_normalized
  ON email_events(recipient_email_normalized);
CREATE INDEX IF NOT EXISTS idx_email_events_status ON email_events(status);
CREATE INDEX IF NOT EXISTS idx_email_events_created_at ON email_events(created_at);

CREATE TABLE IF NOT EXISTS download_events (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  customer_id TEXT,
  asset_id TEXT,
  asset_type TEXT,
  ip_hash TEXT,
  country TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_download_events_order_id
  ON download_events(order_id);
CREATE INDEX IF NOT EXISTS idx_download_events_customer_id
  ON download_events(customer_id);
CREATE INDEX IF NOT EXISTS idx_download_events_asset_id
  ON download_events(asset_id);
CREATE INDEX IF NOT EXISTS idx_download_events_created_at
  ON download_events(created_at);
