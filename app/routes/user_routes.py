"""User profile and admin user-management endpoints."""
from __future__ import annotations

from flask import Blueprint, jsonify, request

from ..auth import USER_FIELDS, current_user, login_required, role_required
from ..db import execute, query_all, query_one

bp = Blueprint("users", __name__, url_prefix="/api/users")

VALID_ROLES = ("Buyer", "Seller", "Admin")


@bp.get("/profile")
@login_required
def get_profile():
    return jsonify(user=current_user())


@bp.put("/profile")
@login_required
def update_profile():
    """Users may update any profile field EXCEPT login and role."""
    user = current_user()
    data = request.get_json(silent=True) or {}

    phone_num = (data.get("phone_num") or "").strip()
    address = (data.get("address") or "").strip()
    favorite_category = (data.get("favorite_category") or "").strip() or None
    password = data.get("password")

    if not phone_num or not address:
        return jsonify(error="Phone number and address are required"), 400

    # COALESCE keeps the existing password when no new one is supplied.
    execute(
        "UPDATE users SET phone_num=%s, address=%s, favorite_category=%s, "
        "password=COALESCE(%s, password) WHERE login=%s",
        (phone_num, address, favorite_category, password or None, user["login"]),
    )
    return jsonify(message="Profile updated", user=current_user())


# --------------------------------------------------------------------------
# Admin-only user management
# --------------------------------------------------------------------------
@bp.get("")
@role_required("Admin")
def list_users():
    # An empty search becomes '%' (ILIKE), which matches every login.
    search = (request.args.get("search") or "").strip()
    rows = query_all(
        f"SELECT {USER_FIELDS} FROM users WHERE login ILIKE %s ORDER BY login",
        (f"%{search}%",),
    )
    return jsonify(users=rows)


@bp.put("/<string:login>/role")
@role_required("Admin")
def change_role(login: str):
    """Only an Admin may change a user's role (e.g. promote Buyer -> Seller)."""
    data = request.get_json(silent=True) or {}
    new_role = (data.get("role") or "").strip()
    if new_role not in VALID_ROLES:
        return jsonify(error=f"Role must be one of {', '.join(VALID_ROLES)}"), 400

    target = query_one("SELECT login, role FROM users WHERE login = %s", (login,))
    if target is None:
        return jsonify(error="User not found"), 404

    me = current_user()
    if me["login"] == login and new_role != "Admin":
        return jsonify(error="You cannot demote your own admin account"), 400

    # A role change cascades to dependent composite FKs (item/auction/bid...).
    # Changing the role of a user who already owns items as a Seller, or has
    # placed bids as a Buyer, would violate those composite FKs, so guard it.
    if target["role"] == "Seller" and new_role != "Seller":
        if query_one("SELECT 1 FROM item WHERE seller_login=%s", (login,)) or \
           query_one("SELECT 1 FROM auction WHERE seller_login=%s", (login,)):
            return jsonify(error="Cannot change role: user still owns items/auctions as Seller"), 409
    if target["role"] == "Buyer" and new_role != "Buyer":
        if query_one("SELECT 1 FROM bid WHERE buyer_login=%s", (login,)) or \
           query_one("SELECT 1 FROM auction WHERE winner_login=%s", (login,)):
            return jsonify(error="Cannot change role: user still has bids/wins as Buyer"), 409

    execute("UPDATE users SET role=%s WHERE login=%s", (new_role, login))
    return jsonify(message=f"{login} is now {new_role}")


@bp.delete("/<string:login>")
@role_required("Admin")
def delete_user(login: str):
    me = current_user()
    if me["login"] == login:
        return jsonify(error="You cannot delete your own account"), 400
    if query_one("SELECT 1 FROM users WHERE login=%s", (login,)) is None:
        return jsonify(error="User not found"), 404
    try:
        execute("DELETE FROM users WHERE login=%s", (login,))
    except Exception:
        return jsonify(error="Cannot delete: user is referenced by items, auctions, or bids"), 409
    return jsonify(message=f"Deleted user {login}")
