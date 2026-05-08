type TableColumnsCache = Map<string, Promise<Set<string>>>;

const tableColumnsCache = new WeakMap<D1Database, TableColumnsCache>();

export async function getTableColumns(db: D1Database, tableName: string) {
  const cache = getOrCreateCache(db);
  const cached = cache.get(tableName);
  if (cached) {
    return cached;
  }

  const promise = loadTableColumns(db, tableName);
  cache.set(tableName, promise);
  return promise;
}

export async function tableHasColumn(
  db: D1Database,
  tableName: string,
  columnName: string,
) {
  const columns = await getTableColumns(db, tableName);
  return columns.has(columnName);
}

export async function getOrdersColumns(db: D1Database) {
  return getTableColumns(db, "orders");
}

export async function ordersHasColumn(db: D1Database, columnName: string) {
  return tableHasColumn(db, "orders", columnName);
}

export async function hasTable(db: D1Database, tableName: string) {
  try {
    const result = await db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
      .bind(tableName)
      .first<{ name?: string }>();
    return result?.name === tableName;
  } catch {
    return false;
  }
}

export async function getOrdersSchemaSupport(db: D1Database) {
  const columns = await getOrdersColumns(db);
  return {
    hasPresetId: columns.has("preset_id"),
    hasRatioLabel: columns.has("ratio_label"),
    hasSourceWidth: columns.has("source_width"),
    hasSourceHeight: columns.has("source_height"),
    hasFinalWidth: columns.has("final_width"),
    hasFinalHeight: columns.has("final_height"),
    hasOutputFormat: columns.has("output_format"),
    hasGenerationStatus: columns.has("generation_status"),
    hasFinalAssetKey: columns.has("final_asset_key"),
    hasPreviewAssetKey: columns.has("preview_asset_key"),
    hasPreviewInputHash: columns.has("preview_input_hash"),
    hasPreviewStale: columns.has("preview_stale"),
  };
}

export async function getFinalAssetsSchemaSupport(db: D1Database) {
  const exists = await hasTable(db, "final_assets");
  const columns = exists ? await getTableColumns(db, "final_assets") : new Set<string>();

  return {
    exists,
    hasR2Key: columns.has("r2_key"),
    hasGenerationStatus: columns.has("generation_status"),
    hasFileSizeBytes: columns.has("file_size_bytes"),
    hasGenerationAttempt: columns.has("generation_attempt"),
    hasPromptHash: columns.has("prompt_hash"),
    hasUpdatedAt: columns.has("updated_at"),
    hasSourceWidth: columns.has("source_width"),
    hasSourceHeight: columns.has("source_height"),
    hasFinalWidth: columns.has("final_width"),
    hasFinalHeight: columns.has("final_height"),
  };
}

function getOrCreateCache(db: D1Database) {
  const cached = tableColumnsCache.get(db);
  if (cached) {
    return cached;
  }

  const nextCache: TableColumnsCache = new Map();
  tableColumnsCache.set(db, nextCache);
  return nextCache;
}

async function loadTableColumns(db: D1Database, tableName: string) {
  try {
    const result = await (
      db.prepare(`PRAGMA table_info(${escapeIdentifier(tableName)})`) as unknown as {
        all<T>(): Promise<{ results?: T[] }>;
      }
    ).all<{ name?: string }>();

    return new Set(
      (result.results || [])
        .map((row) => row.name || "")
        .filter(Boolean),
    );
  } catch {
    return new Set<string>();
  }
}

function escapeIdentifier(value: string) {
  return value.replace(/[^A-Za-z0-9_]/g, "");
}
