// Simple shared state object. Since ES modules share the same object
// reference everywhere they import it, this acts like a tiny global store
// without needing a framework.
export const State = {
  currentUser: null,
  myDisplayName: null,
  isAdmin: false,
  allUsers: {},          // uid -> user doc data
  currentView: { type: "general" } // or { type: "dm", uid, name, photo }
};
