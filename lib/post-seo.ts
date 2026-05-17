import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { Post } from "./posts";
import { getSiteConfig } from "./site";

export type PostSeoOverride = {
  postId: string;
  title?: string;
  h1?: string;
  description?: string;
  keywords?: string[];
};

type SeoFile = {
  overrides: PostSeoOverride[];
};

let cache: SeoFile | null = null;

function load(): SeoFile {
  if (cache) return cache;
  const path = join(process.cwd(), "data", "post-seo.json");
  if (!existsSync(path)) {
    cache = { overrides: [] };
    return cache;
  }
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8"));
    cache = {
      overrides: Array.isArray(parsed.overrides)
        ? parsed.overrides.filter(
            (o: PostSeoOverride & { _example?: boolean }) =>
              o && !o._example && o.postId
          )
        : [],
    };
  } catch {
    cache = { overrides: [] };
  }
  return cache;
}

function getOverride(postId: string): PostSeoOverride | undefined {
  return load().overrides.find((o) => String(o.postId) === String(postId));
}

// --- Auto-generation helpers ---

const SENTENCE_END_RE = /^([^.!?\n]{10,140}[.!?])(?=\s|$)/;

function firstSentence(text: string): string | null {
  const t = text.trim();
  if (!t) return null;
  // Try sentence end punctuation
  const m = t.match(SENTENCE_END_RE);
  if (m) return m[1].trim();
  // Fallback: first newline
  const nl = t.indexOf("\n");
  if (nl > 10 && nl < 140) return t.slice(0, nl).trim();
  return null;
}

function clampOnWord(text: string, max: number, suffix = "…"): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  const trimmed = lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut;
  return trimmed.replace(/[\s,;:.!?\-—]+$/, "") + suffix;
}

function autoTitle(text: string): string | null {
  if (!text) return null;
  const sentence = firstSentence(text);
  if (sentence) return clampOnWord(sentence.replace(/\s+/g, " "), 70);
  return clampOnWord(text.replace(/\s+/g, " "), 70);
}

function autoH1(text: string): string | null {
  if (!text) return null;
  const sentence = firstSentence(text);
  if (sentence) return clampOnWord(sentence.replace(/\s+/g, " "), 110);
  return clampOnWord(text.replace(/\s+/g, " "), 110);
}

function autoDescription(text: string): string | null {
  if (!text) return null;
  // Take up to ~170 chars, prefer ending on sentence boundary
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= 170) return flat;
  const truncated = flat.slice(0, 170);
  // Find last sentence boundary
  const lastSentence = Math.max(
    truncated.lastIndexOf(". "),
    truncated.lastIndexOf("! "),
    truncated.lastIndexOf("? ")
  );
  if (lastSentence > 80) {
    return truncated.slice(0, lastSentence + 1);
  }
  return clampOnWord(truncated, 165);
}

export type PostSeo = {
  title: string;
  h1: string;
  description: string;
  keywords: string[];
  canonical: string;
  wordCount: number;
};

export function getPostSeo(post: Post): PostSeo {
  const override = getOverride(post.id);
  const text = post.text || "";
  const wordCount = text ? text.split(/\s+/).filter(Boolean).length : 0;
  const site = getSiteConfig();

  const fallbackTitle = autoTitle(text) || `Пост #${post.id}`;
  const fallbackH1 = autoH1(text) || `Пост #${post.id}`;
  const fallbackDescription = autoDescription(text) || site.description;

  return {
    title: override?.title?.trim() || fallbackTitle,
    h1: override?.h1?.trim() || fallbackH1,
    description: override?.description?.trim() || fallbackDescription,
    keywords: Array.isArray(override?.keywords) ? override.keywords : [],
    canonical: `${site.siteUrl.replace(/\/+$/, "")}/post/${post.id}/`,
    wordCount,
  };
}
