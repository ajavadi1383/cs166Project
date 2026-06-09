// Buyer's bid history.
import { api } from "../api.js";
import { $, esc, money, statusBadge, on } from "../dom.js";
import { views, navigate } from "../navigation.js";

views.myBids = async () => {
  const { bids } = await api("/bids/mine");
  $("#view").innerHTML = `
    <div class="page-head"><div><h2>My Bids</h2><p>Every bid you have placed.</p></div></div>
    <div class="table-wrap"><table>
      <thead><tr><th>Item</th><th>Your Bid</th><th>Highest Now</th><th>Status</th><th>Time</th><th></th></tr></thead>
      <tbody>${bids.length ? bids.map((b) => `<tr>
        <td>${esc(b.item_name)}</td><td>${money(b.bid_amount)}</td><td>${money(b.current_highest_bid)}</td>
        <td>${statusBadge(b.auction_status)}</td><td>${esc(new Date(b.bid_timestamp).toLocaleString())}</td>
        <td><button class="btn btn-outline btn-sm" data-a="${b.auction_id}">View</button></td></tr>`).join("")
        : `<tr><td colspan="6" class="empty">You haven't placed any bids yet.</td></tr>`}</tbody>
    </table></div>`;
  on("[data-a]", "click", (b) => navigate("auctionDetail", +b.dataset.a));
};
