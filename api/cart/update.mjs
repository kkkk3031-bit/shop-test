import { sql, getOrCreateCartId, getCartWithTotal, readJsonBody } from "../_lib.mjs";

// Sets an exact quantity (qty <= 0 removes the item entirely).
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const body = await readJsonBody(req);
  const productId = parseInt(body.productId, 10);
  const qty = parseInt(body.qty, 10);
  if (!Number.isInteger(productId) || !Number.isInteger(qty)) {
    return res.status(400).json({ error: "productId and qty (integers) required" });
  }

  const cartId = await getOrCreateCartId(req, res);
  if (qty <= 0) {
    await sql`DELETE FROM cart_items WHERE cart_id = ${cartId} AND product_id = ${productId}`;
  } else {
    const [product] = await sql`SELECT id FROM products WHERE id = ${productId}`;
    if (!product) return res.status(404).json({ error: "Unknown product" });
    await sql`
      INSERT INTO cart_items (cart_id, product_id, qty)
      VALUES (${cartId}, ${productId}, ${qty})
      ON CONFLICT (cart_id, product_id) DO UPDATE SET qty = ${qty}
    `;
  }
  res.status(200).json(await getCartWithTotal(cartId));
}
