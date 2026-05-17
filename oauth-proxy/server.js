// Minimal Decap/Sveltia-compatible GitHub OAuth proxy.
// Listens on 127.0.0.1 (Nginx terminates TLS and proxies /oauth/ here).
//
// Endpoints:
//   GET  /auth      → 302 to github.com/login/oauth/authorize
//   GET  /callback  → exchanges code → token, postMessages it back
//
// Sveltia CMS expects:
//   window.postMessage("authorization:github:success:{token,provider:github}", "*")
//
// Env vars (loaded from /opt/decap-oauth/env):
//   OAUTH_CLIENT_ID
//   OAUTH_CLIENT_SECRET
//   OAUTH_ORIGIN     (e.g. https://pinkcrab.ru — used as callback base)
//   OAUTH_PORT       (default 7777)
//   OAUTH_SCOPES     (default "repo,user")

const http = require("node:http");
const { request: httpsRequest } = require("node:https");
const { URL, URLSearchParams } = require("node:url");
const { randomBytes } = require("node:crypto");

const PORT = Number(process.env.OAUTH_PORT || 7777);
const CLIENT_ID = mustEnv("OAUTH_CLIENT_ID");
const CLIENT_SECRET = mustEnv("OAUTH_CLIENT_SECRET");
const ORIGIN = mustEnv("OAUTH_ORIGIN").replace(/\/+$/, "");
const SCOPES = process.env.OAUTH_SCOPES || "repo,user";

function mustEnv(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing required env var ${name}`);
    process.exit(1);
  }
  return v;
}

function ghJSON(method, path, headers, body) {
  return new Promise((resolve, reject) => {
    const req = httpsRequest(
      {
        hostname: "github.com",
        path,
        method,
        headers: {
          "User-Agent": "annekedisi-oauth-proxy/1.0",
          Accept: "application/json",
          ...headers,
        },
      },
      (res) => {
        let buf = "";
        res.on("data", (c) => (buf += c));
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(buf) });
          } catch {
            resolve({ status: res.statusCode, body: { raw: buf } });
          }
        });
      }
    );
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

function postMessageHtml(payload) {
  const safe = JSON.stringify(payload);
  // Polls until the parent window picks up the message
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>OAuth</title></head>
<body>
<p>Авторизация… можно закрыть это окно.</p>
<script>
(function () {
  var message = ${safe};
  function send() {
    if (!window.opener) return false;
    window.opener.postMessage(message, "*");
    return true;
  }
  var t = setInterval(function () { if (send()) { clearInterval(t); setTimeout(function () { window.close(); }, 300); } }, 100);
  setTimeout(function () { clearInterval(t); }, 10000);
})();
</script>
</body></html>`;
}

const server = http.createServer(async (req, res) => {
  let pathname;
  try {
    pathname = new URL(req.url, "http://x").pathname;
  } catch {
    res.writeHead(400);
    return res.end("bad url");
  }

  if (pathname === "/auth" || pathname === "/oauth/auth") {
    const state = randomBytes(12).toString("hex");
    const qs = new URLSearchParams({
      client_id: CLIENT_ID,
      scope: SCOPES,
      redirect_uri: `${ORIGIN}/oauth/callback`,
      state,
      allow_signup: "false",
    });
    res.writeHead(302, {
      Location: `https://github.com/login/oauth/authorize?${qs}`,
    });
    return res.end();
  }

  if (pathname === "/callback" || pathname === "/oauth/callback") {
    const u = new URL(req.url, "http://x");
    const code = u.searchParams.get("code");
    if (!code) {
      res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
      return res.end("Missing ?code");
    }

    let payload;
    try {
      const tokenRes = await ghJSON(
        "POST",
        "/login/oauth/access_token",
        { "Content-Type": "application/json" },
        JSON.stringify({
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          code,
        })
      );
      if (tokenRes.body && tokenRes.body.access_token) {
        payload =
          "authorization:github:success:" +
          JSON.stringify({
            token: tokenRes.body.access_token,
            provider: "github",
          });
      } else {
        payload =
          "authorization:github:error:" +
          JSON.stringify(tokenRes.body || { error: "no_token" });
      }
    } catch (err) {
      payload =
        "authorization:github:error:" +
        JSON.stringify({ error: "exchange_failed", message: String(err) });
    }

    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    return res.end(postMessageHtml(payload));
  }

  if (pathname === "/healthz" || pathname === "/oauth/healthz") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    return res.end("ok");
  }

  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("not found");
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(
    `OAuth proxy listening on 127.0.0.1:${PORT} (origin=${ORIGIN}, scopes=${SCOPES})`
  );
});
