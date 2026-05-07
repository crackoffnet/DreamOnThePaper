CREATE TABLE IF NOT EXISTS final_assets (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  asset_type TEXT NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  r2_key TEXT NOT NULL,
  format TEXT NOT NULL DEFAULT 'png',
  created_at INTEGER NOT NULL,
  FOREIGN KEY(order_id) REFERENCES orders(id)
);

CREATE INDEX IF NOT EXISTS idx_final_assets_order_id ON final_assets(order_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_final_assets_order_asset_type
  ON final_assets(order_id, asset_type);
