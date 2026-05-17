// annekedisi admin API. Stand-alone, no npm deps.
// nginx forwards https://pinkcrab.ru/api/* → http://127.0.0.1:7777/*
//
// Env (loaded from /opt/admin/env):
//   ADMIN_USER              login name
//   ADMIN_PASSWORD_SALT     hex salt for scrypt
//   ADMIN_PASSWORD_HASH     hex scrypt hash of (password, salt, 64)
//   JWT_SECRET              random hex string used to sign cookies
//   DATA_DIR                directory holding live JSON files
//                           (e.g. /var/www/admin-data)
//   PORT                    default 7777
//   TURNSTILE_SITE_KEY      Cloudflare Turnstile site key (public)
//   TURNSTILE_SECRET        Cloudflare Turnstile secret key (server-side)
//   COMMENTS_AUTO_APPROVE   "1" → comments published immediately; otherwise
//                           land in "pending" and require admin approval
//
// Public endpoints (no auth):
//   GET  /api/healthz                  → "ok"
//   GET  /api/config                   → { turnstileSiteKey, commentsEnabled,
//                                         commentsAutoApprove }
//   GET  /api/comments/:postId         → approved comments for a post
//   POST /api/comments/:postId         → submit a comment
//
// Admin endpoints (require admin_session cookie):
//   POST   /api/login                  → set cookie
//   POST   /api/logout                 → clear cookie
//   GET    /api/me                     → { user }
//   GET    /api/partners               → partner-links.json
//   PUT    /api/partners               → write partner-links.json
//   GET    /api/admin/comments         → all comments + filter
//   PATCH  /api/admin/comments/:id     → update status/body/author
//   DELETE /api/admin/comments/:id     → permanently delete

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { scryptSync, createHmac, timingSafeEqual } = require("node:crypto");

const PORT = Number(process.env.PORT || 7777);
const USER = must("ADMIN_USER");
const SALT = must("ADMIN_PASSWORD_SALT");
const HASH = must("ADMIN_PASSWORD_HASH");
const JWT_SECRET = must("JWT_SECRET");
const DATA_DIR = must("DATA_DIR");

const TURNSTILE_SITE_KEY = (process.env.TURNSTILE_SITE_KEY || "").trim();
const TURNSTILE_SECRET = (process.env.TURNSTILE_SECRET || "").trim();
const COMMENTS_AUTO_APPROVE = process.env.COMMENTS_AUTO_APPROVE === "1";

const PARTNERS_FILE = path.join(DATA_DIR, "partner-links.json");
const COMMENTS_FILE = path.join(DATA_DIR, "comments.json");
const SESSION_TTL_SEC = 7 * 24 * 3600;

