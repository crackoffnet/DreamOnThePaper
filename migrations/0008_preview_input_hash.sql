ALTER TABLE orders ADD COLUMN preview_input_hash TEXT;
ALTER TABLE orders ADD COLUMN preview_stale INTEGER DEFAULT 0;
