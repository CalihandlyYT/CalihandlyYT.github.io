(() => {
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const STATUS = {
    active: "● активен",
    wip: "◐ в разработке",
    abandoned: "✕ заброшен",
    done: "✓ завершён",
  };
  const CAT = { web: "web", bot: "бот", app: "приложение", game: "игра" };

  let token = null;
  try { token = sessionStorage.getItem("adm-token"); } catch {}
  let projects = [];
  let filter = "all";
  let query = "";
  let editing = -1; // индекс редактируемого, -1 = новый

  /* ---------- api ---------- */
  async function call(method, path, body) {
    const res = await fetch(path, {
      method,
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    let data = null;
    try { data = await res.json(); } catch {}
    if (res.status === 401 && path !== "/api/login") { logout(true); throw new Error("Сессия истекла, войди снова"); }
    if (!res.ok) throw new Error(data?.error || `Ошибка ${res.status}`);
    return data;
  }

  let toastTimer;
  function toast(msg, bad = false) {
    const t = $("#toast");
    t.textContent = msg;
    t.className = "show" + (bad ? " bad" : "");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (t.className = ""), 2400);
  }

  window.ADM = { call, toast, projects: () => projects };

  async function save(next, okMsg) {
    const prev = projects;
    projects = next;
    render();
    try {
      projects = await call("PUT", "/api/projects", next);
      render();
      toast(okMsg || "Сохранено ✓");
      return true;
    } catch (e) {
      projects = prev;
      render();
      toast(e.message, true);
      return false;
    }
  }

  /* ---------- auth ---------- */
  function showPanel(on) {
    $("#login-view").hidden = on;
    $("#panel-view").hidden = !on;
  }
  async function enter() {
    projects = await call("GET", "/api/projects");
    showPanel(true);
    render();
    window.dispatchEvent(new Event("adm:enter"));
  }
  function logout(silent) {
    if (token && !silent) call("POST", "/api/logout").catch(() => {});
    token = null;
    try { sessionStorage.removeItem("adm-token"); } catch {}
    showPanel(false);
    $("#pw").value = "";
    $("#pw").focus();
  }

  $("#login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    $("#login-err").textContent = "";
    try {
      const { token: t } = await call("POST", "/api/login", { password: $("#pw").value });
      token = t;
      try { sessionStorage.setItem("adm-token", t); } catch {}
      await enter();
      toast("Доступ разрешён");
    } catch (err) {
      $("#login-err").textContent = err.message === "Failed to fetch"
        ? "Сервер не запущен. Запусти: node server.js"
        : err.message;
    }
  });
  $("#logout").addEventListener("click", () => logout(false));

  /* ---------- list ---------- */
  function counts() {
    const c = { all: projects.length };
    for (const k in STATUS) c[k] = projects.filter((p) => p.status === k).length;
    return c;
  }
  function render() {
    const c = counts();
    $("#summary").textContent =
      `${c.all} проектов · ${c.active} активных · ${c.wip} в разработке · ${c.abandoned} заброшенных · ${c.done} завершённых`;
    window.dispatchEvent(new Event("adm:projects"));

    $("#status-filter").innerHTML = ["all", ...Object.keys(STATUS)].map((k) =>
      `<button type="button" data-f="${k}" class="${filter === k ? "on" : ""}">${k === "all" ? "все" : STATUS[k]} [${c[k]}]</button>`).join("");

    const q = query.toLowerCase();
    const rows = projects
      .map((p, i) => ({ p, i }))
      .filter(({ p }) => (filter === "all" || p.status === filter) &&
        (!q || p.name.toLowerCase().includes(q) || p.tags.some((t) => t.toLowerCase().includes(q)) || (p.short || "").toLowerCase().includes(q)));

    if (!rows.length) {
      $("#list").innerHTML = `<div class="empty">${projects.length ? "Ничего не найдено" : "Проектов пока нет. Нажми «+ проект»."}</div>`;
      return;
    }
    $("#list").innerHTML = rows.map(({ p, i }, n) => `
      <div class="row ${esc(p.status)}" data-i="${i}" style="animation-delay:${Math.min(n, 12) * 25}ms">
        <div class="order">
          <button class="icon" data-act="up" title="Выше" ${i === 0 ? "disabled" : ""}>▲</button>
          <button class="icon" data-act="down" title="Ниже" ${i === projects.length - 1 ? "disabled" : ""}>▼</button>
        </div>
        <div class="row-main">
          <h3>${esc(p.name)} <small>${esc(CAT[p.category] || p.category)} · ${esc(p.year)}</small></h3>
          <p>${esc(p.short) || "<span class='dim'>без описания</span>"}</p>
          <div class="tags">${p.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join("")}</div>
        </div>
        <select class="st ${esc(p.status)}" data-act="status" aria-label="Статус">
          ${Object.entries(STATUS).map(([k, v]) => `<option value="${k}" ${p.status === k ? "selected" : ""}>${v}</option>`).join("")}
        </select>
        <div class="row-btns">
          <button class="icon" data-act="edit" title="Редактировать">✎</button>
          <button class="icon del" data-act="del" title="Удалить">🗑</button>
        </div>
      </div>`).join("");
  }

  $("#status-filter").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-f]"); if (!b) return;
    filter = b.dataset.f; render();
  });
  $("#search").addEventListener("input", (e) => { query = e.target.value.trim(); render(); });

  $("#list").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-act]"); if (!b) return;
    const i = +b.closest(".row").dataset.i;
    const act = b.dataset.act;
    if (act === "edit") openEditor(i);
    if (act === "del") askDelete(i);
    if (act === "up" || act === "down") {
      const j = act === "up" ? i - 1 : i + 1;
      if (j < 0 || j >= projects.length) return;
      const next = projects.slice();
      [next[i], next[j]] = [next[j], next[i]];
      save(next, "Порядок изменён");
    }
  });
  $("#list").addEventListener("change", (e) => {
    if (e.target.dataset.act !== "status") return;
    const i = +e.target.closest(".row").dataset.i;
    const next = projects.map((p, k) => (k === i ? { ...p, status: e.target.value } : p));
    save(next, `«${projects[i].name}» → ${STATUS[e.target.value]}`);
  });

  /* ---------- delete ---------- */
  let pendingDelete = -1;
  function askDelete(i) {
    pendingDelete = i;
    $("#confirm-text").innerHTML = `Удалить проект <b>${esc(projects[i].name)}</b>? Это действие нельзя отменить.`;
    $("#confirm").showModal();
  }
  $("#confirm-no").addEventListener("click", () => $("#confirm").close());
  $("#confirm-yes").addEventListener("click", async () => {
    const name = projects[pendingDelete]?.name;
    $("#confirm").close();
    if (pendingDelete < 0) return;
    await save(projects.filter((_, k) => k !== pendingDelete), `«${name}» удалён`);
    pendingDelete = -1;
  });

  /* ---------- editor ---------- */
  const form = $("#edit-form");
  function openEditor(i) {
    editing = i;
    const p = i >= 0 ? projects[i] : { name: "", category: "web", status: "wip", year: new Date().getFullYear(), tags: [], short: "", description: "", links: {} };
    $("#edit-title").textContent = i >= 0 ? `~/projects/${p.name}` : "новый проект";
    form.elements.name.value = p.name;
    form.elements.category.value = CAT[p.category] ? p.category : "web";
    form.elements.status.value = p.status;
    form.elements.year.value = p.year;
    form.elements.tags.value = p.tags.join(", ");
    form.elements.short.value = p.short || "";
    form.elements.description.value = p.description || "";
    form.elements.github.value = p.links?.github || "";
    form.elements.telegram.value = p.links?.telegram || "";
    form.elements.demo.value = p.links?.demo || "";
    $("#edit-err").textContent = "";
    $("#editor").showModal();
    form.elements.name.focus();
  }
  const closeEditor = () => $("#editor").close();

  // "@nick" → https://t.me/nick, "t.me/x" / "site.org" → https://…
  function normUrl(v, handleBase) {
    v = v.trim();
    if (!v) return "";
    if (handleBase && /^@[\w.-]+$/.test(v)) return "https://" + handleBase + v.slice(1);
    if (!/^https?:\/\//i.test(v)) v = "https://" + v.replace(/^\/+/, "");
    return v;
  }
  $("#add").addEventListener("click", () => openEditor(-1));
  $("#edit-close").addEventListener("click", closeEditor);
  $("#edit-cancel").addEventListener("click", closeEditor);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = form.elements.name.value.trim();
    if (!name) { $("#edit-err").textContent = "Нужно название"; return; }
    const dup = projects.findIndex((p) => p.name.toLowerCase() === name.toLowerCase());
    if (dup >= 0 && dup !== editing) { $("#edit-err").textContent = "Проект с таким названием уже есть"; return; }
    const item = {
      name,
      category: form.elements.category.value,
      status: form.elements.status.value,
      year: +form.elements.year.value || new Date().getFullYear(),
      tags: form.elements.tags.value.split(",").map((t) => t.trim()).filter(Boolean),
      short: form.elements.short.value.trim(),
      description: form.elements.description.value.trim(),
      links: {
        github: normUrl(form.elements.github.value, "github.com/"),
        telegram: normUrl(form.elements.telegram.value, "t.me/"),
        demo: normUrl(form.elements.demo.value),
      },
    };
    const next = editing >= 0 ? projects.map((p, k) => (k === editing ? item : p)) : [item, ...projects];
    $("#edit-save").disabled = true;
    const ok = await save(next, editing >= 0 ? "Изменения сохранены" : `«${name}» добавлен`);
    $("#edit-save").disabled = false;
    if (ok) closeEditor();
  });

  // клик по фону закрывает диалоги
  document.querySelectorAll("dialog").forEach((d) =>
    d.addEventListener("click", (e) => { if (e.target === d) d.close(); }));

  /* ---------- publish ---------- */
  $("#publish").addEventListener("click", async () => {
    const b = $("#publish");
    b.disabled = true; b.querySelector("span").textContent = "публикую…";
    try {
      const r = await call("POST", "/api/publish");
      toast(r.message, !r.ok);
    } catch (e) { toast(e.message, true); }
    finally { b.disabled = false; b.querySelector("span").textContent = "🚀 опубликовать"; }
  });

  /* ---------- start ---------- */
  if (token) {
    call("GET", "/api/me").then(enter).catch(() => logout(true));
  } else {
    showPanel(false);
  }
})();
