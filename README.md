# BidHub — Online Auction & Bidding System

CS166 Phase 3. A full-stack, PostgreSQL-backed auction marketplace (eBay-style)
with Buyer, Seller, and Admin roles.

- **Server:** Python + Flask REST API, raw SQL via `psycopg2`.
- **Client:** Single-page app (HTML/CSS/vanilla JS, ES modules).

## Setup & run

Requires Python 3.9+ and PostgreSQL (tested with PostgreSQL 16 via Homebrew).

```bash
cd Project

python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

source startPostgreSQL.sh          # start the local PostgreSQL server
source createPostgreDB.sh          # create auction_db + load schema, indexes & sample data

python run.py                 # serves http://localhost:5050
```

Stop the database with ` source stopPostgreSQL.sh` when finished.

> The scripts assume PostgreSQL 16 from Homebrew (`/opt/homebrew/opt/postgresql@16`).
> Edit the paths at the top of the scripts if your install differs, or run the
> equivalent `createdb` / `psql -f` commands by hand.

## Demo accounts

Password is `password123` for every account.

| Login   | Role   | Use it to…                              |
|---------|--------|------------------------------------------|
| `admin` | Admin  | Manage users, payments, shipments        |
| `alice` | Seller | Create items, list & end auctions        |
| `dave`  | Buyer  | Place bids, win auctions, pay & ship      |

## What each role can do

- **Buyer** (default for new accounts): browse/search auctions, place bids
  (must beat the current highest bid, can't bid on own auction), track bids, and
  pay + arrange shipment for auctions won.
- **Seller**: create items, list them as auctions, monitor bids, end an auction
  at any time (highest bidder wins), and update shipment status/tracking.
- **Admin**: change user roles, delete users, and adjust any payment or shipment
  status.

## Design notes

- **Concurrency:** placing a bid and ending an auction run in a transaction with
  `SELECT … FOR UPDATE` on the auction row, so concurrent bids can't both win
  against a stale highest bid.
- **Indexes** (`sql/indexes.sql`) cover the hottest paths: auction status/seller,
  item category and name search, and a `bid(auction_id, bid_amount DESC)`
  composite for highest-bid and history lookups.
- **Plain-text passwords** and **`MAX(id)+1` integer IDs** are kept deliberately
  to match the provided schema; production would use hashing and sequences.
- A user has exactly one role. Because of the composite foreign keys, a role
  change is rejected (with a clear message) while the user still owns rows that
  assert the old role — e.g. a Seller who still has items.
```