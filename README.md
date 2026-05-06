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
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_SINGLE=
STRIPE_PRICE_BUNDLE=
STRIPE_PRICE_PREMIUM=
PUBLIC_SITE_URL=https://www.dreamonthepaper.com
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
3. `/preview` shows the preview in a device frame with the unlock offer.
4. User clicks "Unlock Full Wallpaper".
5. `/api/create-checkout-session` creates a Stripe Checkout Session server-side.
6. Stripe redirects to `/success?session_id=...`.
7. `/api/verify-payment` retrieves the Stripe session server-side, checks the original order metadata, and returns a short-lived signed order token.
8. `/success` uses that token to call `/api/generate-final`.
9. `/thank-you` shows the high-resolution wallpaper with download, share, and email actions.

If Stripe is not configured, mock checkout is allowed only in development.

Final generation never trusts a client-side `paid` flag or new generation parameters after payment. It requires a server-verified Stripe session and signed order token tied to the original preview/order.

## Stripe Setup

In Stripe Dashboard:

- Enable Checkout.
- Add your domain.
- Add a webhook endpoint:
  - URL: `https://www.dreamonthepaper.com/api/stripe-webhook`
  - Events: `checkout.session.completed`, `payment_intent.payment_failed`
- Copy the webhook signing secret to `STRIPE_WEBHOOK_SECRET`.

Create Stripe Prices for:

- Single wallpaper: `$4.99`
- Mobile + desktop bundle: `$6.99`
- Premium 3-version pack: `$11.99`

Then set:

```bash
STRIPE_PRICE_SINGLE=price_...
STRIPE_PRICE_BUNDLE=price_...
STRIPE_PRICE_PREMIUM=price_...
```

Use `STRIPE_SECRET_KEY`, not `STRIPE_KEY`, as the preferred production secret
name. The server has a temporary fallback for `STRIPE_KEY`, but Cloudflare should
be configured with `STRIPE_SECRET_KEY`.

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
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_SINGLE=
STRIPE_PRICE_BUNDLE=
STRIPE_PRICE_PREMIUM=
PUBLIC_SITE_URL=https://www.dreamonthepaper.com
NEXT_PUBLIC_SITE_URL=https://www.dreamonthepaper.com
ORDER_TOKEN_SECRET=
RESEND_API_KEY=
FROM_EMAIL=hello@dreamonthepaper.com
TURNSTILE_SECRET_KEY=
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
```

Production checkout requires `STRIPE_SECRET_KEY`, `PUBLIC_SITE_URL`, and the
three `STRIPE_PRICE_*` variables.
Add `STRIPE_WEBHOOK_SECRET` when webhooks are enabled.

The free preview limit uses one browser-session token plus an IP/day limit. The paid final generation token is signed server-side and tied to the Stripe Session metadata for one generated final image.

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
