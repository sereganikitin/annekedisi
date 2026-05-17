import Link from "next/link";
import { getAllPosts, getChannelMeta, formatDate } from "@/lib/posts";
import { PostMedia } from "@/components/PostMedia";
import { PostText } from "@/components/PostText";

export default function Home() {
  const posts = getAllPosts();
  const meta = getChannelMeta();

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-5">
      <section className="pt-10 pb-8 text-center sm:pt-14 sm:pb-10">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Лента{" "}
          <span className="bg-gradient-to-r from-rose-500 to-amber-500 bg-clip-text text-transparent">
            annekedisi
          </span>
        </h1>
        <p className="mt-3 text-stone-500 dark:text-stone-400">
          {meta.count} {pluralize(meta.count, ["пост", "поста", "постов"])} из Telegram-канала
        </p>
      </section>

      <ul className="space-y-6 pb-12">
        {posts.map((post) => (
          <li key={post.id}>
            <article className="group overflow-hidden rounded-3xl border border-stone-200/70 bg-white shadow-sm transition hover:shadow-md dark:border-stone-800 dark:bg-stone-900">
              {post.photos.length > 0 || post.videos.length > 0 ? (
                <Link
                  href={`/post/${post.id}`}
                  className="block"
                  aria-label={`Открыть пост ${post.id}`}
                >
                  <div className="p-3 pb-0">
                    <PostMedia
                      photos={post.photos}
                      videos={post.videos}
                      compact
                    />
                  </div>
                </Link>
              ) : null}

              <div className="px-5 pt-4 pb-5 sm:px-6">
                <div className="mb-2 flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
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
                  <p className="text-stone-400 italic">— без подписи —</p>
                )}

                {post.preview ? (
                  <div className="mt-3 rounded-xl border border-stone-200 bg-stone-50 p-3 text-sm dark:border-stone-800 dark:bg-stone-950">
                    {post.preview.site ? (
                      <div className="text-xs uppercase tracking-wide text-stone-500">
                        {post.preview.site}
                      </div>
                    ) : null}
                    {post.preview.title ? (
                      <div className="font-medium">{post.preview.title}</div>
                    ) : null}
                    {post.preview.description ? (
                      <div className="text-stone-600 dark:text-stone-400 line-clamp-2">
                        {post.preview.description}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <div className="mt-4 flex items-center justify-between">
                  <Link
                    href={`/post/${post.id}`}
                    className="inline-flex items-center gap-1 text-sm font-medium text-rose-600 transition group-hover:gap-2 hover:text-rose-700"
                  >
                    Читать пост
                    <span aria-hidden>→</span>
                  </Link>
                  <a
                    href={post.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
                  >
                    #{post.id}
                  </a>
                </div>
              </div>
            </article>
          </li>
        ))}
      </ul>
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
