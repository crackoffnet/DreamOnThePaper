# Dream On The Paper

A premium AI wallpaper generator for personalized phone, desktop, and tablet vision-board wallpapers.

## Stack

- Next.js App Router
- Tailwind CSS
- OpenNext Cloudflare adapter
- Cloudflare Workers + Wrangler
- OpenAI image generation through a server-only route
- Stripe Checkout
- Resend email delivery

## Local Setup

```bash
npm install
npm run dev
```

Open the local URL printed by Next.js.

## Environment

Copy `.env.example` to `.env.local`.

```bash
OPENAI_API_KEY=
STRIPE_SECRET_KEY=
STRIPE_SINGLE_PRICE_ID=
STRIPE_BUNDLE_PRICE_ID=
STRIPE_PREMIUM_PRICE_ID=
CHECKOUT_RATE_LIMIT_BYPASS_TOKEN=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_SITE_URL=https://www.dreamonthepaper.com
ORDER_TOKEN_SECRET=
RESEND_API_KEY=
FROM_EMAIL=hello@dreamonthepaper.com
TURNSTILE_SECRET_KEY=
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
NODE_VERSION=22
```

`OPENAI_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, `ORDER_TOKEN_SECRET`, and `TURNSTILE_SECRET_KEY` must never be exposed to the frontend.

## Preview-First Payment Flow

1. User completes `/create`.
2. `/api/generate-preview` creates a low-quality, watermarked preview without payment.
3. The app returns a safe signed checkout `orderToken` plus a temporary
   browser-session snapshot used for final generation.
4. `/checkout?orderToken=...` verifies the token server-side and shows the
   low-quality preview and package options without relying on Worker memory.
5. `/api/create-checkout-session` creates a Stripe Checkout Session server-side.
6. Stripe redirects to `/success?session_id=...`.
7. `/api/verify-payment` retrieves the Stripe session server-side, checks the original order metadata, and returns a short-lived signed order token.
8. `/success` uses that token to call `/api/generate-final`.
9. `/thank-you` shows the high-resolution wallpaper with download, share, and email actions.

If Stripe is not configured, mock checkout is allowed only in development.

Final generation never trusts a client-side `paid` flag or new generation parameters after payment. It requires a server-verified Stripe session and signed order token tied to the original preview/order.

Cloudflare Workers are stateless, so checkout restoration uses the signed
`orderToken` first and session storage only as a browser fallback. Temporary
order/image storage still has TODOs for Cloudflare D1/KV and R2.

## Stripe Setup

In Stripe Dashboard:

- Enable Checkout.
- Add your domain.
- Add a webhook endpoint:
  - URL: `https://www.dreamonthepaper.com/api/stripe-webhook`
  - Events: `checkout.session.completed`, `payment_intent.payment_failed`
- Copy the webhook signing secret to `STRIPE_WEBHOOK_SECRET`.

Checkout uses Stripe Price IDs from Cloudflare variables:

- `STRIPE_SINGLE_PRICE_ID` for Single wallpaper: `$4.99`
- `STRIPE_BUNDLE_PRICE_ID` for Mobile + desktop bundle: `$6.99`
- `STRIPE_PREMIUM_PRICE_ID` for Premium 3-version pack: `$11.99`

Each value must start with `price_`, not `prod_`.

Stripe Tax is enabled in hosted Checkout with `automatic_tax`. To collect tax,
confirm these Stripe Dashboard settings:

1. Stripe Tax is enabled.
2. Your business address is confirmed.
3. A product tax code is selected for digital goods, or Stripe's default
   product tax code is set for the account.
4. A tax registration is added, for example California.
5. Checkout Sessions are created with `automatic_tax.enabled = true`.

The app does not manually calculate tax, collect tax in the frontend, or use
hardcoded tax rates.

Use `STRIPE_SECRET_KEY`, not `STRIPE_KEY`, in Cloudflare. Use `sk_test_...`
while Stripe is in test mode. Use `sk_live_...` only after the Stripe account is
activated, and do not mix test keys with live-mode webhooks or products.

## Resend Setup

In Resend:

- Verify `dreamonthepaper.com` or your sending domain.
- Create an API key and set `RESEND_API_KEY`.
- Set `FROM_EMAIL=hello@dreamonthepaper.com` or another verified sender.

Email sends the generated wallpaper as an attachment when available. Persistent download links should be added later with Cloudflare R2.

