// Scrapes posts from the public Telegram channel preview (t.me/s/annekedisi)
// and writes them to data/posts.json. No bot/token required — only public posts.
//
// Usage:
//   node scripts/fetch-posts.mjs           # fetch latest page (~20 posts)
//   node scripts/fetch-posts.mjs --pages=5 # paginate up to 5 pages back (~100 posts)

import { load } from "cheerio";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const CHANNEL = "annekedisi";
const BASE_URL = `https://t.me/s/${CHANNEL}`;
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? true];
  })
);
const MAX_PAGES = Math.max(1, Math.min(20, Number(args.pages) || 5));

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const OUT_FILE = resolve(ROOT, "data/posts.json");

function extractBgUrl(style) {
  if (!style) return null;
  const m = style.match(/background-image\s*:\s*url\(['"]?([^'")]+)['"]?\)/i);
  return m ? m[1] : null;
}

function parsePosts(html) {
  const $ = load(html);
  const posts = [];

  $(".tgme_widget_message_wrap").each((_, wrap) => {
    const $wrap = $(wrap);
    const $msg = $wrap.find(".tgme_widget_message").first();
    if (!$msg.length) return;

    const dataPost = $msg.attr("data-post") || "";
    const id = dataPost.split("/")[1];
    if (!id) return;

    // Service messages (e.g. "Channel created") have no text/media — skip them.
    if ($msg.hasClass("service_message")) return;

    // --- Text ---
    const $text = $msg.find(".tgme_widget_message_text.js-message_text").first();
    // Clone, convert <br> to newlines, then read text. Preserve link text.
    let text = "";
    let html_text = "";
    if ($text.length) {
      const $clone = $text.clone();
      $clone.find("br").replaceWith("\n");
      text = $clone.text().trim();
      html_text = $text.html() || "";
    }

    // --- Photos ---
    const photos = [];
    $msg.find(".tgme_widget_message_photo_wrap").each((_, el) => {
      const url = extractBgUrl($(el).attr("style"));
      if (url) photos.push(url);
    });

    // --- Videos ---
    const videos = [];
    $msg.find(".tgme_widget_message_video").each((_, el) => {
      const src = $(el).attr("src");
      const thumb = extractBgUrl(
        $(el).closest(".tgme_widget_message_video_player")
          .find(".tgme_widget_message_video_thumb").attr("style")
      );
      if (src) videos.push({ src, thumb: thumb || null });
    });

    // --- Round video / voice / audio (best-effort) ---
    const roundVideo = $msg.find(".tgme_widget_message_roundvideo").attr("src") || null;
    const voice = $msg.find(".tgme_widget_message_voice").attr("src") || null;

    // --- Date ---
    const $time = $msg.find(".tgme_widget_message_date time").first();
    const datetime = $time.attr("datetime") || null;

    // --- Views ---
    const views = $msg.find(".tgme_widget_message_views").first().text().trim() || null;

    // --- Author / forwarded ---
    const forwardedFrom =
      $msg.find(".tgme_widget_message_forwarded_from_name").first().text().trim() || null;

    // --- Link preview (when post is just a link) ---
    const $preview = $msg.find(".tgme_widget_message_link_preview").first();
    let preview = null;
    if ($preview.length) {
      preview = {
        url: $preview.attr("href") || null,
        site: $preview.find(".link_preview_site_name").text().trim() || null,
        title: $preview.find(".link_preview_title").text().trim() || null,
        description: $preview.find(".link_preview_description").text().trim() || null,
        image: extractBgUrl($preview.find(".link_preview_image, .link_preview_right_image").attr("style")),
      };
    }

    posts.push({
      id,
      url: `https://t.me/${CHANNEL}/${id}`,
      text,
      html: html_text,
      photos,
      videos,
      roundVideo,
      voice,
      datetime,
      views,
      forwardedFrom,
      preview,
    });
  });

  return posts;
}

async function fetchPage(beforeId) {
  const url = beforeId ? `${BASE_URL}?before=${beforeId}` : BASE_URL;
  const res = await fetch(url, {
    headers: {
      "User-Agent": UA,
      "Accept-Language": "ru,en;q=0.9",
    },
  });
  if (!res.ok) {
    throw new Error(`Fetch failed: ${res.status} ${res.statusText} for ${url}`);
  }
  const html = await res.text();
  return parsePosts(html);
}

async function main() {
  console.log(`Scraping @${CHANNEL} (up to ${MAX_PAGES} pages)...`);
  const seen = new Map();

  let before = null;
  for (let page = 0; page < MAX_PAGES; page++) {
    const batch = await fetchPage(before);
    if (!batch.length) {
      console.log(`Page ${page + 1}: 0 posts — stopping.`);
      break;
    }
    let newOnes = 0;
    for (const p of batch) {
      if (!seen.has(p.id)) {
        seen.set(p.id, p);
        newOnes++;
      }
    }
    console.log(
      `Page ${page + 1}: parsed ${batch.length} posts (${newOnes} new). Oldest id=${batch[0].id}.`
    );
    if (newOnes === 0) break;
    before = batch[0].id; // oldest visible on page → fetch older next
  }

  const all = [...seen.values()].sort((a, b) => Number(b.id) - Number(a.id));

  await mkdir(dirname(OUT_FILE), { recursive: true });
  await writeFile(
    OUT_FILE,
    JSON.stringify(
      { channel: CHANNEL, fetchedAt: new Date().toISOString(), count: all.length, posts: all },
      null,
      2
    ),
    "utf8"
  );
  console.log(`Saved ${all.length} posts → ${OUT_FILE}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
