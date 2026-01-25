/* =========================
   Fade helpers
========================= */
const FADE_MS = 250; // 200–300ms känns bra
let fadeRaf = null;

function cancelFade() {
  if (fadeRaf) cancelAnimationFrame(fadeRaf);
  fadeRaf = null;
}

function fadeOut(audio, ms, done) {
  if (!audio) return done?.();
  cancelFade();

  const startVol = audio.volume ?? 1;
  const start = performance.now();

  function step(now) {
    const t = Math.min(1, (now - start) / ms);
    audio.volume = startVol * (1 - t);

    if (t < 1) {
      fadeRaf = requestAnimationFrame(step);
    } else {
      fadeRaf = null;
      done?.();
      // återställ volym för nästa gång
      audio.volume = startVol;
    }
  }

  fadeRaf = requestAnimationFrame(step);
}

function fadePause(audio) {
  if (!audio || audio.paused) return;
  fadeOut(audio, FADE_MS, () => audio.pause());
}

function fadeStop(audio) {
  if (!audio) return;

  // Om den redan är pausad: nollställ direkt
  if (audio.paused) {
    audio.currentTime = 0;
    return;
  }

  fadeOut(audio, FADE_MS, () => {
    audio.pause();
    audio.currentTime = 0;
  });
}

/* =========================
   App state
========================= */
let currentAudio = null;
let currentButton = null;

// URL till "måltuta"
let goalHornUrl = null;

const OWNER = "BoniniSebastian";
const REPO = "v2soundboard";

const CATEGORIES = [
  { label: "SOUNDS",    folder: "sounds/tuta" },
  { label: "GOAL",      folder: "sounds/mal" },
  { label: "Utvisning", folder: "sounds/utvisning" },
  { label: "Avbrott",   folder: "sounds/avbrott" }
];

const AUDIO_EXT = ["mp3", "m4a", "wav", "ogg", "aac"];

/* =========================
   Controls (måste finnas i index.html)
========================= */
const playPauseBtn = document.getElementById("playPauseBtn");
const stopBtn = document.getElementById("stopBtn");
const goalHornBtn = document.getElementById("goalHornBtn");

// Init icons
if (playPauseBtn) playPauseBtn.textContent = "▶";
if (stopBtn) stopBtn.textContent = "■";

// Play/Pause
if (playPauseBtn) {
  playPauseBtn.onclick = () => {
    if (!currentAudio) return;

    if (currentAudio.paused) {
      cancelFade();
      currentAudio.play();
      playPauseBtn.textContent = "❚❚";
    } else {
      fadePause(currentAudio);
      playPauseBtn.textContent = "▶";
    }
  };
}

// Stop
if (stopBtn) {
  stopBtn.onclick = () => {
    stop();
    if (playPauseBtn) playPauseBtn.textContent = "▶";
  };
}

// Måltuta-knapp (rosa)
if (goalHornBtn) {
  goalHornBtn.onclick = () => {
    if (!goalHornUrl) {
      alert('Ingen måltuta hittad i "sounds/tuta". Döp en fil så att den innehåller "Goal horn sound effect".');
      return;
    }

    // Om måltutan redan spelas: stoppa
    if (currentAudio && !currentAudio.paused && currentAudio.src === goalHornUrl) {
      stop();
      if (playPauseBtn) playPauseBtn.textContent = "▶";
      return;
    }

    stop();

    const audio = new Audio(goalHornUrl);
    audio.preload = "auto";
    cancelFade();
    audio.play().catch(() => alert("Kunde inte spela måltutan."));

    currentAudio = audio;
    currentButton = null;

    if (playPauseBtn) playPauseBtn.textContent = "❚❚";

    audio.onended = () => {
      stop();
      if (playPauseBtn) playPauseBtn.textContent = "▶";
    };
  };
}

/* =========================
   Init UI
========================= */
init();

async function init() {
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
      .sort((a, b) => a.name.localeCompare(b.name, "sv"));

    // Hitta måltuta i sounds/tuta
    if (folder === "sounds/tuta" && files.length > 0) {
      const needle = "goal horn sound effect"; // räcker att den innehåller detta
      const match = files.find(f => (f.name || "").toLowerCase().includes(needle));
      goalHornUrl = (match || files[0]).download_url; // fallback: första filen
    }

    if (!files.length) {
      gridEl.innerHTML = `<div style="opacity:.7">Inga ljud i ${folder}</div>`;
      return;
    }

    files.forEach(file => {
      const btn = document.createElement("button");
      btn.className = "btn";
      btn.textContent = pretty(file.name);
      btn.onclick = () => toggle(btn, file.download_url);
      gridEl.appendChild(btn);
    });

  } catch (e) {
    console.error(e);
    gridEl.innerHTML = `<div style="opacity:.7">Kunde inte läsa ${folder}</div>`;
  }
}

function toggle(btn, url) {
  // samma knapp igen = stop
  if (currentButton === btn) {
    stop();
    if (playPauseBtn) playPauseBtn.textContent = "▶";
    return;
  }

  stop();

  const audio = new Audio(url);
  audio.preload = "auto";
  cancelFade();
  audio.play().catch(() => alert("Kunde inte spela ljudet."));

  currentAudio = audio;
  currentButton = btn;
  btn.classList.add("playing");

  if (playPauseBtn) playPauseBtn.textContent = "❚❚";

  audio.onended = () => {
    stop();
    if (playPauseBtn) playPauseBtn.textContent = "▶";
  };
}

function stop() {
  const audioToStop = currentAudio;
  const btnToClear = currentButton;

  // Nolla state direkt (UI känns snabb)
  currentAudio = null;
  currentButton = null;

  if (btnToClear) btnToClear.classList.remove("playing");
  if (audioToStop) fadeStop(audioToStop);
}

function pretty(name) {
  return name.replace(/\.[^/.]+$/, "");
}

function isAudio(name) {
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
