import type { MetadataRoute } from "next";

const siteUrl = "https://www.dreamonthepaper.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/success",
        "/checkout",
        "/preview",
        "/thank-you",
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
