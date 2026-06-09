// Admin payments dashboard.
import { api } from "../api.js";
import { $, esc, money, statusBadge, on } from "../dom.js";
import { toast, guard } from "../toast.js";
import { views, navigate } from "../navigation.js";

views.adminPayments = async () => {
  const { payments } = await api("/payments");
  $("#view").innerHTML = `
    <div class="page-head"><div><h2>Payments</h2><p>Monitor and adjust payment status across the platform.</p></div></div>
    <div class="table-wrap"><table>
      <thead><tr><th>ID</th><th>Auction</th><th>Item</th><th>Buyer</th><th>Amount</th><th>Status</th><th>Set Status</th></tr></thead>
      <tbody>${payments.length ? payments.map((p) => `<tr>
        <td>${p.payment_id}</td><td>#${p.auction_id}</td><td>${esc(p.item_name)}</td><td>${esc(p.buyer_login)}</td>
        <td>${money(p.amount)}</td><td>${statusBadge(p.payment_status)}</td>
        <td><select class="pay-sel" data-pid="${p.payment_id}">
          ${["Pending", "Completed", "Failed"].map((s) => `<option ${s === p.payment_status ? "selected" : ""}>${s}</option>`).join("")}
        </select></td></tr>`).join("")
        : `<tr><td colspan="7" class="empty">No payments recorded.</td></tr>`}</tbody>
    </table></div>`;
  on(".pay-sel", "change", (s) => guard(
    async () => {
      await api(`/payments/${s.dataset.pid}/status`, { method: "PUT", body: { status: s.value } });
      toast("Payment updated.");
    },
    () => navigate("adminPayments"),
  ));
};
