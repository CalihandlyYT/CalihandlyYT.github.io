// Сервер сайта-визитки + API админки. Без зависимостей, нужен только Node.js 18+.
//   node server.js            → http://127.0.0.1:8080, админка: /admin.html
//   PORT=3000 HOST=0.0.0.0 ADMIN_PASSWORD=... node server.js
//
// Источники данных:  site.json (профиль, навыки, контакты, таймлайн…)  →  генерирует data.js
//                    projects.json                                      →  генерирует projects.js
//                    + мета-теги превью в index.html (между <!--og--> и <!--/og-->)
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const ROOT = __dirname;
const PORT = +process.env.PORT || 8080;
const HOST = process.env.HOST || "127.0.0.1";
const F = (n) => path.join(ROOT, n);
const CONFIG = F("admin.config.json");

/* ---------- пароль и сессии ---------- */
function loadPassword() {
  if (process.env.ADMIN_PASSWORD) return process.env.ADMIN_PASSWORD;
  try {
    const cfg = JSON.parse(fs.readFileSync(CONFIG, "utf8"));
    if (cfg.password) return cfg.password;
  } catch {}
  const pw = crypto.randomBytes(9).toString("base64url");
  fs.writeFileSync(CONFIG, JSON.stringify({ password: pw }, null, 2));
  console.log(`\n  Создан пароль админки (сохранён в admin.config.json): ${pw}\n`);
  return pw;
}
const PASSWORD = loadPassword();
const sessions = new Map(); // token -> expiresAt
const SESSION_TTL = 12 * 60 * 60 * 1000;
const loginFails = new Map(); // ip -> { n, until }

function safeEqual(a, b) {
  const ha = crypto.createHash("sha256").update(String(a)).digest();
  const hb = crypto.createHash("sha256").update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}
function authed(req) {
  const m = /^Bearer (.+)$/.exec(req.headers.authorization || "");
  if (!m) return false;
  const exp = sessions.get(m[1]);
  if (!exp || exp < Date.now()) { sessions.delete(m[1]); return false; }
  return true;
}

/* ---------- утилиты валидации ---------- */
const str = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const url = (v) => { const s = str(v, 500); return /^https?:\/\//i.test(s) ? s : ""; };
const arr = (v, max) => (Array.isArray(v) ? v.slice(0, max) : []);
const obj = (v) => (v && typeof v === "object" ? v : {});

function writeAtomic(file, data) {
  fs.writeFileSync(file + ".tmp", data);
  fs.renameSync(file + ".tmp", file);
}
const toJsLiteral = (o) => JSON.stringify(o, null, 2).replace(/</g, "\\u003c");
function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return fallback; }
}

/* ---------- проекты ---------- */
const STATUSES = ["active", "wip", "abandoned", "done"];
function sanitizeProjects(list) {
  if (!Array.isArray(list)) throw new Error("ожидается массив проектов");
  if (list.length > 200) throw new Error("слишком много проектов");
  return list.map((p, i) => {
    p = obj(p);
    const name = str(p.name, 80);
    if (!name) throw new Error(`проект #${i + 1}: нужно название`);
    const year = parseInt(p.year, 10);
    return {
      name,
      category: str(p.category, 30).toLowerCase() || "web",
      short: str(p.short, 300),
      description: str(p.description, 4000),
      tags: arr(p.tags, 15).map((t) => str(t, 40)).filter(Boolean),
      status: STATUSES.includes(p.status) ? p.status : "wip",
      year: year >= 2000 && year <= 2100 ? year : new Date().getFullYear(),
      links: { github: url(p.links?.github), telegram: url(p.links?.telegram), demo: url(p.links?.demo) },
    };
  });
}
function writeProjects(list) {
  writeAtomic(F("projects.json"), JSON.stringify(list, null, 2));
  writeAtomic(F("projects.js"),
    "// Автоматически генерируется server.js из projects.json — не редактируй вручную.\n" +
    "SITE.projects = " + toJsLiteral(list) + ";\n");
}

