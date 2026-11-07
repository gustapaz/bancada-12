CREATE TABLE IF NOT EXISTS benches (
 id TEXT PRIMARY KEY,
 version INTEGER NOT NULL,
 document TEXT NOT NULL,
 expires INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS benches_expiry ON benches(expires);
