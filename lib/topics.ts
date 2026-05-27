import type { Post } from "./posts";

export type TopicSlug = "cats" | "travel" | "photo" | "home" | "nature";

export type TopicMeta = {
  slug: TopicSlug;
  name: string;
  h1: string;
  title: string;
  description: string;
  intro: string;
  keywords: string[];
};

const TOPIC_RULES: { topic: TopicSlug; re: RegExp }[] = [
  {
    topic: "cats",
    re: /(кош(ка|ки|кам|кой|ке|ек)|кот(ы|ика|у|ом|ёнок|ёнка|ята)?|котёнок|котят|мурлык|персик|лапк|усат|мяу|пушист|шерст|кис(а|ы|ке|ой))/i,
  },
  {
    topic: "travel",
    re: /(путешеств|поезд(ка|ке|ки|кой)|дорог(а|и|е)|самолёт|поезд|отел[ья]|гостиниц|пляж|море|горы|город(а|е|ом)?|страна|за\s*границ|курорт|тур(изм|у|истич)?|перелёт|вокзал|маршрут|улочк)/i,
  },
  {
    topic: "photo",
    re: /(фото(граф|сни|снимк|сесси)?|кадр(ы|ов|а)?|снимок|снимк|объектив|съёмк)/i,
  },
  {
    topic: "home",
    re: /(дом(а|у|е|ой)?|сад(у|е|а)?|огород|деревн|дача|двор(е|а)?|крыльц|беседк|кухн)/i,
  },
  {
    topic: "nature",
    re: /(прогул|лес(у|а|ом)?|поле|речк|озер|небо|облак|закат|рассвет|осен|зим|весн|лет(о|ом)|снег|листь|цвет(ы|ок|ам))/i,
  },
];

export const TOPICS: Record<TopicSlug, TopicMeta> = {
  cats: {
    slug: "cats",
    name: "Кошки",
    h1: "Блог о кошках",
    title: "Блог о кошках — фотографии кошек и заметки о животных",
    description:
      "Блог о кошках и животных: фотографии кошек, заметки о домашних котах, истории с прогулок и из дома.",
    intro:
      "Подборка постов о кошках и животных: фотографии котов, забавные моменты, истории из жизни с пушистыми. Если вы искали блог о кошках или просто хотите посмотреть фото кошек — листайте ленту ниже.",
    keywords: [
      "блог о кошках",
      "блог о животных",
      "фотографии кошек",
      "фото кошек",
      "кошки",
      "коты",
    ],
  },
  travel: {
    slug: "travel",
    name: "Путешествия",
    h1: "Блог о путешествиях",
    title: "Блог о путешествиях — фотографии и заметки из поездок",
    description:
      "Блог о путешествиях: фотографии из поездок, заметки с дороги, города, природа и места.",
    intro:
      "Записки и кадры из поездок: фотографии из путешествий, дорожные заметки, города, моря и горы. Тематический блог о путешествиях внутри Annekedisi.",
    keywords: [
      "блог о путешествиях",
      "фотографии из путешествий",
      "фото из поездок",
      "путешествия",
      "заметки о путешествиях",
    ],
  },
  photo: {
    slug: "photo",
    name: "Фотография",
    h1: "Блог о фотографии",
    title: "Блог о фотографии — кадры и фотозаметки",
    description:
      "Блог о фотографии: кадры из обычной жизни, фотозаметки, отдельные фотографии и серии.",
    intro:
      "Фотографии и короткие фотозаметки: кадры из обычной жизни, серии и отдельные снимки. Тематическая подборка блога о фотографии.",
    keywords: [
      "блог о фотографии",
      "фотозаметки",
      "фотография",
      "кадры",
      "фотографии",
    ],
  },
  home: {
    slug: "home",
    name: "Дом и сад",
    h1: "Дом, сад и деревенский быт",
    title: "Дом, сад и деревенский быт — заметки и фото",
    description:
      "Заметки о доме, саде и деревенском быте: дача, огород, крыльцо, беседка, кухня и уютные сцены.",
    intro:
      "О доме, саде и деревенском быте: дача, огород, крыльцо, беседка, простые ежедневные сцены и кадры.",
    keywords: [
      "дом",
      "сад",
      "дача",
      "огород",
      "деревенский быт",
      "блог о доме",
    ],
  },
  nature: {
    slug: "nature",
    name: "Природа и прогулки",
    h1: "Природа и прогулки",
    title: "Природа и прогулки — фотозаметки и кадры",
    description:
      "Фотозаметки с прогулок: природа, лес, поле, небо, времена года и кадры на природе.",
    intro:
      "Кадры и заметки с прогулок: природа, лес, поле, времена года и небо. Тематическая подборка постов о природе и прогулках.",
    keywords: [
      "природа",
      "прогулки",
      "фото с прогулки",
      "пейзаж",
      "блог о природе",
    ],
  },
};

export const TOPIC_SLUGS: TopicSlug[] = ["cats", "travel", "photo", "home", "nature"];

export function isTopicSlug(s: string): s is TopicSlug {
  return (TOPIC_SLUGS as readonly string[]).includes(s);
}

export function detectTopics(text: string): TopicSlug[] {
  if (!text) return [];
  const found = new Set<TopicSlug>();
  for (const { topic, re } of TOPIC_RULES) {
    if (re.test(text)) found.add(topic);
  }
  return Array.from(found);
}

export function getPostTopics(post: Post): TopicSlug[] {
  return detectTopics(post.text || "");
}

export function getPostsByTopic(posts: Post[], slug: TopicSlug): Post[] {
  return posts.filter((p) => detectTopics(p.text || "").includes(slug));
}

// Score other posts by how many topics they share with the source post.
// Falls back to recency neighbours if nothing topical matches.
export function getRelatedPosts(
  source: Post,
  all: Post[],
  limit = 4
): Post[] {
  const sourceTopics = new Set(detectTopics(source.text || ""));
  if (!sourceTopics.size) {
    const sourceIdx = all.findIndex((p) => p.id === source.id);
    if (sourceIdx === -1) return all.slice(0, limit);
    const before = all.slice(sourceIdx + 1, sourceIdx + 1 + limit);
    const after = all.slice(Math.max(0, sourceIdx - limit), sourceIdx);
    return [...before, ...after].slice(0, limit);
  }
  const scored = all
    .filter((p) => p.id !== source.id)
    .map((p) => {
      const t = detectTopics(p.text || "");
      const overlap = t.filter((x) => sourceTopics.has(x)).length;
      return { p, overlap };
    })
    .filter((x) => x.overlap > 0)
    .sort((a, b) => {
      if (b.overlap !== a.overlap) return b.overlap - a.overlap;
      const da = a.p.datetime ? Date.parse(a.p.datetime) : 0;
      const db = b.p.datetime ? Date.parse(b.p.datetime) : 0;
      return db - da;
    });
  return scored.slice(0, limit).map((x) => x.p);
}
