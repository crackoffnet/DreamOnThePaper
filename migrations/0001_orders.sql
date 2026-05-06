CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,

  status TEXT NOT NULL,
  package_type TEXT,
  device TEXT NOT NULL,
  ratio TEXT NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  theme TEXT NOT NULL,
  style TEXT NOT NULL,
  quote_tone TEXT NOT NULL,

  prompt_hash TEXT NOT NULL,
  sanitized_answers_json TEXT NOT NULL,

  preview_r2_key TEXT,
  final_r2_key TEXT,

  stripe_session_id TEXT UNIQUE,
  stripe_payment_status TEXT,

  preview_generated_at INTEGER,
  paid_at INTEGER,
  final_generation_started_at INTEGER,
  final_generated_at INTEGER,

  final_generation_attempts INTEGER NOT NULL DEFAULT 0,

  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  expires_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_stripe_session_id ON orders(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);

CREATE TABLE IF NOT EXISTS generation_events (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL,
  message TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY(order_id) REFERENCES orders(id)
);