let currentAudio = null;
let currentButton = null;

const OWNER = "BoniniSebastian";
const REPO  = "v2soundboard";

const CATEGORIES = [
  { label: "Tuta",      folder: "sounds/tuta" },
  { label: "GOAL",      folder: "sounds/mal" },
  { label: "Utvisning", folder: "sounds/utvisning" },
  { label: "Avbrott",   folder: "sounds/avbrott" }
];

const AUDIO_EXT = ["mp3", "m4a", "wav", "ogg", "aac"];

init();

/* Init */
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

  hookPlayerControls();
}

/* Load folder */
async function loadFolder(folder, gridEl) {
  const apiUrl = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${folder}?t=${Date.now()}`;

  try {
    const res = await fetch(apiUrl, { cache: "no-store" });
    if (!res.ok) throw new Error(res.status);

    const items = await res.json();
    const files = items
      .filter(x => x.type === "file" && isAudio(x.name))
      .sort((a,b) => a.name.localeCompare(b.name, "sv"));

    if (!files.length) {
      gridEl.innerHTML = `<div style="opacity:.7">Inga ljud</div>`;
      return;
    }

    files.forEach(f => {
      const btn = document.createElement("button");
      btn.className = "btn";
      btn.textContent = pretty(f.name);
      btn.onclick = () => toggle(btn, f.download_url);
      gridEl.appendChild(btn);
    });

  } catch (e) {
    gridEl.innerHTML = `<div style="opacity:.7">Kunde inte läsa ${folder}</div>`;
  }
}

/* Toggle play/stop */
function toggle(btn, url) {
  if (currentButton === btn) {
    stop();
    return;
  }

  stop();

  const audio = new Audio(url);
  audio.preload = "auto";
  audio.play().catch(() => {});

  currentAudio = audio;
  currentButton = btn;
  btn.classList.add("playing");

  audio.onended = stop;
}

/* Stop */
function stop() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
  }
  if (currentButton) currentButton.classList.remove("playing");
  currentAudio = null;
  currentButton = null;
}

/* Player controls */
function hookPlayerControls() {
  const playPauseBtn = document.getElementById("playPauseBtn");
  const stopBtn = document.getElementById("stopBtn");

  playPauseBtn.onclick = () => {
    if (!currentAudio) return;

    if (currentAudio.paused) {
      currentAudio.play();
      playPauseBtn.textContent = "⏸";
    } else {
      currentAudio.pause();
      playPauseBtn.textContent = "▶︎";
    }
  };

  stopBtn.onclick = () => {
    stop();
    playPauseBtn.textContent = "▶︎";
  };
}

/* Utils */
function pretty(name) {
  return name.replace(/\.[^/.]+$/, "");
}

function isAudio(name) {
  if (name === ".keep") return false;
  const ext = name.split(".").pop().toLowerCase();
  return AUDIO_EXT.includes(ext);
}
