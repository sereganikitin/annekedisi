import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import Script from "next/script";
import Link from "next/link";
import "./globals.css";
import { BackgroundCats, CatFace } from "@/components/Cats";
import { getSiteConfig, absoluteUrl } from "@/lib/site";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

export function generateMetadata(): Metadata {
  const site = getSiteConfig();
  const og = site.ogImage ? absoluteUrl(site.ogImage) : undefined;
  return {
    metadataBase: new URL(site.siteUrl),
    title: { default: site.title, template: `%s — ${site.siteName}` },
    description: site.description,
    applicationName: site.siteName,
    robots: site.robots,
    openGraph: {
      type: "website",
      siteName: site.siteName,
      title: site.title,
      description: site.description,
      url: site.siteUrl,
      locale: site.locale,
      images: og ? [og] : [],
    },
    twitter: {
      card: "summary_large_image",
      title: site.title,
      description: site.description,
      images: og ? [og] : [],
    },
    alternates: { canonical: site.siteUrl },
    verification: {
      yandex: site.verification?.yandex || undefined,
      google: site.verification?.google || undefined,
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const site = getSiteConfig();
  const tg = `https://t.me/${site.telegramChannel}`;

  const orgLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: site.organization.name,
    url: site.siteUrl,
    logo: site.organization.logo ? absoluteUrl(site.organization.logo) : undefined,
    sameAs: [tg].filter(Boolean),
  };
  const websiteLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: site.siteName,
    url: site.siteUrl,
    inLanguage: site.language,
    description: site.description,
  };

  return (
    <html lang={site.language} className={`${manrope.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <BackgroundCats />

        <header className="border-b border-rose-200/60 bg-rose-50/70 backdrop-blur supports-[backdrop-filter]:bg-rose-50/50 dark:border-rose-900/40 dark:bg-rose-950/40">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
            <Link href="/" className="group flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-rose-200 to-pink-300 text-rose-700 shadow-sm transition-transform group-hover:rotate-[8deg] dark:from-rose-900 dark:to-pink-800 dark:text-rose-100">
                <CatFace className="h-7 w-7" />
              </span>
              <span className="flex flex-col leading-tight">
                <span className="text-base font-semibold tracking-tight text-rose-950 dark:text-rose-100">
                  {site.siteName}
                </span>
                <span className="text-xs text-rose-500/80 dark:text-rose-300/70">
                  {site.tagline}
                </span>
              </span>
            </Link>
            <a
              href={tg}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-white/80 px-3.5 py-1.5 text-xs font-medium text-rose-700 shadow-sm transition hover:border-rose-400 hover:text-rose-800 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-200"
            >
              <TelegramIcon className="h-3.5 w-3.5" />
              в Telegram
            </a>
          </div>
        </header>

        <main className="flex-1 relative">{children}</main>

        <footer className="mt-16 border-t border-rose-200/60 bg-rose-50/50 dark:border-rose-900/40 dark:bg-rose-950/30">
          <div className="mx-auto max-w-6xl px-5 py-8 text-center text-xs text-rose-500/80 dark:text-rose-300/70">
            Источник —{" "}
            <a
              className="underline decoration-dotted hover:text-rose-700 dark:hover:text-rose-100"
              href={tg}
              target="_blank"
              rel="noopener noreferrer"
            >
              @{site.telegramChannel}
            </a>
            . Сайт не является официальным.
          </div>
        </footer>

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteLd) }}
        />

        {site.yandexMetrika ? (
          <>
            <Script id="yandex-metrika" strategy="afterInteractive">{`
(function(m,e,t,r,i,k,a){
  m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
  m[i].l=1*new Date();
  for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
  k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)
})(window, document,'script','https://mc.yandex.ru/metrika/tag.js?id=${site.yandexMetrika}', 'ym');

ym(${site.yandexMetrika}, 'init', {ssr:true, webvisor:true, clickmap:true, ecommerce:"dataLayer", accurateTrackBounce:true, trackLinks:true});
            `}</Script>
            <noscript>
              <div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://mc.yandex.ru/watch/${site.yandexMetrika}`}
                  style={{ position: "absolute", left: "-9999px" }}
                  alt=""
                />
              </div>
            </noscript>
          </>
        ) : null}
      </body>
    </html>
  );
}

function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0Zm5.94 8.18-1.98 9.35c-.15.66-.54.82-1.1.51l-3.05-2.24-1.47 1.41c-.16.16-.3.3-.61.3l.22-3.1 5.66-5.12c.25-.22-.05-.34-.39-.13l-7 4.4-3.01-.94c-.65-.21-.66-.65.14-.96l11.78-4.54c.55-.2 1.03.12.85.96Z" />
    </svg>
  );
}
