let currentAudio = null;
let currentButton = null;

const OWNER = "BoniniSebastian";
const REPO  = "v2soundboard";

const CATEGORIES = [
  { title: "Tuta",      folder: "sounds/tuta",      css: "tuta" },
  { title: "GOAL",      folder: "sounds/mal",       css: "goal" }, // mappen heter "mal"
  { title: "Utvisning", folder: "sounds/utvisning", css: "utvisning" }
];

const AUDIO_EXT = ["mp3", "m4a", "wav", "ogg", "aac"];

init();

async function init() {
  const root = document.getElementById("app") || createRoot();
  root.innerHTML = "";

  for (const cat of CATEGORIES) {
    const section = document.createElement("div");
    section.className = "section";

    const title = document.createElement("div");
    title.className = "section-title";
    title.textContent = cat.title;

    const grid = document.createElement("div");
    grid.className = `grid ${cat.css}`;

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
      .sort((a,b) => a.name.localeCompare(b.name, "sv"))
      .map(x => ({ name: x.name, url: x.download_url }));

    if (files.length === 0) {
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
  // Samma knapp igen => stoppa
  if (currentButton === btn) {
    stop();
    return;
  }

  stop();

  const audio = new Audio(url);
  audio.preload = "auto";

  audio.play().catch(() => alert("Kunde inte spela ljudet."));

  currentAudio = audio;
  currentButton = btn;
  btn.classList.add("playing");

  audio.onended = stop;
}

function stop() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
  }
  if (currentButton) {
    currentButton.classList.remove("playing");
  }
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