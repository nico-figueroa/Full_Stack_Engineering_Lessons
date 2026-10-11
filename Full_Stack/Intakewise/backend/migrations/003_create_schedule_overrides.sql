CREATE TABLE schedule_overrides (
  id SERIAL PRIMARY KEY,
  item_id INTEGER REFERENCES items(id),
  user_id INTEGER REFERENCES users(id),
  date DATE NOT NULL,
  time TEXT NOT NULL,
  dosage TEXT,
  notes TEXT
);
