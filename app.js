/* =========================
   SB Soundboard – app.js
   - 1 MUSIK åt gången (grid)
   - HORN kan spelas Ovanpå och STAPLAS (flera horn samtidigt)
   - Stop stoppar allt
   - Play/Pause styr endast musik
   ========================= */

const OWNER = "BoniniSebastian";
const REPO  = "v2soundboard";

const CATEGORIES = [
  { label: "SOUNDS",    folder: "sounds/tuta" },
  { label: "GOAL",      folder: "sounds/mal" },
  { label: "Utvisning", folder: "sounds/utvisning" },
  { label: "Avbrott",   folder: "sounds/avbrott" }
];

const AUDIO_EXT = ["mp3", "m4a", "wav", "ogg", "aac"];

// Fade för MUSIK
const FADE_MS = 220;
let fadeRaf = null;

function cancelFade() {
  if (fadeRaf) cancelAnimationFrame(fadeRaf);
  fadeRaf = null;
}

function safeSetVolume(audio, v) {
  try { audio.volume = v; return true; } catch { return false; }
}

function fadeOut(audio, ms, done) {
  if (!audio) { done?.(); return; }
  cancelFade();

  const start = performance.now();
  const startVol = (() => {
    try { return typeof audio.volume === "number" ? audio.volume : 1; } catch { return 1; }
  })();

  // Om volym inte går att styra (iOS-strul), kör utan fade
  if (!safeSetVolume(audio, startVol)) { done?.(); return; }

  function step(now) {
    const t = Math.min(1, (now - start) / ms);
    const v = Math.max(0, startVol * (1 - t));

    const ok = safeSetVolume(audio, v);
    if (!ok) { fadeRaf = null; done?.(); return; }

    if (t < 1) {
      fadeRaf = requestAnimationFrame(step);
    } else {
      fadeRaf = null;
      safeSetVolume(audio, startVol); // reset
      done?.();
    }
  }

  fadeRaf = requestAnimationFrame(step);
}

function fadePause(audio) {
  if (!audio || audio.paused) return;
  fadeOut(audio, FADE_MS, () => { try { audio.pause(); } catch {} });
}

function fadeStop(audio, onDone) {
  if (!audio) { onDone?.(); return; }

  if (audio.paused) {
    try { audio.currentTime = 0; } catch {}
    onDone?.();
    return;
  }

  fadeOut(audio, FADE_MS, () => {
    try { audio.pause(); } catch {}
    try { audio.currentTime = 0; } catch {}
    onDone?.();
  });
}

/* =========================
   2-kanals state
   ========================= */

// MUSIK-kanal (bara 1 i taget)
let musicAudio = null;
let musicButton = null;

// HORN-kanal (staplas)
let hornAudios = [];

// Hitta horn-URL i sounds/tuta
let goalHornUrl = null;

/* =========================
   Controls
   ========================= */
const playPauseBtn = document.getElementById("playPauseBtn");
const stopBtn = document.getElementById("stopBtn");
const goalHornBtn = document.getElementById("goalHornBtn");

function setPlayIcon(isPlaying) {
  if (!playPauseBtn) return;
  playPauseBtn.textContent = isPlaying ? "❚❚" : "▶";
}

function setStopIcon() {
  if (!stopBtn) return;
  stopBtn.textContent = "■";
}

function clearMusicMarker() {
  if (musicButton) musicButton.classList.remove("playing");
  musicButton = null;
}

function stopHornAll() {
  for (const a of hornAudios) {
    try { a.pause(); } catch {}
    try { a.currentTime = 0; } catch {}
  }
  hornAudios = [];
}

function stopMusic(updateIcon = true) {
  cancelFade();

  const audioToStop = musicAudio;
  clearMusicMarker();

  if (!audioToStop) {
    if (updateIcon) setPlayIcon(false);
    return;
  }

  fadeStop(audioToStop, () => {
    if (musicAudio === audioToStop) {
      musicAudio = null;
      if (updateIcon) setPlayIcon(false);
    }
  });

  if (updateIcon) setPlayIcon(false);
}

