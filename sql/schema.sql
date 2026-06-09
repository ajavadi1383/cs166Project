
DROP TABLE IF EXISTS shipment CASCADE;
DROP TABLE IF EXISTS payment CASCADE;
DROP TABLE IF EXISTS bid CASCADE;
DROP TABLE IF EXISTS auction CASCADE;
DROP TABLE IF EXISTS item CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ----------------------------------------------------------------------------
-- USER
-- A person who can access the platform. Role drives permissions.
-- UNIQUE(login, role) lets other tables reference a user *and* assert a role
-- through a composite foreign key (e.g. a seller_login must be a 'Seller').
-- ----------------------------------------------------------------------------
CREATE TABLE users (
    login VARCHAR(50) PRIMARY KEY,
    password VARCHAR(100) NOT NULL,
    phone_num VARCHAR(20) NOT NULL,
    address VARCHAR(255) NOT NULL,
    role VARCHAR(10) NOT NULL DEFAULT 'Buyer'
        CHECK (role IN ('Buyer', 'Seller', 'Admin')),
    favorite_category VARCHAR(50),
    UNIQUE (login, role)
);

-- ----------------------------------------------------------------------------
-- ITEM
-- A product listed for auction. Owned by a Seller (enforced via composite FK).
-- ----------------------------------------------------------------------------
CREATE TABLE item (
    item_id INT PRIMARY KEY,
    item_name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    starting_price NUMERIC(10,2) NOT NULL CHECK (starting_price >= 0),
    image_url VARCHAR(255),
    item_condition VARCHAR(50),
    description TEXT,

    seller_login VARCHAR(50) NOT NULL,
    seller_role VARCHAR(10) NOT NULL DEFAULT 'Seller' CHECK (seller_role = 'Seller'),
    FOREIGN KEY (seller_login, seller_role) REFERENCES users(login, role)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

-- ----------------------------------------------------------------------------
-- AUCTION
-- The bidding process for a single item. Starts 'Active', ends 'Closed'.
-- winner_login is set to the highest bidder when the auction is closed.
-- ----------------------------------------------------------------------------
CREATE TABLE auction (
    auction_id INT PRIMARY KEY,
    item_id INT NOT NULL UNIQUE,
    seller_login VARCHAR(50) NOT NULL,
    seller_role VARCHAR(10) NOT NULL DEFAULT 'Seller' CHECK (seller_role = 'Seller'),
    current_highest_bid NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (current_highest_bid >= 0),
    auction_status VARCHAR(20) NOT NULL DEFAULT 'Active'
        CHECK (auction_status IN ('Active', 'Closed')),

    winner_login VARCHAR(50),
    winner_role VARCHAR(10) DEFAULT 'Buyer' CHECK (winner_role = 'Buyer'),

    FOREIGN KEY (item_id) REFERENCES item(item_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    FOREIGN KEY (seller_login, seller_role) REFERENCES users(login, role)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    FOREIGN KEY (winner_login, winner_role) REFERENCES users(login, role)
        ON UPDATE CASCADE
        ON DELETE SET NULL
);

-- ----------------------------------------------------------------------------
-- BID
-- An offer placed by a Buyer on an auction. bid_amount > 0 enforced here;
-- "must beat current highest bid" and "seller cannot bid on own auction" are
-- enforced in the application layer (see app/services).
-- ----------------------------------------------------------------------------
CREATE TABLE bid (
    bid_id INT PRIMARY KEY,
    auction_id INT NOT NULL,
    buyer_login VARCHAR(50) NOT NULL,
    buyer_role VARCHAR(10) NOT NULL DEFAULT 'Buyer' CHECK (buyer_role = 'Buyer'),
    bid_amount NUMERIC(10,2) NOT NULL CHECK (bid_amount > 0),
    bid_timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (auction_id) REFERENCES auction(auction_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    FOREIGN KEY (buyer_login, buyer_role) REFERENCES users(login, role)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

-- ----------------------------------------------------------------------------
-- PAYMENT
-- Payment made by the winning buyer. One payment per auction (UNIQUE).
-- ----------------------------------------------------------------------------
CREATE TABLE payment (
    payment_id INT PRIMARY KEY,
    auction_id INT NOT NULL UNIQUE,
    buyer_login VARCHAR(50) NOT NULL,
    buyer_role VARCHAR(10) NOT NULL DEFAULT 'Buyer' CHECK (buyer_role = 'Buyer'),
    amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
    payment_status VARCHAR(20) NOT NULL DEFAULT 'Pending'
        CHECK (payment_status IN ('Pending', 'Completed', 'Failed')),

    FOREIGN KEY (auction_id) REFERENCES auction(auction_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    FOREIGN KEY (buyer_login, buyer_role) REFERENCES users(login, role)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

-- ----------------------------------------------------------------------------
-- SHIPMENT
-- Delivery created after payment completion. One shipment per auction (UNIQUE).
-- ----------------------------------------------------------------------------
CREATE TABLE shipment (
    shipment_id INT PRIMARY KEY,
    auction_id INT NOT NULL UNIQUE,
    address VARCHAR(255) NOT NULL,
    shipment_status VARCHAR(20) NOT NULL DEFAULT 'Pending'
        CHECK (shipment_status IN ('Pending', 'Shipped', 'Delivered')),
    tracking_number VARCHAR(100),

    FOREIGN KEY (auction_id) REFERENCES auction(auction_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);
