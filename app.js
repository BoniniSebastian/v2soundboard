let currentAudio = null;
let currentButton = null;
let goalHornUrl = null;

const OWNER = "BoniniSebastian";
const REPO = "v2soundboard";

const CATEGORIES = [
  { label: "SOUNDS", folder: "sounds/tuta" },
  { label: "GOAL", folder: "sounds/mal" },
  { label: "Utvisning", folder: "sounds/utvisning" },
  { label: "Avbrott", folder: "sounds/avbrott" }
];

const AUDIO_EXT = ["mp3", "m4a", "wav", "ogg", "aac"];

const playPauseBtn = document.getElementById("playPauseBtn");
const stopBtn = document.getElementById("stopBtn");
const goalHornBtn = document.getElementById("goalHornBtn");

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

stopBtn.onclick = () => stop();

goalHornBtn.onclick = () => {
  if (!goalHornUrl) return alert("Ingen måltuta hittad");
  stop();
  const a = new Audio(goalHornUrl);
  a.play();
  currentAudio = a;
  playPauseBtn.textContent = "❚❚";
  a.onended = stop;
};

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

    section.append(title, grid);
    root.appendChild(section);

    await loadFolder(cat.folder, grid);
  }
}

async function loadFolder(folder, grid) {
  try {
    const res = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/contents/${folder}`, { cache: "no-store" });
    const items = await res.json();

    const files = items.filter(f =>
      f.type === "file" &&
      AUDIO_EXT.includes(f.name.split(".").pop().toLowerCase())
    );

    if (folder === "sounds/tuta") {
      const horn = files.find(f => f.name.toLowerCase().includes("goal horn"));
      if (horn) goalHornUrl = horn.download_url;
    }

    files.forEach(f => {
      const btn = document.createElement("button");
      btn.className = "btn";
      btn.textContent = f.name.replace(/\.[^/.]+$/, "");
      btn.onclick = () => play(btn, f.download_url);
      grid.appendChild(btn);
    });
  } catch {
    grid.textContent = `Kunde inte läsa ${folder}`;
  }
}

function play(btn, url) {
  stop();
  const a = new Audio(url);
  a.play();
  currentAudio = a;
  currentButton = btn;
  btn.classList.add("playing");
  playPauseBtn.textContent = "❚❚";
  a.onended = stop;
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
