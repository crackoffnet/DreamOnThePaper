import { NextResponse } from "next/server";
import { getDb } from "@/lib/cloudflare";
import { getRuntimeEnv } from "@/lib/env";
import { timingSafeStringEqual } from "@/lib/security";
import { isPackageId } from "@/lib/packages";

type AdminOrderRow = {
  id: string;
  created_at: number | string;
  paid_at: number | string | null;
  status: string;
  package_type: string | null;
  amount_cents: number | null;
  currency: string | null;
  customer_email: string | null;
  country: string | null;
  client_ip_hash: string | null;
  stripe_payment_status: string | null;
  email_send_count: number | null;
  download_count: number | null;
  final_asset_count: number;
};

export async function GET(request: Request) {
  const env = getRuntimeEnv();
  const configuredToken = env.ADMIN_DASHBOARD_TOKEN;
  const providedToken = bearerToken(request.headers.get("Authorization"));

  if (
    !configuredToken ||
    !providedToken ||
    !timingSafeStringEqual(configuredToken, providedToken)
  ) {
    return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
  }

  const url = new URL(request.url);
  const status = sanitizeFilter(url.searchParams.get("status"));
  const packageTypeParam = url.searchParams.get("packageType");
  const packageType = isPackageId(packageTypeParam) ? packageTypeParam : "";
  const limit = Math.min(
    Math.max(Number.parseInt(url.searchParams.get("limit") || "25", 10) || 25, 1),
    100,
  );
  const offset = Math.max(
    Number.parseInt(url.searchParams.get("offset") || "0", 10) || 0,
    0,
  );
  const filters: string[] = [];
  const values: D1Value[] = [];

  if (status) {
    filters.push("o.status = ?");
    values.push(status);
  }

  if (packageType) {
    filters.push("o.package_type = ?");
    values.push(packageType);
  }

  values.push(limit, offset);
  const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
  const statement = getDb()
    .prepare(
      `SELECT
        o.id, o.created_at, o.paid_at, o.status, o.package_type,
        o.amount_cents, o.currency, o.customer_email, o.country,
        o.client_ip_hash, o.stripe_payment_status, o.email_send_count,
        o.download_count,
        COUNT(fa.id) AS final_asset_count
       FROM orders o
       LEFT JOIN final_assets fa ON fa.order_id = o.id
       ${where}
       GROUP BY o.id
       ORDER BY o.created_at DESC
       LIMIT ? OFFSET ?`,
    )
    .bind(...values);
  const rows = await (
    statement as unknown as { all<T>(): Promise<{ results?: T[] }> }
  ).all<AdminOrderRow>();

  return NextResponse.json(
    {
      success: true,
      orders: (rows.results || []).map((row) => ({
        orderIdShort: row.id.slice(0, 8),
        createdAt: row.created_at,
        paidAt: row.paid_at,
        status: row.status,
        packageType: row.package_type,
        amountCents: row.amount_cents,
        currency: row.currency || "usd",
        customerEmail: row.customer_email,
        country: row.country,
        clientIpHash: row.client_ip_hash,
        stripePaymentStatus: row.stripe_payment_status,
        finalAssetCount: row.final_asset_count,
        emailSendCount: row.email_send_count || 0,
        downloadCount: row.download_count || 0,
      })),
      limit,
      offset,
    },
    {
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}

function bearerToken(value: string | null) {
  const match = value?.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || "";
}

function sanitizeFilter(value: string | null) {
  return value?.replace(/[^a-z_]/g, "").slice(0, 40) || "";
}
