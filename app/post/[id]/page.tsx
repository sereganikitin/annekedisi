import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getAllPosts, getPost, getNeighbors, formatDate } from "@/lib/posts";
import { PostMedia } from "@/components/PostMedia";
import { PostText } from "@/components/PostText";

export const dynamicParams = false;

export function generateStaticParams() {
  return getAllPosts().map((p) => ({ id: p.id }));
}

export async function generateMetadata(
  props: PageProps<"/post/[id]">
): Promise<Metadata> {
  const { id } = await props.params;
  const post = getPost(id);
  if (!post) return { title: "Пост не найден" };
  const title = post.text
    ? post.text.slice(0, 60).replace(/\s+\S*$/, "") + (post.text.length > 60 ? "…" : "")
    : `Пост #${post.id}`;
  return {
    title: `${title} — annekedisi`,
    description: post.text.slice(0, 160) || `Пост из Telegram-канала annekedisi`,
    openGraph: {
      title,
      description: post.text.slice(0, 200),
      images: post.photos[0] ? [post.photos[0]] : undefined,
    },
  };
}

export default async function PostPage(props: PageProps<"/post/[id]">) {
  const { id } = await props.params;
  const post = getPost(id);
  if (!post) notFound();

  const { prev, next } = getNeighbors(id);

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-5">
      <div className="pt-6 sm:pt-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-stone-500 transition hover:text-rose-600"
        >
          <span aria-hidden>←</span>
          К ленте
        </Link>
      </div>

      <article className="mt-4 overflow-hidden rounded-3xl border border-stone-200/70 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900">
        <header className="px-5 pt-6 pb-3 sm:px-8 sm:pt-8">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-stone-500 dark:text-stone-400">
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
              className="text-stone-400 underline decoration-dotted hover:text-rose-600"
            >
              #{post.id}
            </a>
          </div>
        </header>

        {post.photos.length > 0 || post.videos.length > 0 ? (
          <div className="px-3 sm:px-4">
            <PostMedia photos={post.photos} videos={post.videos} />
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
            className="mx-5 mb-6 block rounded-xl border border-stone-200 bg-stone-50 p-4 transition hover:border-rose-300 sm:mx-8 dark:border-stone-800 dark:bg-stone-950"
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
              <div className="text-xs uppercase tracking-wide text-stone-500">
                {post.preview.site}
              </div>
            ) : null}
            {post.preview.title ? (
              <div className="font-medium">{post.preview.title}</div>
            ) : null}
            {post.preview.description ? (
              <div className="text-sm text-stone-600 dark:text-stone-400">
                {post.preview.description}
              </div>
            ) : null}
          </a>
        ) : null}

        <footer className="border-t border-stone-200/70 px-5 py-4 text-sm dark:border-stone-800 sm:px-8">
          <a
            href={post.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-rose-600 transition hover:text-rose-700"
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
            className="group rounded-2xl border border-stone-200/70 bg-white p-4 transition hover:border-rose-300 dark:border-stone-800 dark:bg-stone-900"
          >
            <div className="text-xs uppercase tracking-wide text-stone-400">
              ← Предыдущий
            </div>
            <div className="mt-1 line-clamp-2 text-sm text-stone-700 dark:text-stone-300">
              {prev.text ? prev.text.slice(0, 100) : `Пост #${prev.id}`}
            </div>
          </Link>
        ) : (
          <div />
        )}
        {next ? (
          <Link
            href={`/post/${next.id}`}
            className="group rounded-2xl border border-stone-200/70 bg-white p-4 text-right transition hover:border-rose-300 dark:border-stone-800 dark:bg-stone-900"
          >
            <div className="text-xs uppercase tracking-wide text-stone-400">
              Следующий →
            </div>
            <div className="mt-1 line-clamp-2 text-sm text-stone-700 dark:text-stone-300">
              {next.text ? next.text.slice(0, 100) : `Пост #${next.id}`}
            </div>
          </Link>
        ) : (
          <div />
        )}
      </nav>
    </div>
  );
}
