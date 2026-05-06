import { getCloudflareContext } from "@opennextjs/cloudflare";

export type RuntimeEnv = {
  OPENAI_API_KEY?: string;
  ORDER_TOKEN_SECRET?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_SINGLE_PRICE_ID?: string;
  STRIPE_BUNDLE_PRICE_ID?: string;
  STRIPE_PREMIUM_PRICE_ID?: string;
  NEXT_PUBLIC_SITE_URL?: string;
  CHECKOUT_RATE_LIMIT_BYPASS_TOKEN?: string;
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
] as const satisfies readonly (keyof RuntimeEnv)[];

export function getRuntimeEnv(): RuntimeEnv {
  const cloudflareEnv = getCloudflareEnv();

  return runtimeEnvNames.reduce<RuntimeEnv>((env, name) => {
    env[name] = process.env[name] ?? stringFromCloudflareEnv(cloudflareEnv, name);
    return env;
  }, {});
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