/* ---------- настройки сайта ---------- */
function sanitizeSite(s, prev = {}) {
  s = obj(s);
  const birth = str(s.birthDate, 10);
  const age = parseInt(s.age, 10);
  const nowText = str(obj(s.now).text, 140);
  const prevNow = obj(prev.now);
  return {
    nick: str(s.nick, 30) || "owicog",
    birthDate: /^\d{4}-\d{2}-\d{2}$/.test(birth) ? birth : "",
    age: age > 0 && age < 120 ? age : null,
    location: str(s.location, 60),
    about: str(s.about, 3000),
    now: {
      text: nowText,
      // дата обновления меняется только когда меняется сам текст
      updated: nowText && nowText === prevNow.text && prevNow.updated ? prevNow.updated : new Date().toISOString(),
    },
    taglines: arr(s.taglines, 12).map((t) => str(t, 120)).filter(Boolean),
    skills: arr(s.skills, 40).map((k) => ({
      name: str(obj(k).name, 40),
      level: Math.max(0, Math.min(100, parseInt(obj(k).level, 10) || 0)),
    })).filter((k) => k.name),
    contacts: arr(s.contacts, 20).map((c) => {
      c = obj(c);
      const u = str(c.url, 500);
      return { label: str(c.label, 30), value: str(c.value, 120), url: /^(https?:\/\/|mailto:)/i.test(u) ? u : "" };
    }).filter((c) => c.label && c.value),
    timeline: arr(s.timeline, 60).map((t) => ({
      date: str(obj(t).date, 40), title: str(obj(t).title, 100), text: str(obj(t).text, 800),
    })).filter((t) => t.title || t.text),
    siteUrl: url(s.siteUrl).replace(/\/+$/, ""),
    description: str(s.description, 300),
    ogVersion: Number.isFinite(+s.ogVersion) ? +s.ogVersion : 0,
  };
}

const escHtml = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
function ogBlock(site) {
  const title = `${site.nick} — dev`;
  const desc = site.description || `${site.nick} — проекты, навыки, контакты.`;
  const lines = [
    `<title>${escHtml(site.nick)}</title>`,
    `<meta name="description" content="${escHtml(desc)}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:site_name" content="${escHtml(site.nick)}">`,
    `<meta property="og:title" content="${escHtml(title)}">`,
    `<meta property="og:description" content="${escHtml(desc)}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${escHtml(title)}">`,
    `<meta name="twitter:description" content="${escHtml(desc)}">`,
  ];
  if (site.siteUrl) lines.push(`<meta property="og:url" content="${escHtml(site.siteUrl)}/">`);
  if (site.siteUrl && fs.existsSync(F("og.png"))) {
    const img = `${site.siteUrl}/og.png?v=${site.ogVersion || 0}`;
    lines.push(
      `<meta property="og:image" content="${escHtml(img)}">`,
      `<meta property="og:image:width" content="1200">`,
      `<meta property="og:image:height" content="630">`,
      `<meta name="twitter:image" content="${escHtml(img)}">`,
    );
  }
  return "<!--og-->\n  " + lines.join("\n  ") + "\n  <!--/og-->";
}
function updateIndexMeta(site) {
  const file = F("index.html");
  const html = fs.readFileSync(file, "utf8");
  if (!/<!--og-->[\s\S]*?<!--\/og-->/.test(html)) return;
  const next = html.replace(/<!--og-->[\s\S]*?<!--\/og-->/, () => ogBlock(site));
  if (next !== html) writeAtomic(file, next);
}
function writeSite(site) {
  writeAtomic(F("site.json"), JSON.stringify(site, null, 2));
  writeAtomic(F("data.js"),
    "// Автоматически генерируется server.js из site.json — редактируй через админку (/admin.html).\n" +
    "const SITE = " + toJsLiteral({ ...site, projects: [] }) + ";\n");
  updateIndexMeta(site);
}

// при старте пересобираем сгенерированные файлы
writeProjects(sanitizeProjects(readJson(F("projects.json"), [])));
{
  const s = readJson(F("site.json"), {});
  writeSite(sanitizeSite(s, s));
}

/* ---------- http ---------- */
const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".ico": "image/x-icon", ".webp": "image/webp",
};
const BLOCKED = new Set(["admin.config.json", "server.js"]);

function send(res, code, body, type = "application/json; charset=utf-8") {
  res.writeHead(code, { "Content-Type": type, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
  res.end(typeof body === "string" || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}
function readBody(req, limit = 1e6) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on("data", (c) => { size += c.length; if (size > limit) { reject(new Error("слишком большой запрос")); req.destroy(); } else chunks.push(c); });
    req.on("end", () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}")); } catch { reject(new Error("неверный JSON")); } });
    req.on("error", reject);
  });
}

