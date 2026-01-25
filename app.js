const FADE_MS = 250;

let currentAudio = null;
let currentButton = null;
let goalHornUrl = null;

const OWNER = "BoniniSebastian";
const REPO  = "v2soundboard";

const CATEGORIES = [
  { label: "SOUNDS", folder: "sounds/tuta" },
  { label: "GOAL", folder: "sounds/mal" },
  { label: "Utvisning", folder: "sounds/utvisning" },
  { label: "Avbrott", folder: "sounds/avbrott" }
];

const AUDIO_EXT = ["mp3", "m4a", "wav", "ogg", "aac"];

/* ===== CONTROLS ===== */
const playPauseBtn = document.getElementById("playPauseBtn");
const stopBtn = document.getElementById("stopBtn");
const goalHornBtn = document.getElementById("goalHornBtn");

playPauseBtn.onclick = () => {
  if (!currentAudio) return;

  if (currentAudio.paused) {
    currentAudio.play();
    playPauseBtn.textContent = "❚❚";
  } else {
    fadePause(currentAudio);
    playPauseBtn.textContent = "▶";
  }
};

stopBtn.onclick = () => {
  stop();
  playPauseBtn.textContent = "▶";
};

goalHornBtn.onclick = () => {
  if (!goalHornUrl) return;

  stop();
  const audio = new Audio(goalHornUrl);
  audio.play();
  currentAudio = audio;
  playPauseBtn.textContent = "❚❚";

  audio.onended = () => stop();
};

/* ===== INIT ===== */
init();

async function init() {
  const root = document.getElementById("app");
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

async function loadFolder(folder, grid) {
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${folder}?t=${Date.now()}`;

  try {
    const res = await fetch(url, { cache: "no-store" });
    const files = (await res.json())
      .filter(f => f.type === "file" && isAudio(f.name))
      .sort((a,b) => a.name.localeCompare(b.name,"sv"));

    if (folder === "sounds/tuta") {
      const match = files.find(f =>
        f.name.toLowerCase().includes("goal horn sound effect")
      );
      goalHornUrl = (match || files[0])?.download_url;
    }

    files.forEach(f => {
      const btn = document.createElement("button");
      btn.className = "btn";
      btn.textContent = pretty(f.name);
      btn.onclick = () => play(btn, f.download_url);
      grid.appendChild(btn);
    });

  } catch {
    grid.innerHTML = `<div style="opacity:.7">Kunde inte läsa ${folder}</div>`;
  }
}

/* ===== PLAY ===== */
function play(btn, url) {
  stop();

  const audio = new Audio(url);
  audio.play();

  currentAudio = audio;
  currentButton = btn;
  btn.classList.add("playing");
  playPauseBtn.textContent = "❚❚";

  audio.onended = () => stop();
}

/* ===== STOP / FADE ===== */
function fadePause(audio) {
  fadeOut(audio, () => audio.pause());
}

function stop() {
  if (currentAudio) fadeOut(currentAudio, () => {
    currentAudio.pause();
    currentAudio.currentTime = 0;
  });

  if (currentButton) currentButton.classList.remove("playing");

  currentAudio = null;
  currentButton = null;
}

function fadeOut(audio, done) {
  const start = audio.volume;
  const t0 = performance.now();

  function step(t) {
    const p = Math.min(1, (t - t0) / FADE_MS);
    audio.volume = start * (1 - p);
    if (p < 1) requestAnimationFrame(step);
    else {
      audio.volume = start;
      done?.();
    }
  }
  requestAnimationFrame(step);
}

/* ===== HELPERS ===== */
function pretty(name) {
  return name.replace(/\.[^/.]+$/, "");
}

function isAudio(name) {
  return AUDIO_EXT.includes(name.split(".").pop().toLowerCase());
}
