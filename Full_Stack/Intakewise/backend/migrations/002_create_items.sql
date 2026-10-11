CREATE TABLE items (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  dosage_per_intake TEXT,
  frequency TEXT,
  times_of_day TEXT[],
  container_quantity INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
