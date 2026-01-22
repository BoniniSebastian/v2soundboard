let currentAudio = null;
let currentButton = null;

const OWNER = "BoniniSebastian";
const REPO  = "v2soundboard";

const CATEGORIES = [
  { id: "tuta", label: "Tuta" },
  { id: "goal", label: "Goal" },
  { id: "utvisning", label: "Utvisning" }
];

const AUDIO_EXT = ["mp3", "m4a", "wav", "ogg", "aac"];

init();

async function init() {
  const root = document.getElementById("app");
  root.innerHTML = "";

  const title = document.createElement("h1");
  title.textContent = "SB Soundboard";
  root.appendChild(title);

  for (const cat of CATEGORIES) {
    await loadCategory(root, cat);
  }
}

async function loadCategory(root, cat) {
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

  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/sounds/${cat.id}?t=${Date.now()}`;

  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error("API error");

    const items = await res.json();

    const files = items
      .filter(f => f.type === "file" && isAudio(f.name))
      .sort((a,b) => a.name.localeCompare(b.name));

    if (files.length === 0) {
      grid.innerHTML = `<div style="opacity:.6">Inga ljud</div>`;
      return;
    }

    files.forEach(f => {
      const btn = document.createElement("button");
      btn.className = "btn";
      btn.textContent = pretty(f.name);
      btn.onclick = () => toggle(btn, f.download_url);
      grid.appendChild(btn);
    });

  } catch (e) {
    grid.innerHTML = `<div style="opacity:.6">Kunde inte läsa sounds/${cat.id}</div>`;
  }
}

function toggle(btn, url) {
  if (currentButton === btn) {
    stop();
    return;
  }

  stop();

  const audio = new Audio(url);
  audio.play();

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
  if (currentButton) currentButton.classList.remove("playing");
  currentAudio = null;
  currentButton = null;
}

function isAudio(name) {
  const ext = name.split(".").pop().toLowerCase();
  return AUDIO_EXT.includes(ext);
}

function pretty(name) {
  return name.replace(/\.[^/.]+$/, "");
}
