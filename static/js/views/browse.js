// Browse & search auctions.
import { api } from "../api.js";
import { $, el, esc, money, debounce } from "../dom.js";
import { views, navigate } from "../navigation.js";

function auctionCard(a) {
  const price = Number(a.current_highest_bid) > 0 ? a.current_highest_bid : a.starting_price;
  const label = Number(a.current_highest_bid) > 0 ? "Current bid" : "Starting price";
  const img = a.image_url ? `style="background-image:url('${esc(a.image_url)}')"` : "";
  const card = el(`<div class="card">
    <div class="card-img" ${img}><span class="badge ${a.auction_status === "Active" ? "badge-active" : "badge-closed"}">${esc(a.auction_status)}</span></div>
    <div class="card-body">
      <span class="card-cat">${esc(a.category)}</span>
      <h3>${esc(a.item_name)}</h3>
      <div class="card-price">${money(price)} <small>${label}</small></div>
      <span class="card-cat">Seller: ${esc(a.seller_login)}</span>
    </div>
    <div class="card-foot"><button class="btn btn-primary btn-sm">View &amp; Bid</button></div>
  </div>`);
  card.querySelector("button").addEventListener("click", () => navigate("auctionDetail", a.auction_id));
  return card;
}

views.browse = async () => {
  const cats = (await api("/items/categories")).categories;
  const view = $("#view");
  view.innerHTML = `
    <div class="page-head"><div><h2>Browse Auctions</h2><p>Search live and closed auctions across the marketplace.</p></div></div>
    <div class="filters">
      <input id="f-q" placeholder="Search item name…" />
      <select id="f-cat"><option value="">All categories</option>${cats.map((c) => `<option>${esc(c)}</option>`).join("")}</select>
      <select id="f-status"><option value="Active">Active</option><option value="">All statuses</option><option value="Closed">Closed</option></select>
    </div>
    <div id="auction-grid" class="grid"></div>`;

  const load = async () => {
    const params = new URLSearchParams();
    const q = $("#f-q").value.trim(); if (q) params.set("q", q);
    const cat = $("#f-cat").value; if (cat) params.set("category", cat);
    const status = $("#f-status").value; if (status) params.set("status", status);
    const { auctions } = await api("/auctions?" + params.toString());
    const grid = $("#auction-grid");
    if (!auctions.length) { grid.innerHTML = `<div class="empty">No auctions match your filters.</div>`; return; }
    grid.innerHTML = "";
    auctions.forEach((a) => grid.appendChild(auctionCard(a)));
  };
  $("#f-q").addEventListener("input", debounce(load, 250));
  $("#f-cat").addEventListener("change", load);
  $("#f-status").addEventListener("change", load);
  await load();
};
