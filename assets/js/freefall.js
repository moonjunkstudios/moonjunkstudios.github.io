// The home page is a jump: scroll = freefall. Altitude counts down from the exit, scroll speed reads in km/h,
// every section is a ring you fly through (scored like the game), and the page ends on the bullseye.
(() => {
  const EXIT_ALT = 600;           // metres above the landing zone at the top of the page
  const RING_PTS = 300, STREAK = 50, BULLSEYE = 1500;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (id) => document.getElementById(id);
  const altEl = $("alt"), spdEl = $("spd"), modeEl = $("mode"), dot = $("dot"), track = $("track"), altBox = $("altBox");
  const topbar = document.querySelector(".topbar");
  const scoreEl = $("score"), ringsEl = $("rings"), result = $("result");
  const gates = [...document.querySelectorAll("[data-ring]")];
  const sections = [...document.querySelectorAll("main > section")];

  // ring markers on the altitude track
  const marks = gates.map((g) => {
    const i = document.createElement("i");
    track.appendChild(i);
    return i;
  });

  let score = 0, streak = 0, shownScore = 0, landed = false;
  const passed = new Set();

  const maxScroll = () => Math.max(1, document.documentElement.scrollHeight - innerHeight);
  const fmt = (n) => Math.round(n).toLocaleString("en-US");

  function placeMarks() {
    const m = maxScroll();
    gates.forEach((g, k) => {
      const y = Math.min(1, Math.max(0, (g.offsetTop - innerHeight * 0.5) / m));
      marks[k].style.top = `calc(${y * 100}% - 7px)`;
    });
  }

  function popup(text, big) {
    document.querySelectorAll(".popup").forEach((o) => o.remove());
    const p = document.createElement("div");
    p.className = "popup" + (big ? " big" : "");
    p.textContent = text;
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 1700);
  }

  function flyRing() {
    if (reduce) return;
    const r = document.createElement("div");
    r.className = "flyring";
    document.body.appendChild(r);
    setTimeout(() => r.remove(), 900);
  }

  function passGate(k) {
    if (passed.has(k)) return;
    passed.add(k);
    marks[k].classList.add("hit");
    const last = k === gates.length - 1;
    streak++;
    const pts = RING_PTS + (streak - 1) * STREAK;
    score += pts;
    flyRing();
    popup(streak > 1 ? `RING +${pts}  STREAK ${streak}` : `RING +${pts}`);
    ringsEl.textContent = `RINGS ${passed.size}/${gates.length}`;
    if (last) setTimeout(land, 600);
  }

  function land() {
    if (landed) return;
    landed = true;
    score += BULLSEYE;
    popup(`BULLSEYE! +${fmt(BULLSEYE)}`, true);
    modeEl.textContent = "LANDED";
    result.innerHTML = `Scroll score <strong>${fmt(score)}</strong> · ${passed.size}/${gates.length} rings. Now do it with a wingsuit.`;
  }

  // ---------- per-frame HUD
  let lastY = scrollY, lastT = performance.now(), speed = 0;
  function frame(t) {
    const y = scrollY, dt = Math.max(1, t - lastT);
    const v = Math.abs(y - lastY) / dt * 1000;           // px/s
    speed += (Math.min(260, v * 0.07) - speed) * Math.min(1, dt / 120);
    lastY = y; lastT = t;
    const f = Math.min(1, y / maxScroll());
    const alt = EXIT_ALT * (1 - f);
    altEl.textContent = fmt(alt);
    altBox.classList.toggle("low", alt < 60);
    topbar.classList.toggle("scrolled", y > 40);
    document.body.classList.toggle("on-hero", y < innerHeight * 0.3);
    spdEl.textContent = fmt(speed < 1 ? 0 : speed);
    dot.style.top = `${f * 100}%`;
    if (!landed) {
      // mode from the section under the middle of the screen; "FREEFALL" while falling fast through it
      const mid = y + innerHeight * 0.5;
      const sec = sections.findLast ? sections.findLast((s) => s.offsetTop <= mid) : sections.filter((s) => s.offsetTop <= mid).pop();
      let mode = sec ? sec.dataset.mode : "STANDING";
      if (y < 4) mode = "STANDING";
      modeEl.textContent = mode;
    }
    if (shownScore !== score) {
      shownScore += Math.ceil((score - shownScore) * 0.18);
      scoreEl.textContent = fmt(shownScore);
    }
    // gates: pass when the section's top crosses the middle of the screen
    gates.forEach((g, k) => { if (!passed.has(k) && g.getBoundingClientRect().top < innerHeight * 0.5) passGate(k); });
    if (!landed && y >= maxScroll() - 2 && passed.size === gates.length) land();
    requestAnimationFrame(frame);
  }

  // ---------- SPACE to jump (to the next section), like the game's exit prompt
  addEventListener("keydown", (e) => {
    if (e.code !== "Space" || e.target.closest("input, textarea, button, video, a")) return;
    e.preventDefault();
    const mid = scrollY + 74;
    const next = sections.find((s) => s.offsetTop > mid);
    scrollTo({ top: next ? next.offsetTop - 64 : maxScroll(), behavior: reduce ? "auto" : "smooth" });
  });

  // ---------- videos: play muted loops only while on screen; course clips also play on hover
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    const v = e.target;
    if (e.isIntersecting && !reduce) { v.play().catch(() => {}); v.closest(".course")?.classList.add("playing"); }
    else { v.pause(); v.closest(".course")?.classList.remove("playing"); }
  }), { threshold: 0.35 });
  document.querySelectorAll("video.loop, .course video").forEach((v) => io.observe(v));
  const hero = $("heroVid");
  if (reduce) { hero.pause(); hero.removeAttribute("autoplay"); }

  // ---------- trailer: big custom play button, then native controls
  const trailer = $("trailer"), playBtn = $("playTrailer");
  playBtn.addEventListener("click", () => { playBtn.remove(); trailer.play(); });
  trailer.addEventListener("play", () => playBtn.isConnected && playBtn.remove());

  // ---------- touch-only visitors: send the game link to a computer
  const toast = $("toast");
  const say = (m) => { toast.textContent = m; toast.classList.add("show"); clearTimeout(say.t); say.t = setTimeout(() => toast.classList.remove("show"), 3200); };
  const gameUrl = new URL("play.html", location.href).href;
  document.querySelectorAll(".copy-link").forEach((b) => b.addEventListener("click", async () => {
    try {
      if (navigator.share) { await navigator.share({ title: "BASE JUMP: FREEFALL", text: "Play this on a computer:", url: gameUrl }); return; }
      await navigator.clipboard.writeText(gameUrl);
      say("Link copied. Open it on a computer to play.");
    } catch (e) {
      if (e && e.name === "AbortError") return;
      say(gameUrl);
    }
  }));

  addEventListener("resize", placeMarks);
  addEventListener("load", placeMarks);
  placeMarks();
  requestAnimationFrame(frame);
})();
