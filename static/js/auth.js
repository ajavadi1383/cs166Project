// Login / register screen wiring.
import { $ } from "./dom.js";
import { api } from "./api.js";
import { setUser } from "./state.js";
import { toast } from "./toast.js";
import { enterApp } from "./navigation.js";

export function initAuth() {
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      const isLogin = tab.dataset.tab === "login";
      $("#login-form").classList.toggle("hidden", !isLogin);
      $("#register-form").classList.toggle("hidden", isLogin);
    });
  });

  $("#login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.target).entries());
    try {
      const r = await api("/auth/login", { method: "POST", body: d });
      setUser(r.user);
      enterApp();
    } catch (err) { toast(err.message, "err"); }
  });

  $("#register-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.target).entries());
    try {
      const r = await api("/auth/register", { method: "POST", body: d });
      setUser(r.user);
      toast("Welcome to BidHub!");
      enterApp();
    } catch (err) { toast(err.message, "err"); }
  });
}
