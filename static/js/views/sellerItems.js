// Seller item management: create/edit/delete items and list them as auctions.
import { api } from "../api.js";
import { $, esc, money, on } from "../dom.js";
import { toast, guard } from "../toast.js";
import { openModal } from "../modal.js";
import { views, navigate } from "../navigation.js";

function itemModal(title, item, onSubmit) {
  openModal(title, [
    { name: "item_name", label: "Item Name", value: item.item_name },
    { name: "category", label: "Category", value: item.category },
    { name: "starting_price", label: "Starting Price", type: "number", value: item.starting_price },
    { name: "item_condition", label: "Condition", optional: true, value: item.item_condition },
    { name: "image_url", label: "Image URL", optional: true, value: item.image_url },
    { name: "description", label: "Description", type: "textarea", optional: true, value: item.description },
  ], onSubmit, title.startsWith("Create") ? "Create" : "Save");
}

views.sellerItems = async () => {
  const { items } = await api("/items?mine=1");
  $("#view").innerHTML = `
    <div class="page-head">
      <div><h2>My Items</h2><p>Create items, then list them on an auction.</p></div>
      <button id="new-item" class="btn btn-primary">+ New Item</button>
    </div>
    <div class="table-wrap"><table>
      <thead><tr><th>ID</th><th>Name</th><th>Category</th><th>Start Price</th><th>Auction</th><th></th></tr></thead>
      <tbody>${items.length ? items.map((i) => `<tr>
        <td>${i.item_id}</td><td>${esc(i.item_name)}</td><td>${esc(i.category)}</td><td>${money(i.starting_price)}</td>
        <td>${i.auction_id ? `#${i.auction_id}` : "—"}</td>
        <td>
          ${i.auction_id ? "" : `<button class="btn btn-accent btn-sm" data-list="${i.item_id}">List Auction</button>`}
          <button class="btn btn-outline btn-sm" data-edit="${i.item_id}">Edit</button>
          <button class="btn btn-danger btn-sm" data-del="${i.item_id}">Delete</button>
        </td></tr>`).join("")
        : `<tr><td colspan="6" class="empty">No items yet — create your first one.</td></tr>`}</tbody>
    </table></div>`;

  $("#new-item").addEventListener("click", () => itemModal("Create Item", {}, async (d) => {
    await api("/items", { method: "POST", body: d }); toast("Item created."); navigate("sellerItems");
  }));

  const byId = Object.fromEntries(items.map((i) => [i.item_id, i]));
  on("[data-edit]", "click", (b) =>
    itemModal("Edit Item", byId[b.dataset.edit], async (d) => {
      await api(`/items/${b.dataset.edit}`, { method: "PUT", body: d });
      toast("Item updated."); navigate("sellerItems");
    }));
  on("[data-del]", "click", (b) => {
    if (!confirm("Delete this item?")) return;
    guard(async () => {
      await api(`/items/${b.dataset.del}`, { method: "DELETE" });
      toast("Item deleted."); navigate("sellerItems");
    });
  });
  on("[data-list]", "click", (b) => guard(async () => {
    await api("/auctions", { method: "POST", body: { item_id: +b.dataset.list } });
    toast("Auction listed!"); navigate("sellerAuctions");
  }));
};
