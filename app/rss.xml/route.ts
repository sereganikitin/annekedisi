import { getAllPosts } from "@/lib/posts";
import { getSiteConfig } from "@/lib/site";
import { getPostSeo } from "@/lib/post-seo";

export const dynamic = "force-static";

const MAX_ITEMS = 40;

function escapeXml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function cdata(s: string): string {
  return `<![CDATA[${s.replace(/]]>/g, "]]]]><![CDATA[>")}]]>`;
}

function rfc822(iso: string | null): string {
  const d = iso ? new Date(iso) : new Date();
  return Number.isNaN(d.getTime()) ? new Date().toUTCString() : d.toUTCString();
}

export async function GET() {
  const site = getSiteConfig();
  const base = site.siteUrl.replace(/\/+$/, "");
  const posts = getAllPosts().slice(0, MAX_ITEMS);

  const lastBuild =
    posts[0]?.datetime ? new Date(posts[0].datetime).toUTCString() : new Date().toUTCString();

  const items = posts
    .map((p) => {
      const seo = getPostSeo(p);
      const url = `${base}/post/${p.id}/`;
      const html = (p.text || "")
        .split(/\n{2,}/)
        .map((para) => `<p>${escapeXml(para).replace(/\n/g, "<br/>")}</p>`)
        .join("");
      const imagesHtml = p.photos
        .map((src) => `<p><img src="${escapeXml(src)}" alt="${escapeXml(seo.h1)}"/></p>`)
        .join("");
      const fullHtml = imagesHtml + html;

      const enclosure = p.photos[0]
        ? `\n      <enclosure url="${escapeXml(p.photos[0])}" type="image/jpeg"/>`
        : "";

      return `    <item>
      <title>${escapeXml(seo.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${rfc822(p.datetime)}</pubDate>
      <description>${cdata(seo.description)}</description>
      <content:encoded>${cdata(fullHtml)}</content:encoded>${enclosure}
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
     xmlns:atom="http://www.w3.org/2005/Atom"
     xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${escapeXml(site.title)}</title>
    <link>${base}/</link>
    <atom:link href="${base}/rss.xml" rel="self" type="application/rss+xml"/>
    <description>${escapeXml(site.description)}</description>
    <language>${escapeXml(site.language)}</language>
    <lastBuildDate>${lastBuild}</lastBuildDate>
${items}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
