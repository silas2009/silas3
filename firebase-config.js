import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyC8X2VyKzHvUIRWrFlv5Kj0DGSzVsFyIQk",
  authDomain: "silas-chat-5a6f2.firebaseapp.com",
  projectId: "silas-chat-5a6f2",
  storageBucket: "silas-chat-5a6f2.firebasestorage.app",
  messagingSenderId: "384784370168",
  appId: "1:384784370168:web:651ca7964dea468087ae0d",
  measurementId: "G-XL9FPLZGGT"
};

// Only this email gets admin powers (block/unblock, delete profiles, delete any message).
export const ADMIN_EMAIL = "uoliseloke@gmail.com";

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const provider = new GoogleAuthProvider();
