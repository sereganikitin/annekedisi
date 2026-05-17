import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

export type Photo = string;
export type Video = { src: string; thumb: string | null };
export type LinkPreview = {
  url: string | null;
  site: string | null;
  title: string | null;
  description: string | null;
  image: string | null;
};

export type Post = {
  id: string;
  url: string;
  text: string;
  html: string;
  photos: Photo[];
  videos: Video[];
  roundVideo: string | null;
  voice: string | null;
  datetime: string | null;
  views: string | null;
  forwardedFrom: string | null;
  preview: LinkPreview | null;
};

export type PostsFile = {
  channel: string;
  fetchedAt: string;
  count: number;
  posts: Post[];
};

const DATA_PATH = join(process.cwd(), "data", "posts.json");

let cache: PostsFile | null = null;

function load(): PostsFile {
  if (cache) return cache;
  if (!existsSync(DATA_PATH)) {
    return { channel: "annekedisi", fetchedAt: "", count: 0, posts: [] };
  }
  const raw = readFileSync(DATA_PATH, "utf8");
  cache = JSON.parse(raw) as PostsFile;
  return cache;
}

export function getAllPosts(): Post[] {
  return load().posts;
}

export function getPost(id: string): Post | undefined {
  return load().posts.find((p) => p.id === id);
}

export function getChannelMeta() {
  const data = load();
  return { channel: data.channel, fetchedAt: data.fetchedAt, count: data.count };
}

export function getNeighbors(id: string): { prev?: Post; next?: Post } {
  const posts = load().posts;
  const i = posts.findIndex((p) => p.id === id);
  if (i === -1) return {};
  return {
    next: i > 0 ? posts[i - 1] : undefined,
    prev: i < posts.length - 1 ? posts[i + 1] : undefined,
  };
}

const MONTHS_RU = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];

export function formatDate(iso: string | null, withTime = false): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const day = d.getDate();
  const month = MONTHS_RU[d.getMonth()];
  const year = d.getFullYear();
  if (!withTime) return `${day} ${month} ${year}`;
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${day} ${month} ${year}, ${hh}:${mm}`;
}
