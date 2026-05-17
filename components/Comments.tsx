"use client";

import { useEffect, useRef, useState } from "react";

type Comment = {
  id: number;
  postId: string;
  parentId: number | null;
  author: string;
  body: string;
  createdAt: number;
};

type Config = {
  turnstileSiteKey: string | null;
  commentsEnabled: boolean;
  commentsAutoApprove: boolean;
};

type ReplyTo = { id: number; author: string } | null;

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

function CommentCard({
  comment,
  onReply,
}: {
  comment: Comment;
  onReply?: () => void;
}) {
  return (
    <div className="rounded-2xl border border-rose-200/70 bg-white/85 px-4 py-3 backdrop-blur-sm dark:border-rose-900/40 dark:bg-rose-950/40">
      <div className="mb-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm">
        <span className="font-medium text-rose-900 dark:text-rose-100">
          {comment.author}
        </span>
        <time
          className="text-xs text-rose-400"
          dateTime={new Date(comment.createdAt * 1000).toISOString()}
        >
          {formatTime(comment.createdAt)}
        </time>
      </div>
      <p className="whitespace-pre-line text-sm leading-relaxed text-rose-950/90 dark:text-rose-50/90">
        {comment.body}
      </p>
      {onReply ? (
        <button
          onClick={onReply}
          className="mt-2 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-rose-600 transition hover:bg-rose-100 hover:text-rose-700 dark:text-rose-300 dark:hover:bg-rose-950/60"
        >
          <ReplyIcon /> Ответить
        </button>
      ) : null}
    </div>
  );
}

function ReplyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true">
      <polyline points="9 17 4 12 9 7" />
      <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
    </svg>
  );
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
  const [replyTo, setReplyTo] = useState<ReplyTo>(null);

  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<
    | { kind: "idle" }
    | { kind: "ok"; text: string }
    | { kind: "err"; text: string }
  >({ kind: "idle" });

  const turnstileMount = useRef<HTMLDivElement>(null);
  const turnstileWidgetId = useRef<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  // Bootstrap
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

  // Turnstile widget
  useEffect(() => {
    if (!config?.turnstileSiteKey) return;
    const src =
      "https://challenges.cloudflare.com/turnstile/v0/api.js?onload=__turnstileLoaded&render=explicit";
    let scriptEl = document.querySelector<HTMLScriptElement>(
      'script[data-turnstile="annekedisi"]'
    );

    let cancelled = false;
    const onLoad = () => {
      if (cancelled || !window.turnstile || !turnstileMount.current) return;
      if (turnstileWidgetId.current) {
        try {
          window.turnstile.remove(turnstileWidgetId.current);
        } catch {}
        turnstileWidgetId.current = null;
      }
      turnstileWidgetId.current = window.turnstile.render(
        turnstileMount.current,
        {
          sitekey: config.turnstileSiteKey!,
          callback: (token: string) => setTurnstileToken(token),
          "error-callback": () => setTurnstileToken(""),
          "expired-callback": () => setTurnstileToken(""),
        }
      );
    };
    (
      window as Window & { __turnstileLoaded?: () => void }
    ).__turnstileLoaded = onLoad;

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

  const startReply = (c: Comment) => {
    setReplyTo({ id: c.id, author: c.author });
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      bodyRef.current?.focus();
    }, 50);
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
          parentId: replyTo?.id ?? null,
        }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setStatus({ kind: "err", text: data.error || "Не удалось отправить" });
      } else {
        setName("");
        setEmail("");
        setBody("");
        setTurnstileToken("");
        setReplyTo(null);
        if (window.turnstile && turnstileWidgetId.current)
          window.turnstile.reset(turnstileWidgetId.current);
        if (data.status === "approved") {
          setStatus({ kind: "ok", text: "Опубликовано — спасибо!" });
          reload();
        } else {
          setStatus({
            kind: "ok",
            text: "Комментарий отправлен на модерацию. Появится после проверки.",
          });
        }
      }
    } catch {
      setStatus({ kind: "err", text: "Сеть не отвечает. Попробуй ещё раз." });
    } finally {
      setSubmitting(false);
    }
  };

  if (config && !config.commentsEnabled) return null;

  // Group: top-level first, replies indexed by parent id
  const topLevel = comments.filter((c) => !c.parentId);
  const repliesByParent: Record<number, Comment[]> = {};
  for (const c of comments) {
    if (c.parentId) {
      (repliesByParent[c.parentId] ||= []).push(c);
    }
  }
  for (const arr of Object.values(repliesByParent)) {
    arr.sort((a, b) => a.createdAt - b.createdAt);
  }

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
      ) : topLevel.length === 0 ? (
        <p className="mb-5 text-sm text-rose-500/70">
          Пока нет комментариев. Будь первым!
        </p>
      ) : (
        <ol className="mb-6 space-y-4">
          {topLevel.map((c) => (
            <li key={c.id}>
              <CommentCard comment={c} onReply={() => startReply(c)} />
              {repliesByParent[c.id]?.length ? (
                <ol className="mt-2 ml-4 space-y-2 border-l-2 border-rose-200/80 pl-4 dark:border-rose-900/40 sm:ml-6 sm:pl-5">
                  {repliesByParent[c.id].map((r) => (
                    <li key={r.id}>
                      <CommentCard comment={r} />
                    </li>
                  ))}
                </ol>
              ) : null}
            </li>
          ))}
        </ol>
      )}

      <form
        ref={formRef}
        onSubmit={submit}
        className="rounded-2xl border border-rose-200/70 bg-white/85 p-4 backdrop-blur-sm dark:border-rose-900/40 dark:bg-rose-950/40"
      >
        <h3 className="mb-3 text-sm font-medium text-rose-700 dark:text-rose-200">
          {replyTo ? "Ответ" : "Оставить комментарий"}
        </h3>

        {replyTo ? (
          <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-rose-200/70 bg-rose-50/80 px-3 py-2 text-sm dark:border-rose-900/40 dark:bg-rose-950/40">
            <span>
              Отвечаешь на: <strong>{replyTo.author}</strong>
            </span>
            <button
              type="button"
              onClick={() => setReplyTo(null)}
              className="rounded-full px-2 py-0.5 text-xs text-rose-500 transition hover:bg-rose-100 hover:text-rose-700 dark:hover:bg-rose-950/60"
            >
              ✕ отменить
            </button>
          </div>
        ) : null}

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
            <span className="mb-1 block text-xs text-rose-500/80">
              Email (не публикуется)
            </span>
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
          <span className="mb-1 block text-xs text-rose-500/80">
            {replyTo ? "Ответ" : "Комментарий"}
          </span>
          <textarea
            ref={bodyRef}
            required
            minLength={2}
            maxLength={4000}
            rows={4}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="w-full rounded-xl border border-rose-200 bg-white/90 px-3 py-2 text-sm leading-relaxed outline-none transition focus:border-rose-400 focus:ring-2 focus:ring-rose-300/40 dark:border-rose-900/60 dark:bg-rose-950/60 dark:text-rose-50"
          />
        </label>

        {/* Honeypot */}
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
            {submitting ? "Отправляем…" : replyTo ? "Ответить" : "Отправить"}
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
