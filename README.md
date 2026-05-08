# Dream On The Paper

A premium AI wallpaper generator for personalized phone, desktop, and tablet vision-board wallpapers.

## Stack

- Next.js App Router
- Tailwind CSS
- OpenNext Cloudflare adapter
- Cloudflare Workers + Wrangler
- OpenAI image generation through a server-only route
- Stripe Checkout
- Brevo transactional email delivery

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
OPENAI_PREVIEW_IMAGE_MODEL=gpt-image-1-mini
OPENAI_FINAL_IMAGE_MODEL=gpt-image-1
OPENAI_FINAL_IMAGE_QUALITY=medium
STRIPE_SECRET_KEY=
STRIPE_SINGLE_PRICE_ID=
CHECKOUT_RATE_LIMIT_BYPASS_TOKEN=
PREVIEW_RATE_LIMIT_BYPASS_TOKEN=
IP_HASH_SECRET=
ADMIN_DASHBOARD_TOKEN=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_SITE_URL=https://www.dreamonthepaper.com
ORDER_TOKEN_SECRET=
RESULT_TOKEN_SECRET=
BREVO_API_KEY=
FROM_EMAIL=hello@dreamonthepaper.com
FROM_NAME=Dream On The Paper
TURNSTILE_SECRET_KEY=
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
NODE_VERSION=22
```

`OPENAI_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `BREVO_API_KEY`, `ORDER_TOKEN_SECRET`, and `TURNSTILE_SECRET_KEY` must never be exposed to the frontend.

Image generation speed is controlled by optional server-side variables:

- `OPENAI_PREVIEW_IMAGE_MODEL` defaults to `gpt-image-1-mini`
- `OPENAI_FINAL_IMAGE_MODEL` defaults to `gpt-image-1`
- `OPENAI_FINAL_IMAGE_QUALITY` defaults to `medium`

Final generation uses launch-friendly normalized sizes (`1024x1024`,
`1024x1536`, or `1536x1024`) and stores those actual output dimensions with the
generated asset. One payment creates one final PNG for the selected mobile,
tablet, desktop, or custom wallpaper type. The success page starts generation in
the background then polls order status for progress.

## Preview-First Payment Flow

1. User completes `/create`.
2. `/api/generate-preview` creates a low-quality, watermarked preview without payment.
3. The app returns a safe signed checkout `orderToken` for restoring the
   preview/order on checkout.
4. `/checkout?orderToken=...` verifies the token server-side and shows the
   low-quality preview and the selected wallpaper type without relying on Worker memory.
5. `/api/create-checkout-session` creates a Stripe Checkout Session server-side.
6. Stripe redirects to `/success?session_id=...`.
7. `/api/verify-checkout-session` retrieves the Stripe session server-side,
   confirms payment, loads the D1 order, marks it paid, and returns a
   short-lived final generation token.
8. `/success` uses that token to call `/api/generate-final`.
9. `/thank-you` shows the high-resolution wallpaper with download, share, and email actions.

If Stripe is not configured, mock checkout is allowed only in development.

Final generation never trusts a client-side `paid` flag or new generation parameters after payment. It requires a server-verified Stripe session, D1 order state, and a signed final generation token tied to the original preview/order.

Cloudflare Workers are stateless, so checkout restoration uses the signed
`orderToken` first and session storage only as a browser fallback. Production
order state lives in D1, rate limits live in KV, and generated images live in
R2.

Browser state is versioned with `APP_STATE_VERSION` in
`lib/appStateVersion.ts`. After major state, storage, or schema changes, update
that value so stale browser tokens and drafts are cleared on `/create`,
`/checkout`, and `/success`. Deployments do not automatically clear browser
storage or D1 rows, so the app intentionally handles stale client state, expired
unpaid orders, and in-progress final generation recovery.

## Stripe Setup

In Stripe Dashboard:

