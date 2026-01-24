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

async function init() {
  const root = document.getElementById("app") || createRoot();
  root.innerHTML = "";

  hookPlayerControls();

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

  updatePlayPauseIcon();
}

function hookPlayerControls() {
  const playPauseBtn = document.getElementById("playPauseBtn");
  const stopBtn = document.getElementById("stopBtn");

  if (playPauseBtn) {
    playPauseBtn.addEventListener("click", () => {
      if (!currentAudio) return;

      if (currentAudio.paused) {
        currentAudio.play().catch(() => {});
      } else {
        currentAudio.pause();
      }
      updatePlayPauseIcon();
    });
  }

  if (stopBtn) {
    stopBtn.addEventListener("click", () => {
      stop();
      updatePlayPauseIcon();
    });
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
      .sort((a, b) => a.name.localeCompare(b.name, "sv"))
      .map(x => ({ name: x.name, url: x.download_url }));

    if (!files.length) {
      gridEl.innerHTML = `<div style="opacity:.7">Inga ljud i ${folder}</div>`;
      return;
    }

    files.forEach(f => {
      const btn = document.createElement("button");
      btn.className = "btn";
      btn.textContent = pretty(f.name);
      btn.addEventListener("click", () => toggle(btn, f.url));
      gridEl.appendChild(btn);
    });

  } catch (e) {
    console.error(e);
    gridEl.innerHTML = `<div style="opacity:.7">Kunde inte läsa ${folder}</div>`;
  }
}

function toggle(btn, url) {
  // Tryck på samma knapp igen = STOPP (startar från början nästa gång)
  if (currentButton === btn && currentAudio && !currentAudio.paused) {
    stop();
    updatePlayPauseIcon();
    return;
  }

  stop();

  const audio = new Audio(url);
  audio.preload = "auto";

  audio.play().catch(() => alert("Kunde inte spela ljudet."));

  currentAudio = audio;
  currentButton = btn;
  btn.classList.add("playing");

  updatePlayPauseIcon();

  audio.onended = () => {
    stop();
    updatePlayPauseIcon();
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

function updatePlayPauseIcon() {
  const playPauseBtn = document.getElementById("playPauseBtn");
  if (!playPauseBtn) return;

  if (currentAudio && !currentAudio.paused) playPauseBtn.textContent = "⏸";
  else playPauseBtn.textContent = "▶︎";
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
