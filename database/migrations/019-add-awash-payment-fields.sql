-- Add Awash Bank wallet payment fields to payment_transactions
-- Depends on: previous migration that created payment_transactions

ALTER TABLE payment_transactions
  ADD COLUMN IF NOT EXISTS awash_payment_url VARCHAR,
  ADD COLUMN IF NOT EXISTS awash_transaction_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS gateway VARCHAR(50) NOT NULL DEFAULT 'SIKINAPAY',
  ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(50);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_gateway ON payment_transactions (gateway);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_awash_transaction_id ON payment_transactions (awash_transaction_id);