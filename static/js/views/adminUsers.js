// Admin user management: search, change roles, delete.
import { api } from "../api.js";
import { $, esc, statusBadge, debounce, on } from "../dom.js";
import { toast, guard } from "../toast.js";
import { views, navigate } from "../navigation.js";

function userRow(u) {
  return `<tr><td>${esc(u.login)}</td><td>${statusBadge(u.role)}</td><td>${esc(u.phone_num)}</td>
    <td>${esc(u.address)}</td><td>${esc(u.favorite_category || "—")}</td>
    <td>
      <select class="role-sel" data-login="${esc(u.login)}">
        ${["Buyer", "Seller", "Admin"].map((r) => `<option ${r === u.role ? "selected" : ""}>${r}</option>`).join("")}
      </select>
      <button class="btn btn-danger btn-sm" data-deluser="${esc(u.login)}">Delete</button>
    </td></tr>`;
}

function wireUserRows() {
  on(".role-sel", "change", (s) => guard(
    async () => {
      await api(`/users/${encodeURIComponent(s.dataset.login)}/role`, { method: "PUT", body: { role: s.value } });
      toast(`${s.dataset.login} is now ${s.value}.`);
    },
    () => navigate("adminUsers"),  // refresh to reset the dropdown on failure
  ));
  on("[data-deluser]", "click", (b) => {
    if (!confirm(`Delete ${b.dataset.deluser}?`)) return;
    guard(async () => {
      await api(`/users/${encodeURIComponent(b.dataset.deluser)}`, { method: "DELETE" });
      toast("User deleted."); navigate("adminUsers");
    });
  });
}

views.adminUsers = async () => {
  const { users } = await api("/users");
  $("#view").innerHTML = `
    <div class="page-head"><div><h2>Manage Users</h2><p>Promote buyers to sellers/admins or remove accounts.</p></div></div>
    <div class="filters"><input id="u-search" placeholder="Search login…" /></div>
    <div class="table-wrap"><table>
      <thead><tr><th>Login</th><th>Role</th><th>Phone</th><th>Address</th><th>Fav. Category</th><th>Actions</th></tr></thead>
      <tbody id="u-body">${users.map(userRow).join("")}</tbody>
    </table></div>`;
  wireUserRows();
  $("#u-search").addEventListener("input", debounce(async (e) => {
    const { users } = await api("/users?search=" + encodeURIComponent(e.target.value.trim()));
    $("#u-body").innerHTML = users.map(userRow).join("");
    wireUserRows();
  }, 250));
};
