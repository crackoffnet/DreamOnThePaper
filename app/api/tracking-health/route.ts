import { NextResponse } from "next/server";
import { getOptionalCloudflareBindings } from "@/lib/cloudflare";

const trackingTables = [
  "customers",
  "orders",
  "order_events",
  "final_assets",
  "email_events",
  "download_events",
] as const;

export async function GET() {
  const bindings = getOptionalCloudflareBindings();
  const tablePresence = bindings.DB
    ? await readTablePresence(bindings.DB)
    : Object.fromEntries(trackingTables.map((table) => [table, false]));

  return NextResponse.json(
    {
      ok: Boolean(bindings.DB && trackingTables.every((table) => tablePresence[table])),
      tracking: {
        hasDb: Boolean(bindings.DB),
        hasCustomersTable: Boolean(tablePresence.customers),
        hasOrdersTable: Boolean(tablePresence.orders),
        hasOrderEventsTable: Boolean(tablePresence.order_events),
        hasFinalAssetsTable: Boolean(tablePresence.final_assets),
        hasEmailEventsTable: Boolean(tablePresence.email_events),
        hasDownloadEventsTable: Boolean(tablePresence.download_events),
      },
    },
    {
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}

async function readTablePresence(db: D1Database) {
  const statement = db
    .prepare(
      `SELECT name FROM sqlite_master
       WHERE type = 'table'
         AND name IN (?, ?, ?, ?, ?, ?)`,
    )
    .bind(...trackingTables);
  const results = await (
    statement as unknown as { all<T>(): Promise<{ results?: T[] }> }
  ).all<{ name: string }>();
  const names = new Set((results.results || []).map((row) => row.name));

  return Object.fromEntries(
    trackingTables.map((table) => [table, names.has(table)]),
  ) as Record<(typeof trackingTables)[number], boolean>;
}
