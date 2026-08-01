import { db } from "./firebase-config.js";
import {
  collection, doc, setDoc, onSnapshot, query, where
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { State } from "./state.js";
import { escapeHtml, dmIdFor } from "./utils.js";

const dmListEl = document.getElementById("dm-list");

let unsubDms = null;
let latestDms = [];
let onSelectDm = () => {};

export function setOnSelectDm(fn) {
  onSelectDm = fn;
}

export function listenForDms() {
  if (unsubDms) unsubDms();
  const q = query(collection(db, "dms"), where("participants", "array-contains", State.currentUser.uid));
  unsubDms = onSnapshot(q, (snap) => {
    latestDms = [];
    snap.forEach((d) => latestDms.push({ id: d.id, ...d.data() }));
    latestDms.sort((a, b) => (b.updatedAtMs || 0) - (a.updatedAtMs || 0));
    renderDmList();
  });
}

export function stopListeningDms() {
  if (unsubDms) unsubDms();
}

export function renderDmList() {
  dmListEl.innerHTML = "";
  latestDms.forEach((dm) => {
    const otherUid = dm.participants.find((p) => p !== State.currentUser.uid);
    const other = State.allUsers[otherUid] || {};
    const item = document.createElement("div");
    item.className = "nav-item";
    if (State.currentView.type === "dm" && State.currentView.uid === otherUid) {
      item.classList.add("active");
    }
    const guestTag = other.isAnonymous ? '<span class="tag guest-tag">guest</span>' : "";
    item.innerHTML = `
      <img src="${other.photoURL || ""}" alt="">
      <div class="label-col">
        <div class="primary">${escapeHtml(other.name || "Unknown")} ${guestTag}</div>
        <div class="preview">${escapeHtml(dm.lastMessage || "")}</div>
      </div>
    `;
    item.addEventListener("click", () => onSelectDm(otherUid, other.name, other.photoURL));
    dmListEl.appendChild(item);
  });
}

export async function ensureDmDoc(otherUid) {
  const dmId = dmIdFor(State.currentUser.uid, otherUid);
  await setDoc(
    doc(db, "dms", dmId),
    { participants: [State.currentUser.uid, otherUid].sort() },
    { merge: true }
  );
  return dmId;
}
