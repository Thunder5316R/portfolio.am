/* ==========================================================
   Asiful Mowla — Portfolio · UI interactions
   ========================================================== */
(function () {
  "use strict";

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const isTouch = window.matchMedia("(hover: none)").matches;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hasGSAP = typeof window.gsap !== "undefined";

  document.body.classList.add("loading");

  /* ---------- Loader ---------- */
  let pct = 0;
  const bar = $("#loaderBar"), pctEl = $("#loaderPct");
  const tick = setInterval(() => {
    pct = Math.min(pct + Math.random() * 12, 92);
    bar.style.width = pct + "%"; pctEl.textContent = Math.floor(pct) + "%";
  }, 120);

  let loaded = false;
  function finishLoading() {
    if (loaded) return; loaded = true;
    clearInterval(tick);
    bar.style.width = "100%"; pctEl.textContent = "100%";
    setTimeout(() => {
      $("#loader").classList.add("done");
      document.body.classList.remove("loading");
      introAnimation();
    }, 350);
  }
  if (document.readyState === "complete") finishLoading();
  else window.addEventListener("load", finishLoading);
  setTimeout(finishLoading, 5000); // safety net if a CDN is slow

  /* ---------- Render projects ---------- */
  const grid = $("#projectGrid");
  (window.PROJECTS || []).forEach((p) => {
    const col = document.createElement("div");
    col.className = "col-md-6 project-col reveal";
    col.dataset.category = (p.category || []).join(" ");
    const thumb = p.image
      ? `<img src="${p.image}" alt="${p.title} screenshot" loading="lazy">`
      : `<div class="thumb-art" style="background:radial-gradient(circle at 30% 20%, ${p.colors[0]}, ${p.colors[1]} 70%)">
           <div class="mock"><div class="mock-bar"><i></i><i></i><i></i></div><div class="mock-body"><i class="bi bi-${p.icon}"></i></div></div>
         </div>`;
    // Only show the links a project actually has
    const link = (url, icon, label) =>
      url ? `<a href="${url}" target="_blank" rel="noopener"><i class="bi bi-${icon}"></i> ${label}</a>` : "";
    const links = link(p.live, "box-arrow-up-right", p.liveLabel || "Live site") + link(p.github, "github", "Source code");
    col.innerHTML = `
      <article class="project-card tilt">
        <div class="project-thumb">${thumb}<span class="project-badge mono">${p.badge || ""}</span></div>
        <div class="project-body">
          <h3>${p.title}</h3>
          <p>${p.desc}</p>
          <div class="tag-row mono">${p.tags.map((t) => `<span>${t}</span>`).join("")}</div>
          <div class="project-links mono">
            ${links || `<span class="private"><i class="bi bi-lock"></i> ${p.note || "Code available on request"}</span>`}
          </div>
        </div>
      </article>`;
    grid.appendChild(col);
  });

  /* ---------- Project filters ---------- */
  $$("#projectFilters button").forEach((btn) =>
    btn.addEventListener("click", () => {
      $$("#projectFilters button").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const f = btn.dataset.filter;
      $$(".project-col").forEach((col) => {
        const show = f === "all" || col.dataset.category.split(" ").includes(f);
        col.classList.toggle("hide", !show);
        if (show && hasGSAP) gsap.fromTo(col, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.5, ease: "power3.out" });
      });
      if (hasGSAP && window.ScrollTrigger) ScrollTrigger.refresh();
    })
  );

  /* ---------- Navbar ---------- */
  const nav = $("#mainNav");
  const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 40);
  window.addEventListener("scroll", onScroll, { passive: true }); onScroll();

  // Active link highlight
  const sections = $$("main section[id]");
  const navLinks = $$(".nav-link");
  const spy = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) navLinks.forEach((l) => l.classList.toggle("active", l.getAttribute("href") === "#" + e.target.id));
    });
  }, { rootMargin: "-45% 0px -50% 0px" });
  sections.forEach((s) => spy.observe(s));

  // Close mobile menu on click
  $$("#navMenu a").forEach((a) => a.addEventListener("click", () => {
    const menu = $("#navMenu");
    if (menu.classList.contains("show") && window.bootstrap) bootstrap.Collapse.getOrCreateInstance(menu).hide();
  }));

  /* ---------- Typing effect ---------- */
  const words = ["full stack web apps", "Laravel back-ends", "REST APIs", "responsive UIs", "admin dashboards"];
  const typed = $("#typed");
  let wi = 0, ci = words[0].length, deleting = true;
  function type() {
    const w = words[wi];
    typed.textContent = w.slice(0, ci);
    if (deleting) { ci--; if (ci < 0) { deleting = false; wi = (wi + 1) % words.length; ci = 0; } }
    else { ci++; if (ci > words[wi].length) { deleting = true; setTimeout(type, 1800); return; } }
    setTimeout(type, deleting ? 45 : 85);
  }
  if (!reduceMotion) setTimeout(type, 3200);

  /* ---------- Local time (Dhaka) ---------- */
  const timeEl = $("#localTime");
  const updateTime = () => {
    timeEl.textContent = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Dhaka" });
  };
  updateTime(); setInterval(updateTime, 30000);
  $("#year").textContent = new Date().getFullYear();

  /* ---------- Custom cursor ---------- */
  if (!isTouch) {
    const dot = $(".cursor-dot"), ring = $(".cursor-ring");
    let mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my;
    window.addEventListener("mousemove", (e) => { mx = e.clientX; my = e.clientY; dot.style.transform = `translate(${mx}px, ${my}px) translate(-50%,-50%)`; });
    (function loop() {
      rx += (mx - rx) * 0.18; ry += (my - ry) * 0.18;
      ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%,-50%)`;
      requestAnimationFrame(loop);
    })();
    document.addEventListener("mouseover", (e) => {
      ring.classList.toggle("hover", !!e.target.closest("a, button, .chip, .tilt, input, textarea"));
    });
  }

  /* ---------- 3D tilt cards ---------- */
  if (!isTouch && !reduceMotion) {
    document.addEventListener("mousemove", (e) => {
      const card = e.target.closest(".tilt");
      if (!card) return;
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      card.style.transform = `perspective(900px) rotateX(${(0.5 - y) * 10}deg) rotateY(${(x - 0.5) * 12}deg) translateZ(0)`;
      card.style.setProperty("--mx", x * 100 + "%");
      card.style.setProperty("--my", y * 100 + "%");
    });
    document.addEventListener("mouseout", (e) => {
      const card = e.target.closest(".tilt");
      if (card && !card.contains(e.relatedTarget)) card.style.transform = "";
    });

    // Magnetic buttons
    $$(".magnetic").forEach((el) => {
      el.addEventListener("mousemove", (e) => {
        const r = el.getBoundingClientRect();
        el.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.25}px, ${(e.clientY - r.top - r.height / 2) * 0.35}px)`;
      });
      el.addEventListener("mouseleave", () => (el.style.transform = ""));
    });
  }

  /* ---------- Scroll animations ---------- */
  function introAnimation() {
    if (!hasGSAP || reduceMotion) return;
    const tl = gsap.timeline({ defaults: { ease: "power4.out" } });
    tl.from(".reveal-word", { yPercent: 110, duration: 1.2, stagger: 0.12 })
      .from(".reveal-hero", { y: 30, opacity: 0, duration: 0.9, stagger: 0.1 }, "-=0.9")
      .fromTo("#mainNav", { y: -30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, clearProps: "transform,opacity" }, "-=0.8")
      .from(".hero-meta > *", { opacity: 0, duration: 0.8, stagger: 0.1 }, "-=0.5");
  }

  if (hasGSAP && window.ScrollTrigger && !reduceMotion) {
    gsap.registerPlugin(ScrollTrigger);
    $$(".reveal").forEach((el) => {
      gsap.from(el, {
        y: 50, opacity: 0, duration: 1, ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 88%", once: true }
      });
    });
  }

  // Counters
  const counterObs = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const el = e.target, target = +el.dataset.count, dec = +(el.dataset.decimals || 0), start = performance.now(), dur = 1600;
      (function step(now) {
        const p = Math.min((now - start) / dur, 1);
        el.textContent = (target * (1 - Math.pow(1 - p, 3))).toFixed(dec);
        if (p < 1) requestAnimationFrame(step);
      })(start);
      counterObs.unobserve(el);
    });
  }, { threshold: 0.6 });
  $$(".stat-num").forEach((el) => counterObs.observe(el));

  /* ---------- 3D tag sphere (skills) ---------- */
  (function tagSphere() {
    const el = $("#tagSphere");
    if (!el) return;
    const tags = ["HTML5", "CSS3", "JavaScript", "React", "Tailwind", "PHP", "Laravel", "MySQL", "SQL", "Bootstrap", "jQuery", "REST API",
      "OpenAI API", "Git", "GitHub", "Blade", "Eloquent", "JSON", "AJAX", "MVC", "XAMPP", "VS Code", "Composer", "MS Access", "Responsive", "OOP"];
    const highlight = ["Laravel", "PHP", "JavaScript", "MySQL", "React", "Tailwind"];
    const spans = tags.map((t) => {
      const s = document.createElement("span");
      s.textContent = t;
      if (highlight.includes(t)) s.classList.add("hl");
      el.appendChild(s); return s;
    });
    const n = tags.length;
    // Fibonacci sphere distribution
    const pts = tags.map((_, i) => {
      const phi = Math.acos(-1 + (2 * i + 1) / n), theta = Math.sqrt(n * Math.PI) * phi;
      return { x: Math.cos(theta) * Math.sin(phi), y: Math.sin(theta) * Math.sin(phi), z: Math.cos(phi) };
    });
    let ax = 0.003, ay = 0.004, dragging = false, lx = 0, ly = 0;
    const rotate = (p, a, b) => {
      // rotate around X by a, then Y by b
      let y = p.y * Math.cos(a) - p.z * Math.sin(a), z = p.y * Math.sin(a) + p.z * Math.cos(a);
      let x = p.x * Math.cos(b) + z * Math.sin(b); z = -p.x * Math.sin(b) + z * Math.cos(b);
      p.x = x; p.y = y; p.z = z;
    };
    el.addEventListener("mousemove", (e) => {
      if (dragging) return;
      const r = el.getBoundingClientRect();
      ay = ((e.clientX - r.left) / r.width - 0.5) * 0.03;
      ax = -((e.clientY - r.top) / r.height - 0.5) * 0.03;
    });
    el.addEventListener("pointerdown", (e) => { dragging = true; lx = e.clientX; ly = e.clientY; el.setPointerCapture(e.pointerId); });
    el.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      ay = (e.clientX - lx) * 0.004; ax = -(e.clientY - ly) * 0.004; lx = e.clientX; ly = e.clientY;
    });
    el.addEventListener("pointerup", () => (dragging = false));
    let visible = true;
    new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(el);
    (function frame() {
      if (visible) {
        const R = el.clientWidth / 2 - 40;
        const fs = Math.max(12, el.clientWidth / 26);
        pts.forEach((p, i) => {
          rotate(p, ax, ay);
          const scale = (p.z + 2) / 3;
          spans[i].style.transform = `translate(-50%,-50%) translate3d(${p.x * R}px, ${p.y * R}px, 0) scale(${scale})`;
          spans[i].style.opacity = 0.25 + ((p.z + 1) / 2) * 0.75;
          spans[i].style.fontSize = fs + "px";
          spans[i].style.zIndex = Math.round((p.z + 1) * 100);
        });
        if (!dragging) { ax *= 0.98; ay *= 0.98; if (Math.abs(ax) + Math.abs(ay) < 0.004) { ax += 0.0006; ay += 0.0012; } }
      }
      requestAnimationFrame(frame);
    })();
  })();

  /* ---------- Contact form (no backend: opens Email / WhatsApp) ---------- */
  const form = $("#contactForm"), note = $("#formNote");
  function readForm() {
    const name = $("#cName"), email = $("#cEmail"), msg = $("#cMsg");
    let ok = true;
    [name, msg].forEach((f) => { const bad = !f.value.trim(); f.classList.toggle("is-invalid", bad); if (bad) ok = false; });
    const badEmail = !/^\S+@\S+\.\S+$/.test(email.value.trim());
    email.classList.toggle("is-invalid", badEmail); if (badEmail) ok = false;
    if (!ok) { note.textContent = "Please fill in your name, a valid email and a message."; note.style.color = "#ff5d73"; return null; }
    note.style.color = "";
    return { name: name.value.trim(), email: email.value.trim(), subject: $("#cSubject").value.trim() || "Project inquiry", msg: msg.value.trim() };
  }
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const d = readForm(); if (!d) return;
    const body = `${d.msg}\n\n— ${d.name}\n${d.email}`;
    window.location.href = `mailto:asifulmowla231@gmail.com?subject=${encodeURIComponent(d.subject)}&body=${encodeURIComponent(body)}`;
    note.textContent = "Opening your email app…";
  });
  $("#waSend").addEventListener("click", () => {
    const d = readForm(); if (!d) return;
    const text = `Hi Asiful, I'm ${d.name} (${d.email}).\n\n*${d.subject}*\n${d.msg}`;
    window.open(`https://wa.me/8801745513701?text=${encodeURIComponent(text)}`, "_blank", "noopener");
    note.textContent = "Opening WhatsApp…";
  });
})();