## Cloudflare Environment Variables

Set these in your Cloudflare Workers production build/deploy environment:

```bash
NODE_VERSION=22
OPENAI_API_KEY=
STRIPE_SECRET_KEY=
STRIPE_SINGLE_PRICE_ID=
STRIPE_BUNDLE_PRICE_ID=
STRIPE_PREMIUM_PRICE_ID=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_SITE_URL=https://www.dreamonthepaper.com
ORDER_TOKEN_SECRET=
RESEND_API_KEY=
FROM_EMAIL=hello@dreamonthepaper.com
TURNSTILE_SECRET_KEY=
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
```

Production checkout requires `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_SITE_URL`,
`ORDER_TOKEN_SECRET`, `STRIPE_SINGLE_PRICE_ID`, `STRIPE_BUNDLE_PRICE_ID`, and
`STRIPE_PREMIUM_PRICE_ID`. Add `STRIPE_WEBHOOK_SECRET` when webhooks are enabled.
`CHECKOUT_RATE_LIMIT_BYPASS_TOKEN` is optional for manual testing only; never
send it from customer-facing browser code.

Checkout creation is limited to 20 attempts per IP/hour. Preview generation
stays stricter at 3 per IP/day plus one browser-session preview. Rate-limit KV
keys are bucketed for easier testing cleanup:

- Checkout: `checkout:{ip}:{YYYY-MM-DDTHH}`
- Preview: `preview:{ip}:{YYYY-MM-DD}`

During testing, use the Cloudflare KV dashboard for `DREAM_RATE_LIMITS` to
delete the current checkout key for your IP/hour bucket if you need to unblock
manual retries.

The free preview limit uses one browser-session token plus an IP/day limit. The paid final generation token is signed server-side and tied to the Stripe Session metadata for one generated final image.

## Cloudflare Storage Helpers

Production helper modules are available for Cloudflare bindings:

- `lib/cloudflare.ts` reads OpenNext Cloudflare bindings: `DB`,
  `DREAM_RATE_LIMITS`, and `WALLPAPER_BUCKET`.
- `lib/orders.ts` stores order state in D1 and uses an atomic
  `paid -> final_generating` update so one paid order can start final
  generation only once.
- `lib/storage.ts` stores image bytes in R2. Preview keys use
  `previews/{orderId}.webp`; final keys use `finals/{orderId}.png`.
- `lib/rateLimit.ts` stores rate-limit counters and generation locks in KV.

## Cloudflare Deploy Settings

- Build command: `npm run build`
- Deploy command: `npm run deploy`
- Non-production deploy command: `npm run upload`
- Root directory: `/` or blank/repo root

## Commands

```bash
npm run generate:examples
npm run build
npm run preview
npm run deploy
```

## Static Example Wallpapers

Homepage examples are static files served from `public/examples`. They are not generated on page visit and do not call OpenAI during rendering.

Run this manually only when you want to regenerate the curated example assets:

```bash
OPENAI_API_KEY=... npm run generate:examples
```

The script writes:

- `public/examples/soft-luxury.jpg`
- `public/examples/wealth-business.jpg`
- `public/examples/nature-reset.jpg`
- `public/examples/fitness-health.jpg`
- `public/examples/family-home.jpg`
- `public/examples/freedom-travel.jpg`

## Future R2 Storage Step

Current delivery uses temporary Worker memory for generated image bytes and browser session storage only for small IDs/URLs/tokens. For durable production delivery, add Cloudflare R2 plus D1/KV:

- Binding name: `WALLPAPER_BUCKET`
- Store generated PNGs without personal prompt answers.
- Email signed expiring download URLs.
- Add a Worker route that validates short-lived download tokens.
- Store order state in D1 and distributed rate limits in KV.

## Routes

- `/` landing page
- `/create` guided wallpaper wizard
- `/preview` low-quality preview and unlock page
- `/checkout` package selection and Stripe Checkout
- `/success` payment verification and final generation
- `/thank-you` result, download, share, and email delivery
- `/api/create-checkout-session`
- `/api/verify-checkout-session`
- `/api/verify-payment`
- `/api/generate-preview`
- `/api/generate-final`
- `/api/generate-wallpaper`
- `/api/send-wallpaper-email`
- `/api/stripe-webhook`

The project uses OpenNext for Workers. Do not enable static export, `next-on-pages`, or `output: "export"`.
