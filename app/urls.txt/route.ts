import { getAllPosts } from "@/lib/posts";
import { getSiteConfig } from "@/lib/site";

export const dynamic = "force-static";

export function GET() {
  const site = getSiteConfig();
  const base = site.siteUrl.replace(/\/+$/, "");
  const urls = [
    `${base}/`,
    ...getAllPosts().map((p) => `${base}/post/${p.id}/`),
  ];
  return new Response(urls.join("\n") + "\n", {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
