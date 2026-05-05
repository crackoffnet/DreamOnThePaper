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

## Payment Flow

1. User completes `/create`.
2. Answers are stored in the browser session and the user goes to `/checkout`.
3. `/api/create-checkout-session` creates a Stripe Checkout Session server-side.
4. Stripe redirects to `/success?session_id=...`.
5. `/api/verify-payment` retrieves the Stripe session server-side and returns a short-lived signed order token.
6. `/success` uses that token to call `/api/generate-wallpaper`.
7. `/thank-you` shows download, share, and email actions.

If Stripe is not configured, mock checkout is allowed only in development.

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
npm run build
npm run preview
npm run deploy
```

## Future R2 Storage Step

Current delivery uses browser session storage and email attachments for generated data URLs. For durable production delivery, add Cloudflare R2:

- Binding name: `WALLPAPER_BUCKET`
- Store generated PNGs without personal prompt answers.
- Email signed expiring download URLs.
- Add a Worker route that validates short-lived download tokens.

## Routes

- `/` landing page
- `/create` guided wallpaper wizard
- `/checkout` package selection and Stripe Checkout
- `/success` payment verification and final generation
- `/thank-you` result, download, share, and email delivery
- `/api/create-checkout-session`
- `/api/verify-payment`
- `/api/generate-wallpaper`
- `/api/send-wallpaper-email`
- `/api/stripe-webhook`

The project uses OpenNext for Workers. Do not enable static export, `next-on-pages`, or `output: "export"`.
