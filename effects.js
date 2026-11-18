// Премиальные эффекты: прогресс, подсветка курсора, 3D-карточки, расшифровка заголовков и т.д.
(() => {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;

  /* ---------- Scroll: progress bar, topbar state, active nav ---------- */
  const progress = $("#progress"), topbar = $(".topbar");
  const onScroll = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    progress.style.setProperty("--p", max > 0 ? scrollY / max : 0);
    topbar.classList.toggle("scrolled", scrollY > 30);
  };
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  const navLinks = [...$$(".topbar nav a")];
  const navIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) navLinks.forEach((a) => a.classList.toggle("active", a.getAttribute("href") === "#" + e.target.id));
    });
  }, { rootMargin: "-45% 0px -50% 0px" });
  $$("main section[id]").forEach((s) => navIO.observe(s));

  /* ---------- Cursor spotlight ---------- */
  if (finePointer && !reduced) {
    const root = document.documentElement;
    addEventListener("pointermove", (e) => {
      root.style.setProperty("--sx", e.clientX + "px");
      root.style.setProperty("--sy", e.clientY + "px");
    }, { passive: true });
  }

  /* ---------- 3D tilt + spotlight on cards ---------- */
  if (finePointer && !reduced) {
    $$("#project-list .card").forEach((card) => {
      card.addEventListener("transitionend", () => (card.style.transitionDelay = ""), { once: true });
      card.addEventListener("pointermove", (e) => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        card.style.setProperty("--mx", x * 100 + "%");
        card.style.setProperty("--my", y * 100 + "%");
        card.classList.add("tilting");
        card.style.transform = `perspective(900px) rotateX(${(0.5 - y) * 9}deg) rotateY(${(x - 0.5) * 11}deg) translateY(-6px)`;
      });
      card.addEventListener("pointerleave", () => {
        card.classList.remove("tilting");
        card.style.transform = "";
      });
    });
  }

  /* ---------- Magnetic buttons ---------- */
  if (finePointer && !reduced) {
    $$(".magnetic").forEach((el) => {
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        el.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.25}px, ${(e.clientY - r.top - r.height / 2) * 0.35}px)`;
      });
      el.addEventListener("pointerleave", () => (el.style.transform = ""));
    });
  }

  /* ---------- Text scramble ---------- */
  const glyphs = "!<>-_\\/[]{}—=+*^?#01アカサタナ";
  function scramble(el, finalText, duration = 900) {
    if (reduced) { el.textContent = finalText; return; }
    const start = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const revealed = Math.floor(t * finalText.length);
      let s = finalText.slice(0, revealed);
      for (let i = revealed; i < finalText.length; i++) s += finalText[i] === " " ? " " : glyphs[(Math.random() * glyphs.length) | 0];
      el.textContent = s;
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  const scrIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.closest(".sec-head")?.classList.add("in");
      scramble(e.target, e.target.dataset.final);
      scrIO.unobserve(e.target);
    });
  }, { threshold: 0.6 });
  $$("[data-scramble]").forEach((el) => { el.dataset.final = el.textContent; scrIO.observe(el); });

  // Имя в hero: расшифровка после загрузки
  const heroName = $("#hero-name");
  const bootDelay = document.getElementById("boot") ? 1900 : 200;
  setTimeout(() => scramble(heroName, SITE.nick, 1100), bootDelay);

  /* ---------- Stats counters ---------- */
  const techCount = new Set(SITE.projects.flatMap((p) => p.tags)).size;
  const counts = {
    projects: SITE.projects.length,
    tech: techCount,
    bots: SITE.projects.filter((p) => p.category === "bot").length,
  };
  const countUp = (el) => {
    const target = counts[el.dataset.count] || 0;
    if (reduced) { el.textContent = target; return; }
    const start = performance.now(), dur = 1400;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / dur);
      el.textContent = Math.round(target * (1 - Math.pow(1 - t, 3)));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  setTimeout(() => $$("[data-count]").forEach(countUp), bootDelay);

  /* ---------- Marquee with tech stack ---------- */
  const tech = [...new Set(SITE.projects.flatMap((p) => p.tags))];
  const row = tech.map((t) => `<span>${esc(t)}</span>`).join("");
  $("#marquee").innerHTML = row + row; // дубль для бесшовной прокрутки

  /* ---------- profile.json typing ---------- */
  const ageEl = $("#age");
  const ageVal = /^\d+/.test(ageEl.textContent) ? parseInt(ageEl.textContent, 10) : null;
  const profile = [
    ["nick", SITE.nick],
    ["age", ageVal],
    ["location", SITE.location],
    ["role", "fullstack developer"],
    ["now", SITE.now?.text],
    ["stack", ["Node.js", "Python", "TypeScript", "Unity"]],
    ["projects", SITE.projects.length],
    ["status", "online"],
  ].filter(([, v]) => v != null && v !== "");
  const fmt = (v) =>
    Array.isArray(v) ? `<span class="pun">[</span>${v.map((x) => `<span class="str">"${esc(x)}"</span>`).join('<span class="pun">, </span>')}<span class="pun">]</span>`
    : typeof v === "number" ? `<span class="num">${v}</span>`
    : `<span class="str">"${esc(v)}"</span>`;
  const lines = [
    '<span class="pun">{</span>',
    ...profile.map(([k, v], i) => `  <span class="key">"${k}"</span><span class="pun">: </span>${fmt(v)}${i < profile.length - 1 ? '<span class="pun">,</span>' : ""}`),
    '<span class="pun">}</span>',
  ];
  const code = $("#profile-code");
  if (reduced) code.innerHTML = lines.join("\n");
  else {
    let li = 0;
    const addLine = () => {
      code.innerHTML = lines.slice(0, ++li).join("\n") + (li < lines.length ? '\n<span class="cursor">█</span>' : "");
      if (li < lines.length) setTimeout(addLine, 140 + Math.random() * 120);
    };
    setTimeout(addLine, bootDelay + 300);
  }
})();
