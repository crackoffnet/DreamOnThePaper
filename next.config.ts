import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  async headers() {
    const securityHeaders = [
      {
        key: "X-Content-Type-Options",
        value: "nosniff",
      },
      {
        key: "Referrer-Policy",
        value: "strict-origin-when-cross-origin",
      },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=(), payment=()",
      },
      {
        key: "X-Frame-Options",
        value: "DENY",
      },
      {
        key: "Strict-Transport-Security",
        value: "max-age=31536000",
      },
      {
        key: "Content-Security-Policy",
        value: [
          "default-src 'self'",
          // TODO: Future hardening: replace unsafe-inline with CSP nonce and remove unsafe-eval after verifying Next/OpenNext compatibility.
          "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://static.cloudflareinsights.com",
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data: blob: https:",
          "font-src 'self' data:",
          "connect-src 'self' https://api.stripe.com https://checkout.stripe.com",
          "object-src 'none'",
          "base-uri 'self'",
          "form-action 'self' https://checkout.stripe.com",
          "frame-src https://checkout.stripe.com",
          "frame-ancestors 'none'",
        ].join("; "),
      },
    ];

    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
