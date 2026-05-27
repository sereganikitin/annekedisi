import Link from "next/link";
import type { Metadata } from "next";
import { getAllPosts, getChannelMeta } from "@/lib/posts";
import { getSiteConfig } from "@/lib/site";
import { TOPIC_SLUGS, TOPICS, getPostsByTopic } from "@/lib/topics";

const ABOUT_DESCRIPTION =
  "О блоге Annekedisi: блог о кошках, путешествиях и фотографии. Заметки и кадры из жизни, прогулок и поездок. Контакты, темы блога и ссылка на Telegram-канал.";

export const metadata: Metadata = {
  title: "Об авторе и блоге",
  description: ABOUT_DESCRIPTION,
  alternates: { canonical: "https://pinkcrab.ru/about/" },
};

export default function AboutPage() {
  const site = getSiteConfig();
  const meta = getChannelMeta();
  const allPosts = getAllPosts();
  const tg = `https://t.me/${site.telegramChannel}`;

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Лента", item: site.siteUrl },
      {
        "@type": "ListItem",
        position: 2,
        name: "Об авторе и блоге",
        item: `${site.siteUrl.replace(/\/+$/, "")}/about/`,
      },
    ],
  };

  const aboutLd = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: "Об авторе и блоге Annekedisi",
    url: `${site.siteUrl.replace(/\/+$/, "")}/about/`,
    inLanguage: site.language,
    description: ABOUT_DESCRIPTION,
    isPartOf: { "@type": "WebSite", name: site.siteName, url: site.siteUrl },
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

      <article className="mt-4 overflow-hidden rounded-3xl border border-rose-200/70 bg-white/85 px-6 py-8 shadow-sm backdrop-blur-sm sm:px-10 sm:py-10 dark:border-rose-900/40 dark:bg-rose-950/60">
        <header className="mb-6">
          <p className="text-xs uppercase tracking-wide text-rose-500/80 dark:text-rose-300/70">
            О блоге
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-rose-950 sm:text-4xl dark:text-rose-50">
            Annekedisi — блог о кошках, путешествиях и фотографии
          </h1>
        </header>

        <section className="prose-rose space-y-4 text-rose-900/90 dark:text-rose-50/90">
          <p>
            Это личный блог о кошках и животных, путешествиях, фотографии и тёплом
            деревенском быте. Сюда переезжают посты из{" "}
            <a
              href={tg}
              target="_blank"
              rel="noopener noreferrer"
              className="text-rose-600 underline decoration-dotted hover:text-rose-700 dark:text-rose-300 dark:hover:text-rose-100"
            >
              Telegram-канала @{site.telegramChannel}
            </a>{" "}
            — заметки, фотографии и короткие видео из обычной жизни: с прогулок,
            из дома, с грядок, из поездок и просто из моментов с кошками.
          </p>

          <p>
            На сайте сейчас{" "}
            <strong>
              {meta.count} {pluralize(meta.count, ["пост", "поста", "постов"])}
            </strong>
            , архив обновляется автоматически: каждый новый пост в канале через
            некоторое время появляется здесь со всеми фотографиями и видео.
          </p>
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-medium text-rose-900 dark:text-rose-100">
            Темы блога
          </h2>
          <p className="mt-2 text-sm text-rose-700/80 dark:text-rose-200/70">
            Тематические подборки постов:
          </p>
          <nav aria-label="Темы" className="mt-3 flex flex-wrap gap-2">
            {TOPIC_SLUGS.filter(
              (s) => getPostsByTopic(allPosts, s).length > 0
            ).map((s) => {
              const count = getPostsByTopic(allPosts, s).length;
              return (
                <Link
                  key={s}
                  href={`/tag/${s}`}
                  className="rounded-full border border-rose-200 bg-white/80 px-3.5 py-1.5 text-sm font-medium text-rose-700 shadow-sm transition hover:border-rose-400 hover:text-rose-800 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-200"
                >
                  {TOPICS[s].h1}{" "}
                  <span className="text-rose-400/80 dark:text-rose-300/70">
                    · {count}
                  </span>
                </Link>
              );
            })}
          </nav>
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-medium text-rose-900 dark:text-rose-100">
            Где ещё
          </h2>
          <ul className="mt-2 space-y-1.5 text-rose-900/90 dark:text-rose-50/90">
            <li>
              <a
                href={tg}
                target="_blank"
                rel="noopener noreferrer"
                className="text-rose-600 underline decoration-dotted hover:text-rose-700 dark:text-rose-300 dark:hover:text-rose-100"
              >
                Telegram-канал @{site.telegramChannel}
              </a>{" "}
              — основной источник постов, новинки выходят там
            </li>
            <li>
              <Link
                href="/rss.xml"
                className="text-rose-600 underline decoration-dotted hover:text-rose-700 dark:text-rose-300 dark:hover:text-rose-100"
              >
                RSS-лента
              </Link>{" "}
              — для тех, кто читает блоги в RSS-агрегаторах
            </li>
          </ul>
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-medium text-rose-900 dark:text-rose-100">
            Комментарии
          </h2>
          <p className="mt-2 text-sm text-rose-700/80 dark:text-rose-200/70">
            Под каждым постом можно оставить комментарий и ответить на чужой —
            никакой регистрации, нужны только имя и email. Комментарии проходят
            модерацию.
          </p>
        </section>
      </article>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutLd) }}
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
