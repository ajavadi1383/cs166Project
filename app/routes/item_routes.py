"""Item management: sellers manage their own items, admins manage all."""
from __future__ import annotations

from flask import Blueprint, jsonify, request

from ..auth import current_user, login_required, role_required
from ..db import execute, next_id, query_all, query_one

bp = Blueprint("items", __name__, url_prefix="/api/items")


@bp.get("")
@login_required
def list_items():
    """List items. Sellers/Admins see management info; supports ?mine=1."""
    user = current_user()
    mine = request.args.get("mine") == "1"
    if mine:
        rows = query_all(
            "SELECT i.*, a.auction_id FROM item i "
            "LEFT JOIN auction a ON a.item_id = i.item_id "
            "WHERE i.seller_login = %s ORDER BY i.item_id DESC",
            (user["login"],),
        )
    else:
        rows = query_all(
            "SELECT i.*, a.auction_id FROM item i "
            "LEFT JOIN auction a ON a.item_id = i.item_id "
            "ORDER BY i.item_id DESC"
        )
    return jsonify(items=rows)


@bp.get("/categories")
@login_required
def categories():
    rows = query_all("SELECT DISTINCT category FROM item ORDER BY category")
    return jsonify(categories=[r["category"] for r in rows])


@bp.post("")
@role_required("Seller", "Admin")
def create_item():
    user = current_user()
    data = request.get_json(silent=True) or {}

    item_name = (data.get("item_name") or "").strip()
    category = (data.get("category") or "").strip()
    starting_price = data.get("starting_price")
    image_url = (data.get("image_url") or "").strip() or None
    item_condition = (data.get("item_condition") or "").strip() or None
    description = (data.get("description") or "").strip() or None

    if not item_name or not category or starting_price in (None, ""):
        return jsonify(error="item_name, category and starting_price are required"), 400
    try:
        starting_price = float(starting_price)
    except (TypeError, ValueError):
        return jsonify(error="starting_price must be a number"), 400
    if starting_price < 0:
        return jsonify(error="starting_price must be >= 0"), 400

    # A Seller owns the item. An Admin creating an item must also be a Seller-
    # role in the schema (seller_role='Seller'), so admins act on behalf only
    # when they own a seller account; otherwise reject with a clear message.
    if user["role"] != "Seller":
        return jsonify(error="Only Seller accounts can own items"), 403

    new_id = next_id("item", "item_id")
    execute(
        "INSERT INTO item (item_id, item_name, category, starting_price, image_url, "
        "item_condition, description, seller_login) "
        "VALUES (%s, %s, %s, %s, %s, %s, %s, %s)",
        (new_id, item_name, category, starting_price, image_url,
         item_condition, description, user["login"]),
    )
    return jsonify(message="Item created", item=_get(new_id)), 201


@bp.put("/<int:item_id>")
@role_required("Seller", "Admin")
def update_item(item_id: int):
    user = current_user()
    item = _get(item_id)
    if item is None:
        return jsonify(error="Item not found"), 404
    if user["role"] != "Admin" and item["seller_login"] != user["login"]:
        return jsonify(error="You can only edit your own items"), 403

    data = request.get_json(silent=True) or {}
    item_name = (data.get("item_name") or item["item_name"]).strip()
    category = (data.get("category") or item["category"]).strip()
    starting_price = data.get("starting_price", item["starting_price"])
    image_url = (data.get("image_url") or "").strip() or None
    item_condition = (data.get("item_condition") or "").strip() or None
    description = (data.get("description") or "").strip() or None
    try:
        starting_price = float(starting_price)
    except (TypeError, ValueError):
        return jsonify(error="starting_price must be a number"), 400

    execute(
        "UPDATE item SET item_name=%s, category=%s, starting_price=%s, image_url=%s, "
        "item_condition=%s, description=%s WHERE item_id=%s",
        (item_name, category, starting_price, image_url, item_condition, description, item_id),
    )
    return jsonify(message="Item updated", item=_get(item_id))


@bp.delete("/<int:item_id>")
@role_required("Seller", "Admin")
def delete_item(item_id: int):
    user = current_user()
    item = _get(item_id)
    if item is None:
        return jsonify(error="Item not found"), 404
    if user["role"] != "Admin" and item["seller_login"] != user["login"]:
        return jsonify(error="You can only remove your own items"), 403
    try:
        execute("DELETE FROM item WHERE item_id=%s", (item_id,))
    except Exception:
        return jsonify(error="Cannot delete: item is referenced by an auction"), 409
    return jsonify(message="Item removed")


def _get(item_id: int) -> dict | None:
    return query_one("SELECT * FROM item WHERE item_id=%s", (item_id,))
