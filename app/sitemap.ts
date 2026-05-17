import type { MetadataRoute } from "next";
import { getAllPosts } from "@/lib/posts";
import { getSiteConfig } from "@/lib/site";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const site = getSiteConfig();
  const base = site.siteUrl.replace(/\/+$/, "");
  const posts = getAllPosts();

  const now = new Date().toISOString();
  return [
    { url: `${base}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    ...posts.map((p) => ({
      url: `${base}/post/${p.id}/`,
      lastModified: p.datetime ? new Date(p.datetime).toISOString() : now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
