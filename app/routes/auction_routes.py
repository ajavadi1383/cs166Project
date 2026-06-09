"""Auction lifecycle: browse/search, create, view, end."""
from __future__ import annotations

from flask import Blueprint, jsonify, request

from ..auth import current_user, login_required, role_required
from ..db import execute, get_cursor, next_id, query_all, query_one

bp = Blueprint("auctions", __name__, url_prefix="/api/auctions")

# Columns joined from item so the client can render rich auction cards.
_AUCTION_SELECT = """
    SELECT a.auction_id, a.item_id, a.seller_login, a.current_highest_bid,
           a.auction_status, a.winner_login,
           i.item_name, i.category, i.starting_price, i.image_url,
           i.item_condition, i.description
    FROM auction a
    JOIN item i ON i.item_id = a.item_id
"""


@bp.get("")
@login_required
def browse():
    """Browse and search auctions. Filters: status, category, q (name), seller."""
    status = request.args.get("status")
    category = request.args.get("category")
    q = (request.args.get("q") or "").strip()
    seller = request.args.get("seller")

    clauses, params = [], []
    if status in ("Active", "Closed"):
        clauses.append("a.auction_status = %s")
        params.append(status)
    if category:
        clauses.append("i.category = %s")
        params.append(category)
    if q:
        clauses.append("i.item_name ILIKE %s")
        params.append(f"%{q}%")
    if seller:
        clauses.append("a.seller_login = %s")
        params.append(seller)

    sql = _AUCTION_SELECT
    if clauses:
        sql += " WHERE " + " AND ".join(clauses)
    sql += " ORDER BY a.auction_status, a.auction_id DESC"
    return jsonify(auctions=query_all(sql, tuple(params)))


@bp.get("/won")
@login_required
def won():
    """Auctions the current buyer has won (with payment/shipment status)."""
    user = current_user()
    rows = query_all(
        _AUCTION_SELECT.replace(
            "FROM auction a",
            "       , p.payment_status, s.shipment_status\n    FROM auction a",
        )
        + " LEFT JOIN payment p ON p.auction_id = a.auction_id"
        + " LEFT JOIN shipment s ON s.auction_id = a.auction_id"
        + " WHERE a.winner_login = %s ORDER BY a.auction_id DESC",
        (user["login"],),
    )
    return jsonify(auctions=rows)


@bp.get("/<int:auction_id>")
@login_required
def detail(auction_id: int):
    auction = query_one(_AUCTION_SELECT + " WHERE a.auction_id = %s", (auction_id,))
    if auction is None:
        return jsonify(error="Auction not found"), 404
    bids = query_all(
        "SELECT bid_id, buyer_login, bid_amount, bid_timestamp FROM bid "
        "WHERE auction_id = %s ORDER BY bid_amount DESC, bid_timestamp DESC",
        (auction_id,),
    )
    payment = query_one("SELECT * FROM payment WHERE auction_id = %s", (auction_id,))
    shipment = query_one("SELECT * FROM shipment WHERE auction_id = %s", (auction_id,))
    return jsonify(auction=auction, bids=bids, payment=payment, shipment=shipment)


@bp.post("")
@role_required("Seller")
def create_auction():
    """Create an auction for one of the seller's items. Starts Active."""
    user = current_user()
    data = request.get_json(silent=True) or {}
    item_id = data.get("item_id")
    if item_id in (None, ""):
        return jsonify(error="item_id is required"), 400

    item = query_one("SELECT * FROM item WHERE item_id = %s", (item_id,))
    if item is None:
        return jsonify(error="Item not found"), 404
    if item["seller_login"] != user["login"]:
        return jsonify(error="You can only auction your own items"), 403
    if query_one("SELECT 1 FROM auction WHERE item_id = %s", (item_id,)):
        return jsonify(error="This item is already in an auction"), 409

    # current_highest_bid starts at 0; the starting price acts as the floor for
    # the first valid bid (enforced when placing a bid).
    new_id = next_id("auction", "auction_id")
    execute(
        "INSERT INTO auction (auction_id, item_id, seller_login, current_highest_bid, "
        "auction_status) VALUES (%s, %s, %s, 0, 'Active')",
        (new_id, item_id, user["login"]),
    )
    return jsonify(message="Auction created", auction=query_one(
        _AUCTION_SELECT + " WHERE a.auction_id = %s", (new_id,))), 201


@bp.post("/<int:auction_id>/end")
@login_required
def end_auction(auction_id: int):
    """End an auction. Seller (owner) or Admin only. Sets winner + Closed."""
    user = current_user()
    auction = query_one("SELECT * FROM auction WHERE auction_id = %s", (auction_id,))
    if auction is None:
        return jsonify(error="Auction not found"), 404
    if user["role"] != "Admin" and auction["seller_login"] != user["login"]:
        return jsonify(error="Only the seller or an admin can end this auction"), 403
    if auction["auction_status"] == "Closed":
        return jsonify(error="Auction is already closed"), 409

    # Determine the winner as the highest bidder, all inside one transaction.
    with get_cursor(commit=True) as cur:
        cur.execute(
            "SELECT buyer_login, bid_amount FROM bid WHERE auction_id = %s "
            "ORDER BY bid_amount DESC, bid_timestamp ASC LIMIT 1",
            (auction_id,),
        )
        top = cur.fetchone()
        if top:
            cur.execute(
                "UPDATE auction SET auction_status='Closed', winner_login=%s, "
                "current_highest_bid=%s WHERE auction_id=%s",
                (top["buyer_login"], top["bid_amount"], auction_id),
            )
        else:
            cur.execute(
                "UPDATE auction SET auction_status='Closed', winner_login=NULL "
                "WHERE auction_id=%s",
                (auction_id,),
            )
    return jsonify(message="Auction closed",
                   auction=query_one(_AUCTION_SELECT + " WHERE a.auction_id=%s", (auction_id,)))
