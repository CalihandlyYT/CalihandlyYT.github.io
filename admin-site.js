// Вкладки админки: профиль, навыки, контакты, таймлайн, превью ссылки (Open Graph).
(() => {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const clone = (o) => JSON.parse(JSON.stringify(o));

  let saved = null; // то, что на сервере
  let site = null;  // черновик
  let dirty = false;

  /* ---------- вкладки ---------- */
  function showTab(name) {
    if (!$(`[data-pane="${name}"]`)) name = "projects";
    $$("#tabs button").forEach((b) => b.classList.toggle("on", b.dataset.tab === name));
    $$(".tab").forEach((p) => (p.hidden = p.dataset.pane !== name));
    $("#savebar").hidden = name === "projects";
    history.replaceState(null, "", "#" + name);
    if (name === "preview") drawOg();
  }
  $("#tabs").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-tab]");
    if (b) showTab(b.dataset.tab);
  });

  /* ---------- загрузка ---------- */
  window.addEventListener("adm:enter", async () => {
    try {
      saved = await ADM.call("GET", "/api/site");
      site = clone(saved);
      fillAll();
      setDirty(false);
      showTab(location.hash.slice(1) || "projects");
    } catch (e) { ADM.toast(e.message, true); }
  });
  window.addEventListener("adm:projects", () => { if (!$('[data-pane="preview"]').hidden) drawOg(); });

  function setDirty(v) {
    dirty = v;
    $("#dirty").textContent = v ? "● есть несохранённые изменения" : "нет изменений";
    $("#savebar").classList.toggle("is-dirty", v);
  }
  addEventListener("beforeunload", (e) => { if (dirty) { e.preventDefault(); e.returnValue = ""; } });

  /* ---------- простые поля (data-k) ---------- */
  const get = (k) => k.split(".").reduce((o, p) => (o ? o[p] : undefined), site);
  function set(k, v) {
    const parts = k.split(".");
    let o = site;
    parts.slice(0, -1).forEach((p) => (o = o[p] = o[p] && typeof o[p] === "object" ? o[p] : {}));
    o[parts.at(-1)] = v;
  }
  function fillFields() {
    $$("[data-k]").forEach((el) => {
      const k = el.dataset.k;
      const v = get(k);
      el.value = k === "taglines" ? (v || []).join("\n") : v ?? "";
    });
    const upd = site.now?.updated && site.now?.text ? new Date(site.now.updated).toLocaleString("ru-RU") : "";
    $("#now-updated").textContent = upd ? `обновлено: ${upd}` : "";
  }
  document.addEventListener("input", (e) => {
    const el = e.target.closest("[data-k]");
    if (!el || !site) return;
    const k = el.dataset.k;
    let v = el.value;
    if (k === "taglines") v = v.split("\n").map((s) => s.trim()).filter(Boolean);
    if (k === "age") v = v ? +v : null;
    set(k, v);
    setDirty(true);
    if (["nick", "siteUrl", "description", "now.text", "taglines"].includes(k)) drawOgSoon();
  });

  /* ---------- списки (навыки, контакты, таймлайн) ---------- */
  const REP = {
    skills: {
      blank: () => ({ name: "", level: 50 }),
      row: (it) => `
        <input data-f="name" value="${esc(it.name)}" placeholder="название" maxlength="40">
        <input data-f="level" type="range" min="0" max="100" value="${+it.level || 0}">
        <output>${+it.level || 0}%</output>`,
    },
    contacts: {
      blank: () => ({ label: "", value: "", url: "" }),
      row: (it) => `
        <input data-f="label" value="${esc(it.label)}" placeholder="telegram" maxlength="30">
        <input data-f="value" value="${esc(it.value)}" placeholder="@username" maxlength="120">
        <input data-f="url" value="${esc(it.url)}" placeholder="t.me/username (необязательно)">`,
    },
    timeline: {
      blank: () => ({ date: "", title: "", text: "" }),
      row: (it) => `
        <input data-f="date" value="${esc(it.date)}" placeholder="2026 · осень" maxlength="40">
        <input data-f="title" value="${esc(it.title)}" placeholder="заголовок" maxlength="100">
        <textarea data-f="text" rows="2" placeholder="описание" maxlength="800">${esc(it.text)}</textarea>`,
    },
  };
  function renderRep(name) {
    const list = site[name] || (site[name] = []);
    $(`#rep-${name}`).innerHTML = list.length
      ? list.map((it, i) => `
        <div class="rep-row rep-${name}" data-i="${i}">
          <div class="order">
            <button class="icon" data-mv="-1" type="button" title="Выше" ${i === 0 ? "disabled" : ""}>▲</button>
            <button class="icon" data-mv="1" type="button" title="Ниже" ${i === list.length - 1 ? "disabled" : ""}>▼</button>
          </div>
          <div class="rep-fields">${REP[name].row(it)}</div>
          <button class="icon del" data-del type="button" title="Удалить">✕</button>
        </div>`).join("")
      : `<div class="empty">Пусто</div>`;
  }
  Object.keys(REP).forEach((name) => {
    const box = $(`#rep-${name}`);
    box.addEventListener("input", (e) => {
      const f = e.target.dataset.f; if (!f) return;
      const i = +e.target.closest(".rep-row").dataset.i;
      site[name][i][f] = f === "level" ? +e.target.value : e.target.value;
      if (f === "level") e.target.nextElementSibling.textContent = e.target.value + "%";
      setDirty(true);
    });
    box.addEventListener("click", (e) => {
      const row = e.target.closest(".rep-row"); if (!row) return;
      const i = +row.dataset.i, list = site[name];
      if (e.target.closest("[data-del]")) { list.splice(i, 1); }
      else if (e.target.closest("[data-mv]")) {
        const j = i + +e.target.closest("[data-mv]").dataset.mv;
        if (j < 0 || j >= list.length) return;
        [list[i], list[j]] = [list[j], list[i]];
      } else return;
      renderRep(name); setDirty(true);
    });
  });
  $$("[data-add]").forEach((b) => b.addEventListener("click", () => {
    const name = b.dataset.add;
    (site[name] = site[name] || []).push(REP[name].blank());
    renderRep(name); setDirty(true);
    $(`#rep-${name} .rep-row:last-child input`)?.focus();
  }));

  function fillAll() {
    fillFields();
    Object.keys(REP).forEach(renderRep);
    drawOgSoon();
  }

  /* ---------- сохранение ---------- */
  const normUrl = (v) => {
    v = (v || "").trim();
    if (!v || /^(https?:\/\/|mailto:)/i.test(v)) return v;
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return "mailto:" + v;
    return "https://" + v.replace(/^\/+/, "");
  };
  async function saveSite() {
    const body = clone(site);
    body.contacts = (body.contacts || []).map((c) => ({ ...c, url: normUrl(c.url) }));
    body.siteUrl = body.siteUrl ? normUrl(body.siteUrl) : "";
    $("#site-save").disabled = true;
    try {
      saved = await ADM.call("PUT", "/api/site", body);
      site = clone(saved);
      fillAll();
      setDirty(false);
      ADM.toast("Настройки сохранены ✓");
    } catch (e) {
      ADM.toast(e.message, true);
    } finally {
      $("#site-save").disabled = false;
    }
  }
  $("#site-save").addEventListener("click", saveSite);
  $("#site-reset").addEventListener("click", () => { site = clone(saved); fillAll(); setDirty(false); });
  addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s" && site && $("#savebar").hidden === false) {
      e.preventDefault(); saveSite();
    }
  });

  /* ---------- превью ссылки: картинка og.png ---------- */
  let ogTimer;
  const drawOgSoon = () => { clearTimeout(ogTimer); ogTimer = setTimeout(drawOg, 250); };

  async function drawOg() {
    if (!site) return;
    const cv = $("#og-canvas"), ctx = cv.getContext("2d");
    const W = 1200, H = 630;
    try {
      await Promise.all([
        document.fonts.load('900 150px "Unbounded"'),
        document.fonts.load('400 30px "JetBrains Mono"'),
        document.fonts.load('600 30px "JetBrains Mono"'),
      ]);
    } catch {}
    const projects = ADM.projects();
    const green = "#3dff8f", cyan = "#2de2ff", muted = "#6f8a80", text = "#d6efe4";

    // фон
    ctx.fillStyle = "#06080a"; ctx.fillRect(0, 0, W, H);
    const glow = (x, y, r, c) => {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, c); g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    };
    glow(120, 40, 520, "rgba(61,255,143,.22)");
    glow(1150, 600, 560, "rgba(45,226,255,.16)");
    glow(700, 700, 400, "rgba(139,92,255,.12)");
    // сетка
    ctx.strokeStyle = "rgba(61,255,143,.07)"; ctx.lineWidth = 1;
    for (let x = 0; x <= W; x += 60) { ctx.beginPath(); ctx.moveTo(x + .5, 0); ctx.lineTo(x + .5, H); ctx.stroke(); }
    for (let y = 0; y <= H; y += 60) { ctx.beginPath(); ctx.moveTo(0, y + .5); ctx.lineTo(W, y + .5); ctx.stroke(); }
    // матрица справа
    ctx.font = '400 20px "JetBrains Mono"';
    const chars = "01アカサタナ<>/{}#$";
    for (let i = 0; i < 160; i++) {
      const x = 760 + ((i * 53) % 440), y = 30 + ((i * 97) % 600);
      ctx.fillStyle = `rgba(61,255,143,${0.04 + ((i * 7) % 10) / 100})`;
      ctx.fillText(chars[i % chars.length], x, y);
    }
    // рамка
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, green); grad.addColorStop(.5, "#00ffc6"); grad.addColorStop(1, cyan);
    ctx.strokeStyle = grad; ctx.globalAlpha = .45; ctx.lineWidth = 2;
    roundRect(ctx, 24, 24, W - 48, H - 48, 28); ctx.stroke(); ctx.globalAlpha = 1;

    // логотип >_
    ctx.fillStyle = grad; roundRect(ctx, 80, 84, 64, 64, 16); ctx.fill();
    ctx.fillStyle = "#04110a"; ctx.font = '600 28px "JetBrains Mono"'; ctx.textBaseline = "middle"; ctx.textAlign = "center";
    ctx.fillText(">_", 112, 117);
    ctx.textAlign = "left";
    ctx.fillStyle = muted; ctx.font = '400 26px "JetBrains Mono"';
    ctx.fillText("~/" + (site.nick || "owicog") + "  ·  portfolio", 166, 117);

    // ник
    let size = 150;
    ctx.font = `900 ${size}px "Unbounded"`;
    const nick = site.nick || "owicog";
    while (ctx.measureText(nick).width > W - 170 && size > 60) { size -= 6; ctx.font = `900 ${size}px "Unbounded"`; }
    ctx.textBaseline = "alphabetic";
    ctx.shadowColor = "rgba(61,255,143,.45)"; ctx.shadowBlur = 40;
    ctx.fillStyle = grad; ctx.fillText(nick, 74, 300);
    ctx.shadowBlur = 0;

    // фраза
    ctx.font = '400 30px "JetBrains Mono"';
    ctx.fillStyle = green; ctx.fillText("~$", 80, 368);
    ctx.fillStyle = text; ctx.fillText(fit(ctx, site.taglines?.[0] || "developer", W - 240), 130, 368);

    // статус
    const now = site.now?.text ? "сейчас: " + site.now.text : "online · открыт к проектам";
    ctx.font = '400 24px "JetBrains Mono"';
    const nowTxt = fit(ctx, now, W - 260);
    const pw = ctx.measureText(nowTxt).width + 74;
    ctx.fillStyle = "rgba(61,255,143,.08)"; roundRect(ctx, 80, 410, pw, 50, 25); ctx.fill();
    ctx.strokeStyle = "rgba(61,255,143,.4)"; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = green; ctx.beginPath(); ctx.arc(110, 435, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = text; ctx.textBaseline = "middle"; ctx.fillText(nowTxt, 130, 436);

    // статистика
    const tech = new Set(projects.flatMap((p) => p.tags)).size;
    const stats = [[projects.length, "проектов"], [tech, "технологий"], [projects.filter((p) => p.category === "bot").length, "ботов"]];
    let sx = 80;
    stats.forEach(([n, label]) => {
      ctx.textBaseline = "alphabetic";
      ctx.font = '700 46px "Unbounded"'; ctx.fillStyle = grad; ctx.fillText(String(n), sx, 545);
      const nw = ctx.measureText(String(n)).width;
      ctx.font = '400 22px "JetBrains Mono"'; ctx.fillStyle = muted; ctx.fillText(label, sx + nw + 12, 543);
      sx += nw + ctx.measureText(label).width + 60;
    });
    // адрес
    const host = (site.siteUrl || "").replace(/^https?:\/\//, "");
    if (host) {
      ctx.font = '400 22px "JetBrains Mono"'; ctx.fillStyle = muted; ctx.textAlign = "right";
      ctx.fillText(host, W - 80, 543); ctx.textAlign = "left";
    }

    // карточка-превью
    $("#pv-site").textContent = host || site.nick;
    $("#pv-title").textContent = `${site.nick} — dev`;
    $("#pv-desc").textContent = site.description || `${site.nick} — проекты, навыки, контакты.`;
    $("#url-warn").textContent = site.siteUrl ? "" :
      "Адрес сайта не указан: Telegram и Discord покажут название и описание, но без картинки — им нужна полная ссылка. Заполни, когда выложишь сайт в интернет.";
  }
  function roundRect(c, x, y, w, h, r) {
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  function fit(c, s, max) {
    if (c.measureText(s).width <= max) return s;
    while (s.length > 1 && c.measureText(s + "…").width > max) s = s.slice(0, -1);
    return s + "…";
  }

  $("#og-save").addEventListener("click", async () => {
    if (dirty) { ADM.toast("Сначала сохрани настройки", true); return; }
    await drawOg();
    try {
      saved = await ADM.call("PUT", "/api/og", { png: $("#og-canvas").toDataURL("image/png") });
      site = clone(saved);
      $("#og-open").href = "og.png?v=" + saved.ogVersion;
      ADM.toast("Картинка превью сохранена ✓");
    } catch (e) { ADM.toast(e.message, true); }
  });
})();
