import { sql } from "../_lib.mjs";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "GET only" });
  const { id } = req.query;

  const [order] = await sql`SELECT id, total_cents, status, created_at FROM orders WHERE id = ${id}`;
  if (!order) return res.status(404).json({ error: "Order not found" });

  const items = await sql`
    SELECT oi.product_id, oi.qty, oi.price_cents, p.name, p.icon
    FROM order_items oi JOIN products p ON p.id = oi.product_id
    WHERE oi.order_id = ${id}
  `;
  res.status(200).json({ ...order, items });
}
