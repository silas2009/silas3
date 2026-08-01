import { signInWithGoogle, signInAsGuest, signOutUser, initAuth, watchRedirectErrors } from "./auth.js";
import { listenForUsers, stopListeningUsers, setOnSelectPerson } from "./users.js";
import { listenForDms, stopListeningDms, ensureDmDoc, setOnSelectDm } from "./dms.js";
import { listenForMessages, stopListeningMessages } from "./messages.js";
import { State } from "./state.js";

const loginScreen = document.getElementById("login-screen");
const blockedScreen = document.getElementById("blocked-screen");
const appEl = document.getElementById("app");
const loadingOverlay = document.getElementById("loading-overlay");

const signInBtn = document.getElementById("google-signin");
const guestBtn = document.getElementById("guest-signin");
const signOutBtn = document.getElementById("sign-out");
const blockedSignOutBtn = document.getElementById("blocked-signout");
const loginError = document.getElementById("login-error");

const meAvatar = document.getElementById("me-avatar");
const meName = document.getElementById("me-name");
const meBadge = document.getElementById("me-badge");

const navGeneral = document.getElementById("nav-general");
const chatHeaderTitle = document.getElementById("chat-header-title");
const chatHeaderAvatar = document.getElementById("chat-header-avatar");
const backBtn = document.getElementById("back-btn");
const sidebarEl = document.getElementById("sidebar");
const chatAreaEl = document.getElementById("chat-area");

function showLoading() {
  loadingOverlay.classList.add("active");
}
function hideLoading() {
  loadingOverlay.classList.remove("active");
}

// ---------- Sign-in / sign-out ----------
signInBtn.addEventListener("click", async () => {
  loginError.textContent = "";
  try {
    await signInWithGoogle();
  } catch (err) {
    loginError.textContent = "Sign-in failed: " + (err.message || err.code || "unknown error");
  }
});

guestBtn.addEventListener("click", async () => {
  loginError.textContent = "";
  try {
    await signInAsGuest();
  } catch (err) {
    loginError.textContent = "Guest sign-in failed: " + (err.message || err.code || "unknown error");
  }
});

watchRedirectErrors((err) => {
  loginError.textContent = "Sign-in failed: " + err.message;
});

signOutBtn.addEventListener("click", () => signOutUser());
blockedSignOutBtn.addEventListener("click", () => signOutUser());

// ---------- Auth state wiring ----------
initAuth({
  onSignedIn: (user) => {
    loginScreen.style.display = "none";
    blockedScreen.style.display = "none";
    appEl.classList.add("active");
    showLoading();

    meAvatar.src = user.photoURL || "";
    meName.textContent = State.myDisplayName || "Guest";
    meBadge.textContent = State.isAdmin ? "★ Admin" : user.isAnonymous ? "Guest account" : "";

    let usersReady = false;
    let messagesReady = false;
    const maybeHide = () => {
      if (usersReady && messagesReady) setTimeout(hideLoading, 200);
    };

    listenForUsers(() => {
      usersReady = true;
      maybeHide();
    });
    listenForDms();
    switchToGeneral(() => {
      messagesReady = true;
      maybeHide();
    });

    // Safety net in case a listener is unusually slow — never leave the
    // user staring at a loading screen forever.
    setTimeout(hideLoading, 3000);
  },
  onBlocked: () => {
    loginScreen.style.display = "none";
    appEl.classList.remove("active");
    blockedScreen.style.display = "flex";
    hideLoading();
  },
  onUnblocked: () => {
    blockedScreen.style.display = "none";
    appEl.classList.add("active");
  },
  onSignedOut: () => {
    stopListeningUsers();
    stopListeningDms();
    stopListeningMessages();
    loginScreen.style.display = "flex";
    blockedScreen.style.display = "none";
    appEl.classList.remove("active");
    hideLoading();
  }
});

// ---------- View switching (General / DMs) ----------
function highlightNav() {
  navGeneral.classList.toggle("active", State.currentView.type === "general");
}

function showChatOnMobile() {
  if (window.innerWidth <= 640) {
    sidebarEl.classList.add("hide-mobile");
    chatAreaEl.classList.remove("hide-mobile");
  }
}

function switchToGeneral(onFirstLoad) {
  State.currentView = { type: "general" };
  chatHeaderTitle.textContent = "General";
  chatHeaderAvatar.style.display = "none";
  highlightNav();
  listenForMessages(onFirstLoad);
  showChatOnMobile();
}
navGeneral.addEventListener("click", () => switchToGeneral());

async function openDM(uid, name, photo) {
  if (!uid) return;
  State.currentView = { type: "dm", uid, name, photo };
  chatHeaderTitle.textContent = name || "Unknown";
  chatHeaderAvatar.src = photo || "";
  chatHeaderAvatar.style.display = "inline-block";
  highlightNav();
  listenForMessages();
  showChatOnMobile();
  await ensureDmDoc(uid);
}
setOnSelectPerson(openDM);
setOnSelectDm(openDM);
window.addEventListener("open-dm", (e) => openDM(e.detail.uid, e.detail.name, e.detail.photo));

backBtn.addEventListener("click", () => {
  sidebarEl.classList.remove("hide-mobile");
  chatAreaEl.classList.add("hide-mobile");
});
