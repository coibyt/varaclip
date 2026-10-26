import type { MetadataRoute } from "next";

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://varaclip.com").replace(/\/$/, "");

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/admin", "/studio", "/settings", "/messages", "/upload"] }],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
