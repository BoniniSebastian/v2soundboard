let currentAudio = null;
let currentButton = null;

// URL till "måltuta" (första filen i sounds/mal)
let goalHornUrl = null;

const OWNER = "BoniniSebastian";
const REPO  = "v2soundboard";

const CATEGORIES = [
  { label: "Tuta",      folder: "sounds/tuta" },
  { label: "GOAL",      folder: "sounds/mal" },
  { label: "Utvisning", folder: "sounds/utvisning" },
  { label: "Avbrott",   folder: "sounds/avbrott" }
];

const AUDIO_EXT = ["mp3", "m4a", "wav", "ogg", "aac"];

// Controls
const playPauseBtn = document.getElementById("playPauseBtn");
const stopBtn = document.getElementById("stopBtn");
const goalHornBtn = document.getElementById("goalHornBtn");

// Init icons
playPauseBtn.textContent = "▶";
stopBtn.textContent = "■";

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

stopBtn.onclick = () => {
  stop();
  playPauseBtn.textContent = "▶";
};

// Måltuta-knapp: spelar första GOAL-filen
goalHornBtn.onclick = () => {
  if (!goalHornUrl) {
    alert("Ingen måltuta hittad. Lägg minst en fil i sounds/mal.");
    return;
  }

  // Om måltutan redan spelas: stoppa
  if (currentAudio && !currentAudio.paused && currentAudio.src === goalHornUrl) {
    stop();
    playPauseBtn.textContent = "▶";
    return;
  }

  stop();

  const audio = new Audio(goalHornUrl);
  audio.preload = "auto";
  audio.play().catch(() => alert("Kunde inte spela måltutan."));

  currentAudio = audio;
  currentButton = null;

  playPauseBtn.textContent = "❚❚";

  audio.onended = () => {
    stop();
    playPauseBtn.textContent = "▶";
  };
};

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
      .sort((a,b) => a.name.localeCompare(b.name, "sv"));

    // Sätt goalHornUrl som första filen i sounds/mal (sorterad)
    if (folder === "sounds/mal" && files.length > 0) {
      goalHornUrl = files[0].download_url;
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
    playPauseBtn.textContent = "▶";
    return;
  }

  stop();

  const audio = new Audio(url);
  audio.preload = "auto";
  audio.play().catch(() => alert("Kunde inte spela ljudet."));

  currentAudio = audio;
  currentButton = btn;
  btn.classList.add("playing");

  playPauseBtn.textContent = "❚❚";

  audio.onended = () => {
    stop();
    playPauseBtn.textContent = "▶";
  };
}

function stop() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
  }

  if (currentButton) currentButton.classList.remove("playing");

  currentAudio = null;
  currentButton = null;
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
