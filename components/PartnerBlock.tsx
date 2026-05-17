"use client";

import { useEffect, useState } from "react";
import type { PartnerLink } from "@/lib/site";
import { PartnerIcon, detectPlatform, PLATFORM_COLOR } from "./PartnerIcon";

type PartnersFile = {
  blockTitle: string;
  global: PartnerLink[];
  perPost: { postId: string; links: PartnerLink[] }[];
};

type Snapshot = {
  title: string;
  links: PartnerLink[];
};

function pickFor(data: PartnersFile, postId: string): Snapshot {
  const own = data.perPost?.find((p) => String(p.postId) === String(postId));
  const links = [...(data.global || []), ...(own?.links ?? [])].filter(
    (l) => l && l.title && l.url
  );
  return { title: data.blockTitle || "Партнёры", links };
}

export function PartnerBlock({
  postId,
  fallback,
}: {
  postId: string;
  fallback: Snapshot;
}) {
  const [snap, setSnap] = useState<Snapshot>(fallback);

  useEffect(() => {
    let alive = true;
    fetch("/data/partner-links.json", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: PartnersFile | null) => {
        if (!alive || !d) return;
        setSnap(pickFor(d, postId));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [postId]);

  if (!snap.links.length) return null;

  return (
    <section className="mt-6 mb-12 rounded-2xl border border-rose-200/70 bg-gradient-to-br from-rose-50/90 to-pink-50/70 p-5 backdrop-blur-sm dark:border-rose-900/40 dark:from-rose-950/50 dark:to-pink-950/40">
      <div className="mb-3 text-xs font-medium uppercase tracking-wide text-rose-500/80 dark:text-rose-300/70">
        {snap.title}
      </div>
      <ul className="flex flex-wrap gap-2">
        {snap.links.map((l, i) => {
          const platform = detectPlatform(l.url);
          const colorClass = PLATFORM_COLOR[platform] || "text-rose-500";
          return (
            <li key={`${l.url}-${i}`}>
              <a
                href={l.url}
                target={
                  l.url.startsWith("mailto:") || l.url.startsWith("tel:")
                    ? undefined
                    : "_blank"
                }
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white/85 px-3.5 py-1.5 text-sm font-medium text-rose-700 shadow-sm transition hover:-translate-y-0.5 hover:border-rose-400 hover:shadow-md dark:border-rose-900/60 dark:bg-rose-950/60 dark:text-rose-200"
              >
                <span className={`${colorClass} text-base`}>
                  <PartnerIcon url={l.url} />
                </span>
                <span>{l.title}</span>
                <span aria-hidden className="text-rose-400">→</span>
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
