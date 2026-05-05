# Dream On The Paper

A production-ready MVP for an AI-generated vision board wallpaper product.

## Stack

- Next.js App Router
- Tailwind CSS
- Next.js API routes
- OpenAI Images API with a built-in mock fallback
- Stripe Checkout with a built-in mock fallback

## Getting Started

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Environment

Copy `.env.example` to `.env.local`.

```bash
OPENAI_API_KEY=
STRIPE_SECRET_KEY=
NEXT_PUBLIC_BASE_URL=http://localhost:3000
STRIPE_SINGLE_PRICE_ID=
STRIPE_BUNDLE_PRICE_ID=
```

If `OPENAI_API_KEY` is empty, `/api/generate` returns a polished mock wallpaper.
If `STRIPE_SECRET_KEY` is empty, `/api/checkout` redirects directly to `/thank-you`.

## Routes

- `/` landing page
- `/create` guided wallpaper form
- `/checkout` pricing and payment
- `/thank-you` generated image preview and download
- `/api/generate` wallpaper generation
- `/api/checkout` Stripe Checkout session or mock redirect
