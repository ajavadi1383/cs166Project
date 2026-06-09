// Buyer's won auctions with payment/shipment shortcuts.
import { api } from "../api.js";
import { $, esc, money, statusBadge, on } from "../dom.js";
import { views, navigate } from "../navigation.js";

views.won = async () => {
  const { auctions } = await api("/auctions/won");
  $("#view").innerHTML = `
    <div class="page-head"><div><h2>Won Auctions</h2><p>Auctions you won — pay and track shipment here.</p></div></div>
    <div class="table-wrap"><table>
      <thead><tr><th>Item</th><th>Winning Bid</th><th>Payment</th><th>Shipment</th><th></th></tr></thead>
      <tbody>${auctions.length ? auctions.map((a) => `<tr>
        <td>${esc(a.item_name)}</td><td>${money(a.current_highest_bid)}</td>
        <td>${a.payment_status ? statusBadge(a.payment_status) : "—"}</td>
        <td>${a.shipment_status ? statusBadge(a.shipment_status) : "—"}</td>
        <td><button class="btn btn-primary btn-sm" data-a="${a.auction_id}">Manage</button></td></tr>`).join("")
        : `<tr><td colspan="5" class="empty">You haven't won any auctions yet.</td></tr>`}</tbody>
    </table></div>`;
  on("[data-a]", "click", (b) => navigate("auctionDetail", +b.dataset.a));
};
