ALTER TABLE users ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user'
  CHECK (role IN ('admin', 'user'));

ALTER TABLE items ADD COLUMN IF NOT EXISTS interaction_profile JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE items ADD COLUMN IF NOT EXISTS reference_data JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE items ADD COLUMN IF NOT EXISTS warnings JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE items ADD COLUMN IF NOT EXISTS notes TEXT;

ALTER TABLE schedule_overrides ADD COLUMN IF NOT EXISTS is_skipped BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE schedule_overrides ALTER COLUMN item_id SET NOT NULL;
ALTER TABLE schedule_overrides ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE schedule_overrides DROP CONSTRAINT IF EXISTS schedule_overrides_item_id_fkey;
ALTER TABLE schedule_overrides ADD CONSTRAINT schedule_overrides_item_id_fkey
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE;
CREATE UNIQUE INDEX IF NOT EXISTS schedule_overrides_item_date_time_idx
  ON schedule_overrides(item_id, date, time);
CREATE INDEX IF NOT EXISTS items_user_id_idx ON items(user_id);
CREATE INDEX IF NOT EXISTS overrides_user_date_idx ON schedule_overrides(user_id, date);
CREATE INDEX IF NOT EXISTS reference_cache_name_fetched_idx ON reference_cache(normalized_name, fetched_at DESC);
CREATE INDEX IF NOT EXISTS interaction_cache_name_fetched_idx ON interaction_cache(normalized_name, fetched_at DESC);
