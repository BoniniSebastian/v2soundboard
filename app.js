const FADE_MS = 250;
let fadeRaf = null;

function fadeOut(audio, done) {
  const startVol = audio.volume ?? 1;
  const start = performance.now();

  function step(now) {
    const t = Math.min(1, (now - start) / FADE_MS);
    audio.volume = startVol * (1 - t);
    if (t < 1) fadeRaf = requestAnimationFrame(step);
    else {
      audio.pause();
      audio.volume = startVol;
      done?.();
    }
  }
  fadeRaf = requestAnimationFrame(step);
}

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

const AUDIO_EXT = ["mp3","m4a","wav","ogg","aac"];

const playPauseBtn = document.getElementById("playPauseBtn");
const stopBtn = document.getElementById("stopBtn");
const goalHornBtn = document.getElementById("goalHornBtn");

playPauseBtn.onclick = () => {
  if (!currentAudio) return;
  if (currentAudio.paused) {
    currentAudio.play();
    playPauseBtn.textContent = "❚❚";
  } else {
    fadeOut(currentAudio);
    playPauseBtn.textContent = "▶";
  }
};

stopBtn.onclick = () => stop();

goalHornBtn.onclick = () => {
  if (!goalHornUrl) return alert("Ingen måltuta hittad");
  stop();
  const audio = new Audio(goalHornUrl);
  audio.play();
  currentAudio = audio;
  playPauseBtn.textContent = "❚❚";
};

function stop() {
  if (currentAudio) fadeOut(currentAudio, () => currentAudio.currentTime = 0);
  if (currentButton) currentButton.classList.remove("playing");
  currentAudio = null;
  currentButton = null;
  playPauseBtn.textContent = "▶";
}

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
  const res = await fetch(
    `https://api.github.com/repos/${OWNER}/${REPO}/contents/${folder}?t=${Date.now()}`,
    { cache: "no-store" }
  );
  const files = (await res.json())
    .filter(f => AUDIO_EXT.includes(f.name.split(".").pop()));

  if (folder === "sounds/tuta") {
    const horn = files.find(f =>
      f.name.toLowerCase().includes("goal horn sound effect")
    );
    goalHornUrl = horn?.download_url;
  }

  files.forEach(file => {
    const btn = document.createElement("button");
    btn.className = "btn";
    btn.textContent = file.name.replace(/\.[^/.]+$/, "");
    btn.onclick = () => {
      stop();
      const audio = new Audio(file.download_url);
      audio.play();
      currentAudio = audio;
      currentButton = btn;
      btn.classList.add("playing");
      playPauseBtn.textContent = "❚❚";
      audio.onended = stop;
    };
    grid.appendChild(btn);
  });
}
