"use client";

import { useEffect, useRef, useState } from "react";

type Comment = {
  id: number;
  postId: string;
  author: string;
  body: string;
  createdAt: number;
};

type Config = {
  turnstileSiteKey: string | null;
  commentsEnabled: boolean;
  commentsAutoApprove: boolean;
};

const MONTHS_RU = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];

function formatTime(unix: number): string {
  const d = new Date(unix * 1000);
  const day = d.getDate();
  const month = MONTHS_RU[d.getMonth()];
  const year = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${day} ${month} ${year}, ${hh}:${mm}`;
}

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: {
          sitekey: string;
          callback: (token: string) => void;
          "error-callback"?: () => void;
          "expired-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
        }
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

export function Comments({ postId }: { postId: string }) {
  const [config, setConfig] = useState<Config | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(true);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [body, setBody] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [turnstileToken, setTurnstileToken] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<
    | { kind: "idle" }
    | { kind: "ok"; text: string }
    | { kind: "err"; text: string }
  >({ kind: "idle" });

  const turnstileMount = useRef<HTMLDivElement>(null);
  const turnstileWidgetId = useRef<string | null>(null);

  // Bootstrap: load config + comments in parallel
  useEffect(() => {
    let alive = true;
    fetch("/api/config", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: Config | null) => alive && setConfig(d))
      .catch(() => alive && setConfig(null));
    fetch(`/api/comments/${postId}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d) => {
        if (!alive) return;
        setComments(d.items || []);
        setLoadingComments(false);
      })
      .catch(() => alive && setLoadingComments(false));
    return () => {
      alive = false;
    };
  }, [postId]);

  // Inject Turnstile script + render widget when config arrives
  useEffect(() => {
    if (!config?.turnstileSiteKey) return;

    const src = "https://challenges.cloudflare.com/turnstile/v0/api.js?onload=__turnstileLoaded&render=explicit";
    let scriptEl = document.querySelector<HTMLScriptElement>(
      'script[data-turnstile="annekedisi"]'
    );

    let cancelled = false;
    const onLoad = () => {
      if (cancelled || !window.turnstile || !turnstileMount.current) return;
      // Clear any prior widget on the mount node
      if (turnstileWidgetId.current) {
        try {
          window.turnstile.remove(turnstileWidgetId.current);
        } catch {}
        turnstileWidgetId.current = null;
      }
      turnstileWidgetId.current = window.turnstile.render(turnstileMount.current, {
        sitekey: config.turnstileSiteKey!,
        callback: (token: string) => setTurnstileToken(token),
        "error-callback": () => setTurnstileToken(""),
        "expired-callback": () => setTurnstileToken(""),
      });
    };

    (window as Window & { __turnstileLoaded?: () => void }).__turnstileLoaded = onLoad;

    if (!scriptEl) {
      scriptEl = document.createElement("script");
      scriptEl.src = src;
      scriptEl.async = true;
      scriptEl.defer = true;
      scriptEl.dataset.turnstile = "annekedisi";
      document.head.appendChild(scriptEl);
    } else if (window.turnstile) {
      onLoad();
    }

    return () => {
      cancelled = true;
      if (turnstileWidgetId.current && window.turnstile) {
        try {
          window.turnstile.remove(turnstileWidgetId.current);
        } catch {}
        turnstileWidgetId.current = null;
      }
    };
  }, [config?.turnstileSiteKey]);

  const reload = async () => {
    const r = await fetch(`/api/comments/${postId}`, { cache: "no-store" });
    if (r.ok) {
      const d = await r.json();
      setComments(d.items || []);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setStatus({ kind: "idle" });

    try {
      const r = await fetch(`/api/comments/${postId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          body,
          website,
          turnstile: turnstileToken,
        }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setStatus({ kind: "err", text: data.error || "Не удалось отправить" });
      } else if (data.status === "approved") {
        setName("");
        setEmail("");
        setBody("");
        setTurnstileToken("");
        if (window.turnstile && turnstileWidgetId.current)
          window.turnstile.reset(turnstileWidgetId.current);
        setStatus({ kind: "ok", text: "Опубликовано — спасибо!" });
        reload();
      } else {
        setName("");
        setEmail("");
        setBody("");
        setTurnstileToken("");
        if (window.turnstile && turnstileWidgetId.current)
          window.turnstile.reset(turnstileWidgetId.current);
        setStatus({
          kind: "ok",
          text: "Комментарий отправлен на модерацию. Появится после проверки.",
        });
      }
    } catch (e) {
      setStatus({ kind: "err", text: "Сеть не отвечает. Попробуй ещё раз." });
    } finally {
      setSubmitting(false);
    }
  };

  if (config && !config.commentsEnabled) return null;

  const turnstileReady = !config?.turnstileSiteKey || turnstileToken.length > 0;
  const canSubmit =
    !submitting &&
    name.trim().length >= 2 &&
    /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email.trim()) &&
    body.trim().length >= 2 &&
    turnstileReady;

  return (
    <section className="mx-5 mb-6 sm:mx-8" aria-labelledby="comments-h">
      <h2
        id="comments-h"
        className="mb-4 text-xl font-semibold text-rose-950 dark:text-rose-50"
      >
        Комментарии
        {comments.length ? (
          <span className="ml-2 text-base font-normal text-rose-400">
            {comments.length}
          </span>
        ) : null}
      </h2>

      {loadingComments ? (
        <p className="text-sm text-rose-500/70">Загрузка…</p>
      ) : comments.length === 0 ? (
        <p className="mb-5 text-sm text-rose-500/70">
          Пока нет комментариев. Будь первым!
        </p>
      ) : (
        <ol className="mb-6 space-y-4">
          {comments.map((c) => (
            <li
              key={c.id}
              className="rounded-2xl border border-rose-200/70 bg-white/85 px-4 py-3 backdrop-blur-sm dark:border-rose-900/40 dark:bg-rose-950/40"
            >
              <div className="mb-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm">
                <span className="font-medium text-rose-900 dark:text-rose-100">
                  {c.author}
                </span>
                <time
                  className="text-xs text-rose-400"
                  dateTime={new Date(c.createdAt * 1000).toISOString()}
                >
                  {formatTime(c.createdAt)}
                </time>
              </div>
              <p className="whitespace-pre-line text-sm leading-relaxed text-rose-950/90 dark:text-rose-50/90">
                {c.body}
              </p>
            </li>
          ))}
        </ol>
      )}

      <form
        onSubmit={submit}
        className="rounded-2xl border border-rose-200/70 bg-white/85 p-4 backdrop-blur-sm dark:border-rose-900/40 dark:bg-rose-950/40"
      >
        <h3 className="mb-3 text-sm font-medium text-rose-700 dark:text-rose-200">
          Оставить комментарий
        </h3>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs text-rose-500/80">Имя</span>
            <input
              type="text"
              required
              minLength={2}
              maxLength={60}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              className="w-full rounded-xl border border-rose-200 bg-white/90 px-3 py-2 text-sm outline-none transition focus:border-rose-400 focus:ring-2 focus:ring-rose-300/40 dark:border-rose-900/60 dark:bg-rose-950/60 dark:text-rose-50"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-rose-500/80">Email (не публикуется)</span>
            <input
              type="email"
              required
              maxLength={120}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="w-full rounded-xl border border-rose-200 bg-white/90 px-3 py-2 text-sm outline-none transition focus:border-rose-400 focus:ring-2 focus:ring-rose-300/40 dark:border-rose-900/60 dark:bg-rose-950/60 dark:text-rose-50"
            />
          </label>
        </div>

        <label className="mt-3 block">
          <span className="mb-1 block text-xs text-rose-500/80">Комментарий</span>
          <textarea
            required
            minLength={2}
            maxLength={4000}
            rows={4}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="w-full rounded-xl border border-rose-200 bg-white/90 px-3 py-2 text-sm leading-relaxed outline-none transition focus:border-rose-400 focus:ring-2 focus:ring-rose-300/40 dark:border-rose-900/60 dark:bg-rose-950/60 dark:text-rose-50"
          />
        </label>

        {/* Honeypot — invisible to humans, attractive to bots */}
        <input
          type="text"
          name="website"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          autoComplete="off"
          tabIndex={-1}
          aria-hidden="true"
          className="absolute -left-[9999px] h-0 w-0 opacity-0"
        />

        {config?.turnstileSiteKey ? (
          <div className="mt-3" ref={turnstileMount} />
        ) : null}

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-rose-500/70">
            {config?.commentsAutoApprove
              ? "Комментарии публикуются сразу."
              : "Комментарии проходят модерацию."}
          </p>
          <button
            type="submit"
            disabled={!canSubmit}
            className="inline-flex items-center gap-1.5 rounded-full bg-rose-600 px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-rose-300"
          >
            {submitting ? "Отправляем…" : "Отправить"}
          </button>
        </div>

        {status.kind === "ok" ? (
          <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-100">
            {status.text}
          </p>
        ) : null}
        {status.kind === "err" ? (
          <p className="mt-3 rounded-xl bg-rose-100 px-3 py-2 text-sm text-rose-800 dark:bg-rose-950/60 dark:text-rose-100">
            {status.text}
          </p>
        ) : null}
      </form>
    </section>
  );
}
