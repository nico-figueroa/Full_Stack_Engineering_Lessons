ALTER TABLE users ADD COLUMN IF NOT EXISTS email_mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_mfa_enabled_at TIMESTAMPTZ;
ALTER TABLE users ALTER COLUMN email SET NOT NULL;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_format_check;
ALTER TABLE users ADD CONSTRAINT users_email_format_check
  CHECK (position('@' in email) > 1);

CREATE TABLE IF NOT EXISTS email_mfa_challenges (
  id UUID PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose TEXT NOT NULL CHECK (purpose IN ('login', 'enrollment')),
  code_hash TEXT NOT NULL,
  attempts SMALLINT NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS email_mfa_challenges_user_purpose_idx
  ON email_mfa_challenges(user_id, purpose, expires_at DESC);
ALTER TABLE email_mfa_challenges ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  passwordless_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO passwordless_count
  FROM users
  WHERE password_hash IS NULL OR btrim(password_hash) = '';

  IF passwordless_count = 1
     AND NOT EXISTS (SELECT 1 FROM users WHERE lower(email) = 'nitem18@hotmail.com') THEN
    UPDATE users
    SET email = 'nitem18@hotmail.com', updated_at = NOW()
    WHERE password_hash IS NULL OR btrim(password_hash) = '';
  ELSIF passwordless_count > 1 THEN
    RAISE NOTICE 'Multiple passwordless Intakewise users exist; assign unique emails manually before enabling password recovery.';
  END IF;
END $$;
