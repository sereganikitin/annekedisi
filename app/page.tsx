import Link from "next/link";
import { getAllPosts, getChannelMeta, formatDate } from "@/lib/posts";
import { PostMedia } from "@/components/PostMedia";
import { PostText } from "@/components/PostText";
import { CatPaw } from "@/components/Cats";

export default function Home() {
  const posts = getAllPosts();
  const meta = getChannelMeta();

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <section className="relative pt-10 pb-10 text-center sm:pt-16 sm:pb-12">
        <CatPaw className="absolute left-6 top-12 hidden h-8 w-8 rotate-[-15deg] text-rose-300/70 sm:block dark:text-rose-700/50" />
        <CatPaw className="absolute right-8 top-20 hidden h-10 w-10 rotate-[10deg] text-rose-300/60 sm:block dark:text-rose-700/40" />
        <h1 className="text-4xl font-semibold tracking-tight text-rose-950 sm:text-5xl dark:text-rose-50">
          Лента{" "}
          <span className="bg-gradient-to-r from-rose-500 via-pink-500 to-rose-400 bg-clip-text text-transparent">
            annekedisi
          </span>
        </h1>
        <p className="mt-3 text-rose-500/80 dark:text-rose-300/70">
          {meta.count} {pluralize(meta.count, ["пост", "поста", "постов"])} из Telegram-канала
        </p>
      </section>

      <div className="columns-1 gap-6 pb-16 lg:columns-2 [&>*]:break-inside-avoid">
        {posts.map((post) => (
          <article
            key={post.id}
            className="group mb-6 overflow-hidden rounded-3xl border border-rose-200/70 bg-white/85 shadow-sm backdrop-blur-sm transition hover:-translate-y-0.5 hover:shadow-md hover:shadow-rose-200/40 dark:border-rose-900/40 dark:bg-rose-950/60 dark:shadow-rose-950/10"
          >
            {post.photos.length > 0 || post.videos.length > 0 ? (
              <Link
                href={`/post/${post.id}`}
                className="block"
                aria-label={`Открыть пост ${post.id}`}
              >
                <div className="p-3 pb-0">
                  <PostMedia photos={post.photos} videos={post.videos} compact />
                </div>
              </Link>
            ) : null}

            <div className="px-5 pt-4 pb-5 sm:px-6">
              <div className="mb-2 flex items-center gap-2 text-xs text-rose-500/80 dark:text-rose-300/70">
                <time dateTime={post.datetime ?? undefined}>
                  {formatDate(post.datetime, true)}
                </time>
                {post.views ? (
                  <>
                    <span className="opacity-50">·</span>
                    <span className="inline-flex items-center gap-1">
                      <EyeIcon className="h-3.5 w-3.5" />
                      {post.views}
                    </span>
                  </>
                ) : null}
                {post.forwardedFrom ? (
                  <>
                    <span className="opacity-50">·</span>
                    <span className="italic">из {post.forwardedFrom}</span>
                  </>
                ) : null}
              </div>

              {post.text ? (
                <PostText text={post.text} clamp={320} />
              ) : (
                <p className="italic text-rose-400/80">— без подписи —</p>
              )}

              {post.preview ? (
                <div className="mt-3 rounded-xl border border-rose-200/70 bg-rose-50/80 p-3 text-sm dark:border-rose-900/40 dark:bg-rose-950/40">
                  {post.preview.site ? (
                    <div className="text-xs uppercase tracking-wide text-rose-500/80">
                      {post.preview.site}
                    </div>
                  ) : null}
                  {post.preview.title ? (
                    <div className="font-medium">{post.preview.title}</div>
                  ) : null}
                  {post.preview.description ? (
                    <div className="line-clamp-2 text-rose-700/80 dark:text-rose-200/70">
                      {post.preview.description}
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="mt-4 flex items-center justify-between">
                <Link
                  href={`/post/${post.id}`}
                  className="inline-flex items-center gap-1 text-sm font-medium text-rose-600 transition group-hover:gap-2 hover:text-rose-700 dark:text-rose-300 dark:hover:text-rose-100"
                >
                  Читать пост
                  <span aria-hidden>→</span>
                </Link>
                <a
                  href={post.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-rose-400/80 hover:text-rose-600 dark:text-rose-400/60 dark:hover:text-rose-200"
                >
                  #{post.id}
                </a>
              </div>
            </div>
          </article>
        ))}
      </div>
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

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
