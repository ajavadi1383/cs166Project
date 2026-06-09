"""Bidding: place a bid and view a buyer's bid history."""
from __future__ import annotations

from flask import Blueprint, jsonify, request

from ..auth import current_user, login_required, role_required
from ..db import get_cursor, query_all

bp = Blueprint("bids", __name__, url_prefix="/api/bids")


@bp.get("/mine")
@login_required
def my_bids():
    user = current_user()
    rows = query_all(
        "SELECT b.bid_id, b.auction_id, b.bid_amount, b.bid_timestamp, "
        "       i.item_name, a.auction_status, a.current_highest_bid "
        "FROM bid b "
        "JOIN auction a ON a.auction_id = b.auction_id "
        "JOIN item i ON i.item_id = a.item_id "
        "WHERE b.buyer_login = %s "
        "ORDER BY b.bid_timestamp DESC",
        (user["login"],),
    )
    return jsonify(bids=rows)


@bp.post("")
@role_required("Buyer", "Admin")
def place_bid():
    """Place a bid on an active auction.

    Enforced business rules:
      * Auction must exist and be 'Active'.
      * A seller cannot bid on their own auction.
      * The bid must be strictly greater than the current highest bid,
        and at least the item's starting price for the first bid.
      * Only Buyer accounts hold bids (schema constraint buyer_role='Buyer').
    """
    user = current_user()
    if user["role"] != "Buyer":
        return jsonify(error="Only Buyer accounts can place bids"), 403

    data = request.get_json(silent=True) or {}
    auction_id = data.get("auction_id")
    amount = data.get("amount")
    if auction_id in (None, "") or amount in (None, ""):
        return jsonify(error="auction_id and amount are required"), 400
    try:
        amount = float(amount)
    except (TypeError, ValueError):
        return jsonify(error="amount must be a number"), 400
    if amount <= 0:
        return jsonify(error="amount must be greater than 0"), 400

    # Run the whole check-and-insert atomically with a row lock so concurrent
    # bids cannot both "win" against a stale current_highest_bid.
    with get_cursor(commit=True) as cur:
        cur.execute(
            "SELECT a.auction_id, a.seller_login, a.current_highest_bid, "
            "       a.auction_status, i.starting_price "
            "FROM auction a JOIN item i ON i.item_id = a.item_id "
            "WHERE a.auction_id = %s FOR UPDATE",
            (auction_id,),
        )
        auction = cur.fetchone()
        if auction is None:
            return jsonify(error="Auction not found"), 404
        if auction["auction_status"] != "Active":
            return jsonify(error="Auction is closed; no more bids accepted"), 409
        if auction["seller_login"] == user["login"]:
            return jsonify(error="A seller cannot bid on their own auction"), 403

        # First valid bid must reach starting price; later bids must beat the highest.
        if float(auction["current_highest_bid"]) == 0:
            if amount < float(auction["starting_price"]):
                return jsonify(error=f"First bid must be at least the starting price "
                                     f"({auction['starting_price']})"), 400
        elif amount <= float(auction["current_highest_bid"]):
            return jsonify(error=f"Bid must be greater than the current highest bid "
                                 f"({auction['current_highest_bid']})"), 400

        cur.execute("SELECT COALESCE(MAX(bid_id), 0) + 1 AS next FROM bid")
        new_id = cur.fetchone()["next"]
        cur.execute(
            "INSERT INTO bid (bid_id, auction_id, buyer_login, bid_amount) "
            "VALUES (%s, %s, %s, %s)",
            (new_id, auction_id, user["login"], amount),
        )
        cur.execute(
            "UPDATE auction SET current_highest_bid = %s WHERE auction_id = %s",
            (amount, auction_id),
        )

    return jsonify(message="Bid placed", bid_id=new_id, current_highest_bid=amount), 201
