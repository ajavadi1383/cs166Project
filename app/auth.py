from __future__ import annotations

from functools import wraps

from flask import g, jsonify, session

from .db import query_one


def current_user() -> dict | None:
    """Return the logged-in user row (without password) or None."""
    login = session.get("login")
    if not login:
        return None
    if getattr(g, "_user", None) and g._user.get("login") == login:
        return g._user
    user = query_one(
        "SELECT login, phone_num, address, role, favorite_category "
        "FROM users WHERE login = %s",
        (login,),
    )
    g._user = user
    return user


def login_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if current_user() is None:
            return jsonify(error="Authentication required"), 401
        return fn(*args, **kwargs)

    return wrapper


def role_required(*roles: str):
    """Restrict a route to users whose role is in `roles`."""

    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            user = current_user()
            if user is None:
                return jsonify(error="Authentication required"), 401
            if user["role"] not in roles:
                return jsonify(error="You do not have permission for this action"), 403
            return fn(*args, **kwargs)

        return wrapper

    return decorator
