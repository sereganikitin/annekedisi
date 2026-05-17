import type { MetadataRoute } from "next";
import { getSiteConfig } from "@/lib/site";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  const site = getSiteConfig();
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/admin/"] },
    ],
    sitemap: `${site.siteUrl.replace(/\/+$/, "")}/sitemap.xml`,
  };
}
