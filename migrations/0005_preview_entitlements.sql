CREATE TABLE IF NOT EXISTS preview_entitlements (
  id TEXT PRIMARY KEY,
  browser_id TEXT NOT NULL,
  ip_hash TEXT,
  ua_hash TEXT,
  preview_count INTEGER NOT NULL DEFAULT 0,
  last_preview_at TEXT,
  window_starts_at TEXT NOT NULL,
  blocked_until TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_preview_entitlements_browser_id
  ON preview_entitlements(browser_id);

CREATE INDEX IF NOT EXISTS idx_preview_entitlements_window_starts_at
  ON preview_entitlements(window_starts_at);

CREATE TABLE IF NOT EXISTS browser_sessions (
  browser_id TEXT PRIMARY KEY,
  active_order_id TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS preview_attempts (
  id TEXT PRIMARY KEY,
  browser_id TEXT NOT NULL,
  order_id TEXT,
  ip_hash TEXT,
  ua_hash TEXT,
  allowed INTEGER NOT NULL DEFAULT 0,
  denial_reason TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_preview_attempts_browser_id
  ON preview_attempts(browser_id);

CREATE INDEX IF NOT EXISTS idx_preview_attempts_created_at
  ON preview_attempts(created_at);