- Enable Checkout.
- Add your domain.
- Add a webhook endpoint:
  - URL: `https://www.dreamonthepaper.com/api/stripe-webhook`
  - Events: `checkout.session.completed`, `payment_intent.payment_failed`
- Copy the webhook signing secret to `STRIPE_WEBHOOK_SECRET`.

Checkout uses one Stripe Price ID from Cloudflare variables:

- `STRIPE_SINGLE_PRICE_ID` for Dream On The Paper Final Wallpaper: `$4.99`

The value must start with `price_`, not `prod_`. The selected wallpaper type
(`mobile`, `tablet`, `desktop`, or `custom`) is stored in Stripe metadata and
D1 order tracking.

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

## Brevo Setup

In Brevo:

- Create a Brevo account.
- Add `dreamonthepaper.com` or your sending domain.
- Add the Brevo DNS records in Cloudflare.
- Verify the domain in Brevo.
- Create a Brevo API key and add the Cloudflare secret `BREVO_API_KEY`.
- Add `FROM_EMAIL=hello@dreamonthepaper.com`.
- Add `FROM_NAME=Dream On The Paper`.

Email sends the paid final PNG from R2 as a Brevo transactional attachment when
the file is small enough for email delivery. Until `BREVO_API_KEY`,
`FROM_EMAIL`, and `FROM_NAME` are configured, email delivery is disabled and
users should download the PNG.

For deliverability and privacy, wallpaper delivery emails are attachment-only
transactional emails. They do not include public image links, download links,
website links, tracked buttons, prompts, private answers, or order tokens.

Brevo's free plan currently includes 300 email sends/day, which is enough for
the MVP.

Generated wallpapers are private customer assets. R2 is not public. The app
does not expose permanent public final-image links; final image API requests
require the signed paid-session token. If longer-lived direct links are added
later, use signed links that expire within 24-48 hours.

## Cloudflare Environment Variables

Set these in your Cloudflare Workers production build/deploy environment:

```bash
NODE_VERSION=22
OPENAI_API_KEY=
OPENAI_PREVIEW_IMAGE_MODEL=gpt-image-1-mini
OPENAI_FINAL_IMAGE_MODEL=gpt-image-1
OPENAI_FINAL_IMAGE_QUALITY=medium
STRIPE_SECRET_KEY=
STRIPE_SINGLE_PRICE_ID=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_SITE_URL=https://www.dreamonthepaper.com
ORDER_TOKEN_SECRET=
BREVO_API_KEY=
FROM_EMAIL=hello@dreamonthepaper.com
FROM_NAME=Dream On The Paper
TURNSTILE_SECRET_KEY=
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
```

Production checkout requires `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_SITE_URL`,
`ORDER_TOKEN_SECRET`, and `STRIPE_SINGLE_PRICE_ID`. Add `STRIPE_WEBHOOK_SECRET`
when webhooks are enabled. `RESULT_TOKEN_SECRET` is optional; if omitted, paid
result-access tokens fall back to `ORDER_TOKEN_SECRET`.
`CHECKOUT_RATE_LIMIT_BYPASS_TOKEN` is optional for manual testing only; never
send it from customer-facing browser code.

Checkout creation is limited to 20 attempts per IP/hour. Preview generation
allows multiple low-resolution previews and only uses quiet abuse throttles:
10 preview requests per browser/hour and 30 preview requests per IP/hour.
Failed OpenAI/R2/D1 preview generations do not consume any product-facing quota.
Rate-limit KV keys are bucketed for easier testing cleanup:

- Checkout: `checkout:{ip}:{YYYY-MM-DDTHH}`
- Preview browser requests: `preview:browser:{browserId}:{YYYY-MM-DDTHH}`
- Preview IP requests: `preview:ip:{ip}:{YYYY-MM-DDTHH}`

During testing, use the Cloudflare KV dashboard for `DREAM_RATE_LIMITS` to
delete the current checkout key for your IP/hour bucket if you need to unblock
manual retries. You can also delete the relevant preview browser/IP keys for
your current buckets. `PREVIEW_RATE_LIMIT_BYPASS_TOKEN` is optional for
manual curl/Postman testing only and must not be sent from customer-facing
browser code.

