// Seller auction management: monitor, end, and manage shipments.
import { api } from "../api.js";
import { $, esc, money, statusBadge, on } from "../dom.js";
import { getUser } from "../state.js";
import { toast, guard } from "../toast.js";
import { openModal } from "../modal.js";
import { views, navigate } from "../navigation.js";

function shipmentModal(auctionId) {
  openModal("Update Shipment", [
    { name: "status", label: "Status", type: "select", options: ["Pending", "Shipped", "Delivered"], value: "Shipped" },
    { name: "tracking_number", label: "Tracking Number", optional: true },
  ], async (d) => {
    // Find or create the shipment via the auction detail first.
    const det = await api(`/auctions/${auctionId}`);
    let shipmentId = det.shipment ? det.shipment.shipment_id : null;
    if (!shipmentId) {
      const created = await api("/shipments", { method: "POST", body: { auction_id: auctionId } });
      shipmentId = created.shipment.shipment_id;
    }
    await api(`/shipments/${shipmentId}/status`, { method: "PUT", body: d });
    toast("Shipment updated.");
    navigate("sellerAuctions");
  }, "Update");
}

views.sellerAuctions = async () => {
  const { auctions } = await api("/auctions?seller=" + encodeURIComponent(getUser().login));
  $("#view").innerHTML = `
    <div class="page-head"><div><h2>My Auctions</h2><p>Monitor bids and close auctions.</p></div></div>
    <div class="table-wrap"><table>
      <thead><tr><th>ID</th><th>Item</th><th>Highest Bid</th><th>Status</th><th>Winner</th><th></th></tr></thead>
      <tbody>${auctions.length ? auctions.map((a) => `<tr>
        <td>${a.auction_id}</td><td>${esc(a.item_name)}</td><td>${money(a.current_highest_bid)}</td>
        <td>${statusBadge(a.auction_status)}</td><td>${esc(a.winner_login || "—")}</td>
        <td>
          <button class="btn btn-outline btn-sm" data-a="${a.auction_id}">View</button>
          ${a.auction_status === "Active" ? `<button class="btn btn-danger btn-sm" data-end="${a.auction_id}">End</button>` : ""}
          ${a.auction_status === "Closed" && a.winner_login ? `<button class="btn btn-primary btn-sm" data-ship="${a.auction_id}">Shipment</button>` : ""}
        </td></tr>`).join("")
        : `<tr><td colspan="6" class="empty">No auctions yet.</td></tr>`}</tbody>
    </table></div>`;
  on("[data-a]", "click", (b) => navigate("auctionDetail", +b.dataset.a));
  on("[data-end]", "click", (b) => {
    if (!confirm("End this auction now?")) return;
    guard(async () => {
      await api(`/auctions/${b.dataset.end}/end`, { method: "POST" });
      toast("Auction closed."); navigate("sellerAuctions");
    });
  });
  on("[data-ship]", "click", (b) => shipmentModal(+b.dataset.ship));
};
