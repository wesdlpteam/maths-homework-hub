// Path rules and Postgres queries for the document store. `sql` is a Neon tagged-template function.
const SEG = /^[A-Za-z0-9_.:-]{1,120}$/;

export function validPath(p) {
  if (typeof p !== "string") return false;
  const parts = p.split("/");
  return parts.length >= 1 && parts.length <= 6 && parts.every(s => SEG.test(s) && s !== "." && s !== "..");
}
export const isDocPath = p => validPath(p) && p.split("/").length % 2 === 0;
export const isCollectionPath = p => validPath(p) && p.split("/").length % 2 === 1;

const idOf = path => path.slice(path.lastIndexOf("/") + 1);
const toDoc = r => ({ id: idOf(r.path), data: r.data });

export function makeStore(sql) {
  return {
    async init() {
      await sql`CREATE TABLE IF NOT EXISTS docs (path TEXT PRIMARY KEY, data JSONB NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT now())`;
    },
    async get(path) {
      const rows = await sql`SELECT path, data FROM docs WHERE path = ${path}`;
      return rows[0] ? toDoc(rows[0]) : null;
    },
    // Direct children only: starts_with avoids LIKE wildcards; no slash after the prefix.
    async list(coll) {
      const prefix = coll + "/";
      const rows = await sql`SELECT path, data FROM docs WHERE starts_with(path, ${prefix}) AND position('/' in substr(path, length(${prefix}) + 1)) = 0 ORDER BY path`;
      return rows.map(toDoc);
    },
    async set(path, data) {
      await sql`INSERT INTO docs (path, data) VALUES (${path}, ${JSON.stringify(data)}::jsonb) ON CONFLICT (path) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`;
    },
    // Shallow merge. Returns false when the doc does not exist.
    async update(path, data) {
      const rows = await sql`UPDATE docs SET data = data || ${JSON.stringify(data)}::jsonb, updated_at = now() WHERE path = ${path} RETURNING path`;
      return rows.length > 0;
    },
    async remove(path) {
      await sql`DELETE FROM docs WHERE path = ${path}`;
    },
  };
}
