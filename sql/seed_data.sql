-- ============================================================================
-- Sample dataset for the Online Auction and Bidding System.
-- Default password for every sample account below is:  password123
-- ============================================================================

TRUNCATE shipment, payment, bid, auction, item, users RESTART IDENTITY CASCADE;

-- ---------------------------------------------------------------------------
-- Users (1 admin, 3 sellers, 4 buyers)
-- ---------------------------------------------------------------------------
INSERT INTO users (login, password, phone_num, address, role, favorite_category) VALUES
    ('admin',   'password123', '555-0100', '1 Admin Plaza, Riverside CA',      'Admin',  NULL),
    ('alice',   'password123', '555-0101', '22 Maple St, San Jose CA',         'Seller', 'Electronics'),
    ('bob',     'password123', '555-0102', '88 Oak Ave, Los Angeles CA',       'Seller', 'Collectibles'),
    ('carol',   'password123', '555-0103', '13 Pine Rd, San Diego CA',         'Seller', 'Fashion'),
    ('dave',    'password123', '555-0104', '47 Elm Blvd, Sacramento CA',       'Buyer',  'Electronics'),
    ('erin',    'password123', '555-0105', '9 Cedar Ln, Fresno CA',            'Buyer',  'Collectibles'),
    ('frank',   'password123', '555-0106', '301 Birch Way, Oakland CA',        'Buyer',  'Fashion'),
    ('grace',   'password123', '555-0107', '76 Spruce Ct, Long Beach CA',      'Buyer',  'Electronics');

-- ---------------------------------------------------------------------------
-- Items (each owned by a seller)
-- ---------------------------------------------------------------------------
INSERT INTO item (item_id, item_name, category, starting_price, image_url, item_condition, description, seller_login) VALUES
    (1, 'Apple MacBook Pro 14"',      'Electronics',  900.00, 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600', 'Used - Good',      'M1 Pro, 16GB RAM, 512GB SSD. Light scuffs on lid.', 'alice'),
    (2, 'Sony WH-1000XM5 Headphones', 'Electronics',  180.00, 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=600', 'Like New',         'Noise-cancelling over-ear headphones, barely used.', 'alice'),
    (3, 'Vintage Polaroid Camera',    'Collectibles', 45.00,  'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=600', 'Used - Fair',      'Working 1970s instant camera, great for display.', 'bob'),
    (4, '1st Edition Comic Book',      'Collectibles', 250.00, 'https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?w=600', 'Used - Good',      'Rare first edition, bagged and boarded.', 'bob'),
    (5, 'Leather Jacket (Genuine)',    'Fashion',      120.00, 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600', 'New',              'Size M, full-grain leather, never worn.', 'carol'),
    (6, 'Designer Handbag',            'Fashion',      300.00, 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600', 'Like New',         'Authentic, includes dust bag and receipt.', 'carol'),
    (7, 'Mechanical Keyboard',         'Electronics',  60.00,  'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600', 'New',              'Hot-swappable, RGB, brown switches.', 'alice');

-- ---------------------------------------------------------------------------
-- Auctions (item_id is unique per auction)
--   1-5 Active, 6 Closed (won by erin), 7 Active no bids yet.
-- ---------------------------------------------------------------------------
INSERT INTO auction (auction_id, item_id, seller_login, current_highest_bid, auction_status, winner_login) VALUES
    (1, 1, 'alice', 1025.00, 'Active', NULL),
    (2, 2, 'alice', 205.00,  'Active', NULL),
    (3, 3, 'bob',   55.00,   'Active', NULL),
    (4, 4, 'bob',   0.00,    'Active', NULL),
    (5, 5, 'carol', 135.00,  'Active', NULL),
    (6, 6, 'carol', 360.00,  'Closed', 'erin'),
    (7, 7, 'alice', 0.00,    'Active', NULL);

-- ---------------------------------------------------------------------------
-- Bids (each strictly greater than the previous highest for that auction)
-- ---------------------------------------------------------------------------
INSERT INTO bid (bid_id, auction_id, buyer_login, bid_amount, bid_timestamp) VALUES
    (1, 1, 'dave',  950.00,  '2026-05-20 10:00:00'),
    (2, 1, 'grace', 1000.00, '2026-05-20 11:30:00'),
    (3, 1, 'dave',  1025.00, '2026-05-21 09:15:00'),
    (4, 2, 'grace', 190.00,  '2026-05-22 14:00:00'),
    (5, 2, 'dave',  205.00,  '2026-05-22 16:45:00'),
    (6, 3, 'erin',  50.00,   '2026-05-23 08:00:00'),
    (7, 3, 'frank', 55.00,   '2026-05-23 12:20:00'),
    (8, 5, 'frank', 130.00,  '2026-05-24 18:00:00'),
    (9, 5, 'erin',  135.00,  '2026-05-25 19:30:00'),
    (10, 6, 'frank', 320.00, '2026-05-10 09:00:00'),
    (11, 6, 'erin',  360.00, '2026-05-12 21:00:00');

-- ---------------------------------------------------------------------------
-- Payment for the closed auction (won by erin)
-- ---------------------------------------------------------------------------
INSERT INTO payment (payment_id, auction_id, buyer_login, amount, payment_status) VALUES
    (1, 6, 'erin', 360.00, 'Completed');

-- ---------------------------------------------------------------------------
-- Shipment for the paid auction
-- ---------------------------------------------------------------------------
INSERT INTO shipment (shipment_id, auction_id, address, shipment_status, tracking_number) VALUES
    (1, 6, '9 Cedar Ln, Fresno CA', 'Shipped', '1Z999AA10123456784');
