import Link from "next/link";
import { getAllPosts, getChannelMeta } from "@/lib/posts";
import { FeedCard } from "@/components/FeedCard";
import { TOPIC_SLUGS, TOPICS, getPostsByTopic } from "@/lib/topics";
import { CatPaw } from "@/components/Cats";

export default function Home() {
  const posts = getAllPosts();
  const meta = getChannelMeta();

  const activeTopics = TOPIC_SLUGS.filter(
    (s) => getPostsByTopic(posts, s).length > 0
  );

  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Annekedisi — блог о кошках, путешествиях и фотографии",
    itemListElement: posts.slice(0, 30).map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `https://pinkcrab.ru/post/${p.id}/`,
    })),
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6">
      <section className="relative pt-10 pb-8 text-center sm:pt-16 sm:pb-10">
        <CatPaw className="absolute left-6 top-12 hidden h-8 w-8 rotate-[-15deg] text-rose-300/70 sm:block dark:text-rose-700/50" />
        <CatPaw className="absolute right-8 top-20 hidden h-10 w-10 rotate-[10deg] text-rose-300/60 sm:block dark:text-rose-700/40" />
        <h1 className="text-4xl font-semibold tracking-tight text-rose-950 sm:text-5xl dark:text-rose-50">
          <span className="bg-gradient-to-r from-rose-500 via-pink-500 to-rose-400 bg-clip-text text-transparent">
            Annekedisi
          </span>{" "}
          — блог о кошках, путешествиях и фотографии
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-rose-700/80 dark:text-rose-200/70 sm:text-lg">
          Личный блог о кошках и животных, с заметками и фотографиями из путешествий,
          уютных бытовых сцен и кадров с прогулок. Все посты — из Telegram-канала{" "}
          <span className="font-medium">annekedisi</span>: фото кошек, фотографии из
          поездок и короткие истории.
        </p>
        <p className="mt-3 text-sm text-rose-500/80 dark:text-rose-300/70">
          {meta.count} {pluralize(meta.count, ["пост", "поста", "постов"])} · обновляется
          из Telegram
        </p>

        {activeTopics.length > 0 ? (
          <nav
            aria-label="Темы блога"
            className="mx-auto mt-6 flex max-w-3xl flex-wrap justify-center gap-2"
          >
            {activeTopics.map((slug) => (
              <Link
                key={slug}
                href={`/tag/${slug}`}
                className="rounded-full border border-rose-200 bg-white/80 px-3.5 py-1.5 text-sm font-medium text-rose-700 shadow-sm transition hover:border-rose-400 hover:text-rose-800 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-200"
              >
                {TOPICS[slug].h1}
              </Link>
            ))}
          </nav>
        ) : null}
      </section>

      <h2 className="sr-only">Все посты блога: кошки, путешествия, фотография</h2>
      <ul className="grid grid-cols-1 gap-5 pb-12 md:grid-cols-2 xl:grid-cols-3">
        {posts.map((post) => (
          <li key={post.id}>
            <FeedCard post={post} />
          </li>
        ))}
      </ul>

      <section className="mx-auto max-w-3xl pb-16 text-center text-sm text-rose-700/80 dark:text-rose-200/70">
        <h2 className="mb-3 text-lg font-medium text-rose-900 dark:text-rose-100">
          О блоге
        </h2>
        <p>
          Annekedisi — это блог о кошках и животных, путешествиях и фотографии. Здесь
          собраны фотографии кошек, фото из путешествий, заметки о доме и саде, видео
          с прогулок и наблюдения из обычной жизни. Если вы искали блог о кошках,
          блог о путешествиях или подборку фотографий с поездок и из деревенского
          быта — добро пожаловать.
        </p>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }}
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
