import type { PartnerLink } from "@/lib/site";

export function PartnerBlock({
  title,
  links,
}: {
  title: string;
  links: PartnerLink[];
}) {
  if (!links.length) return null;
  return (
    <section className="mx-5 mb-6 rounded-2xl border border-rose-200/70 bg-gradient-to-br from-rose-50/90 to-pink-50/70 p-5 sm:mx-8 dark:border-rose-900/40 dark:from-rose-950/50 dark:to-pink-950/40">
      <div className="mb-3 text-xs font-medium uppercase tracking-wide text-rose-500/80 dark:text-rose-300/70">
        {title}
      </div>
      <ul className="flex flex-wrap gap-2">
        {links.map((l, i) => (
          <li key={`${l.url}-${i}`}>
            <a
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-white/85 px-3.5 py-1.5 text-sm font-medium text-rose-700 shadow-sm transition hover:-translate-y-0.5 hover:border-rose-400 hover:shadow-md dark:border-rose-900/60 dark:bg-rose-950/60 dark:text-rose-200"
            >
              {l.title}
              <span aria-hidden>→</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
