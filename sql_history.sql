CREATE TABLE IF NOT EXISTS rsvps (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  attending  INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);


__________________________________________________

CREATE TABLE invites (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  code        TEXT NOT NULL UNIQUE,
  family_name TEXT NOT NULL,
  max_guests  INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT DEFAULT (datetime('now'))
);

ALTER TABLE rsvps ADD COLUMN invite_code TEXT;
ALTER TABLE rsvps ADD COLUMN guest_count INTEGER DEFAULT 1;