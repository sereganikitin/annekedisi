import Link from "next/link";
import { getAllPosts, getChannelMeta, formatDate, type Post } from "@/lib/posts";
import { CatPaw } from "@/components/Cats";

export default function Home() {
  const posts = getAllPosts();
  const meta = getChannelMeta();

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6">
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

      <ul className="grid grid-cols-1 gap-5 pb-16 md:grid-cols-2 xl:grid-cols-3">
        {posts.map((post) => (
          <li key={post.id}>
            <FeedCard post={post} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function FeedCard({ post }: { post: Post }) {
  const cover = post.photos[0] || post.videos[0]?.thumb || null;
  const isVideo = post.videos.length > 0;
  const mediaCount = post.photos.length + post.videos.length;
  // Telegram serves grouped-video thumbnails at ~180×320, which goes mushy
  // when stretched into a card cover. Use the same image as a blurred
  // backdrop and place the thumbnail on top in object-contain so the actual
  // pixels are never enlarged.
  const useBlurredBg = !post.photos.length && post.videos.length > 0;

  return (
    <article className="group grid aspect-[4/5] h-full grid-rows-[3fr_2fr] overflow-hidden rounded-3xl border border-rose-200/70 bg-white/85 shadow-sm backdrop-blur-sm transition hover:-translate-y-0.5 hover:shadow-md hover:shadow-rose-200/50 dark:border-rose-900/40 dark:bg-rose-950/60">
      <Link
        href={`/post/${post.id}`}
        aria-label={`Открыть пост ${post.id}`}
        className="relative block overflow-hidden bg-rose-100/60 dark:bg-rose-950/40"
      >
        {cover ? (
          useBlurredBg ? (
            <>
              <div
                className="absolute inset-0 scale-125 bg-cover bg-center blur-2xl brightness-90 dark:brightness-75"
                style={{ backgroundImage: `url("${cover}")` }}
                aria-hidden="true"
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={cover}
                alt=""
                loading="lazy"
                className="absolute inset-0 m-auto h-full w-full object-contain transition duration-500 group-hover:scale-[1.04]"
              />
            </>
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={cover}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
            />
          )
        ) : (
          <div className="grid h-full place-items-center bg-gradient-to-br from-rose-100/80 to-pink-100/60 text-rose-300/80 dark:from-rose-950/60 dark:to-rose-900/40 dark:text-rose-700/60">
            <CatPaw className="h-20 w-20 rotate-[-12deg]" />
          </div>
        )}
        {mediaCount > 1 ? (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/85 px-2.5 py-1 text-xs font-medium text-rose-700 shadow-sm backdrop-blur-sm dark:bg-rose-950/80 dark:text-rose-100">
            <StackIcon className="h-3.5 w-3.5" />
            {mediaCount}
          </span>
        ) : null}
        {isVideo ? (
          <span className="absolute left-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-black/55 text-white shadow-md">
            <PlayIcon className="h-4 w-4 translate-x-[1px]" />
          </span>
        ) : null}
      </Link>

      <div className="flex min-h-0 flex-col px-4 py-3 sm:px-5 sm:py-4">
        <div className="flex items-center justify-between text-xs text-rose-500/80 dark:text-rose-300/70">
          <time dateTime={post.datetime ?? undefined}>
            {formatDate(post.datetime)}
          </time>
          <span className="inline-flex items-center gap-2">
            {post.views ? (
              <span className="inline-flex items-center gap-1">
                <EyeIcon className="h-3.5 w-3.5" />
                {post.views}
              </span>
            ) : null}
            <a
              href={post.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-rose-400/80 hover:text-rose-600 dark:text-rose-400/60 dark:hover:text-rose-200"
            >
              #{post.id}
            </a>
          </span>
        </div>

        <p
          className={
            "mt-1.5 flex-1 overflow-hidden whitespace-pre-line text-sm leading-snug line-clamp-4 " +
            (post.text
              ? "text-rose-950/90 dark:text-rose-50/90"
              : "italic text-rose-400/80")
          }
        >
          {post.text || "— без подписи —"}
        </p>

        <Link
          href={`/post/${post.id}`}
          className="mt-2 inline-flex items-center gap-1 self-start text-sm font-medium text-rose-600 transition group-hover:gap-2 hover:text-rose-700 dark:text-rose-300 dark:hover:text-rose-100"
        >
          Читать
          <span aria-hidden>→</span>
        </Link>
      </div>
    </article>
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

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M8 5v14l11-7-11-7Z" />
    </svg>
  );
}

function StackIcon({ className }: { className?: string }) {
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
      <rect x="7" y="3" width="14" height="14" rx="2" />
      <path d="M3 7v12a2 2 0 0 0 2 2h12" />
    </svg>
  );
}
