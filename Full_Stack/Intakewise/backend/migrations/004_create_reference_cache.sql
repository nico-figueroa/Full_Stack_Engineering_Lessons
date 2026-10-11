CREATE TABLE reference_cache (
  id SERIAL PRIMARY KEY,
  item_name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  source TEXT NOT NULL, -- 'dailymed', 'nih_supplement', 'fda_srs'
  payload JSONB NOT NULL,
  fetched_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE interaction_cache (
  id SERIAL PRIMARY KEY,
  item_name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  source TEXT NOT NULL, -- 'dailymed', 'nih_supplement', 'internal'
  warnings JSONB NOT NULL,
  fetched_at TIMESTAMP NOT NULL DEFAULT NOW()
);
