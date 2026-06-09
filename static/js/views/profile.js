// View / edit the current user's profile.
import { api } from "../api.js";
import { $, esc, statusBadge } from "../dom.js";
import { toast } from "../toast.js";
import { openModal } from "../modal.js";
import { views, navigate } from "../navigation.js";

views.profile = async () => {
  const { user } = await api("/users/profile");
  $("#view").innerHTML = `
    <div class="page-head"><div><h2>My Profile</h2><p>Update your details. Login and role can't be changed here.</p></div></div>
    <div class="detail-panel" style="max-width:520px">
      <div class="kv"><span>Login</span><span>${esc(user.login)}</span></div>
      <div class="kv"><span>Role</span><span>${statusBadge(user.role)}</span></div>
      <div class="kv"><span>Phone</span><span>${esc(user.phone_num)}</span></div>
      <div class="kv"><span>Address</span><span>${esc(user.address)}</span></div>
      <div class="kv"><span>Favorite Category</span><span>${esc(user.favorite_category || "—")}</span></div>
      <button id="edit-profile" class="btn btn-primary" style="margin-top:16px">Edit Profile</button>
    </div>`;
  $("#edit-profile").addEventListener("click", () => {
    openModal("Edit Profile", [
      { name: "phone_num", label: "Phone Number", value: user.phone_num },
      { name: "address", label: "Address", value: user.address },
      { name: "favorite_category", label: "Favorite Category", optional: true, value: user.favorite_category },
      { name: "password", label: "New Password", type: "password", optional: true },
    ], async (d) => {
      if (!d.password) delete d.password;
      await api("/users/profile", { method: "PUT", body: d }); toast("Profile updated."); navigate("profile");
    });
  });
};
