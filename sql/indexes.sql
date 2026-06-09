-- --- Auction browse/search access paths -------------------------------------
-- Filtering by status is the single most common predicate (active auctions).
CREATE INDEX IF NOT EXISTS idx_auction_status      ON auction (auction_status);
-- A seller's dashboard lists their own auctions.
CREATE INDEX IF NOT EXISTS idx_auction_seller      ON auction (seller_login);
-- A buyer's "auctions I won" view.
CREATE INDEX IF NOT EXISTS idx_auction_winner      ON auction (winner_login);

-- --- Item search access paths ------------------------------------------------
-- Category filter on the browse page.
CREATE INDEX IF NOT EXISTS idx_item_category       ON item (category);
-- Seller's "my items" view.
CREATE INDEX IF NOT EXISTS idx_item_seller         ON item (seller_login);
-- Case-insensitive item-name search (ILIKE '%term%'); trigram if available,
-- otherwise a lower() expression index for prefix/equality help.
CREATE INDEX IF NOT EXISTS idx_item_name_lower     ON item (lower(item_name));

-- --- Bid access paths --------------------------------------------------------
-- Bid history for an auction, newest / highest first. Composite index serves
-- both "all bids for auction X ordered by amount" and the highest-bid lookup.
CREATE INDEX IF NOT EXISTS idx_bid_auction_amount  ON bid (auction_id, bid_amount DESC);
-- A buyer's bidding history.
CREATE INDEX IF NOT EXISTS idx_bid_buyer           ON bid (buyer_login);

-- --- Payment / shipment access paths ----------------------------------------
-- (auction_id is already UNIQUE on these tables, so it is indexed; we add the
--  status filters used by the admin dashboards.)
CREATE INDEX IF NOT EXISTS idx_payment_status      ON payment (payment_status);
CREATE INDEX IF NOT EXISTS idx_shipment_status     ON shipment (shipment_status);

-- Refresh planner statistics after creating indexes.
ANALYZE;
