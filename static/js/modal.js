// Generic form modal builder used by the seller/profile/shipment flows.
import { $, el, esc } from "./dom.js";
import { toast } from "./toast.js";

export function openModal(title, fields, onSubmit, submitLabel = "Save") {
  const root = $("#modal-root");
  const body = fields.map((f) => {
    if (f.type === "textarea")
      return `<label>${esc(f.label)}<textarea name="${f.name}">${esc(f.value || "")}</textarea></label>`;
    if (f.type === "select") {
      const opts = f.options.map((o) =>
        `<option value="${esc(o)}" ${o === f.value ? "selected" : ""}>${esc(o)}</option>`).join("");
      return `<label>${esc(f.label)}<select name="${f.name}">${opts}</select></label>`;
    }
    return `<label>${esc(f.label)}${f.optional ? ' <span class="opt">(optional)</span>' : ""}
      <input name="${f.name}" type="${f.type || "text"}" value="${esc(f.value ?? "")}" ${f.optional ? "" : "required"} /></label>`;
  }).join("");

  const overlay = el(`<div class="modal-overlay">
    <div class="modal">
      <div class="modal-head"><h3>${esc(title)}</h3><button class="icon-btn" data-close>&times;</button></div>
      <form><div class="modal-body">${body}</div>
      <div class="modal-foot">
        <button type="button" class="btn btn-outline" data-close>Cancel</button>
        <button type="submit" class="btn btn-primary">${esc(submitLabel)}</button>
      </div></form>
    </div></div>`);

  const close = () => root.innerHTML = "";
  overlay.addEventListener("click", (e) => { if (e.target === overlay || e.target.hasAttribute("data-close")) close(); });
  overlay.querySelector("form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    try { await onSubmit(data); close(); }
    catch (err) { toast(err.message, "err"); }
  });
  root.innerHTML = "";
  root.appendChild(overlay);
}
