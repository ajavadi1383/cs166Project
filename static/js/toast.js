// Transient toast notifications.
import { $ } from "./dom.js";

let toastTimer;

export function toast(msg, kind = "ok") {
  const t = $("#toast");
  t.textContent = msg;
  t.className = `toast ${kind}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add("hidden"), 3200);
}

// Run an async action, showing any error as a toast.
// `onError` (optional) runs after the toast, e.g. to refresh the view.
export async function guard(fn, onError) {
  try {
    await fn();
  } catch (e) {
    toast(e.message, "err");
    if (onError) onError();
  }
}
