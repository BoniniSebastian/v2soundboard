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

  // Koppla kontroller (måste finnas i index.html)
  const playPauseBtn = document.getElementById("playPauseBtn");
  const stopBtn = document.getElementById("stopBtn");

  // Säker default-ikon
  if (playPauseBtn) playPauseBtn.textContent = "▶";
  if (stopBtn) stopBtn.textContent = "■";

  // Play/Pause (pausar/fortsätter aktuell låt)
  if (playPauseBtn) {
    playPauseBtn.addEventListener("click", () => {
      if (!currentAudio) return;

      if (currentAudio.paused) {
        currentAudio.play().catch(() => {});
        playPauseBtn.textContent = "||"; // PAUSE
      } else {
        currentAudio.pause();
        playPauseBtn.textContent = "▶"; // PLAY
      }
    });
  }

  // Stop (stoppar och spolar tillbaka)
  if (stopBtn) {
    stopBtn.addEventListener("click", () => {
      stop();
      if (playPauseBtn) playPauseBtn.textContent = "▶";
    });
  }

  // Bygg kategorier och knappar
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

    await loadFolder(cat.folder, grid, playPauseBtn);
  }
}

async function loadFolder(folder, gridEl, playPauseBtn) {
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

      btn.addEventListener("click", () => {
        // Klick på samma knapp igen = STOPP (som du vill)
        if (currentButton === btn && currentAudio && !currentAudio.paused) {
          stop();
          if (playPauseBtn) playPauseBtn.textContent = "▶";
          return;
        }

        // Stoppa allt annat först
        stop();

        // Spela ny
        const audio = new Audio(f.url);
        audio.preload = "auto";
        audio.play().catch(() => alert("Kunde inte spela ljudet."));

        currentAudio = audio;
        currentButton = btn;
        btn.classList.add("playing");

        if (playPauseBtn) playPauseBtn.textContent = "||";

        audio.onended = () => {
          stop();
          if (playPauseBtn) playPauseBtn.textContent = "▶";
        };
      });

      gridEl.appendChild(btn);
    });

  } catch (e) {
    console.error(e);
    gridEl.innerHTML = `<div style="opacity:.7">Kunde inte läsa ${folder}</div>`;
  }
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
