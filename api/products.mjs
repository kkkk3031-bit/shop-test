import { sql } from "./_lib.mjs";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "GET only" });
  const products = await sql`
    SELECT id, slug, name, category, icon, price_cents, was_cents, bg
    FROM products ORDER BY id
  `;
  res.setHeader("Cache-Control", "public, max-age=30, stale-while-revalidate=300");
  res.status(200).json({ products });
}
