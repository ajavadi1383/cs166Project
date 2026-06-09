"""Registration, login and logout."""
from __future__ import annotations

from flask import Blueprint, jsonify, request, session

from ..auth import current_user, get_user
from ..db import query_one, execute

bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@bp.post("/register")
def register():
    data = request.get_json(silent=True) or {}
    login = (data.get("login") or "").strip()
    password = data.get("password") or ""
    phone_num = (data.get("phone_num") or "").strip()
    address = (data.get("address") or "").strip()
    favorite_category = (data.get("favorite_category") or "").strip() or None

    # All required fields per the requirement analysis (role defaults to Buyer).
    missing = [f for f, v in (
        ("login", login), ("password", password),
        ("phone_num", phone_num), ("address", address),
    ) if not v]
    if missing:
        return jsonify(error=f"Missing required field(s): {', '.join(missing)}"), 400
    if len(login) > 50:
        return jsonify(error="Login must be at most 50 characters"), 400

    if query_one("SELECT 1 FROM users WHERE login = %s", (login,)):
        return jsonify(error="That login is already taken"), 409

    # New accounts are always created as Buyer (role escalation is admin-only).
    execute(
        "INSERT INTO users (login, password, phone_num, address, role, favorite_category) "
        "VALUES (%s, %s, %s, %s, 'Buyer', %s)",
        (login, password, phone_num, address, favorite_category),
    )
    session["login"] = login
    return jsonify(message="Account created", user=get_user(login)), 201


@bp.post("/login")
def login():
    data = request.get_json(silent=True) or {}
    login_ = (data.get("login") or "").strip()
    password = data.get("password") or ""
    if not login_ or not password:
        return jsonify(error="Login and password are required"), 400

    row = query_one("SELECT login, password FROM users WHERE login = %s", (login_,))
    if row is None or row["password"] != password:
        return jsonify(error="Invalid login or password"), 401

    session["login"] = login_
    return jsonify(message="Logged in", user=get_user(login_))


@bp.post("/logout")
def logout():
    session.clear()
    return jsonify(message="Logged out")


@bp.get("/me")
def me():
    return jsonify(user=current_user())
