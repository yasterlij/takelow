CREATE TABLE bids_partitioned (LIKE bids INCLUDING ALL) PARTITION BY RANGE (bid_time);

CREATE TABLE bids_2026_q3 PARTITION OF bids_partitioned FOR VALUES FROM ('2026-07-01') TO ('2026-10-01');

CREATE INDEX CONCURRENTLY idx_bids_auction_active ON bids (auction_id, amount);
