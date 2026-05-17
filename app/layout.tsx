import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { BackgroundCats, CatFace } from "@/components/Cats";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Annekedisi — блог",
  description: "Заметки и кадры из канала Annekedisi",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru" className={`${manrope.variable} h-full antialiased`}>
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
                  annekedisi
                </span>
                <span className="text-xs text-rose-500/80 dark:text-rose-300/70">
                  заметки и кадры
                </span>
              </span>
            </Link>
            <a
              href="https://t.me/annekedisi"
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
              href="https://t.me/annekedisi"
              target="_blank"
              rel="noopener noreferrer"
            >
              @annekedisi
            </a>
            . Сайт не является официальным.
          </div>
        </footer>
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
