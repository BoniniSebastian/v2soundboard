/* =========================
   SB Soundboard – app.js
   - Kategorier från /sounds/<mapp>
   - Play/Pause + Stop + Måltuta-knapp
   - iOS-safe fade (kraschar inte om volume ej går att styra)
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

// Fade (ms)
const FADE_MS = 220;

// State
let currentAudio = null;
let currentButton = null;
let goalHornUrl = null;

// Fade internals
let fadeRaf = null;

function cancelFade() {
  if (fadeRaf) cancelAnimationFrame(fadeRaf);
  fadeRaf = null;
}

function safeSetVolume(audio, v) {
  // iOS Safari kan ignorera/ibland strula med volume – vi får aldrig krascha här
  try {
    audio.volume = v;
    return true;
  } catch {
    return false;
  }
}

function fadeOut(audio, ms, done) {
  if (!audio) { done?.(); return; }
  cancelFade();

  const start = performance.now();
  const startVol = (() => {
    try { return typeof audio.volume === "number" ? audio.volume : 1; } catch { return 1; }
  })();

  // Om vi inte kan sätta volym: kör "done" direkt (ingen fade men funkar alltid)
  if (!safeSetVolume(audio, startVol)) {
    done?.();
    return;
  }

  function step(now) {
    const t = Math.min(1, (now - start) / ms);
    const v = Math.max(0, startVol * (1 - t));

    // Om Safari börjar vägra mitt i: avsluta och kör done
    const ok = safeSetVolume(audio, v);
    if (!ok) {
      fadeRaf = null;
      done?.();
      return;
    }

    if (t < 1) {
      fadeRaf = requestAnimationFrame(step);
    } else {
      fadeRaf = null;
      // återställ inför nästa gång
      safeSetVolume(audio, startVol);
      done?.();
    }
  }

  fadeRaf = requestAnimationFrame(step);
}

function fadePause(audio) {
  if (!audio || audio.paused) return;
  fadeOut(audio, FADE_MS, () => {
    try { audio.pause(); } catch {}
  });
}

function fadeStop(audio, onDone) {
  if (!audio) { onDone?.(); return; }

  // Om redan pausad: nollställ direkt
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
   Controls (måste finnas i index.html)
   - playPauseBtn
   - stopBtn
   - goalHornBtn
   ========================= */

const playPauseBtn = document.getElementById("playPauseBtn");
const stopBtn = document.getElementById("stopBtn");
const goalHornBtn = document.getElementById("goalHornBtn");

// Om någon id saknas → krascha inte hela appen
function controlsOk() {
  return !!(playPauseBtn && stopBtn && goalHornBtn);
}

function setPlayIcon(isPlaying) {
  if (!playPauseBtn) return;
  // ▶ för play, ❚❚ för paus
  playPauseBtn.textContent = isPlaying ? "❚❚" : "▶";
}

function setStopIcon() {
  if (!stopBtn) return;
  stopBtn.textContent = "■";
}

function bindControls() {
  if (!controlsOk()) {
    console.warn("Saknar controls i index.html (playPauseBtn/stopBtn/goalHornBtn).");
    return;
  }

  setPlayIcon(false);
  setStopIcon();

  playPauseBtn.onclick = () => {
    if (!currentAudio) return;

    if (currentAudio.paused) {
      // Resume
      cancelFade();
      currentAudio.play().then(() => setPlayIcon(true)).catch(() => {});
    } else {
      // Pause med fade
      fadePause(currentAudio);
      setPlayIcon(false);
    }
  };

  stopBtn.onclick = () => {
    stopAll(true);
  };

  goalHornBtn.onclick = () => {
    if (!goalHornUrl) {
      alert('Ingen måltuta hittad i "sounds/tuta". Döp filen så att den innehåller "Goal horn sound effect".');
      return;
    }
    playUrl(goalHornUrl, null); // null = ingen grid-knapp som markeras
  };
}

/* =========================
   Core playback
   ========================= */

function clearPlayingMarker() {
  if (currentButton) currentButton.classList.remove("playing");
  currentButton = null;
}

function stopAll(updateIcon = true) {
  cancelFade();

  const audioToStop = currentAudio;
  clearPlayingMarker();

  if (!audioToStop) {
    if (updateIcon) setPlayIcon(false);
    return;
  }

  // Stoppa med fade, men vänta tills fade är klar innan vi nollställer state
  fadeStop(audioToStop, () => {
    // Om något nytt började spela under fade: rör inte det
    if (currentAudio === audioToStop) {
      currentAudio = null;
      if (updateIcon) setPlayIcon(false);
    }
  });

  // Vi rensar inte currentAudio direkt här – annars kan play/pause bli knas på iOS
  // men vi vill ändå visa play direkt:
  if (updateIcon) setPlayIcon(false);
}

function playUrl(url, btnOrNull) {
  // Om samma knapp trycks igen → stop (som du vill)
  if (btnOrNull && currentButton === btnOrNull) {
    stopAll(true);
    return;
  }

  stopAll(false);

  // Skapa ny Audio varje gång (stabilt)
  const audio = new Audio(url);
  audio.preload = "auto";

  currentAudio = audio;
  clearPlayingMarker();

  if (btnOrNull) {
    currentButton = btnOrNull;
    btnOrNull.classList.add("playing");
  }

  // Start
  audio.play()
    .then(() => setPlayIcon(true))
    .catch(() => {
      // iOS kan blocka om något konstigt – visa play-icon igen
      setPlayIcon(false);
    });

  audio.onended = () => {
    // Bara om det fortfarande är “current”
    if (currentAudio === audio) stopAll(true);
  };
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

      btn.onclick = () => {
        playUrl(file.download_url, btn);
      };

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
