type D1Value = string | number | boolean | null | ArrayBuffer | Uint8Array;

interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
}

interface D1PreparedStatement {
  bind(...values: D1Value[]): D1PreparedStatement;
  first<T = unknown>(): Promise<T | null>;
  run<T = unknown>(): Promise<D1Result<T>>;
}

interface D1Result<T = unknown> {
  results?: T[];
  success: boolean;
  error?: string;
  meta: {
    changes?: number;
    [key: string]: unknown;
  };
}

interface KVNamespace {
  get(key: string): Promise<string | null>;
  get<T = unknown>(key: string, type: "json"): Promise<T | null>;
  put(
    key: string,
    value: string | ArrayBuffer | ArrayBufferView | ReadableStream,
    options?: { expirationTtl?: number; metadata?: unknown },
  ): Promise<void>;
  delete(key: string): Promise<void>;
}

interface R2Bucket {
  put(
    key: string,
    value: ReadableStream | ArrayBuffer | ArrayBufferView | string | null,
    options?: R2PutOptions,
  ): Promise<R2Object>;
  get(key: string): Promise<R2ObjectBody | null>;
  head(key: string): Promise<R2Object | null>;
  delete(key: string): Promise<void>;
}

interface R2PutOptions {
  httpMetadata?: R2HTTPMetadata;
  customMetadata?: Record<string, string>;
}

interface R2HTTPMetadata {
  contentType?: string;
  cacheControl?: string;
}

interface R2Object {
  key: string;
  version: string;
  size: number;
  etag: string;
  httpEtag: string;
  uploaded: Date;
  httpMetadata?: R2HTTPMetadata;
  customMetadata?: Record<string, string>;
  writeHttpMetadata(headers: Headers): void;
}

interface R2ObjectBody extends R2Object {
  body: ReadableStream;
  arrayBuffer(): Promise<ArrayBuffer>;
}

interface CloudflareEnv {
  DB?: D1Database;
  DREAM_RATE_LIMITS?: KVNamespace;
  WALLPAPER_BUCKET?: R2Bucket;
  OPENAI_API_KEY?: string;
  ORDER_TOKEN_SECRET?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_SINGLE_PRICE_ID?: string;
  STRIPE_BUNDLE_PRICE_ID?: string;
  STRIPE_PREMIUM_PRICE_ID?: string;
  NEXT_PUBLIC_SITE_URL?: string;
  CHECKOUT_RATE_LIMIT_BYPASS_TOKEN?: string;
  PREVIEW_RATE_LIMIT_BYPASS_TOKEN?: string;
  IP_HASH_SECRET?: string;
  ADMIN_DASHBOARD_TOKEN?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  BREVO_API_KEY?: string;
  FROM_EMAIL?: string;
  FROM_NAME?: string;
}
