// Firebase Console -> Project settings -> General -> "Your apps" bölməsindən öz konfiqurasiyanızı buraya yapışdırın.
// https://console.firebase.google.com/ -> yeni layihə yaradın -> Authentication (Email/Password) və Firestore Database aktivləşdirin.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAM-0_dtPVl_p5XI40Vpn18cjLAiqr50qM",
  authDomain: "tapgor-1b757.firebaseapp.com",
  projectId: "tapgor-1b757",
  storageBucket: "tapgor-1b757.firebasestorage.app",
  messagingSenderId: "389606887157",
  appId: "1:389606887157:web:92622aede8a5a411747fbc",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