async function api(req, res, pathname) {
  const ip = req.socket.remoteAddress;
  const m = req.method;

  if (pathname === "/api/login" && m === "POST") {
    const f = loginFails.get(ip);
    if (f && f.until > Date.now()) return send(res, 429, { error: "Слишком много попыток, подожди минуту" });
    const { password } = await readBody(req);
    if (!safeEqual(password || "", PASSWORD)) {
      const n = (f?.n || 0) + 1;
      loginFails.set(ip, { n, until: n >= 5 ? Date.now() + 60_000 : 0 });
      return send(res, 401, { error: "Неверный пароль" });
    }
    loginFails.delete(ip);
    const token = crypto.randomBytes(32).toString("hex");
    sessions.set(token, Date.now() + SESSION_TTL);
    return send(res, 200, { token });
  }
  if (pathname === "/api/logout" && m === "POST") {
    const t = /^Bearer (.+)$/.exec(req.headers.authorization || "");
    if (t) sessions.delete(t[1]);
    return send(res, 200, { ok: true });
  }
  if (pathname === "/api/me" && m === "GET") return authed(req) ? send(res, 200, { ok: true }) : send(res, 401, { error: "Нужно войти" });

  if (pathname === "/api/projects" && m === "GET") return send(res, 200, readJson(F("projects.json"), []));
  if (pathname === "/api/site" && m === "GET") return send(res, 200, readJson(F("site.json"), {}));

  // всё ниже — только для админа
  if (!authed(req)) return send(res, 401, { error: "Нужно войти" });

  if (pathname === "/api/projects" && m === "PUT") {
    const clean = sanitizeProjects(await readBody(req));
    writeProjects(clean);
    return send(res, 200, clean);
  }
  if (pathname === "/api/site" && m === "PUT") {
    const prev = readJson(F("site.json"), {});
    const body = await readBody(req);
    const clean = sanitizeSite({ ...body, ogVersion: prev.ogVersion }, prev);
    writeSite(clean);
    return send(res, 200, clean);
  }
  if (pathname === "/api/og" && m === "PUT") {
    const { png } = await readBody(req, 4e6);
    const b64 = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(png || "");
    if (!b64) throw new Error("ожидается PNG");
    const buf = Buffer.from(b64[1], "base64");
    if (buf.length > 3e6 || buf.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") throw new Error("неверная картинка");
    writeAtomic(F("og.png"), buf);
    const site = readJson(F("site.json"), {});
    site.ogVersion = Date.now();
    const clean = sanitizeSite(site, site);
    writeSite(clean);
    return send(res, 200, clean);
  }
  if (pathname === "/api/publish" && m === "POST") return send(res, 200, await publish());
  send(res, 404, { error: "not found" });
}

/* ---------- публикация: git commit + push → GitHub Actions → Pages ---------- */
const { execFile } = require("node:child_process");
const git = (...args) => new Promise((resolve) =>
  execFile("git", args, { cwd: ROOT, timeout: 90_000, windowsHide: true }, (err, stdout, stderr) =>
    resolve({ ok: !err, out: (stdout + stderr).trim() })));
let publishing = false;
async function publish() {
  if (publishing) return { ok: false, message: "Публикация уже идёт" };
  publishing = true;
  try {
    if (!(await git("rev-parse", "--is-inside-work-tree")).ok) return { ok: false, message: "Папка не git-репозиторий" };
    await git("add", "-A");
    const st = await git("status", "--porcelain");
    if (st.out) {
      const c = await git("commit", "-m", "Обновление сайта из админки " + new Date().toLocaleString("ru-RU"));
      if (!c.ok) return { ok: false, message: "git commit: " + c.out.slice(-200) };
    }
    const p = await git("push");
    if (!p.ok) return { ok: false, message: "git push: " + p.out.slice(-200) };
    return { ok: true, message: st.out ? "Опубликовано 🚀 Сайт обновится через ~1 мин" : "Нечего публиковать — всё уже на GitHub" };
  } finally {
    publishing = false;
  }
}

http.createServer(async (req, res) => {
  try {
    const { pathname } = new URL(req.url, "http://x");
    if (pathname.startsWith("/api/")) return await api(req, res, pathname);
    if (req.method !== "GET" && req.method !== "HEAD") return send(res, 405, "Method not allowed", "text/plain");

    let rel = decodeURIComponent(pathname);
    if (rel.endsWith("/")) rel += "index.html";
    if (rel === "/admin") rel = "/admin.html";
    const file = path.normalize(path.join(ROOT, rel));
    const base = path.basename(file);
    const hidden = path.relative(ROOT, file).split(path.sep).some((s) => s.startsWith("."));
    if (!file.startsWith(ROOT + path.sep) || hidden || BLOCKED.has(base) || base.endsWith(".tmp")) return send(res, 404, "Not found", "text/plain");
    fs.readFile(file, (err, data) => {
      if (err) return send(res, 404, "Not found", "text/plain");
      send(res, 200, data, MIME[path.extname(file).toLowerCase()] || "application/octet-stream");
    });
  } catch (e) {
    send(res, 400, { error: e.message || "ошибка" });
  }
}).listen(PORT, HOST, () => {
  console.log(`  Сайт:    http://${HOST}:${PORT}/`);
  console.log(`  Админка: http://${HOST}:${PORT}/admin.html`);
});
