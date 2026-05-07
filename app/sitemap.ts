import type { MetadataRoute } from "next";

const siteUrl = "https://www.dreamonthepaper.com";

const routes = [
  "",
  "/create",
  "/about",
  "/privacy-policy",
  "/terms",
  "/refund-policy",
  "/contact",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return routes.map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified: now,
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : route === "/create" ? 0.9 : 0.5,
  }));
}
