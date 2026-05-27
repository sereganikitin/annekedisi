import type { MetadataRoute } from "next";
import { getAllPosts } from "@/lib/posts";
import { getSiteConfig } from "@/lib/site";
import { TOPIC_SLUGS, getPostsByTopic } from "@/lib/topics";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const site = getSiteConfig();
  const base = site.siteUrl.replace(/\/+$/, "");
  const posts = getAllPosts();

  const now = new Date().toISOString();
  const tagEntries = TOPIC_SLUGS.filter(
    (s) => getPostsByTopic(posts, s).length > 0
  ).map((s) => ({
    url: `${base}/tag/${s}/`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  return [
    { url: `${base}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${base}/about/`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    ...tagEntries,
    ...posts.map((p) => ({
      url: `${base}/post/${p.id}/`,
      lastModified: p.datetime ? new Date(p.datetime).toISOString() : now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
      images: p.photos.length ? p.photos : undefined,
    })),
  ];
}
