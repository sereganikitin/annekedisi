import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getAllPosts, getPost, getNeighbors, formatDate } from "@/lib/posts";
import { getSiteConfig, getPartnerLinksFor, absoluteUrl } from "@/lib/site";
import { PostMedia } from "@/components/PostMedia";
import { PostText } from "@/components/PostText";
import { PartnerBlock } from "@/components/PartnerBlock";

export const dynamicParams = false;

export function generateStaticParams() {
  return getAllPosts().map((p) => ({ id: p.id }));
}

function snippet(text: string, max: number): string {
  if (!text) return "";
  if (text.length <= max) return text;
  return text.slice(0, max).replace(/\s+\S*$/, "") + "…";
}

export async function generateMetadata(
  props: PageProps<"/post/[id]">
): Promise<Metadata> {
  const { id } = await props.params;
  const post = getPost(id);
  const site = getSiteConfig();
  if (!post) return { title: "Пост не найден" };
  const title = post.text
    ? snippet(post.text, 60)
    : `Пост #${post.id}`;
  const description = post.text ? snippet(post.text, 200) : site.description;
  const url = `${site.siteUrl.replace(/\/+$/, "")}/post/${post.id}/`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title,
      description,
      url,
      siteName: site.siteName,
      locale: site.locale,
      images: post.photos[0] ? [{ url: post.photos[0] }] : undefined,
      publishedTime: post.datetime || undefined,
    },
    twitter: {
      card: post.photos[0] ? "summary_large_image" : "summary",
      title,
      description,
      images: post.photos[0] ? [post.photos[0]] : undefined,
    },
  };
}

export default async function PostPage(props: PageProps<"/post/[id]">) {
  const { id } = await props.params;
  const post = getPost(id);
  if (!post) notFound();

  const site = getSiteConfig();
  const { prev, next } = getNeighbors(id);
  const { title: partnerTitle, links: partnerLinks } = getPartnerLinksFor(id);
  const postUrl = `${site.siteUrl.replace(/\/+$/, "")}/post/${post.id}/`;

  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.text ? snippet(post.text, 110) : `Пост #${post.id}`,
    image: post.photos.length
      ? post.photos
      : post.videos[0]?.thumb
      ? [post.videos[0].thumb]
      : undefined,
    datePublished: post.datetime || undefined,
    dateModified: post.datetime || undefined,
    author: { "@type": "Organization", name: site.organization.name },
    publisher: {
      "@type": "Organization",
      name: site.organization.name,
      url: site.siteUrl,
      logo: site.organization.logo
        ? { "@type": "ImageObject", url: absoluteUrl(site.organization.logo) }
        : undefined,
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": postUrl },
    url: postUrl,
    inLanguage: site.language,
    articleBody: post.text || undefined,
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Лента", item: site.siteUrl },
      { "@type": "ListItem", position: 2, name: `Пост #${post.id}`, item: postUrl },
    ],
  };

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-5">
      <div className="pt-6 sm:pt-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-rose-600/80 transition hover:text-rose-700 dark:text-rose-300/80 dark:hover:text-rose-200"
        >
          <span aria-hidden>←</span>
          К ленте
        </Link>
      </div>

      <article className="mt-4 overflow-hidden rounded-3xl border border-rose-200/70 bg-white/85 shadow-sm backdrop-blur-sm dark:border-rose-900/40 dark:bg-rose-950/60">
        <header className="px-5 pt-6 pb-3 sm:px-8 sm:pt-8">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-rose-500/80 dark:text-rose-300/70">
            <time dateTime={post.datetime ?? undefined}>
              {formatDate(post.datetime, true)}
            </time>
            {post.views ? (
              <>
                <span className="opacity-50">·</span>
                <span>{post.views} просмотров</span>
              </>
            ) : null}
            {post.forwardedFrom ? (
              <>
                <span className="opacity-50">·</span>
                <span className="italic">переслано из {post.forwardedFrom}</span>
              </>
            ) : null}
            <span className="opacity-50">·</span>
            <a
              href={post.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-rose-400/80 underline decoration-dotted hover:text-rose-700 dark:hover:text-rose-200"
            >
              #{post.id}
            </a>
          </div>
        </header>

        {post.photos.length > 0 || post.videos.length > 0 ? (
          <div className="px-3 sm:px-4">
            <PostMedia photos={post.photos} videos={post.videos} postUrl={post.url} />
          </div>
        ) : null}

        {post.text ? (
          <div className="px-5 py-6 sm:px-8 sm:py-8">
            <div className="text-lg leading-relaxed">
              <PostText text={post.text} />
            </div>
          </div>
        ) : null}

        {post.preview ? (
          <a
            href={post.preview.url || post.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mx-5 mb-6 block rounded-xl border border-rose-200/70 bg-rose-50/80 p-4 transition hover:border-rose-400 sm:mx-8 dark:border-rose-900/40 dark:bg-rose-950/40"
          >
            {post.preview.image ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={post.preview.image}
                alt=""
                className="mb-3 max-h-64 w-full rounded-lg object-cover"
              />
            ) : null}
            {post.preview.site ? (
              <div className="text-xs uppercase tracking-wide text-rose-500/80">
                {post.preview.site}
              </div>
            ) : null}
            {post.preview.title ? (
              <div className="font-medium">{post.preview.title}</div>
            ) : null}
            {post.preview.description ? (
              <div className="text-sm text-rose-700/80 dark:text-rose-200/70">
                {post.preview.description}
              </div>
            ) : null}
          </a>
        ) : null}

        <PartnerBlock
          postId={post.id}
          fallback={{ title: partnerTitle, links: partnerLinks }}
        />

        <footer className="border-t border-rose-200/60 px-5 py-4 text-sm dark:border-rose-900/40 sm:px-8">
          <a
            href={post.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-rose-600 transition hover:text-rose-700 dark:text-rose-300 dark:hover:text-rose-100"
          >
            Открыть в Telegram
            <span aria-hidden>↗</span>
          </a>
        </footer>
      </article>

      <nav className="mt-6 mb-12 grid gap-3 sm:grid-cols-2">
        {prev ? (
          <Link
            href={`/post/${prev.id}`}
            className="group rounded-2xl border border-rose-200/70 bg-white/85 p-4 backdrop-blur-sm transition hover:border-rose-400 dark:border-rose-900/40 dark:bg-rose-950/60"
          >
            <div className="text-xs uppercase tracking-wide text-rose-400/80">
              ← Предыдущий
            </div>
            <div className="mt-1 line-clamp-2 text-sm text-rose-900/80 dark:text-rose-100/80">
              {prev.text ? prev.text.slice(0, 100) : `Пост #${prev.id}`}
            </div>
          </Link>
        ) : (
          <div />
        )}
        {next ? (
          <Link
            href={`/post/${next.id}`}
            className="group rounded-2xl border border-rose-200/70 bg-white/85 p-4 text-right backdrop-blur-sm transition hover:border-rose-400 dark:border-rose-900/40 dark:bg-rose-950/60"
          >
            <div className="text-xs uppercase tracking-wide text-rose-400/80">
              Следующий →
            </div>
            <div className="mt-1 line-clamp-2 text-sm text-rose-900/80 dark:text-rose-100/80">
              {next.text ? next.text.slice(0, 100) : `Пост #${next.id}`}
            </div>
          </Link>
        ) : (
          <div />
        )}
      </nav>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
    </div>
  );
}
