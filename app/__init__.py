from __future__ import annotations

import os

from flask import Flask, jsonify, render_template

from .config import Config
from .db import close_pool, init_pool


def create_app(config: Config | None = None) -> Flask:
    app = Flask(
        __name__,
        static_folder="../static",
        template_folder="../templates",
    )
    cfg = config or Config()
    app.config.from_object(cfg)
    app.secret_key = cfg.SECRET_KEY

    # Initialise the PostgreSQL connection pool once per process.
    init_pool(cfg)

    @app.teardown_appcontext
    def _shutdown(exception=None):  # noqa: ANN001
        # The pool lives for the whole process; nothing per-request to close.
        return None

    # Register API blueprints.
    from .routes.auth_routes import bp as auth_bp
    from .routes.user_routes import bp as user_bp
    from .routes.item_routes import bp as item_bp
    from .routes.auction_routes import bp as auction_bp
    from .routes.bid_routes import bp as bid_bp
    from .routes.payment_routes import bp as payment_bp
    from .routes.shipment_routes import bp as shipment_bp

    for bp in (auth_bp, user_bp, item_bp, auction_bp, bid_bp, payment_bp, shipment_bp):
        app.register_blueprint(bp)

    # Serve the single-page client.
    @app.route("/")
    def index():
        return render_template("index.html")

    # Uniform JSON error handler for API consumers.
    @app.errorhandler(404)
    def not_found(_e):
        return jsonify(error="Not found"), 404

    @app.errorhandler(500)
    def server_error(_e):
        return jsonify(error="Internal server error"), 500

    return app
