import { db } from "./firebase-config.js";
import {
  collection, addDoc, doc, deleteDoc, setDoc, serverTimestamp,
  onSnapshot, query, orderBy, limit
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { State } from "./state.js";
import { escapeHtml, dmIdFor } from "./utils.js";

const messagesEl = document.getElementById("messages");
const msgInput = document.getElementById("msg-input");
const sendBtn = document.getElementById("send-btn");

let unsubMessages = null;

function messagesPathParts() {
  if (State.currentView.type === "general") return ["messages"];
  const dmId = dmIdFor(State.currentUser.uid, State.currentView.uid);
  return ["dms", dmId, "messages"];
}

export function listenForMessages(onFirstSnapshot) {
  if (unsubMessages) unsubMessages();
  const pathParts = messagesPathParts();
  const colRef = collection(db, ...pathParts);

  // IMPORTANT: we order by "createdAtMs" (a plain number set on the device
  // at send time) rather than the Firestore serverTimestamp() field.
  // serverTimestamp() is null on the sender's own device until the server
  // confirms it, and ordering by a field that's briefly null can make a
  // just-sent message flash into view and then vanish until the real
  // timestamp arrives. A plain number never has that gap.
  const q = query(colRef, orderBy("createdAtMs", "asc"), limit(200));

  let first = true;
  unsubMessages = onSnapshot(q, (snap) => {
    messagesEl.innerHTML = "";
    if (snap.empty) {
      messagesEl.innerHTML = '<div id="empty-state">No messages yet — say hi 👋</div>';
    } else {
      snap.forEach((docSnap) => {
        const m = docSnap.data();
        const isMine = State.currentUser && m.uid === State.currentUser.uid;
        const canDelete = State.isAdmin || isMine;
        const div = document.createElement("div");
        div.className = "msg" + (isMine ? " mine" : "");

        const time = m.createdAtMs
          ? new Date(m.createdAtMs).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          : "";
        const guestTag = m.isAnonymous ? ' <span class="tag guest-tag">guest</span>' : "";

        div.innerHTML = `
          <img src="${m.photoURL || ""}" alt="">
          <div>
            <div class="bubble">
              ${
                State.currentView.type === "general"
                  ? `<div class="sender">${escapeHtml(m.name || "Anonymous")}${guestTag}</div>`
                  : ""
              }
              <div class="text">${escapeHtml(m.text || "")}</div>
              ${canDelete ? '<button class="del-btn" title="Delete message">&times;</button>' : ""}
            </div>
            <div class="time">${time}</div>
          </div>
        `;

        if (State.currentView.type === "general" && !isMine) {
          const openDm = () =>
            window.dispatchEvent(new CustomEvent("open-dm", { detail: { uid: m.uid, name: m.name, photo: m.photoURL } }));
          div.querySelector(".sender").addEventListener("click", openDm);
          div.querySelector("img").addEventListener("click", openDm);
        }

        if (canDelete) {
          div.querySelector(".del-btn").addEventListener("click", async () => {
            await deleteDoc(doc(db, ...pathParts, docSnap.id));
          });
        }

        messagesEl.appendChild(div);
      });
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    if (first) {
      first = false;
      if (onFirstSnapshot) onFirstSnapshot();
    }
  });
}

export function stopListeningMessages() {
  if (unsubMessages) unsubMessages();
}

export async function sendMessage() {
  const text = msgInput.value.trim();
  if (!text || !State.currentUser) return;
  msgInput.value = "";

  const pathParts = messagesPathParts();
  const nowMs = Date.now();
  const payload = {
    text,
    uid: State.currentUser.uid,
    name: State.myDisplayName || State.currentUser.displayName || "Anonymous",
    photoURL: State.currentUser.photoURL || "",
    isAnonymous: !!State.currentUser.isAnonymous,
    createdAt: serverTimestamp(), // kept for reference/audit only, not used for ordering
    createdAtMs: nowMs
  };

  try {
    if (State.currentView.type === "general") {
      await addDoc(collection(db, "messages"), payload);
    } else {
      const dmId = dmIdFor(State.currentUser.uid, State.currentView.uid);
      await addDoc(collection(db, "dms", dmId, "messages"), payload);
      await setDoc(
        doc(db, "dms", dmId),
        {
          participants: [State.currentUser.uid, State.currentView.uid].sort(),
          lastMessage: text,
          updatedAtMs: nowMs,
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );
    }
  } catch (err) {
    console.error("Failed to send:", err);
  }
}

sendBtn.addEventListener("click", sendMessage);
msgInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendMessage();
});
