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
//
// Endpoints:
//   POST /api/login   {user,password}  → 200 + Set-Cookie  / 401
//   POST /api/logout                   → 204
//   GET  /api/me                       → {user} / 401
//   GET  /api/partners                 → partner-links.json
//   PUT  /api/partners                 → write partner-links.json
//   GET  /api/healthz                  → "ok"
//
// All write endpoints require a valid signed cookie.

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const {
  scryptSync,
  createHmac,
  timingSafeEqual,
  randomBytes,
} = require("node:crypto");

const PORT = Number(process.env.PORT || 7777);
const USER = must("ADMIN_USER");
const SALT = must("ADMIN_PASSWORD_SALT");
const HASH = must("ADMIN_PASSWORD_HASH");
const JWT_SECRET = must("JWT_SECRET");
const DATA_DIR = must("DATA_DIR");
const PARTNERS_FILE = path.join(DATA_DIR, "partner-links.json");
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
// Do NOT auto-create PARTNERS_FILE here. While missing, nginx 404s the
// public /data/partner-links.json endpoint and the front-end falls back
// to the build-time content baked into the post HTML. The file is created
// the first time the admin clicks Save.

const DEFAULT_PARTNERS = {
  blockTitle: "Наши друзья и партнёры",
  global: [],
  perPost: [],
};

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
      } catch (e) {
        reject(new Error("invalid json"));
      }
    });
    req.on("error", reject);
  });
}

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

// --- router ---
const server = http.createServer(async (req, res) => {
  // CORS not needed — same-origin via nginx
  const url = new URL(req.url, "http://x");
  const route = `${req.method} ${url.pathname}`;

  try {
    if (route === "GET /healthz" || route === "GET /api/healthz") {
      return send(res, 200, "ok");
    }

    if (route === "POST /login" || route === "POST /api/login") {
      const body = await readBody(req);
      const user = String(body.user || "");
      const pass = String(body.password || "");
      if (user !== USER || !verifyPassword(pass)) {
        return send(res, 401, { error: "invalid credentials" });
      }
      const token = signToken({
        user,
        exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SEC,
      });
      return send(res, 200, { user }, {
        "Set-Cookie": `admin_session=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_TTL_SEC}`,
      });
    }

    if (route === "POST /logout" || route === "POST /api/logout") {
      return send(res, 204, "", {
        "Set-Cookie": "admin_session=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0",
      });
    }

    if (route === "GET /me" || route === "GET /api/me") {
      const u = sessionUser(req);
      if (!u) return send(res, 401, { error: "unauthorized" });
      return send(res, 200, { user: u });
    }

    if (route === "GET /partners" || route === "GET /api/partners") {
      const u = sessionUser(req);
      if (!u) return send(res, 401, { error: "unauthorized" });
      let data;
      try {
        data = JSON.parse(fs.readFileSync(PARTNERS_FILE, "utf8"));
      } catch {
        data = DEFAULT_PARTNERS;
      }
      return send(res, 200, data);
    }

    if (route === "PUT /partners" || route === "PUT /api/partners") {
      const u = sessionUser(req);
      if (!u) return send(res, 401, { error: "unauthorized" });
      const body = await readBody(req);
      const clean = validatePartnersPayload(body);
      const tmp = PARTNERS_FILE + ".tmp";
      fs.writeFileSync(tmp, JSON.stringify(clean, null, 2));
      fs.renameSync(tmp, PARTNERS_FILE);
      return send(res, 200, clean);
    }

    return send(res, 404, { error: "not found" });
  } catch (err) {
    console.error(err);
    return send(res, 400, { error: err.message || "bad request" });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`admin api listening on 127.0.0.1:${PORT} (DATA_DIR=${DATA_DIR})`);
});
