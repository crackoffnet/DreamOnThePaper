# Dream On The Paper

A compact AI wallpaper generator for phone, desktop, and tablet vision-board wallpapers.

## Stack

- Next.js App Router
- Tailwind CSS
- Next.js API routes
- OpenAI Images API through a server-only route
- Cloudflare Workers via `@opennextjs/cloudflare` and Wrangler
- Stripe Checkout with a built-in mock fallback

## Getting Started

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
NEXT_PUBLIC_SITE_URL=https://dreamonthepaper.com
STRIPE_SINGLE_PRICE_ID=
STRIPE_BUNDLE_PRICE_ID=
```

`OPENAI_API_KEY` is only read server-side by `/api/generate-wallpaper`.
If `OPENAI_API_KEY` is empty in local development, the generator returns a mock wallpaper.
In production, set the key in Cloudflare as an encrypted environment variable or secret.

If `STRIPE_SECRET_KEY` is empty, `/api/checkout` redirects directly to `/thank-you`.

## Cloudflare Environment

Set these in your Cloudflare Workers build/deploy environment:

```bash
NODE_VERSION=22
OPENAI_API_KEY=
NEXT_PUBLIC_SITE_URL=https://dreamonthepaper.com
```

Optional Stripe variables:

```bash
STRIPE_SECRET_KEY=
STRIPE_SINGLE_PRICE_ID=
STRIPE_BUNDLE_PRICE_ID=
```

## Cloudflare Deploy

```bash
npm run build
npm run preview
npm run deploy
```

The project uses OpenNext for Workers. Do not enable static export, `next-on-pages`, or `output: "export"`.

## Routes

- `/` landing page
- `/create` guided wallpaper wizard
- `/checkout` pricing and payment
- `/thank-you` generated image preview and download
- `/api/generate-wallpaper` secure wallpaper generation
- `/api/generate` legacy alias for wallpaper generation
- `/api/checkout` Stripe Checkout session or mock redirect
