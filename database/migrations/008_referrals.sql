-- Códigos únicos de referido y relación entre clientes referidos.
BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS referral_code VARCHAR(12),
  ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES users(id) ON DELETE SET NULL;

UPDATE users
SET referral_code = upper(encode(gen_random_bytes(6), 'hex'))
WHERE referral_code IS NULL;

ALTER TABLE users
  ALTER COLUMN referral_code SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);
CREATE INDEX IF NOT EXISTS idx_users_referred_by ON users(referred_by);
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_not_self_referred;
ALTER TABLE users ADD CONSTRAINT users_not_self_referred CHECK (referred_by IS NULL OR referred_by <> id);

COMMIT;



