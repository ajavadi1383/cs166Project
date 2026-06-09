"""Payments: the winning buyer pays; admins can manage payment status."""
from __future__ import annotations

from flask import Blueprint, jsonify, request

from ..auth import current_user, login_required, role_required
from ..db import execute, next_id, query_all, query_one

bp = Blueprint("payments", __name__, url_prefix="/api/payments")

VALID_STATUS = ("Pending", "Completed", "Failed")


@bp.get("")
@role_required("Admin")
def list_payments():
    rows = query_all(
        "SELECT p.*, i.item_name FROM payment p "
        "JOIN auction a ON a.auction_id = p.auction_id "
        "JOIN item i ON i.item_id = a.item_id "
        "ORDER BY p.payment_id DESC"
    )
    return jsonify(payments=rows)


@bp.post("")
@login_required
def make_payment():
    """The winning buyer initiates payment on a closed auction they won."""
    user = current_user()
    data = request.get_json(silent=True) or {}
    auction_id = data.get("auction_id")
    if auction_id in (None, ""):
        return jsonify(error="auction_id is required"), 400

    auction = query_one("SELECT * FROM auction WHERE auction_id = %s", (auction_id,))
    if auction is None:
        return jsonify(error="Auction not found"), 404
    if auction["auction_status"] != "Closed":
        return jsonify(error="You can only pay after the auction has closed"), 409
    if auction["winner_login"] != user["login"]:
        return jsonify(error="Only the winning buyer can pay for this auction"), 403
    if query_one("SELECT 1 FROM payment WHERE auction_id = %s", (auction_id,)):
        return jsonify(error="A payment already exists for this auction"), 409

    amount = float(auction["current_highest_bid"])
    if amount <= 0:
        return jsonify(error="Nothing to pay: the auction had no winning bid"), 400

    # Status starts Pending; a simple simulated gateway marks it Completed.
    status = "Completed" if (data.get("confirm") is True) else "Pending"
    new_id = next_id("payment", "payment_id")
    execute(
        "INSERT INTO payment (payment_id, auction_id, buyer_login, amount, payment_status) "
        "VALUES (%s, %s, %s, %s, %s)",
        (new_id, auction_id, user["login"], amount, status),
    )
    return jsonify(message="Payment recorded",
                   payment=query_one("SELECT * FROM payment WHERE payment_id=%s", (new_id,))), 201


@bp.put("/<int:payment_id>/status")
@login_required
def update_status(payment_id: int):
    """Winner can confirm their own pending payment; Admin can set any status."""
    user = current_user()
    new_status = (request.get_json(silent=True) or {}).get("status", "").strip()
    if new_status not in VALID_STATUS:
        return jsonify(error=f"status must be one of {', '.join(VALID_STATUS)}"), 400

    payment = query_one("SELECT * FROM payment WHERE payment_id = %s", (payment_id,))
    if payment is None:
        return jsonify(error="Payment not found"), 404

    if user["role"] != "Admin":
        if payment["buyer_login"] != user["login"]:
            return jsonify(error="You can only update your own payment"), 403
        if new_status == "Failed":
            return jsonify(error="Only an admin can mark a payment Failed"), 403

    execute("UPDATE payment SET payment_status=%s WHERE payment_id=%s", (new_status, payment_id))
    return jsonify(message=f"Payment marked {new_status}")
