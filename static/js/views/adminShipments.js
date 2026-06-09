// Admin shipments dashboard.
import { api } from "../api.js";
import { $, esc, statusBadge, on } from "../dom.js";
import { toast, guard } from "../toast.js";
import { views, navigate } from "../navigation.js";

views.adminShipments = async () => {
  const { shipments } = await api("/shipments");
  $("#view").innerHTML = `
    <div class="page-head"><div><h2>Shipments</h2><p>Track deliveries across all closed, paid auctions.</p></div></div>
    <div class="table-wrap"><table>
      <thead><tr><th>ID</th><th>Auction</th><th>Item</th><th>Address</th><th>Tracking</th><th>Status</th><th>Set Status</th></tr></thead>
      <tbody>${shipments.length ? shipments.map((s) => `<tr>
        <td>${s.shipment_id}</td><td>#${s.auction_id}</td><td>${esc(s.item_name)}</td><td>${esc(s.address)}</td>
        <td>${esc(s.tracking_number || "—")}</td><td>${statusBadge(s.shipment_status)}</td>
        <td><select class="ship-sel" data-sid="${s.shipment_id}">
          ${["Pending", "Shipped", "Delivered"].map((v) => `<option ${v === s.shipment_status ? "selected" : ""}>${v}</option>`).join("")}
        </select></td></tr>`).join("")
        : `<tr><td colspan="7" class="empty">No shipments yet.</td></tr>`}</tbody>
    </table></div>`;
  on(".ship-sel", "change", (s) => guard(
    async () => {
      await api(`/shipments/${s.dataset.sid}/status`, { method: "PUT", body: { status: s.value } });
      toast("Shipment updated.");
    },
    () => navigate("adminShipments"),
  ));
};