function must(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing required env ${name}`);
    process.exit(1);
  }
  return v;
}

fs.mkdirSync(DATA_DIR, { recursive: true });

const DEFAULT_PARTNERS = {
  blockTitle: "Наши друзья и партнёры",
  global: [],
  perPost: [],
};

const DEFAULT_COMMENTS = { nextId: 1, comments: [] };

// --- storage helpers ---
function readJsonOrDefault(file, defaults) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return JSON.parse(JSON.stringify(defaults));
  }
}

function atomicWrite(file, data) {
  const tmp = file + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, file);
}

// --- crypto helpers ---
function verifyPassword(plain) {
  const got = scryptSync(plain, Buffer.from(SALT, "hex"), 64);
  const want = Buffer.from(HASH, "hex");
  return got.length === want.length && timingSafeEqual(got, want);
}

function signToken(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", JWT_SECRET).update(body).digest("base64url");
  return `${body}.${sig}`;
}

function verifyToken(token) {
  if (!token || typeof token !== "string") return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", JWT_SECRET).update(body).digest("base64url");
  if (expected.length !== sig.length) return null;
  try {
    if (!timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return null;
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

function parseCookies(header) {
  const out = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k) out[k] = rest.join("=");
  }
  return out;
}

function sessionUser(req) {
  const c = parseCookies(req.headers.cookie || "");
  const data = verifyToken(c.admin_session);
  return data?.user || null;
}

function clientIp(req) {
  const xff = req.headers["x-real-ip"] || req.headers["x-forwarded-for"] || "";
  return String(xff).split(",")[0].trim() || req.socket.remoteAddress || "?";
}

// --- HTTP helpers ---
function send(res, status, body, extraHeaders = {}) {
  const isObj = body && typeof body === "object";
  const payload = isObj ? JSON.stringify(body) : body || "";
  res.writeHead(status, {
    "Content-Type": isObj ? "application/json; charset=utf-8" : "text/plain; charset=utf-8",
    "Cache-Control": "no-store",
    ...extraHeaders,
  });
  res.end(payload);
}

function readBody(req, max = 256 * 1024) {
  return new Promise((resolve, reject) => {
    let buf = "";
    req.on("data", (chunk) => {
      buf += chunk;
      if (buf.length > max) {
        req.destroy();
        reject(new Error("body too large"));
      }
    });
    req.on("end", () => {
      if (!buf) return resolve({});
      try {
        resolve(JSON.parse(buf));
      } catch {
        reject(new Error("invalid json"));
      }
    });
    req.on("error", reject);
  });
}

// --- rate limit (in-memory, per process) ---
const ipHistory = new Map();
const RATE_WINDOW_SEC = 3600;
const RATE_MAX_PER_HOUR = 5;
const RATE_MIN_GAP_SEC = 60;

function checkRateLimit(ip) {
  const now = Math.floor(Date.now() / 1000);
  const cutoff = now - RATE_WINDOW_SEC;
  const arr = (ipHistory.get(ip) || []).filter((t) => t > cutoff);
  ipHistory.set(ip, arr);
  if (arr.length >= RATE_MAX_PER_HOUR) {
    return { ok: false, reason: `Слишком много комментариев. Попробуй через час.` };
  }
  if (arr.length && now - arr[arr.length - 1] < RATE_MIN_GAP_SEC) {
    const wait = RATE_MIN_GAP_SEC - (now - arr[arr.length - 1]);
    return { ok: false, reason: `Слишком часто. Подожди ${wait} сек.` };
  }
  return { ok: true };
}

function noteRateLimit(ip) {
  const arr = ipHistory.get(ip) || [];
  arr.push(Math.floor(Date.now() / 1000));
  ipHistory.set(ip, arr);
}

// --- Turnstile verification ---
async function verifyTurnstile(token, ip) {
  if (!TURNSTILE_SECRET) return { ok: true, skipped: true };
  if (!token || typeof token !== "string") return { ok: false, reason: "missing-token" };
  try {
    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          secret: TURNSTILE_SECRET,
          response: token,
          remoteip: ip,
        }).toString(),
      }
    );
    const data = await res.json();
    if (data.success) return { ok: true };
    return { ok: false, reason: (data["error-codes"] || []).join(",") || "failed" };
  } catch (err) {
    return { ok: false, reason: "network: " + String(err) };
  }
}

// --- validators ---
function validatePartnersPayload(p) {
  if (!p || typeof p !== "object") throw new Error("payload must be object");
  const out = {
    blockTitle: typeof p.blockTitle === "string" ? p.blockTitle : "Наши друзья и партнёры",
    global: [],
    perPost: [],
  };
  const checkLink = (l) => {
    if (!l || typeof l !== "object") return null;
    const title = String(l.title || "").trim();
    const url = String(l.url || "").trim();
    if (!title || !url) return null;
    if (!/^(https?:|mailto:|tel:|\/)/i.test(url)) return null;
    if (title.length > 120) return null;
    if (url.length > 2048) return null;
    return { title, url };
  };
  if (Array.isArray(p.global)) {
    out.global = p.global.map(checkLink).filter(Boolean).slice(0, 50);
  }
  if (Array.isArray(p.perPost)) {
    out.perPost = p.perPost
      .map((entry) => {
        if (!entry || typeof entry !== "object") return null;
        const postId = String(entry.postId || "").trim();
        if (!postId || !/^\d+$/.test(postId)) return null;
        const links = Array.isArray(entry.links)
          ? entry.links.map(checkLink).filter(Boolean).slice(0, 20)
          : [];
        return { postId, links };
      })
      .filter(Boolean)
      .slice(0, 500);
  }
  return out;
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/;
const POST_ID_RE = /^\d+$/;
const URL_INSIDE_RE = /https?:\/\//gi;

function validateNewComment(body) {
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const text = String(body.body || "").trim();

  if (name.length < 2 || name.length > 60)
    throw new Error("Имя должно быть от 2 до 60 символов");
  if (!EMAIL_RE.test(email) || email.length > 120)
    throw new Error("Неверный email");
  if (text.length < 2 || text.length > 4000)
    throw new Error("Текст комментария должен быть от 2 до 4000 символов");

  // Soft spam check: lots of URLs is suspicious
  const urlMatches = text.match(URL_INSIDE_RE);
  if (urlMatches && urlMatches.length > 3)
    throw new Error("Слишком много ссылок в тексте");

  return { name, email, body: text };
}

// --- routes ---
const COMMENT_PUBLIC_FIELDS = ["id", "postId", "author", "body", "createdAt"];

function publicComment(c) {
  const out = {};
  for (const k of COMMENT_PUBLIC_FIELDS) out[k] = c[k];
  return out;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  const pathname = url.pathname.replace(/^\/api(?=\/|$)/, "") || "/";
  const route = `${req.method} ${pathname}`;

  try {
    // ----- public -----
    if (route === "GET /healthz") return send(res, 200, "ok");

    if (route === "GET /config") {
      return send(res, 200, {
        turnstileSiteKey: TURNSTILE_SITE_KEY || null,
        commentsEnabled: true,
        commentsAutoApprove: COMMENTS_AUTO_APPROVE,
      });
    }

    const commentsMatch = pathname.match(/^\/comments\/(\d+)\/?$/);
    if (commentsMatch && req.method === "GET") {
      const postId = commentsMatch[1];
      const data = readJsonOrDefault(COMMENTS_FILE, DEFAULT_COMMENTS);
      const items = data.comments
        .filter((c) => c.postId === postId && c.status === "approved")
        .sort((a, b) => a.createdAt - b.createdAt)
        .map(publicComment);
      return send(res, 200, { items });
    }

    if (commentsMatch && req.method === "POST") {
      const postId = commentsMatch[1];
      const body = await readBody(req);

      // honeypot — silently accept and discard
      if (body.website && String(body.website).trim() !== "") {
        return send(res, 200, { ok: true, status: "filtered" });
      }

      const ip = clientIp(req);
      const rate = checkRateLimit(ip);
      if (!rate.ok) return send(res, 429, { error: rate.reason });

      let clean;
      try {
        clean = validateNewComment(body);
      } catch (e) {
        return send(res, 400, { error: e.message });
      }

      const tsResult = await verifyTurnstile(body.turnstile, ip);
      if (!tsResult.ok) {
        return send(res, 400, {
          error:
            tsResult.reason === "missing-token"
              ? "Подтверди, что ты не робот"
              : "Проверка анти-спам не пройдена. Обнови страницу и попробуй ещё раз.",
        });
      }

      noteRateLimit(ip);

      const data = readJsonOrDefault(COMMENTS_FILE, DEFAULT_COMMENTS);
      const comment = {
        id: data.nextId++,
        postId,
        author: clean.name,
        email: clean.email,
        body: clean.body,
        createdAt: Math.floor(Date.now() / 1000),
        status: COMMENTS_AUTO_APPROVE ? "approved" : "pending",
        ip,
        userAgent: String(req.headers["user-agent"] || "").slice(0, 200),
      };
      data.comments.push(comment);
      atomicWrite(COMMENTS_FILE, data);

      return send(res, 200, {
        ok: true,
        status: comment.status,
        id: comment.id,
      });
    }

    // ----- session -----
    if (route === "POST /login") {
      const body = await readBody(req);
      const user = String(body.user || "");
      const pass = String(body.password || "");
      if (user !== USER || !verifyPassword(pass)) {
        return send(res, 401, { error: "Неверный логин или пароль" });
      }
      const token = signToken({
        user,
        exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SEC,
      });
      return send(
        res,
        200,
        { user },
        {
          "Set-Cookie": `admin_session=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_TTL_SEC}`,
        }
      );
    }

    if (route === "POST /logout") {
      return send(res, 204, "", {
        "Set-Cookie":
          "admin_session=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0",
      });
    }

    if (route === "GET /me") {
      const u = sessionUser(req);
      if (!u) return send(res, 401, { error: "unauthorized" });
      return send(res, 200, { user: u });
    }

    // ----- admin -----
    const adminUser = sessionUser(req);
    const requireAdmin = () => {
      if (!adminUser) {
        send(res, 401, { error: "unauthorized" });
        return false;
      }
      return true;
    };

    if (route === "GET /partners") {
      if (!requireAdmin()) return;
      return send(res, 200, readJsonOrDefault(PARTNERS_FILE, DEFAULT_PARTNERS));
    }

    if (route === "PUT /partners") {
      if (!requireAdmin()) return;
      const body = await readBody(req);
      const clean = validatePartnersPayload(body);
      atomicWrite(PARTNERS_FILE, clean);
      return send(res, 200, clean);
    }

    if (route === "GET /admin/comments") {
      if (!requireAdmin()) return;
      const status = url.searchParams.get("status") || "all";
      const data = readJsonOrDefault(COMMENTS_FILE, DEFAULT_COMMENTS);
      const items = data.comments
        .filter((c) => status === "all" || c.status === status)
        .sort((a, b) => b.createdAt - a.createdAt);
      return send(res, 200, { items });
    }

    const adminCommentMatch = pathname.match(/^\/admin\/comments\/(\d+)\/?$/);
    if (adminCommentMatch && req.method === "PATCH") {
      if (!requireAdmin()) return;
      const id = Number(adminCommentMatch[1]);
      const body = await readBody(req);
      const data = readJsonOrDefault(COMMENTS_FILE, DEFAULT_COMMENTS);
      const c = data.comments.find((x) => x.id === id);
      if (!c) return send(res, 404, { error: "comment not found" });
      if (typeof body.status === "string") {
        if (!["pending", "approved", "spam"].includes(body.status))
          return send(res, 400, { error: "bad status" });
        c.status = body.status;
      }
      if (typeof body.body === "string") {
        const t = body.body.trim();
        if (t.length < 2 || t.length > 4000)
          return send(res, 400, { error: "bad body length" });
        c.body = t;
      }
      if (typeof body.author === "string") {
        const a = body.author.trim();
        if (a.length < 2 || a.length > 60)
          return send(res, 400, { error: "bad author length" });
        c.author = a;
      }
      atomicWrite(COMMENTS_FILE, data);
      return send(res, 200, c);
    }

    if (adminCommentMatch && req.method === "DELETE") {
      if (!requireAdmin()) return;
      const id = Number(adminCommentMatch[1]);
      const data = readJsonOrDefault(COMMENTS_FILE, DEFAULT_COMMENTS);
      const i = data.comments.findIndex((x) => x.id === id);
      if (i === -1) return send(res, 404, { error: "comment not found" });
      data.comments.splice(i, 1);
      atomicWrite(COMMENTS_FILE, data);
      return send(res, 204, "");
    }

    return send(res, 404, { error: "not found" });
  } catch (err) {
    console.error(err);
    return send(res, 400, { error: err.message || "bad request" });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(
    `admin api listening on 127.0.0.1:${PORT} (DATA_DIR=${DATA_DIR}, turnstile=${
      TURNSTILE_SECRET ? "on" : "off"
    }, auto-approve=${COMMENTS_AUTO_APPROVE})`
  );
});
