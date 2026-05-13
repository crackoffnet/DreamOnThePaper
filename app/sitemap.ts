import type { MetadataRoute } from "next";

const siteUrl = "https://www.dreamonthepaper.com";

const routes = [
  "",
  "/create",
  "/examples",
  "/about",
  "/privacy",
  "/terms",
  "/refund-policy",
  "/contact",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return routes.map((route) => {
    let changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] = "monthly";
    let priority = 0.5;

    if (route === "") {
      changeFrequency = "weekly";
      priority = 1;
    } else if (route === "/create") {
      changeFrequency = "weekly";
      priority = 0.9;
    } else if (route === "/examples") {
      changeFrequency = "weekly";
      priority = 0.8;
    } else if (
      route === "/privacy" ||
      route === "/terms" ||
      route === "/refund-policy"
    ) {
      changeFrequency = "yearly";
      priority = 0.3;
    }

    return {
      url: `${siteUrl}${route}`,
      lastModified: now,
      changeFrequency,
      priority,
    };
  });
}
