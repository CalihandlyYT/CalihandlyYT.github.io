(() => {
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const startTime = Date.now();

  /* ---------- Matrix rain ---------- */
  const cvs = $("#matrix"), ctx = cvs.getContext("2d");
  const chars = "アイウエオカキクケコサシスセソ01owicog<>/{}#$%&*";
  let cols, drops;
  const fs = 16;
  function resize() {
    cvs.width = innerWidth; cvs.height = innerHeight;
    cols = Math.ceil(cvs.width / fs);
    drops = Array.from({ length: cols }, () => Math.random() * -50);
  }
  function rain() {
    ctx.fillStyle = "rgba(6,8,10,0.09)";
    ctx.fillRect(0, 0, cvs.width, cvs.height);
    ctx.font = fs + "px monospace";
    for (let i = 0; i < cols; i++) {
      const ch = chars[(Math.random() * chars.length) | 0];
      ctx.fillStyle = Math.random() > 0.975 ? "#e6fff1" : (i % 7 === 0 ? "#2de2ff" : "#3dff8f");
      ctx.fillText(ch, i * fs, drops[i] * fs);
      if (drops[i] * fs > cvs.height && Math.random() > 0.975) drops[i] = 0;
      drops[i]++;
    }
  }
  resize();
  addEventListener("resize", resize);
  if (!reduced) setInterval(rain, 50);

  /* ---------- Boot screen ---------- */
  const bootLines = [
    "[  OK  ] Initializing kernel...",
    "[  OK  ] Mounting /dev/brain",
    "[  OK  ] Loading coffee.service",
    "[  OK  ] Starting firewall (nobody gets in)",
    "[ WARN ] Sleep schedule not found",
    "[  OK  ] Decrypting profile: " + SITE.nick,
    "[  OK  ] Access granted.",
    "",
    "> welcome, guest_",
  ];
  const boot = $("#boot"), bootLog = $("#boot-log");
  let seenBoot = false;
  try { seenBoot = sessionStorage.getItem("booted") === "1"; } catch (e) {}
  if (reduced || seenBoot) {
    boot.remove();
  } else {
    let i = 0;
    const next = () => {
      if (i < bootLines.length) {
        bootLog.textContent += bootLines[i++] + "\n";
        setTimeout(next, 120 + Math.random() * 160);
      } else {
        setTimeout(() => { boot.classList.add("hide"); setTimeout(() => boot.remove(), 600); }, 400);
        try { sessionStorage.setItem("booted", "1"); } catch (e) {}
      }
    };
    next();
    boot.addEventListener("click", () => boot.remove());
  }

  /* ---------- Typed taglines ---------- */
  const typed = $("#typed");
  let ti = 0, ci = 0, deleting = false;
  function type() {
    const line = SITE.taglines[ti];
    typed.textContent = line.slice(0, ci);
    if (!deleting && ci < line.length) { ci++; setTimeout(type, 55); }
    else if (!deleting) { deleting = true; setTimeout(type, 1800); }
    else if (ci > 0) { ci--; setTimeout(type, 25); }
    else { deleting = false; ti = (ti + 1) % SITE.taglines.length; setTimeout(type, 300); }
  }
  if (reduced) typed.textContent = SITE.taglines[0]; else type();

  /* ---------- About: age, location ---------- */
  function getAge() {
    if (SITE.birthDate) {
      const b = new Date(SITE.birthDate), n = new Date();
      if (!isNaN(b)) {
        let a = n.getFullYear() - b.getFullYear();
        if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--;
        return a;
      }
    }
    return SITE.age ?? null;
  }
  const age = getAge();
  $("#age").textContent = age != null ? age + " y.o." : "??";
  $("#loc").textContent = SITE.location || "";
  $("#pcount").textContent = SITE.projects.length;
  $("#about-text").innerHTML = esc(SITE.about || "").split(esc(SITE.nick)).join(`<b>${esc(SITE.nick)}</b>`).replace(/\n/g, "<br>");
  document.querySelector(".glitch").dataset.text = SITE.nick;

  /* ---------- Now: чем занят ---------- */
  function ago(iso) {
    const s = (Date.now() - new Date(iso)) / 1000;
    if (!isFinite(s) || s < 0) return "";
    if (s < 3600) return "только что";
    if (s < 86400) return `${(s / 3600) | 0} ч назад`;
    if (s < 86400 * 30) return `${(s / 86400) | 0} дн назад`;
    return `${(s / 86400 / 30) | 0} мес назад`;
  }
  if (SITE.now?.text) {
    $("#now-text").innerHTML = `<span class="dim">сейчас:</span> ${esc(SITE.now.text)}`;
    $("#now-ago").textContent = ago(SITE.now.updated) ? "· " + ago(SITE.now.updated) : "";
  }

  /* ---------- Timeline ---------- */
  $("#timeline-list").innerHTML = (SITE.timeline || []).map((t) => `
    <li class="tl-item reveal">
      <span class="tl-dot"></span>
      <time>${esc(t.date)}</time>
      <h3>${esc(t.title)}</h3>
      ${t.text ? `<p>${esc(t.text)}</p>` : ""}
    </li>`).join("");
  if (!(SITE.timeline || []).length) $("#timeline").remove();

  /* ---------- Projects ---------- */
  const statusLabel = { active: "● активен", done: "✓ завершён", wip: "◐ в разработке", abandoned: "✕ заброшен" };
  const catLabel = { all: "все", web: "web", bot: "боты", app: "приложения", game: "игры" };
  const cats = ["all", ...new Set(SITE.projects.map((p) => p.category).filter(Boolean))];
  $("#filters").innerHTML = cats.map((c) => {
    const n = c === "all" ? SITE.projects.length : SITE.projects.filter((p) => p.category === c).length;
    return `<button type="button" data-cat="${esc(c)}" class="${c === "all" ? "on" : ""}">${esc(catLabel[c] || c)} [${n}]</button>`;
  }).join("");
  $("#filters").addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    document.querySelectorAll("#filters button").forEach((x) => x.classList.toggle("on", x === b));
    document.querySelectorAll("#project-list .card").forEach((card) => {
      const p = SITE.projects[+card.dataset.i];
      card.classList.toggle("hidden", b.dataset.cat !== "all" && p.category !== b.dataset.cat);
      card.classList.add("in");
    });
  });
  $("#project-list").innerHTML = SITE.projects.map((p, i) => `
    <article class="card reveal${p.status === "abandoned" ? " is-abandoned" : ""}" tabindex="0" data-i="${i}">
      <div class="card-head">
        <h3>${esc(p.name)}</h3>
        <span class="perm">drwxr-xr-x ${esc(p.year)}</span>
      </div>
      <p>${esc(p.short)}</p>
      <div class="tags">${p.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join("")}</div>
      <div class="card-foot">
        <span class="status ${esc(p.status)}">${statusLabel[p.status] || esc(p.status)}</span>
        <span class="open">README →</span>
      </div>
    </article>`).join("");

  const modal = $("#modal");
  function openProject(i) {
    const p = SITE.projects[i];
    $("#modal-title").textContent = `~/projects/${p.name}/README.md`;
    const links = [];
    if (p.links?.github) links.push(`<a class="btn ghost" href="${esc(p.links.github)}" target="_blank" rel="noopener">[ github ]</a>`);
    if (p.links?.telegram) links.push(`<a class="btn ghost" href="${esc(p.links.telegram)}" target="_blank" rel="noopener">[ telegram ]</a>`);
    if (p.links?.demo) links.push(`<a class="btn" href="${esc(p.links.demo)}" target="_blank" rel="noopener">[ сайт ]</a>`);
    $("#modal-body").innerHTML = `
      <h3># ${esc(p.name)}</h3>
      <p class="meta">${statusLabel[p.status] || esc(p.status)} · ${esc(p.year)}</p>
      <p>${esc(p.description)}</p>
      <div class="tags">${p.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join("")}</div>
      ${links.length ? `<div class="links">${links.join("")}</div>` : ""}`;
    modal.showModal();
  }
  $("#project-list").addEventListener("click", (e) => {
    const card = e.target.closest(".card"); if (card) openProject(+card.dataset.i);
  });
  $("#project-list").addEventListener("keydown", (e) => {
    const card = e.target.closest(".card");
    if (card && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); openProject(+card.dataset.i); }
  });
  $("#modal-close").addEventListener("click", () => modal.close());
  modal.addEventListener("click", (e) => { if (e.target === modal) modal.close(); });

  /* ---------- Skills ---------- */
  $("#skill-list").innerHTML = SITE.skills.map((s) => `
    <div class="skill">
      <span>${esc(s.name)}</span>
      <div class="bar"><span data-w="${+s.level}"></span></div>
      <span class="pct">${+s.level}%</span>
    </div>`).join("");

  /* ---------- Contacts ---------- */
  $("#contact-list").innerHTML = SITE.contacts.map((c) => {
    const inner = `<span class="k">${esc(c.label)}</span><span>= "${esc(c.value)}"</span>`;
    return c.url
      ? `<a class="contact reveal" href="${esc(c.url)}" target="_blank" rel="noopener">${inner}</a>`
      : `<button type="button" class="contact copyable reveal" data-copy="${esc(c.value)}" title="Нажми, чтобы скопировать">${inner}<em class="copy-hint">копировать</em></button>`;
  }).join("");
  $("#contact-list").addEventListener("click", async (e) => {
    const b = e.target.closest(".copyable"); if (!b) return;
    const hint = b.querySelector(".copy-hint");
    try { await navigator.clipboard.writeText(b.dataset.copy); hint.textContent = "скопировано ✓"; }
    catch { hint.textContent = b.dataset.copy; }
    b.classList.add("copied");
    setTimeout(() => { hint.textContent = "копировать"; b.classList.remove("copied"); }, 1600);
  });

  /* ---------- Reveal on scroll ---------- */
  document.querySelectorAll("section:not(.hero) .window, .sec-head, .sec-sub, .filters").forEach((el) => el.classList.add("reveal"));
  document.querySelectorAll("#project-list .card, #contact-list .contact").forEach((el, i) => (el.style.transitionDelay = (i % 3) * 90 + "ms"));
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      en.target.classList.add("in");
      en.target.querySelectorAll(".bar span").forEach((b) => (b.style.width = b.dataset.w + "%"));
      io.unobserve(en.target);
    });
  }, { threshold: 0.15 });
  document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

  /* ---------- Uptime & year ---------- */
  $("#year").textContent = new Date().getFullYear();
  setInterval(() => {
    const s = ((Date.now() - startTime) / 1000) | 0;
    $("#uptime").textContent = (s >= 60 ? ((s / 60) | 0) + "m " : "") + (s % 60) + "s";
  }, 1000);

  /* ---------- Interactive terminal ---------- */
  const out = $("#term-out"), input = $("#term-in"), term = $("#term");
  const history = []; let hi = 0;
  const print = (html, cls = "") => {
    const p = document.createElement("pre");
    if (cls) p.className = cls;
    p.innerHTML = html;
    out.appendChild(p);
    term.scrollTop = term.scrollHeight;
  };
  const commands = {
    help: () => print(
      "Доступные команды:\n" +
      "  <b>whoami</b>      — кто я\n" +
      "  <b>about</b>       — обо мне\n" +
      "  <b>projects</b>    — список проектов\n" +
      "  <b>open N</b>      — открыть проект по номеру\n" +
      "  <b>skills</b>      — навыки\n" +
      "  <b>now</b>         — чем занят сейчас\n" +
      "  <b>timeline</b>    — путь по годам\n" +
      "  <b>contact</b>     — контакты\n" +
      "  <b>matrix</b>      — ускорить дождь\n" +
      "  <b>hack</b>        — ...\n" +
      "  <b>clear</b>       — очистить экран"),
    whoami: () => print(esc(SITE.nick) + (age != null ? `, ${age} y.o.` : "") + (SITE.location ? `, ${esc(SITE.location)}` : "")),
    age: () => print(age != null ? `${age}` : "classified 🔒"),
    about: () => print(esc($("#about .out:last-of-type").textContent.trim().replace(/\s+/g, " "))),
    projects: () => print(SITE.projects.map((p, i) =>
      `[${String(i + 1).padStart(2)}] <b>${esc(p.name)}</b> <span class="dim">(${esc(p.category || "")})</span> — ${esc(p.short)}`).join("\n") + "\n\n<span class='dim'>open N — подробнее</span>"),
    open: (n) => {
      const i = parseInt(n, 10) - 1;
      if (SITE.projects[i]) { print(`opening ${esc(SITE.projects[i].name)}...`); openProject(i); }
      else print("usage: open N  (N — номер из projects)", "err");
    },
    skills: () => print(SITE.skills.map((s) =>
      `${esc(s.name).padEnd(16)} [${"#".repeat(Math.round(s.level / 10)).padEnd(10, ".")}] ${+s.level}%`).join("\n")),
    contact: () => print(SITE.contacts.map((c) =>
      `${esc(c.label).padEnd(10)} ${c.url ? `<a href="${esc(c.url)}" target="_blank" rel="noopener">${esc(c.value)}</a>` : esc(c.value)}`).join("\n")),
    clear: () => (out.innerHTML = ""),
    now: () => print(SITE.now?.text ? `${esc(SITE.now.text)} <span class="dim">(${ago(SITE.now.updated)})</span>` : "отдыхаю 😴"),
    timeline: () => print((SITE.timeline || []).map((t) => `<span class="c">${esc(t.date).padEnd(14)}</span> <b>${esc(t.title)}</b>`).join("\n") || "пусто"),
    admin: () => {
      if (!/^(localhost|127.0.0.1)$/.test(location.hostname)) return print("Permission denied: админка доступна только локально 🔒", "err");
      print("redirecting to /admin.html ..."); setTimeout(() => (location.href = "admin.html"), 500);
    },
    sudo: () => print("Nice try. Этот инцидент будет зарегистрирован.", "err"),
    ls: () => commands.projects(),
    matrix: () => { for (let k = 0; k < 30; k++) setTimeout(rain, k * 15); print("wake up, neo..."); },
    hack: () => {
      const steps = ["bypassing firewall...", "injecting payload...", "cracking hash ████████ 100%", "ACCESS GRANTED", "...шутка. Просто посмотри проекты 😉"];
      steps.forEach((s, k) => setTimeout(() => print(s, k === 3 ? "ok" : ""), k * 500));
    },
  };
  $("#term-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const raw = input.value.trim();
    input.value = "";
    print(`<span class="c">owicog@root:~$</span> ${esc(raw)}`);
    if (!raw) return;
    history.push(raw); hi = history.length;
    const [cmd, ...args] = raw.split(/\s+/);
    const fn = commands[cmd.toLowerCase()];
    fn ? fn(...args) : print(`bash: ${esc(cmd)}: команда не найдена. Введи help`, "err");
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowUp" && hi > 0) { input.value = history[--hi]; e.preventDefault(); }
    if (e.key === "ArrowDown") { hi = Math.min(hi + 1, history.length); input.value = history[hi] || ""; e.preventDefault(); }
  });
  term.addEventListener("click", () => input.focus());
})();
