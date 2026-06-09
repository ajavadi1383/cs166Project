// Auction detail: bidding, ending, and the winner payment/shipment panel.
import { api } from "../api.js";
import { $, esc, money, statusBadge } from "../dom.js";
import { getUser } from "../state.js";
import { toast, guard } from "../toast.js";
import { openModal } from "../modal.js";
import { views, navigate } from "../navigation.js";

function winnerPanel(a, payment, shipment, isWinner) {
  if (a.auction_status !== "Closed" || !isWinner) return "";
  let html = `<div style="margin-top:18px;padding-top:16px;border-top:1px solid var(--line)"><strong>You won this auction!</strong>`;
  if (!payment) {
    html += `<p style="color:var(--muted);font-size:13px">Complete payment of ${money(a.current_highest_bid)} to proceed.</p>
      <button id="pay-now" class="btn btn-accent btn-sm">Pay ${money(a.current_highest_bid)}</button>`;
  } else {
    html += `<div class="kv"><span>Payment</span><span>${statusBadge(payment.payment_status)}</span></div>`;
    if (payment.payment_status === "Pending")
      html += `<button id="confirm-pay" class="btn btn-accent btn-sm" data-pid="${payment.payment_id}">Confirm Payment</button>`;
    if (payment.payment_status === "Completed" && !shipment)
      html += `<button id="create-ship" class="btn btn-primary btn-sm">Set Up Shipment</button>`;
    if (shipment) {
      html += `<div class="kv"><span>Shipment</span><span>${statusBadge(shipment.shipment_status)}</span></div>`;
      if (shipment.tracking_number) html += `<div class="kv"><span>Tracking</span><span>${esc(shipment.tracking_number)}</span></div>`;
    }
  }
  return html + `</div>`;
}

function wireWinnerPanel(a) {
  const pay = $("#pay-now");
  if (pay) pay.addEventListener("click", () => guard(async () => {
    await api("/payments", { method: "POST", body: { auction_id: a.auction_id, confirm: true } });
    toast("Payment completed."); navigate("auctionDetail", a.auction_id);
  }));
  const confirm = $("#confirm-pay");
  if (confirm) confirm.addEventListener("click", () => guard(async () => {
    await api(`/payments/${confirm.dataset.pid}/status`, { method: "PUT", body: { status: "Completed" } });
    toast("Payment completed."); navigate("auctionDetail", a.auction_id);
  }));
  const ship = $("#create-ship");
  if (ship) ship.addEventListener("click", () => {
    openModal("Set Up Shipment", [{ name: "address", label: "Delivery Address" }], async (d) => {
      await api("/shipments", { method: "POST", body: { auction_id: a.auction_id, address: d.address } });
      toast("Shipment created."); navigate("auctionDetail", a.auction_id);
    }, "Create Shipment");
  });
}

views.auctionDetail = async (auctionId) => {
  const { auction: a, bids, payment, shipment } = await api(`/auctions/${auctionId}`);
  const user = getUser();
  const view = $("#view");
  const isBuyer = user.role === "Buyer";
  const isOwner = a.seller_login === user.login;
  const isAdmin = user.role === "Admin";
  const canBid = isBuyer && a.auction_status === "Active" && !isOwner;
  const isWinner = a.winner_login === user.login;

  let actions = "";
  if (canBid) {
    actions = `<div class="bid-box">
      <input id="bid-amount" type="number" step="0.01" min="0" placeholder="Your bid amount" />
      <button id="place-bid" class="btn btn-accent">Place Bid</button></div>`;
  }
  if ((isOwner || isAdmin) && a.auction_status === "Active") {
    actions += `<button id="end-auction" class="btn btn-danger" style="margin-top:12px">End Auction Now</button>`;
  }

  view.innerHTML = `
    <button class="btn btn-outline btn-sm" id="back">&larr; Back</button>
    <div class="detail" style="margin-top:16px">
      <div class="detail-media">
        <img src="${esc(a.image_url || "https://via.placeholder.com/600x400?text=No+Image")}" alt="" />
      </div>
      <div class="detail-panel">
        <span class="card-cat">${esc(a.category)}</span>
        <h2>${esc(a.item_name)} ${statusBadge(a.auction_status)}</h2>
        <div class="big-price">${money(Number(a.current_highest_bid) > 0 ? a.current_highest_bid : a.starting_price)}</div>
        <div class="kv"><span>Starting price</span><span>${money(a.starting_price)}</span></div>
        <div class="kv"><span>Seller</span><span>${esc(a.seller_login)}</span></div>
        <div class="kv"><span>Condition</span><span>${esc(a.item_condition || "—")}</span></div>
        ${a.winner_login ? `<div class="kv"><span>Winner</span><span>${esc(a.winner_login)}</span></div>` : ""}
        <p style="color:var(--muted);margin-top:14px">${esc(a.description || "No description provided.")}</p>
        ${actions}
        ${winnerPanel(a, payment, shipment, isWinner)}
      </div>
    </div>
    <h3 class="section-title">Bid History (${bids.length})</h3>
    <div class="table-wrap">
      <table><thead><tr><th>Bidder</th><th>Amount</th><th>Time</th></tr></thead>
      <tbody>${bids.length ? bids.map((b) =>
        `<tr><td>${esc(b.buyer_login)}</td><td>${money(b.bid_amount)}</td><td>${esc(new Date(b.bid_timestamp).toLocaleString())}</td></tr>`).join("")
        : `<tr><td colspan="3" class="empty">No bids yet.</td></tr>`}</tbody></table>
    </div>`;

  $("#back").addEventListener("click", () => navigate("browse"));

  const placeBtn = $("#place-bid");
  if (placeBtn) placeBtn.addEventListener("click", () => guard(async () => {
    await api("/bids", { method: "POST", body: { auction_id: a.auction_id, amount: $("#bid-amount").value } });
    toast("Bid placed!"); navigate("auctionDetail", a.auction_id);
  }));

  const endBtn = $("#end-auction");
  if (endBtn) endBtn.addEventListener("click", () => guard(async () => {
    await api(`/auctions/${a.auction_id}/end`, { method: "POST" });
    toast("Auction closed."); navigate("auctionDetail", a.auction_id);
  }));

  wireWinnerPanel(a);
};
