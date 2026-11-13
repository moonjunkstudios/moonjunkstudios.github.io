// Moonjunk Studios: privacy-first Google Analytics 4 (opt-in). Events are documented in Website/ANALYTICS.md.
// - Runs only on moonjunkstudios.com (or on localhost with ?ga_debug=1). Never on portals such as CrazyGames.
// - Nothing loads or is stored until the visitor clicks "Allow". Global Privacy Control counts as "No".
// - No user IDs, no ad features, no Google Signals. Cookies (_ga*) last 13 months at most.
// The game reaches this file through window.MoonjunkAnalytics.game() (Assets/BaseJump/Plugins/WebGL/BJWeb.jslib).
(() => {
  const ID = "G-G8VVEFEW93";
  const KEY = "mj_analytics";                        // localStorage: {v: "granted" | "denied", t: ms}
  const MAX_AGE = 395 * 864e5;                       // ask again after 13 months
  const q = new URLSearchParams(location.search);
  const ss = (k, v) => { try { return v === undefined ? sessionStorage.getItem(k) : sessionStorage.setItem(k, v); } catch (e) { return null; } };
  if (q.get("ga_debug") === "1") ss("mj_ga_debug", "1");
  if (q.get("ga_debug") === "0") ss("mj_ga_debug", "0");
  const debug = ss("mj_ga_debug") === "1";
  const host = location.hostname;
  const ours = host === "moonjunkstudios.com" || host === "www.moonjunkstudios.com";
  const local = host === "localhost" || host === "127.0.0.1";
  const enabled = ours || (local && debug);

  const read = () => {
    try { const c = JSON.parse(localStorage.getItem(KEY)); return c && Date.now() - c.t < MAX_AGE ? c.v : null; } catch (e) { return null; }
  };
  const write = (v) => { try { localStorage.setItem(KEY, JSON.stringify({ v, t: Date.now() })); } catch (e) {} };

  let state = read() || (navigator.globalPrivacyControl === true ? "denied" : null);
  let loaded = false;
  const queue = [];                                  // game events from before the visitor chose (kept in memory only)
  const log = (...a) => { if (debug) console.info("[analytics]", ...a); };

  function load() {
    if (loaded || !enabled) return;
    loaded = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { dataLayer.push(arguments); };
    gtag("consent", "default", { analytics_storage: "granted", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
    gtag("set", { allow_google_signals: false, allow_ad_personalization_signals: false });
    gtag("js", new Date());
    const cfg = { cookie_expires: 395 * 86400 };     // 13 months
    if (debug) cfg.debug_mode = true;
    gtag("config", ID, cfg);                         // sends the one automatic page_view for this page load
    const s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + ID;
    document.head.appendChild(s);
    log("loaded GA4", ID);
    while (queue.length) send(...queue.shift());
  }

  function send(name, params) {
    if (!enabled || state === "denied") return;
    if (state !== "granted") { if (queue.length < 30) queue.push([name, params]); return; }
    load();
    params = Object.assign({}, params);
    if (debug) params.debug_mode = true;             // per event: GA4 DebugView picks it up reliably this way
    gtag("event", name, params);
    log(name, params || {});
  }

  function choose(v) {
    state = v;
    write(v);
    if (v === "granted") load();
    else {
      queue.length = 0;
      if (loaded) gtag("consent", "update", { analytics_storage: "denied" });
      // remove GA cookies from this host and the parent domain
      document.cookie.split(";").map((c) => c.split("=")[0].trim()).filter((n) => n.startsWith("_ga")).forEach((n) => {
        [host, "." + host.replace(/^www\./, "")].forEach((d) => { document.cookie = n + "=; Max-Age=0; path=/; domain=" + d; });
        document.cookie = n + "=; Max-Age=0; path=/";
      });
    }
    hideBanner();
    document.dispatchEvent(new CustomEvent("mj-analytics", { detail: v }));
  }

  // ---------- consent banner (small, bottom-left, never steals focus from the game)
  let banner = null;
  function showBanner() {
    if (banner || !enabled) return;
    banner = document.createElement("div");
    banner.className = "consent";
    banner.setAttribute("role", "region");
    banner.setAttribute("aria-label", "Analytics choice");
    banner.innerHTML = '<p>Can we count your visit? We use Google Analytics cookies to see which pages and courses people enjoy. ' +
      'No ads, no profiles, nothing you type. <a href="privacy.html">Privacy</a></p>' +
      '<div class="row"><button class="btn btn-gold" type="button" data-v="granted">Allow</button>' +
      '<button class="btn btn-ghost" type="button" data-v="denied">No thanks</button></div>';
    banner.addEventListener("click", (e) => {
      const b = e.target.closest("button[data-v]");
      if (!b) return;
      choose(b.dataset.v);
      const game = document.getElementById("unity-canvas");
      if (game) game.focus({ preventScroll: true });   // hand the keyboard back to the game
    });
    document.body.appendChild(banner);
  }
  function hideBanner() { if (banner) { banner.remove(); banner = null; } }

  // ---------- site events: Ko-fi and social profile clicks (one listener for the whole page)
  const SOCIAL = { "youtube.com": "youtube", "tiktok.com": "tiktok", "instagram.com": "instagram", "x.com": "x", "twitter.com": "x",
    "reddit.com": "reddit", "bsky.app": "bluesky", "discord.gg": "discord", "discord.com": "discord", "itch.io": "itch",
    "facebook.com": "facebook", "threads.net": "threads", "twitch.tv": "twitch" };
  document.addEventListener("click", (e) => {
    const a = e.target.closest && e.target.closest("a[href]");
    if (!a || a.host === location.host) return;
    const domain = a.hostname.replace(/^www\./, "");
    const where = a.closest("footer") ? "footer" : a.closest(".support") ? "support_card" : a.closest("header") ? "header" : "page";
    if (domain === "ko-fi.com") send("support_click", { platform: "ko-fi", link_location: where, link_url: a.href });
    else {
      const k = Object.keys(SOCIAL).find((d) => domain === d || domain.endsWith("." + d));
      if (k) send("social_click", { platform: SOCIAL[k], link_location: where, link_url: a.href });
    }
  }, { capture: true, passive: true });

  window.MoonjunkAnalytics = {
    enabled,
    get choice() { return state; },
    allow: () => choose("granted"),
    deny: () => choose("denied"),
    // called by the game; time_since_load_sec is added to game_ready so we can see real-world load times
    game(name, params) {
      params = params || {};
      if (name === "game_ready") params.time_since_load_sec = Math.round(performance.now() / 100) / 10;
      send(name, params);
    },
  };

  if (!enabled) return;
  if (state === "granted") load();
  else if (state === null) {
    if (document.body) showBanner(); else document.addEventListener("DOMContentLoaded", showBanner);
  }
})();
