const ordersColumnsCache = new WeakMap<D1Database, Promise<Set<string>>>();

export async function getOrdersColumns(db: D1Database) {
  const cached = ordersColumnsCache.get(db);
  if (cached) {
    return cached;
  }

  const promise = loadOrdersColumns(db);
  ordersColumnsCache.set(db, promise);
  return promise;
}

export async function ordersHasColumn(db: D1Database, columnName: string) {
  const columns = await getOrdersColumns(db);
  return columns.has(columnName);
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

async function loadOrdersColumns(db: D1Database) {
  try {
    const result = await (
      db.prepare("PRAGMA table_info(orders)") as unknown as {
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
