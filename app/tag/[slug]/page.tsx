import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getAllPosts } from "@/lib/posts";
import { getSiteConfig } from "@/lib/site";
import {
  TOPIC_SLUGS,
  TOPICS,
  getPostsByTopic,
  isTopicSlug,
} from "@/lib/topics";
import { FeedCard } from "@/components/FeedCard";

export const dynamicParams = false;

export function generateStaticParams() {
  return TOPIC_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata(
  props: PageProps<"/tag/[slug]">
): Promise<Metadata> {
  const { slug } = await props.params;
  if (!isTopicSlug(slug)) return { title: "Тег не найден" };
  const topic = TOPICS[slug];
  const site = getSiteConfig();
  const canonical = `${site.siteUrl.replace(/\/+$/, "")}/tag/${slug}/`;
  const hasPosts = getPostsByTopic(getAllPosts(), slug).length > 0;

  return {
    title: topic.title,
    description: topic.description,
    keywords: topic.keywords,
    robots: hasPosts ? undefined : "noindex, follow",
    alternates: { canonical },
    openGraph: {
      type: "website",
      title: topic.title,
      description: topic.description,
      url: canonical,
      siteName: site.siteName,
      locale: site.locale,
    },
    twitter: {
      card: "summary",
      title: topic.title,
      description: topic.description,
    },
    category: topic.h1,
  };
}

export default async function TagPage(props: PageProps<"/tag/[slug]">) {
  const { slug } = await props.params;
  if (!isTopicSlug(slug)) notFound();
  const topic = TOPICS[slug];
  const site = getSiteConfig();
  const canonical = `${site.siteUrl.replace(/\/+$/, "")}/tag/${slug}/`;

  const allPosts = getAllPosts();
  const posts = getPostsByTopic(allPosts, slug);

  const otherTopics = TOPIC_SLUGS.filter((s) => s !== slug).filter(
    (s) => getPostsByTopic(allPosts, s).length > 0
  );

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Лента", item: site.siteUrl },
      { "@type": "ListItem", position: 2, name: topic.h1, item: canonical },
    ],
  };

  const collectionLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: topic.title,
    description: topic.description,
    url: canonical,
    inLanguage: site.language,
    isPartOf: { "@type": "WebSite", name: site.siteName, url: site.siteUrl },
    about: { "@type": "Thing", name: topic.name },
    keywords: topic.keywords.join(", "),
    mainEntity: {
      "@type": "ItemList",
      itemListElement: posts.slice(0, 30).map((p, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `${site.siteUrl.replace(/\/+$/, "")}/post/${p.id}/`,
      })),
    },
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6">
      <div className="pt-6 sm:pt-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-rose-600/80 transition hover:text-rose-700 dark:text-rose-300/80 dark:hover:text-rose-200"
        >
          <span aria-hidden>←</span>
          К ленте
        </Link>
      </div>

      <section className="pt-6 pb-8 text-center sm:pt-10 sm:pb-10">
        <p className="text-xs uppercase tracking-wide text-rose-500/80 dark:text-rose-300/70">
          Тема блога
        </p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-rose-950 sm:text-5xl dark:text-rose-50">
          {topic.h1}
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-rose-700/80 dark:text-rose-200/70 sm:text-lg">
          {topic.intro}
        </p>
        <p className="mt-3 text-sm text-rose-500/80 dark:text-rose-300/70">
          {posts.length} {pluralize(posts.length, ["пост", "поста", "постов"])} по теме
          «{topic.name.toLowerCase()}»
        </p>
      </section>

      {posts.length > 0 ? (
        <ul className="grid grid-cols-1 gap-5 pb-12 md:grid-cols-2 xl:grid-cols-3">
          {posts.map((post) => (
            <li key={post.id}>
              <FeedCard post={post} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="mx-auto max-w-2xl pb-12 text-center text-rose-500/80 dark:text-rose-300/70">
          По этой теме пока нет постов.
        </p>
      )}

      {otherTopics.length > 0 ? (
        <section className="mx-auto max-w-3xl pb-16 text-center">
          <h2 className="mb-3 text-lg font-medium text-rose-900 dark:text-rose-100">
            Другие темы блога
          </h2>
          <nav
            aria-label="Другие темы блога"
            className="flex flex-wrap justify-center gap-2"
          >
            {otherTopics.map((s) => (
              <Link
                key={s}
                href={`/tag/${s}`}
                className="rounded-full border border-rose-200 bg-white/80 px-3.5 py-1.5 text-sm font-medium text-rose-700 shadow-sm transition hover:border-rose-400 hover:text-rose-800 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-200"
              >
                {TOPICS[s].h1}
              </Link>
            ))}
          </nav>
        </section>
      ) : null}

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionLd) }}
      />
    </div>
  );
}

function pluralize(n: number, forms: [string, string, string]): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return forms[1];
  return forms[2];
}
