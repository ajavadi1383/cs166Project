// ===========================================================================
// BidHub client entry point.
// Imports each view module for its side-effect (registering into `views`),
// wires global controls, and bootstraps the session.
// ===========================================================================
import { $ } from "./dom.js";
import { api } from "./api.js";
import { getUser, setUser } from "./state.js";
import { initAuth } from "./auth.js";
import { enterApp } from "./navigation.js";

// Register all views (each module assigns itself onto the shared registry).
import "./views/browse.js";
import "./views/auctionDetail.js";
import "./views/myBids.js";
import "./views/won.js";
import "./views/sellerItems.js";
import "./views/sellerAuctions.js";
import "./views/profile.js";
import "./views/adminUsers.js";
import "./views/adminPayments.js";
import "./views/adminShipments.js";

$("#logout-btn").addEventListener("click", async () => {
  await api("/auth/logout", { method: "POST" });
  setUser(null);
  $("#app").classList.add("hidden");
  $("#auth-screen").classList.remove("hidden");
});

(async function init() {
  initAuth();
  try {
    const r = await api("/auth/me");
    if (r.user) { setUser(r.user); enterApp(); }
  } catch (_) { /* not logged in */ }
})();
