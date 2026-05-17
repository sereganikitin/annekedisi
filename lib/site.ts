import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

export type SiteConfig = {
  siteName: string;
  siteUrl: string;
  title: string;
  tagline: string;
  description: string;
  ogImage: string;
  telegramChannel: string;
  language: string;
  locale: string;
  robots: string;
  organization: { name: string; url: string; logo: string };
  verification: { yandex: string; google: string };
};

export type PartnerLink = { title: string; url: string };

export type PartnerLinksFile = {
  blockTitle: string;
  global: PartnerLink[];
  perPost: { postId: string; links: PartnerLink[] }[];
};

const SITE_PATH = join(process.cwd(), "data", "site.json");
const PARTNERS_PATH = join(process.cwd(), "data", "partner-links.json");

let siteCache: SiteConfig | null = null;
let partnersCache: PartnerLinksFile | null = null;

const SITE_DEFAULTS: SiteConfig = {
  siteName: "annekedisi",
  siteUrl: "https://pinkcrab.ru",
  title: "Annekedisi — блог",
  tagline: "заметки и кадры",
  description: "Заметки и кадры из канала Annekedisi",
  ogImage: "",
  telegramChannel: "annekedisi",
  language: "ru",
  locale: "ru_RU",
  robots: "index, follow",
  organization: { name: "Annekedisi", url: "https://pinkcrab.ru", logo: "" },
  verification: { yandex: "", google: "" },
};

const PARTNERS_DEFAULTS: PartnerLinksFile = {
  blockTitle: "Наши друзья и партнёры",
  global: [],
  perPost: [],
};

function loadSite(): SiteConfig {
  if (!existsSync(SITE_PATH)) return SITE_DEFAULTS;
  try {
    const parsed = JSON.parse(readFileSync(SITE_PATH, "utf8"));
    return { ...SITE_DEFAULTS, ...parsed };
  } catch {
    return SITE_DEFAULTS;
  }
}

function loadPartners(): PartnerLinksFile {
  if (!existsSync(PARTNERS_PATH)) return PARTNERS_DEFAULTS;
  try {
    const parsed = JSON.parse(readFileSync(PARTNERS_PATH, "utf8"));
    return { ...PARTNERS_DEFAULTS, ...parsed };
  } catch {
    return PARTNERS_DEFAULTS;
  }
}

export function getSiteConfig(): SiteConfig {
  if (!siteCache) siteCache = loadSite();
  return siteCache;
}

function getPartnersFile(): PartnerLinksFile {
  if (!partnersCache) partnersCache = loadPartners();
  return partnersCache;
}

export function getPartnerLinksFor(postId: string): {
  title: string;
  links: PartnerLink[];
} {
  const data = getPartnersFile();
  const own = data.perPost.find((p) => String(p.postId) === String(postId));
  const merged = [...data.global, ...(own?.links ?? [])].filter(
    (l) => l && l.url && l.title
  );
  return { title: data.blockTitle || "Партнёры", links: merged };
}

export function absoluteUrl(path: string): string {
  const base = getSiteConfig().siteUrl.replace(/\/+$/, "");
  if (!path) return base;
  return path.startsWith("http") ? path : `${base}${path.startsWith("/") ? "" : "/"}${path}`;
}
