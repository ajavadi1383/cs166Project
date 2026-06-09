"""Shipments: created after payment completion; seller/admin update status."""
from __future__ import annotations

from flask import Blueprint, jsonify, request

from ..auth import current_user, login_required, role_required
from ..db import execute, next_id, query_all, query_one

bp = Blueprint("shipments", __name__, url_prefix="/api/shipments")

VALID_STATUS = ("Pending", "Shipped", "Delivered")


@bp.get("")
@role_required("Admin")
def list_shipments():
    rows = query_all(
        "SELECT s.*, i.item_name, a.seller_login, a.winner_login FROM shipment s "
        "JOIN auction a ON a.auction_id = s.auction_id "
        "JOIN item i ON i.item_id = a.item_id "
        "ORDER BY s.shipment_id DESC"
    )
    return jsonify(shipments=rows)


@bp.post("")
@login_required
def create_shipment():
    """Create a shipment once payment is Completed.

    Allowed for the winning buyer (to supply a delivery address), the seller
    that owns the auction, or an admin.
    """
    user = current_user()
    data = request.get_json(silent=True) or {}
    auction_id = data.get("auction_id")
    if auction_id in (None, ""):
        return jsonify(error="auction_id is required"), 400

    auction = query_one("SELECT * FROM auction WHERE auction_id = %s", (auction_id,))
    if auction is None:
        return jsonify(error="Auction not found"), 404

    allowed = (
        user["role"] == "Admin"
        or auction["seller_login"] == user["login"]
        or auction["winner_login"] == user["login"]
    )
    if not allowed:
        return jsonify(error="Not permitted to create this shipment"), 403

    payment = query_one("SELECT * FROM payment WHERE auction_id = %s", (auction_id,))
    if payment is None or payment["payment_status"] != "Completed":
        return jsonify(error="Shipment can only be created after payment is Completed"), 409
    if query_one("SELECT 1 FROM shipment WHERE auction_id = %s", (auction_id,)):
        return jsonify(error="A shipment already exists for this auction"), 409

    # Default address: the winning buyer's stored address.
    address = (data.get("address") or "").strip()
    if not address:
        winner = query_one("SELECT address FROM users WHERE login = %s", (auction["winner_login"],))
        address = winner["address"] if winner else ""
    if not address:
        return jsonify(error="A shipping address is required"), 400

    new_id = next_id("shipment", "shipment_id")
    execute(
        "INSERT INTO shipment (shipment_id, auction_id, address, shipment_status) "
        "VALUES (%s, %s, %s, 'Pending')",
        (new_id, auction_id, address),
    )
    return jsonify(message="Shipment created",
                   shipment=query_one("SELECT * FROM shipment WHERE shipment_id=%s", (new_id,))), 201


@bp.put("/<int:shipment_id>/status")
@login_required
def update_status(shipment_id: int):
    """The seller (owner) or an admin updates status and tracking number."""
    user = current_user()
    data = request.get_json(silent=True) or {}
    new_status = (data.get("status") or "").strip()
    tracking = (data.get("tracking_number") or "").strip() or None
    if new_status not in VALID_STATUS:
        return jsonify(error=f"status must be one of {', '.join(VALID_STATUS)}"), 400

    shipment = query_one(
        "SELECT s.*, a.seller_login FROM shipment s "
        "JOIN auction a ON a.auction_id = s.auction_id WHERE s.shipment_id = %s",
        (shipment_id,),
    )
    if shipment is None:
        return jsonify(error="Shipment not found"), 404
    if user["role"] != "Admin" and shipment["seller_login"] != user["login"]:
        return jsonify(error="Only the seller or an admin can update shipment status"), 403

    execute(
        "UPDATE shipment SET shipment_status=%s, tracking_number=COALESCE(%s, tracking_number) "
        "WHERE shipment_id=%s",
        (new_status, tracking, shipment_id),
    )
    return jsonify(message=f"Shipment marked {new_status}")