function stopAll() {
  stopHornAll();
  stopMusic(true);
}

function playMusic(url, btnOrNull) {
  // samma musikknapp igen = stoppa musiken
  if (btnOrNull && musicButton === btnOrNull) {
    stopMusic(true);
    return;
  }

  stopMusic(false); // stoppa bara musiken, inte horn

  const audio = new Audio(url);
  audio.preload = "auto";

  musicAudio = audio;
  clearMusicMarker();

  if (btnOrNull) {
    musicButton = btnOrNull;
    btnOrNull.classList.add("playing");
  }

  audio.play()
    .then(() => setPlayIcon(true))
    .catch(() => setPlayIcon(false));

  audio.onended = () => {
    if (musicAudio === audio) stopMusic(true);
  };
}

function playHorn() {
  if (!goalHornUrl) {
    alert('Ingen måltuta hittad i "sounds/tuta". Döp filen så att den innehåller "Goal horn sound effect".');
    return;
  }

  const a = new Audio(goalHornUrl);
  a.preload = "auto";

  hornAudios.push(a);

  a.play().catch(() => {});

  a.onended = () => {
    hornAudios = hornAudios.filter(x => x !== a);
  };
}

function bindControls() {
  setPlayIcon(false);
  setStopIcon();

  playPauseBtn.onclick = () => {
    if (!musicAudio) return;

    if (musicAudio.paused) {
      cancelFade();
      musicAudio.play().then(() => setPlayIcon(true)).catch(() => {});
    } else {
      fadePause(musicAudio);
      setPlayIcon(false);
    }
  };

  stopBtn.onclick = () => stopAll();

  // 📣 Horn: staplas och påverkar inte musiken
  goalHornBtn.onclick = () => playHorn();
}

/* =========================
   UI build
   ========================= */

init().catch(console.error);

async function init() {
  bindControls();

  const root = document.getElementById("app") || createRoot();
  root.innerHTML = "";

  for (const cat of CATEGORIES) {
    const section = document.createElement("div");
    section.className = "section";

    const title = document.createElement("div");
    title.className = "section-title";
    title.textContent = cat.label;

    const grid = document.createElement("div");
    grid.className = "grid";

    section.appendChild(title);
    section.appendChild(grid);
    root.appendChild(section);

    await loadFolder(cat.folder, grid);
  }
}

async function loadFolder(folder, gridEl) {
  const apiUrl = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${folder}?t=${Date.now()}`;

  try {
    const res = await fetch(apiUrl, { cache: "no-store" });
    if (!res.ok) throw new Error(`GitHub API fel: ${res.status}`);
    const items = await res.json();

    const files = (items || [])
      .filter(x => x?.type === "file" && isAudio(x.name))
      .sort((a, b) => (a.name || "").localeCompare(b.name || "", "sv"));

    // Hitta goal horn i sounds/tuta
    if (folder === "sounds/tuta") {
      const wanted = "goal horn sound effect";
      const match = files.find(f => (f.name || "").toLowerCase().includes(wanted));
      goalHornUrl = (match || files[0] || null)?.download_url || null;
    }

    if (!files.length) {
      gridEl.innerHTML = `<div style="opacity:.7">Inga ljud i ${folder}</div>`;
      return;
    }

    for (const file of files) {
      const btn = document.createElement("button");
      btn.className = "btn";
      btn.textContent = pretty(file.name);

      // Grid = musikkanal (en åt gången)
      btn.onclick = () => playMusic(file.download_url, btn);

      gridEl.appendChild(btn);
    }

  } catch (e) {
    console.error(e);
    gridEl.innerHTML = `<div style="opacity:.7">Kunde inte läsa ${folder}</div>`;
  }
}

function pretty(name) {
  return (name || "").replace(/\.[^/.]+$/, "");
}

function isAudio(name) {
  if (!name) return false;
  if (name === ".keep") return false;
  const ext = (name.split(".").pop() || "").toLowerCase();
  return AUDIO_EXT.includes(ext);
}

function createRoot() {
  const div = document.createElement("div");
  div.id = "app";
  document.body.appendChild(div);
  return div;
}
