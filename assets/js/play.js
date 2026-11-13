// Loads the Unity WebGL build from game/ (file names come from game/build.json, written by tools/build_assets.py).
(() => {
  const $ = (id) => document.getElementById(id);
  const canvas = $("unity-canvas"), loader = $("loader"), bar = $("bar"), barOut = $("barOut"), pct = $("pct"), tip = $("tip"), err = $("err");
  const status = $("gameStatus");
  const tips = [
    "Tuck early, open late. Your landing bonus will thank you.",
    "Knife-edge crevice ahead? Roll onto your side with Q or E before the slit.",
    "Proximity chains build within 30 m of the rock, and vanish if you crash.",
    "Daredevil lines are optional. Committing and missing usually isn't.",
    "Under canopy, hold S to flare at about 3 m for a soft, precise touchdown.",
    "Press G to switch graphics quality if your machine is struggling.",
  ];
  let t = Math.floor(Math.random() * tips.length);
  tip.textContent = tips[t];
  const tipTimer = setInterval(() => { t = (t + 1) % tips.length; tip.textContent = tips[t]; }, 4500);

  // controls drawer
  const panel = $("controls"), cBtn = $("controlsBtn");
  const toggle = (open) => { panel.hidden = !open; cBtn.setAttribute("aria-expanded", String(open)); if (!open) canvas.focus({ preventScroll: true }); };
  cBtn.onclick = () => toggle(panel.hidden);
  $("closeControls").onclick = () => toggle(false);

  const touchOnly = matchMedia("(pointer: coarse)").matches && !matchMedia("(any-pointer: fine)").matches;
  if (touchOnly) {
    $("mobileNote").hidden = false;
    $("tryAnyway").onclick = () => { $("mobileNote").hidden = true; start(); };
    $("copyLink").onclick = async () => {
      const url = location.href.split("#")[0];
      try {
        if (navigator.share) { await navigator.share({ title: "BASE JUMP: FREEFALL", text: "Play this on a computer:", url }); return; }
        await navigator.clipboard.writeText(url);
        $("copied").textContent = "Link copied. Open it on a computer to play.";
      } catch (e) { if (!e || e.name !== "AbortError") $("copied").textContent = url; }
    };
  } else start();

  function showError(msg) {
    err.hidden = false;
    err.setAttribute("role", "alert");
    err.textContent = "The game couldn't start: " + msg + " Try reloading, or a different browser (Chrome, Edge, Firefox, Safari).";
  }

  async function start() {
    let b;
    try { b = await (await fetch("game/build.json", { cache: "no-store" })).json(); }
    catch (e) { showError("the build manifest is missing."); return; }
    const s = document.createElement("script");
    s.src = "game/Build/" + b.loader;
    s.onload = () => {
      createUnityInstance(canvas, {
        dataUrl: "game/Build/" + b.data,
        frameworkUrl: "game/Build/" + b.framework,
        codeUrl: "game/Build/" + b.code,
        streamingAssetsUrl: "game/StreamingAssets",
        companyName: b.companyName,   // the build's own names: they key the browser save data
        productName: b.productName,
        productVersion: b.productVersion,
        devicePixelRatio: Math.min(window.devicePixelRatio || 1, 1.25), // same cap as the game's own page
        showBanner: (msg, type) => { if (type === "error") showError(msg); },
      }, (p) => {
        const v = Math.round(p * 100);
        bar.style.width = v + "%";
        barOut.setAttribute("aria-valuenow", String(v));
        pct.textContent = (v < 90 ? "Fuelling the rocket… " : "Climbing to the exit… ") + v + "%";
      }).then((inst) => {
        clearInterval(tipTimer);
        loader.classList.add("done");
        setTimeout(() => { loader.hidden = true; }, 600);  // out of the accessibility tree once faded
        status.textContent = "Game loaded. Focus the game area, then use the arrow keys and Enter to choose a course. Space jumps.";
        const fs = $("fsBtn");
        fs.disabled = false;
        fs.onclick = () => inst.SetFullscreen(1);
        canvas.focus({ preventScroll: true });
      }).catch((m) => showError(String(m)));
    };
    s.onerror = () => showError("the game files didn't download.");
    document.body.appendChild(s);
  }
  canvas.addEventListener("pointerdown", () => canvas.focus({ preventScroll: true }));
})();
