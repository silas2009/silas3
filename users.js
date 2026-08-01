import { db } from "./firebase-config.js";
import {
  collection, doc, deleteDoc, updateDoc, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { State } from "./state.js";
import { escapeHtml } from "./utils.js";

const peopleListEl = document.getElementById("people-list");
const peopleLabel = document.getElementById("people-label");
const searchInput = document.getElementById("search-input");

let unsubUsers = null;
let openPopover = null;
let onSelectPerson = () => {};

export function setOnSelectPerson(fn) {
  onSelectPerson = fn;
}

export function listenForUsers(onReady) {
  if (unsubUsers) unsubUsers();
  let first = true;
  unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
    State.allUsers = {};
    snap.forEach((d) => (State.allUsers[d.id] = d.data()));
    renderPeopleList();
    if (first) {
      first = false;
      if (onReady) onReady();
    }
  });
}

export function stopListeningUsers() {
  if (unsubUsers) unsubUsers();
}

function closePopover() {
  if (openPopover) {
    openPopover.remove();
    openPopover = null;
  }
}
document.addEventListener("click", (e) => {
  if (openPopover && !openPopover.contains(e.target) && !e.target.closest(".admin-menu-btn")) {
    closePopover();
  }
});

export function renderPeopleList() {
  if (!State.currentUser) return;
  const filter = searchInput.value.trim().toLowerCase();
  peopleListEl.innerHTML = "";

  const entries = Object.entries(State.allUsers).filter(([uid]) => uid !== State.currentUser.uid);
  const filtered = filter
    ? entries.filter(
        ([, u]) =>
          (u.name || "").toLowerCase().includes(filter) ||
          (u.email || "").toLowerCase().includes(filter)
      )
    : entries;

  peopleLabel.style.display = filter ? "block" : entries.length ? "block" : "none";

  filtered.forEach(([uid, u]) => {
    const item = document.createElement("div");
    item.className = "nav-item";
    item.style.position = "relative";

    const tags =
      (u.isAnonymous ? '<span class="tag guest-tag">guest</span>' : "") +
      (u.blocked ? '<span class="tag blocked-tag">blocked</span>' : "");

    item.innerHTML = `
      <img src="${u.photoURL || ""}" alt="">
      <div class="label-col">
        <div class="primary">${escapeHtml(u.name || "Anonymous")} ${tags}</div>
        <div class="preview">${escapeHtml(u.email || (u.isAnonymous ? "Anonymous guest" : ""))}</div>
      </div>
      ${State.isAdmin ? `<button class="admin-menu-btn" data-uid="${uid}">&#8942;</button>` : ""}
    `;

    item.querySelector(".label-col").addEventListener("click", () => onSelectPerson(uid, u.name, u.photoURL));

    if (State.isAdmin) {
      item.querySelector(".admin-menu-btn").addEventListener("click", (e) => {
        e.stopPropagation();
        showAdminUserMenu(e.currentTarget, uid, u);
      });
    }

    peopleListEl.appendChild(item);
  });
}

searchInput.addEventListener("input", renderPeopleList);

function showAdminUserMenu(anchorEl, uid, u) {
  closePopover();
  const pop = document.createElement("div");
  pop.className = "admin-popover";
  const rect = anchorEl.getBoundingClientRect();
  pop.style.top = rect.bottom + window.scrollY + 4 + "px";
  pop.style.left = rect.left - 120 + "px";
  pop.innerHTML = `
    <button data-action="block">${u.blocked ? "Unblock user" : "Block user"}</button>
    <button data-action="delete" class="danger">Delete profile</button>
  `;

  pop.querySelector('[data-action="block"]').addEventListener("click", async () => {
    await updateDoc(doc(db, "users", uid), { blocked: !u.blocked });
    closePopover();
  });

  pop.querySelector('[data-action="delete"]').addEventListener("click", async () => {
    const label = u.isAnonymous ? "this guest's" : `${u.name || "this user"}'s`;
    if (confirm(`Delete ${label} profile? Their messages will remain, but their account entry will be removed.`)) {
      await deleteDoc(doc(db, "users", uid));
    }
    closePopover();
  });

  document.body.appendChild(pop);
  openPopover = pop;
}
