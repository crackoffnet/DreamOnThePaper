import type { MetadataRoute } from "next";

const siteUrl = "https://www.dreamonthepaper.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/admin",
          "/checkout",
          "/success",
          "/result",
          "/preview",
          "/thank-you",
          "/_next/",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
