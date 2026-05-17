import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import Link from "next/link";
import "./globals.css";

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
      <body className="min-h-full flex flex-col bg-stone-50 text-stone-900 dark:bg-stone-950 dark:text-stone-100">
        <header className="border-b border-stone-200/70 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:border-stone-800 dark:bg-stone-950/80">
          <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4">
            <Link href="/" className="group flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-rose-400 to-amber-300 text-white shadow-sm transition-transform group-hover:rotate-6">
                <span className="text-base font-bold">A</span>
              </span>
              <span className="flex flex-col leading-tight">
                <span className="text-base font-semibold tracking-tight">annekedisi</span>
                <span className="text-xs text-stone-500 dark:text-stone-400">
                  заметки и кадры
                </span>
              </span>
            </Link>
            <a
              href="https://t.me/annekedisi"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-3.5 py-1.5 text-xs font-medium text-stone-700 transition hover:border-rose-300 hover:text-rose-600 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300"
            >
              <TelegramIcon className="h-3.5 w-3.5" />
              в Telegram
            </a>
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="border-t border-stone-200/70 mt-16 dark:border-stone-800">
          <div className="mx-auto max-w-3xl px-5 py-8 text-center text-xs text-stone-500 dark:text-stone-400">
            Источник —{" "}
            <a
              className="underline decoration-dotted hover:text-rose-600"
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
