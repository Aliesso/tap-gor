import { auth } from "./firebase-config.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

const el = {
  tabLogin: document.getElementById("tabLogin"),
  tabRegister: document.getElementById("tabRegister"),
  loginForm: document.getElementById("loginForm"),
  registerForm: document.getElementById("registerForm"),
  authError: document.getElementById("authError"),
};

function showError(message) {
  el.authError.textContent = message;
  el.authError.hidden = false;
}

function clearError() {
  el.authError.hidden = true;
  el.authError.textContent = "";
}

el.tabLogin.addEventListener("click", () => {
  el.tabLogin.classList.add("active");
  el.tabRegister.classList.remove("active");
  el.loginForm.hidden = false;
  el.registerForm.hidden = true;
  clearError();
});

el.tabRegister.addEventListener("click", () => {
  el.tabRegister.classList.add("active");
  el.tabLogin.classList.remove("active");
  el.registerForm.hidden = false;
  el.loginForm.hidden = true;
  clearError();
});

const ERROR_MESSAGES = {
  "auth/invalid-email": "E-poçt ünvanı düzgün deyil.",
  "auth/user-not-found": "Bu e-poçtla istifadəçi tapılmadı.",
  "auth/wrong-password": "Parol yanlışdır.",
  "auth/invalid-credential": "E-poçt və ya parol yanlışdır.",
  "auth/email-already-in-use": "Bu e-poçt artıq qeydiyyatdan keçib.",
  "auth/weak-password": "Parol ən azı 6 simvol olmalıdır.",
};

function friendlyError(error) {
  return ERROR_MESSAGES[error.code] || "Xəta baş verdi. Yenidən cəhd edin.";
}

el.loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearError();
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;

  try {
    await signInWithEmailAndPassword(auth, email, password);
    window.location.href = "index.html";
  } catch (error) {
    showError(friendlyError(error));
  }
});

el.registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearError();
  const name = document.getElementById("registerName").value.trim();
  const email = document.getElementById("registerEmail").value.trim();
  const password = document.getElementById("registerPassword").value;

  try {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(credential.user, { displayName: name });
    window.location.href = "index.html";
  } catch (error) {
    showError(friendlyError(error));
  }
});

onAuthStateChanged(auth, (user) => {
  if (user) {
    window.location.href = "index.html";
  }
});
