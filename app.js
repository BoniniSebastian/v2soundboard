let currentAudio = null;
let currentButton = null;
let isPaused = false;

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

async function init() {
  const root = document.getElementById("app") || createRoot();
  root.innerHTML = "";

  // === GLOBALA KONTROLLER ===
  const controls = document.createElement("div");
  controls.className = "controls";

  const playPauseBtn = document.createElement("button");
  playPauseBtn.id = "playPause";
  playPauseBtn.textContent = "▶";
  playPauseBtn.onclick = togglePlayPause;

  const stopBtn = document.createElement("button");
  stopBtn.textContent = "⏹";
  stopBtn.onclick = stop;

  controls.appendChild(playPauseBtn);
  controls.appendChild(stopBtn);
  root.appendChild(controls);

  // === KATEGORIER ===
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
    if (!res.ok) throw new Error(res.status);
    const items = await res.json();

    const files = items
      .filter(x => x.type === "file" && isAudio(x.name))
      .sort((a,b) => a.name.localeCompare(b.name, "sv"))
      .map(x => ({ name: x.name, url: x.download_url }));

    files.forEach(f => {
      const btn = document.createElement("button");
      btn.className = "btn";
      btn.textContent = pretty(f.name);
      btn.onclick = () => playFromButton(btn, f.url);
      gridEl.appendChild(btn);
    });

  } catch {
    gridEl.innerHTML = `<div style="opacity:.6">Kunde inte läsa ${folder}</div>`;
  }
}

// === LJUDLOGIK ===

function playFromButton(btn, url) {
  if (currentButton === btn && currentAudio && !isPaused) {
    stop();
    return;
  }

  stop();

  const audio = new Audio(url);
  audio.play();

  currentAudio = audio;
  currentButton = btn;
  isPaused = false;

  btn.classList.add("playing");
  updatePlayIcon();

  audio.onended = stop;
}

function togglePlayPause() {
  if (!currentAudio) return;

  if (isPaused) {
    currentAudio.play();
    isPaused = false;
  } else {
    currentAudio.pause();
    isPaused = true;
  }

  updatePlayIcon();
}

function stop() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
  }

  if (currentButton) currentButton.classList.remove("playing");

  currentAudio = null;
  currentButton = null;
  isPaused = false;

  updatePlayIcon();
}

function updatePlayIcon() {
  const btn = document.getElementById("playPause");
  if (!btn) return;

  btn.textContent = (currentAudio && !isPaused) ? "⏸" : "▶";
}

// === HJÄLP ===

function pretty(name) {
  return name.replace(/\.[^/.]+$/, "");
}

function isAudio(name) {
  const ext = name.split(".").pop().toLowerCase();
  return AUDIO_EXT.includes(ext);
}

function createRoot() {
  const div = document.createElement("div");
  div.id = "app";
  document.body.appendChild(div);
  return div;
}
