// ===== Fade settings =====
const FADE_MS = 260; // 200–300ms känns bra
let fadeRaf = null;

function cancelFade() {
  if (fadeRaf) cancelAnimationFrame(fadeRaf);
  fadeRaf = null;
}

function fadeOut(audio, ms, done) {
  if (!audio) return done?.();
  cancelFade();

  const startVol = (typeof audio.volume === "number") ? audio.volume : 1;
  const start = performance.now();

  function step(now) {
    const t = Math.min(1, (now - start) / ms);
    audio.volume = startVol * (1 - t);

    if (t < 1) {
      fadeRaf = requestAnimationFrame(step);
    } else {
      fadeRaf = null;
      done?.();
      audio.volume = startVol; // återställ
    }
  }

  fadeRaf = requestAnimationFrame(step);
}

function fadePause(audio) {
  if (!audio || audio.paused) return;
  fadeOut(audio, FADE_MS, () => audio.pause());
}

function fadeStop(audio) {
  if (!audio) return;
  if (audio.paused) { audio.currentTime = 0; return; }
  fadeOut(audio, FADE_MS, () => {
    audio.pause();
    audio.currentTime = 0;
  });
}

// ===== State =====
let currentAudio = null;
let currentButton = null;

// URL till "måltuta" (letar i sounds/tuta efter filnamn som innehåller texten nedan)
let goalHornUrl = null;
const GOAL_HORN_MATCH = "goal horn sound effect"; // matchas case-insensitive

// ===== Repo settings =====
const OWNER = "BoniniSebastian";
const REPO  = "v2soundboard";

// OBS: mapparna heter: tuta, mal, utvisning, avbrott
const CATEGORIES = [
  { label: "SOUNDS",   folder: "sounds/tuta",      slug: "tuta" },
  { label: "GOAL",     folder: "sounds/mal",       slug: "mal" },
  { label: "Utvisning",folder: "sounds/utvisning", slug: "utvisning" },
  { label: "Avbrott",  folder: "sounds/avbrott",   slug: "avbrott" },
];

const AUDIO_EXT = ["mp3", "m4a", "wav", "ogg", "aac"];

// ===== Controls (index.html måste ha dessa id) =====
const playPauseBtn = document.getElementById("playPauseBtn");
const stopBtn      = document.getElementById("stopBtn");
const goalHornBtn  = document.getElementById("goalHornBtn");

// Ikoner (inte iPhone-emoji)
const ICON_PLAY  = "▶";
const ICON_PAUSE = "❚❚";
const ICON_STOP  = "■";
const ICON_HORN  = "
