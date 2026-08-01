export function escapeHtml(str) {
  const d = document.createElement("div");
  d.textContent = str || "";
  return d.innerHTML;
}

// Deterministic conversation id for a pair of users, regardless of order.
export function dmIdFor(a, b) {
  return [a, b].sort().join("_");
}
