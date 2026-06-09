// Small DOM / formatting helpers shared across views.

export const $ = (sel, root = document) => root.querySelector(sel);

export const el = (html) => {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstChild;
};

export function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

export function money(n) {
  return "$" + Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function debounce(fn, ms) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

// Attach an event handler to every element matching `selector`.
// The handler receives the matched element.
export function on(selector, event, handler) {
  document.querySelectorAll(selector).forEach((node) =>
    node.addEventListener(event, () => handler(node)));
}

export function statusBadge(status) {
  const map = {
    Active: "badge-active", Closed: "badge-closed",
    Pending: "badge-pending", Completed: "badge-completed", Failed: "badge-failed",
    Shipped: "badge-shipped", Delivered: "badge-delivered",
  };
  return `<span class="badge ${map[status] || ""}">${esc(status)}</span>`;
}
