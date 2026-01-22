let currentAudio = null;
let currentButton = null;

const OWNER = "BoniniSebastian";
const REPO  = "v2soundboard";
const FOLDER = "sounds";

const API_URL = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${FOLDER}?t=${Date.now()}`;
const AUDIO_EXT = ["mp3", "m4a", "wav", "ogg", "aac"];

init();

async function init() {
  const root = document.getElementById("app") || createRoot();
  root.innerHTML = "";

  const section = document.createElement("div");
  section.className = "section";

  const title = document.createElement("div");
  title.className = "section-title";
  title.textContent = "MUSIK";

  const grid = document.createElement("div");
  grid.className = "grid";

  section.appendChild(title);
  section.appendChild(grid);
  root.appendChild(section);

  try {
    const res = await fetch(API_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`GitHub API fel: ${res.status}`);
    const items = await res.json();

    const files = (items || [])
      .filter(x => x?.type === "file" && isAudio(x.name))
      .sort((a,b) => a.name.localeCompare(b.name))
      .map(x => ({ name: x.name, url: x.download_url }));

    if (files.length === 0) {
      grid.innerHTML = `<div style="opacity:.7">Inga ljud hittades i /sounds.</div>`;
      return;
    }

    files.forEach(f => {
      const btn = document.createElement("button");
      btn.className = "btn";
      btn.textContent = pretty(f.name);
      btn.addEventListener("click", () => toggle(btn, f.url));
      grid.appendChild(btn);
    });

  } catch (e) {
    console.error(e);
    grid.innerHTML = `<div style="opacity:.7">
      Kunde inte läsa /sounds via GitHub API.
    </div>`;
  }
}

function toggle(btn, url) {
  if (currentButton === btn) { stop(); return; }
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
  if (currentAudio) { currentAudio.pause(); currentAudio.currentTime = 0; }
  if (currentButton) currentButton.classList.remove("playing");
  currentAudio = null;
  currentButton = null;
}

function pretty(name) { return name.replace(/\.[^/.]+$/, ""); }

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
