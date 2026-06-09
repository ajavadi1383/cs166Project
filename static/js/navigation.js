// Routing + top navigation. View modules register themselves into `views`.
import { $, el, esc } from "./dom.js";
import { getUser } from "./state.js";

// Populated by side-effect imports of the view modules (see main.js).
export const views = {};

function navItems() {
  const role = getUser().role;
  const items = [
    { id: "browse", label: "Browse Auctions" },
    { id: "myBids", label: "My Bids", roles: ["Buyer"] },
    { id: "won", label: "Won & Payments", roles: ["Buyer"] },
    { id: "sellerItems", label: "My Items", roles: ["Seller"] },
    { id: "sellerAuctions", label: "My Auctions", roles: ["Seller"] },
    { id: "adminUsers", label: "Users", roles: ["Admin"] },
    { id: "adminPayments", label: "Payments", roles: ["Admin"] },
    { id: "adminShipments", label: "Shipments", roles: ["Admin"] },
    { id: "profile", label: "Profile" },
  ];
  return items.filter((i) => !i.roles || i.roles.includes(role));
}

export function renderNav(active) {
  const nav = $("#main-nav");
  nav.innerHTML = "";
  navItems().forEach((i) => {
    const b = el(`<button class="nav-link ${i.id === active ? "active" : ""}">${esc(i.label)}</button>`);
    b.addEventListener("click", () => navigate(i.id));
    nav.appendChild(b);
  });
  $("#user-chip").innerHTML = `${esc(getUser().login)}<span class="role">${esc(getUser().role)}</span>`;
}

export function navigate(viewId, arg) {
  renderNav(viewId);
  $("#view").innerHTML = `<div class="loading">Loading…</div>`;
  (views[viewId] || views.browse)(arg).catch((e) => {
    $("#view").innerHTML = `<div class="empty">${esc(e.message)}</div>`;
  });
}

export function enterApp() {
  $("#auth-screen").classList.add("hidden");
  $("#app").classList.remove("hidden");
  navigate("browse");
}
