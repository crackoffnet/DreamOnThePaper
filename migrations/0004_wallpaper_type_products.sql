ALTER TABLE orders ADD COLUMN wallpaper_type TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_wallpaper_type
  ON orders(wallpaper_type);
