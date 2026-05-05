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
RESEND_API_KEY=
FROM_EMAIL=hello@dreamonthepaper.com
NEXT_PUBLIC_SITE_URL=https://dreamonthepaper.com
ORDER_TOKEN_SECRET=
NODE_VERSION=22
```

`OPENAI_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, and `ORDER_TOKEN_SECRET` must never be exposed to the frontend.

## Preview-First Payment Flow

1. User completes `/create`.
2. `/api/generate-preview` creates a low-quality, watermarked preview without payment.
3. `/preview` shows the preview in a device frame with the unlock offer.
4. User clicks "Unlock Full Wallpaper".
5. `/api/create-checkout-session` creates a Stripe Checkout Session server-side.
6. Stripe redirects to `/success?session_id=...`.
7. `/api/verify-payment` retrieves the Stripe session server-side and returns a short-lived signed order token.
8. `/success` uses that token to call `/api/generate-final`.
9. `/thank-you` shows the high-resolution wallpaper with download, share, and email actions.

If Stripe is not configured, mock checkout is allowed only in development.

Final generation never trusts a client-side `paid` flag. It requires a server-verified Stripe session and signed order token.

## Stripe Setup

In Stripe Dashboard:

- Enable Checkout.
- Add your domain.
- Add a webhook endpoint:
  - URL: `https://dreamonthepaper.com/api/stripe-webhook`
  - Events: `checkout.session.completed`
- Copy the webhook signing secret to `STRIPE_WEBHOOK_SECRET`.

The app uses inline `price_data` for:

- Single wallpaper: `$7.99`
- Mobile + desktop bundle: `$12.99`
- Premium 3-version pack: `$19.99`

## Resend Setup

In Resend:

- Verify `dreamonthepaper.com` or your sending domain.
- Create an API key and set `RESEND_API_KEY`.
- Set `FROM_EMAIL=hello@dreamonthepaper.com` or another verified sender.

Email sends the generated wallpaper as an attachment when available. Persistent download links should be added later with Cloudflare R2.

## Cloudflare Environment Variables

Set these in your Cloudflare Workers build/deploy environment:

```bash
NODE_VERSION=22
OPENAI_API_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
RESEND_API_KEY=
FROM_EMAIL=hello@dreamonthepaper.com
NEXT_PUBLIC_SITE_URL=https://dreamonthepaper.com
ORDER_TOKEN_SECRET=
```

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

Current delivery uses browser session storage and email attachments for generated data URLs. For durable production delivery, add Cloudflare R2:

- Binding name: `WALLPAPER_BUCKET`
- Store generated PNGs without personal prompt answers.
- Email signed expiring download URLs.
- Add a Worker route that validates short-lived download tokens.

## Routes

- `/` landing page
- `/create` guided wallpaper wizard
- `/preview` low-quality preview and unlock page
- `/checkout` package selection and Stripe Checkout
- `/success` payment verification and final generation
- `/thank-you` result, download, share, and email delivery
- `/api/create-checkout-session`
- `/api/verify-payment`
- `/api/generate-preview`
- `/api/generate-final`
- `/api/generate-wallpaper`
- `/api/send-wallpaper-email`
- `/api/stripe-webhook`

The project uses OpenNext for Workers. Do not enable static export, `next-on-pages`, or `output: "export"`.
