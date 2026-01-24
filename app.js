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

const playPauseBtn = document.getElementById("playPauseBtn");
const stopBtn = document.getElementById("stopBtn");

playPauseBtn.onclick = () => {
  if (!currentAudio) return;

  if (currentAudio.paused) {
    currentAudio.play();
    playPauseBtn.textContent = "❚❚";
  } else {
    currentAudio.pause();
    playPauseBtn.textContent = "▶";
  }
};

stopBtn.onclick = stop;

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
    if (!res.ok) throw new Error(res.status);

    const items = await res.json();

    items
      .filter(f => f.type === "file" && isAudio(f.name))
      .sort((a,b) => a.name.localeCompare(b.name, "sv"))
      .forEach(f => {
        const btn = document.createElement("button");
        btn.className = "btn";
        btn.textContent = pretty(f.name);
        btn.onclick = () => toggle(btn, f.download_url);
        grid.appendChild(btn);
      });

  } catch {
    grid.innerHTML = `<div style="opacity:.6">Kunde inte läsa ${folder}</div>`;
  }
}

function toggle(btn, url) {
  if (currentButton === btn) {
    stop();
    return;
  }

  stop();

  currentAudio = new Audio(url);
  currentAudio.play();
  playPauseBtn.textContent = "❚❚";

  currentButton = btn;
  btn.classList.add("playing");

  currentAudio.onended = stop;
}

function stop() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
  }
  if (currentButton) currentButton.classList.remove("playing");

  currentAudio = null;
  currentButton = null;
  playPauseBtn.textContent = "▶";
}

function isAudio(name) {
  const ext = name.split(".").pop().toLowerCase();
  return AUDIO_EXT.includes(ext);
}

function pretty(name) {
  return name.replace(/\.[^/.]+$/, "");
}