## Customer and Order Tracking

Cloudflare D1 stores privacy-conscious order tracking for fulfillment, refunds,
fraud prevention, payment operations, and support. Tracking captures safe order
metadata such as wallpaper type, amount, Stripe Checkout Session ID, payment status,
customer email, selected device/size/style/theme, generated final asset rows,
email delivery attempts, and download events.

Do not store or expose API keys, raw order tokens, final generation tokens,
card data, generated image base64, full Stripe objects, full prompts, or private
answers in events or health/admin responses. IP addresses are stored only for
operations review and are also hashed with `IP_HASH_SECRET` when configured,
falling back to `ORDER_TOKEN_SECRET`.

Admin order summaries are available at `/api/admin/orders` only with:

```bash
Authorization: Bearer $ADMIN_DASHBOARD_TOKEN
```

The admin endpoint returns safe summaries only: short order ID, status,
package, amount, customer email, country, IP hash, payment status, final asset
count, email count, and download count. It does not return raw IP by default,
R2 keys, prompts, answers, Stripe objects, or tokens.

Tracking health is available at `/api/tracking-health` and returns booleans for
the expected D1 tables only.

## Cloudflare Storage Helpers

Production helper modules are available for Cloudflare bindings:

- `lib/cloudflare.ts` reads OpenNext Cloudflare bindings: `DB`,
  `DREAM_RATE_LIMITS`, and `WALLPAPER_BUCKET`.
- `lib/orders.ts` stores order state in D1 and uses an atomic
  `paid -> final_generating` update so a paid order can safely start final
  generation. If a generation is already in progress, `/api/generate-final`
  returns `202` and `/success` polls `/api/order-status` instead of failing.
  Stale `final_generating` orders older than 10 minutes can retry once without
  another payment.
- `lib/storage.ts` stores image bytes in R2. Preview keys use
  `previews/{orderId}/{previewId}.png|jpg|webp`; final keys use
  `finals/{orderId}/{assetType}.png`.
- `lib/rateLimit.ts` stores rate-limit counters and generation locks in KV.

## Cloudflare Deploy Settings

- Build command: `npm run build`
- Deploy command: `npm run deploy`
- Non-production deploy command: `npm run upload`
- Root directory: `/` or blank/repo root

## Production Security

Recommended Cloudflare production settings:

- SSL/TLS mode: Full (strict)
- Always Use HTTPS: enabled
- HSTS: enabled in Cloudflare when ready, matching the app fallback
  `Strict-Transport-Security: max-age=31536000`
- Minimum TLS version: TLS 1.2
- TLS 1.3: enabled

The app also sends production security headers from `next.config.ts`:

- `Strict-Transport-Security: max-age=31536000`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()`
- `X-Frame-Options: DENY`
- `Content-Security-Policy` with `frame-ancestors 'none'`

The current CSP is compatibility-focused for Next.js/OpenNext and still allows
`'unsafe-inline'` and `'unsafe-eval'` for scripts. Future hardening TODO:
replace inline script allowances with a CSP nonce and remove `'unsafe-eval'`
after validating Next/OpenNext and Cloudflare runtime behavior.

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

## Storage Model

Production delivery uses Cloudflare D1 for order state, KV for rate limits, and
R2 for preview/final image files. Browser storage is limited to short IDs,
state flags, and signed restore/download tokens; image base64 and private
answers are not stored in browser storage.

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
- `/api/final-asset`
- `/api/order-status`
- `/api/order-health`
- `/api/schema-health`
- `/api/order-abandon`
- `/api/tracking-health`
- `/api/admin/orders`
- `/api/send-wallpaper-email`
- `/api/stripe-webhook`

The project uses OpenNext for Workers. Do not enable static export, `next-on-pages`, or `output: "export"`.
