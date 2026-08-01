import { auth, db, provider, ADMIN_EMAIL } from "./firebase-config.js";
import {
  signInWithPopup, signInWithRedirect, getRedirectResult,
  signInAnonymously, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  doc, getDoc, setDoc, onSnapshot, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { State } from "./state.js";

function randomGuestName(uid) {
  return "Guest-" + uid.slice(0, 4).toUpperCase();
}

export async function signInWithGoogle() {
  try {
    await signInWithPopup(auth, provider);
  } catch (err) {
    // Some browsers/environments block popups outright — fall back to a
    // full-page redirect instead of just failing.
    const fallbackCodes = [
      "auth/popup-blocked",
      "auth/popup-closed-by-user",
      "auth/cancelled-popup-request",
      "auth/operation-not-supported-in-this-environment"
    ];
    if (err && fallbackCodes.includes(err.code)) {
      await signInWithRedirect(auth, provider);
    } else {
      throw err;
    }
  }
}

export function signInAsGuest() {
  return signInAnonymously(auth);
}

export function signOutUser() {
  return signOut(auth);
}

// Surfaces any error that happened during a redirect-based sign-in
// (e.g. unauthorized domain) once the page reloads after redirect.
export function watchRedirectErrors(onError) {
  getRedirectResult(auth).catch((err) => {
    if (err && err.code) onError(err);
  });
}

let unsubMyDoc = null;

export function initAuth({ onSignedIn, onBlocked, onUnblocked, onSignedOut }) {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      State.currentUser = null;
      State.isAdmin = false;
      State.myDisplayName = null;
      if (unsubMyDoc) unsubMyDoc();
      onSignedOut();
      return;
    }

    State.currentUser = user;
    State.isAdmin = user.email === ADMIN_EMAIL;

    const userRef = doc(db, "users", user.uid);
    let resolvedName;

    if (user.isAnonymous) {
      const existing = await getDoc(userRef);
      resolvedName = (existing.exists() && existing.data().name) || randomGuestName(user.uid);
      await setDoc(userRef, {
        name: resolvedName,
        email: "",
        photoURL: "",
        isAnonymous: true,
        lastSeen: serverTimestamp()
      }, { merge: true });
    } else {
      resolvedName = user.displayName || "Anonymous";
      await setDoc(userRef, {
        name: resolvedName,
        email: user.email || "",
        photoURL: user.photoURL || "",
        isAnonymous: false,
        lastSeen: serverTimestamp()
      }, { merge: true });
    }

    State.myDisplayName = resolvedName;
    onSignedIn(user);

    // Watch our own profile for being blocked/unblocked in real time.
    if (unsubMyDoc) unsubMyDoc();
    let first = true;
    unsubMyDoc = onSnapshot(userRef, (snap) => {
      const data = snap.data();
      const blocked = !!(data && data.blocked);
      if (first) {
        first = false;
        if (blocked) onBlocked();
        return;
      }
      if (blocked) onBlocked();
      else onUnblocked();
    });
  });
}
