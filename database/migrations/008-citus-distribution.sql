-- Citus distribution – must run AFTER all tables are created and BEFORE FK constraints are re-added.
-- Products and OTPs are small reference tables (replicated to all nodes).
-- Users, Auctions, and Bids are distributed by their respective shard keys.
-- Transactions and Favorites are distributed by user_id for co-location with users.

-- Drop foreign keys that would block distribution
ALTER TABLE IF EXISTS auctions DROP CONSTRAINT IF EXISTS fk_auctions_product;
ALTER TABLE IF EXISTS auctions DROP CONSTRAINT IF EXISTS auctions_product_id_fkey;
ALTER TABLE IF EXISTS bids DROP CONSTRAINT IF EXISTS fk_bids_auction;
ALTER TABLE IF EXISTS bids DROP CONSTRAINT IF EXISTS fk_bids_user;
ALTER TABLE IF EXISTS transactions DROP CONSTRAINT IF EXISTS fk_transactions_user;
ALTER TABLE IF EXISTS favorites DROP CONSTRAINT IF EXISTS fk_favorites_auction;
ALTER TABLE IF EXISTS favorites DROP CONSTRAINT IF EXISTS fk_favorites_user;

-- Reference tables (replicated to all nodes)
SELECT create_reference_table('products');
SELECT create_reference_table('otps');

-- Distributed tables
SELECT create_distributed_table('users', 'id');
SELECT create_distributed_table('auctions', 'id');
SELECT create_distributed_table('bids', 'auction_id');
SELECT create_distributed_table('transactions', 'user_id');
SELECT create_distributed_table('favorites', 'user_id');

-- Recreate foreign keys
ALTER TABLE auctions ADD CONSTRAINT auctions_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;
ALTER TABLE bids ADD CONSTRAINT fk_bids_auction FOREIGN KEY (auction_id) REFERENCES auctions(id) ON DELETE CASCADE;
ALTER TABLE bids ADD CONSTRAINT fk_bids_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE transactions ADD CONSTRAINT fk_transactions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE favorites ADD CONSTRAINT fk_favorites_auction FOREIGN KEY (auction_id) REFERENCES auctions(id) ON DELETE CASCADE;
ALTER TABLE favorites ADD CONSTRAINT fk_favorites_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
