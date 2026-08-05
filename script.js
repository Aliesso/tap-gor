import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut, updateProfile } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const DARKEN_INTERVAL_SECONDS = 7;
const DARKEN_STEP = 0.2;
const BOOST_COOLDOWN_SECONDS = 20;
const MAX_LIVES = 3;
const JUMPSCARE_DURATION_MS = 1200;
const ROUND_TARGET_COUNT = 10;
const MAX_HELP_USES = 2;
const HINT_REVEAL_MS = 2000;

const levels = [
  { key: "room", name: "Otaq" },
];

const ROOM_OBJECT_POOL = [
  { name: "Balqabaq", left: 26, top: 16, width: 12, height: 14 },
  { name: "Qarğa", left: 44, top: 9, width: 12, height: 12 },
  { name: "Kəllə", left: 53, top: 21, width: 9, height: 11 },
  { name: "Bayquş", left: 90, top: 34, width: 11, height: 15 },
  { name: "Pişik", left: 48, top: 72, width: 18, height: 22 },
  { name: "Qumsaat", left: 93, top: 64, width: 9, height: 12 },
  { name: "Qlobus", left: 7, top: 46, width: 8, height: 11 },
  { name: "Teleskop", left: 9, top: 55, width: 15, height: 10 },
  { name: "Sehrbaz papağı", left: 6, top: 72, width: 10, height: 10 },
  { name: "Sandıq", left: 12, top: 82, width: 15, height: 10 },
  { name: "Siçan", left: 20, top: 74, width: 7, height: 6 },
  { name: "Qurbağa", left: 30, top: 81, width: 8, height: 7 },
  { name: "Şam qəndili", left: 20, top: 42, width: 10, height: 16 },
  { name: "Çaynik", left: 65, top: 34, width: 9, height: 11 },
  { name: "Qavanozlar", left: 15, top: 22, width: 12, height: 12 },
  { name: "Tərəzi", left: 81, top: 52, width: 11, height: 11 },
  { name: "Fənər", left: 78, top: 41, width: 10, height: 12 },
  { name: "Lampa", left: 88, top: 44, width: 9, height: 11 },
  { name: "Mortar", left: 68, top: 70, width: 10, height: 9 },
  { name: "Lələk-qələm", left: 93, top: 87, width: 10, height: 8 },
  { name: "Oyun kartları", left: 44, top: 87, width: 12, height: 8 },
  { name: "Tumarlar", left: 33, top: 89, width: 14, height: 8 },
  { name: "Qazan", left: 50, top: 39, width: 12, height: 10 },
  { name: "Timsah", left: 73, top: 12, width: 16, height: 10 },
];

