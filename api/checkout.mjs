import { sql, getOrCreateCartId } from "./_lib.mjs";

// Real checkout: snapshots cart -> order (+ order_items with price-at-purchase)
// -> clears the cart, all in one statement via CTEs so it's atomic even
// though Neon's HTTP driver doesn't support multi-roundtrip transactions.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const cartId = await getOrCreateCartId(req, res);

  const [{ count }] = await sql`
    SELECT COUNT(*)::int AS count FROM cart_items WHERE cart_id = ${cartId}
  `;
  if (count === 0) return res.status(400).json({ error: "Cart is empty" });

  const [order] = await sql`
    WITH cart_snapshot AS (
      SELECT ci.product_id, ci.qty, p.price_cents
      FROM cart_items ci JOIN products p ON p.id = ci.product_id
      WHERE ci.cart_id = ${cartId}
    ),
    new_order AS (
      INSERT INTO orders (cart_id, total_cents)
      SELECT ${cartId}, COALESCE(SUM(qty * price_cents), 0) FROM cart_snapshot
      RETURNING id, total_cents, created_at
    ),
    inserted_items AS (
      INSERT INTO order_items (order_id, product_id, qty, price_cents)
      SELECT (SELECT id FROM new_order), product_id, qty, price_cents FROM cart_snapshot
      RETURNING 1
    ),
    cleared AS (
      DELETE FROM cart_items WHERE cart_id = ${cartId} RETURNING 1
    )
    SELECT id, total_cents, created_at FROM new_order
  `;

  res.status(200).json({ order_id: order.id, total_cents: order.total_cents, created_at: order.created_at });
}
