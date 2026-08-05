import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const el = {
  boardList: document.getElementById("boardList"),
  boardLoading: document.getElementById("boardLoading"),
};

function formatDuration(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

const RANK_MEDALS = ["🥇", "🥈", "🥉"];

async function loadLeaderboard(currentUid) {
  const scoresQuery = query(collection(db, "scores"), orderBy("timeSeconds", "asc"), limit(50));
  const snapshot = await getDocs(scoresQuery);

  el.boardLoading.remove();

  if (snapshot.empty) {
    el.boardList.innerHTML = `<p class="board-empty">Hələ heç kim tamamlamayıb. İlk sən ol!</p>`;
    return;
  }

  snapshot.docs.forEach((doc, index) => {
    const data = doc.data();
    const row = document.createElement("div");
    row.className = "board-row";
    if (data.uid === currentUid) row.classList.add("board-row-me");

    const rank = RANK_MEDALS[index] || `#${index + 1}`;
    row.innerHTML = `
      <span class="board-rank">${rank}</span>
      <span class="board-name">${escapeHtml(data.name || "Anonim")}</span>
      <span class="board-time">${formatDuration(data.timeSeconds)}</span>
    `;
    el.boardList.appendChild(row);
  });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  loadLeaderboard(user.uid);
});
