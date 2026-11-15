-- Document store for the Hub (class sets, versions, library). Run once in Neon; the API also creates it on first call.
CREATE TABLE IF NOT EXISTS docs (path TEXT PRIMARY KEY, data JSONB NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
