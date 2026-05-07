import { getCloudflareContext } from "@opennextjs/cloudflare";

export const DEFAULT_FROM_NAME = "Dream On The Paper";

export type RuntimeEnv = {
  OPENAI_API_KEY?: string;
  ORDER_TOKEN_SECRET?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_SINGLE_PRICE_ID?: string;
  STRIPE_BUNDLE_PRICE_ID?: string;
  STRIPE_PREMIUM_PRICE_ID?: string;
  NEXT_PUBLIC_SITE_URL?: string;
  CHECKOUT_RATE_LIMIT_BYPASS_TOKEN?: string;
  PREVIEW_RATE_LIMIT_BYPASS_TOKEN?: string;
  BREVO_API_KEY?: string;
  FROM_EMAIL?: string;
  FROM_NAME?: string;
};

const runtimeEnvNames = [
  "OPENAI_API_KEY",
  "ORDER_TOKEN_SECRET",
  "STRIPE_SECRET_KEY",
  "STRIPE_SINGLE_PRICE_ID",
  "STRIPE_BUNDLE_PRICE_ID",
  "STRIPE_PREMIUM_PRICE_ID",
  "NEXT_PUBLIC_SITE_URL",
  "CHECKOUT_RATE_LIMIT_BYPASS_TOKEN",
  "PREVIEW_RATE_LIMIT_BYPASS_TOKEN",
  "BREVO_API_KEY",
  "FROM_EMAIL",
  "FROM_NAME",
] as const satisfies readonly (keyof RuntimeEnv)[];

export function getRuntimeEnv(): RuntimeEnv {
  const cloudflareEnv = getCloudflareEnv();

  return runtimeEnvNames.reduce<RuntimeEnv>((env, name) => {
    env[name] = runtimeEnvValue(cloudflareEnv, name);
    return env;
  }, {});
}

export function isFromNameUsingFallback() {
  const cloudflareEnv = getCloudflareEnv();
  return !(
    process.env.FROM_NAME || stringFromCloudflareEnv(cloudflareEnv, "FROM_NAME")
  );
}

export function getRuntimeEnvPresence() {
  const env = getRuntimeEnv();

  return {
    hasOpenAiKey: Boolean(env.OPENAI_API_KEY),
    hasOrderTokenSecret: Boolean(env.ORDER_TOKEN_SECRET),
    hasStripeSecretKey: Boolean(env.STRIPE_SECRET_KEY),
    hasSinglePriceId: Boolean(env.STRIPE_SINGLE_PRICE_ID),
    hasBundlePriceId: Boolean(env.STRIPE_BUNDLE_PRICE_ID),
    hasPremiumPriceId: Boolean(env.STRIPE_PREMIUM_PRICE_ID),
    hasSiteUrl: Boolean(env.NEXT_PUBLIC_SITE_URL),
    hasBrevoApiKey: Boolean(env.BREVO_API_KEY),
    hasFromEmail: Boolean(env.FROM_EMAIL),
    hasFromName: Boolean(env.FROM_NAME),
  };
}

function getCloudflareEnv() {
  try {
    return getCloudflareContext().env as CloudflareEnv & Record<string, unknown>;
  } catch {
    return null;
  }
}

function stringFromCloudflareEnv(
  env: (CloudflareEnv & Record<string, unknown>) | null,
  name: keyof RuntimeEnv,
) {
  const value = env?.[name];
  return typeof value === "string" ? value : undefined;
}

function runtimeEnvValue(
  cloudflareEnv: (CloudflareEnv & Record<string, unknown>) | null,
  name: keyof RuntimeEnv,
) {
  if (name === "FROM_NAME") {
    return (
      process.env.FROM_NAME ||
      stringFromCloudflareEnv(cloudflareEnv, "FROM_NAME") ||
      DEFAULT_FROM_NAME
    );
  }

  return process.env[name] ?? stringFromCloudflareEnv(cloudflareEnv, name);
}