function shuffle(array) {
  const result = array.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function renderHiddenObjects(scene) {
  scene.querySelectorAll(".hidden-object").forEach((el) => el.remove());
  const chosen = shuffle(ROOM_OBJECT_POOL).slice(0, ROUND_TARGET_COUNT);
  chosen.forEach((obj) => {
    const div = document.createElement("div");
    div.className = "obj spot hidden-object";
    div.dataset.name = obj.name;
    div.style.left = `${obj.left}%`;
    div.style.top = `${obj.top}%`;
    div.style.width = `${obj.width}%`;
    div.style.height = `${obj.height}%`;
    scene.appendChild(div);
  });
}

const state = {
  levelIndex: 0,
  darkness: 0,
  secondsToNextDarken: DARKEN_INTERVAL_SECONDS,
  boostCooldown: 0,
  found: new Set(),
  targets: new Set(),
  gameOver: false,
  startTime: 0,
  lives: MAX_LIVES,
  darkenCount: 0,
  helpUses: MAX_HELP_USES,
};

function formatDuration(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

const el = {
  levelName: document.getElementById("levelName"),
  boostBtn: document.getElementById("boostBtn"),
  boostLabel: document.getElementById("boostLabel"),
  helpBtn: document.getElementById("helpBtn"),
  helpLabel: document.getElementById("helpLabel"),
  timerFill: document.getElementById("timerFill"),
  timerSeconds: document.getElementById("timerSeconds"),
  wordList: document.getElementById("wordList"),
  lives: document.getElementById("lives"),
  modal: document.getElementById("modal"),
  modalTitle: document.getElementById("modalTitle"),
  modalText: document.getElementById("modalText"),
  modalBtn: document.getElementById("modalBtn"),
  jumpscareOverlay: document.getElementById("jumpscareOverlay"),
  boostHint: document.getElementById("boostHint"),
  userName: document.getElementById("userName"),
  logoutBtn: document.getElementById("logoutBtn"),
  gameContainer: document.getElementById("gameContainer"),
};

let currentUser = null;

async function saveScore(elapsedSeconds) {
  if (!currentUser) return;
  try {
    const scoreRef = doc(db, "scores", currentUser.uid);
    const existing = await getDoc(scoreRef);
    if (existing.exists() && existing.data().timeSeconds <= elapsedSeconds) {
      return;
    }
    await setDoc(scoreRef, {
      uid: currentUser.uid,
      name: currentUser.displayName || "Anonim",
      timeSeconds: elapsedSeconds,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Skor saxlanılmadı:", error);
  }
}

function currentSceneEl() {
  return document.getElementById(`scene-${levels[state.levelIndex].key}`);
}

function initLevel(index) {
  state.levelIndex = index;
  state.darkness = 0;
  state.secondsToNextDarken = DARKEN_INTERVAL_SECONDS;
  state.boostCooldown = 0;
  state.found = new Set();
  state.gameOver = false;
  state.startTime = Date.now();
  state.lives = MAX_LIVES;
  state.darkenCount = 0;
  state.helpUses = MAX_HELP_USES;

  document.querySelectorAll(".scene").forEach((s) => (s.hidden = true));
  const scene = currentSceneEl();
  scene.hidden = false;
  scene.querySelector(".darkness-overlay").style.opacity = 0;
  renderHiddenObjects(scene);

  el.levelName.textContent = levels[index].name;

  state.targets = new Set(
    Array.from(scene.querySelectorAll(".hidden-object")).map((o) => o.dataset.name)
  );

  renderWordList();
  updateTimerUI();
  updateBoostButton();
  updateHelpButton();
  updateLivesUI();
  el.modal.hidden = true;
  el.modalBtn.hidden = false;
  el.jumpscareOverlay.hidden = true;
  el.boostHint.hidden = true;
}

function renderWordList() {
  el.wordList.innerHTML = "";
  state.targets.forEach((name) => {
    const chip = document.createElement("div");
    chip.className = "chip";
    chip.dataset.name = name;
    chip.textContent = name;
    el.wordList.appendChild(chip);
  });
}

function markWordFound(name) {
  const chip = el.wordList.querySelector(`.chip[data-name="${CSS.escape(name)}"]`);
  if (chip) chip.classList.add("found");
}

function updateTimerUI() {
  const pct = ((DARKEN_INTERVAL_SECONDS - state.secondsToNextDarken) / DARKEN_INTERVAL_SECONDS) * 100;
  el.timerFill.style.width = `${pct}%`;
  el.timerSeconds.textContent = `${state.secondsToNextDarken}s`;
}

function updateLivesUI() {
  el.lives.textContent = "❤️".repeat(state.lives) + "🖤".repeat(MAX_LIVES - state.lives);
}

function shakePuzzle() {
  const wrapper = document.querySelector(".scene-wrapper");
  wrapper.classList.remove("shake");
  void wrapper.offsetWidth;
  wrapper.classList.add("shake");
}

function registerMiss() {
  if (state.gameOver) return;
  state.lives--;
  updateLivesUI();
  shakePuzzle();
  if (state.lives <= 0) {
    triggerLivesGameOver();
  }
}

function updateBoostButton() {
  if (state.boostCooldown > 0) {
    el.boostBtn.disabled = true;
    el.boostLabel.textContent = `${state.boostCooldown}s`;
  } else {
    el.boostBtn.disabled = false;
    el.boostLabel.textContent = "Otağı Aydınlat";
  }
}

function applyDarkenStep() {
  state.darkness = Math.min(1, state.darkness + DARKEN_STEP);
  currentSceneEl().querySelector(".darkness-overlay").style.opacity = state.darkness;
  state.darkenCount++;
  if (state.darkenCount === 2) {
    el.boostHint.hidden = false;
  }
  if (state.darkness >= 1) {
    triggerGameOver();
  }
}

function useBoost() {
  if (state.boostCooldown > 0 || state.gameOver) return;
  state.darkness = 0;
  currentSceneEl().querySelector(".darkness-overlay").style.opacity = 0;
  state.secondsToNextDarken = DARKEN_INTERVAL_SECONDS;
  state.boostCooldown = BOOST_COOLDOWN_SECONDS;
  el.boostHint.hidden = true;
  updateBoostButton();
  updateTimerUI();
}

function updateHelpButton() {
  el.helpBtn.disabled = state.helpUses <= 0;
  el.helpLabel.textContent = `Kömək (${state.helpUses})`;
}

function useHelp() {
  if (state.helpUses <= 0 || state.gameOver) return;

  const remaining = Array.from(currentSceneEl().querySelectorAll(".hidden-object:not(.found-object)"));
  if (remaining.length === 0) return;

  state.helpUses--;
  updateHelpButton();

  const pick = remaining[Math.floor(Math.random() * remaining.length)];
  pick.classList.add("hint-reveal");
  setTimeout(() => pick.classList.remove("hint-reveal"), HINT_REVEAL_MS);
}

function tick() {
  if (state.gameOver) return;

  state.secondsToNextDarken--;
  if (state.boostCooldown > 0) {
    state.boostCooldown--;
    updateBoostButton();
  }

  if (state.secondsToNextDarken <= 0) {
    applyDarkenStep();
    state.secondsToNextDarken = DARKEN_INTERVAL_SECONDS;
  }

  updateTimerUI();
}

async function triggerWin() {
  state.gameOver = true;
  const elapsedSeconds = Math.floor((Date.now() - state.startTime) / 1000);
  el.modalTitle.textContent = "🎉 Tamamlandı!";
  el.modalText.textContent = `Vaxtın: ${formatDuration(elapsedSeconds)}. Reytinqə keçirilir...`;
  el.modalBtn.hidden = true;
  el.modal.hidden = false;
  await saveScore(elapsedSeconds);
  window.location.href = "leaderboard.html";
}

function triggerGameOver() {
  state.gameOver = true;
  el.modalTitle.textContent = "⏱️ Vaxt bitdi!";
  el.modalText.textContent = "Şəkil tam qaraldı. Yenidən cəhd et!";
  el.modalBtn.textContent = "Yenidən cəhd et";
  el.modalBtn.onclick = () => initLevel(state.levelIndex);
  el.modal.hidden = false;
}

function triggerLivesGameOver() {
  state.gameOver = true;
  el.jumpscareOverlay.hidden = false;
  setTimeout(() => {
    el.jumpscareOverlay.hidden = true;
    el.modalTitle.textContent = "💔 Canların bitdi!";
    el.modalText.textContent = "Səhv yerlərə klikləyib bütün canlarını itirdin. Yenidən cəhd et!";
    el.modalBtn.textContent = "Yenidən cəhd et";
    el.modalBtn.onclick = () => initLevel(state.levelIndex);
    el.modal.hidden = false;
  }, JUMPSCARE_DURATION_MS);
}

function handleObjectClick(objEl) {
  if (objEl.classList.contains("decoy")) {
    registerMiss();
    return;
  }

  const name = objEl.dataset.name;
  if (state.found.has(name)) return;

  state.found.add(name);
  objEl.classList.add("found-object");
  markWordFound(name);

  if (state.found.size === state.targets.size) {
    triggerWin();
  }
}

document.querySelector(".scene-wrapper").addEventListener("click", (e) => {
  if (state.gameOver) return;
  const objEl = e.target.closest(".obj");
  if (objEl) {
    handleObjectClick(objEl);
  } else {
    registerMiss();
  }
});

el.boostBtn.addEventListener("click", useBoost);
el.helpBtn.addEventListener("click", useHelp);
el.logoutBtn.addEventListener("click", () => signOut(auth));

let gameStarted = false;

async function ensureDisplayName(user) {
  await user.reload();
  if (user.displayName) return user.displayName;
  let name = "";
  while (!name) {
    name = (window.prompt("Reytinqdə görünəcək adınızı daxil edin:") || "").trim();
  }
  await updateProfile(user, { displayName: name });
  return name;
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  currentUser = user;
  const name = await ensureDisplayName(user);
  el.userName.textContent = `👤 ${name}`;
  document.getElementById("authLoading").hidden = true;
  el.gameContainer.hidden = false;
  if (!gameStarted) {
    gameStarted = true;
    initLevel(0);
    setInterval(tick, 1000);
  }
});
