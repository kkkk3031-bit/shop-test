import { sql, getOrCreateCartId, getCartWithTotal, readJsonBody } from "../_lib.mjs";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const body = await readJsonBody(req);
  const productId = parseInt(body.productId, 10);
  const delta = Number.isInteger(body.qty) ? body.qty : 1;
  if (!Number.isInteger(productId)) {
    return res.status(400).json({ error: "productId (integer) required" });
  }

  const [product] = await sql`SELECT id FROM products WHERE id = ${productId}`;
  if (!product) return res.status(404).json({ error: "Unknown product" });

  const cartId = await getOrCreateCartId(req, res);
  await sql`
    INSERT INTO cart_items (cart_id, product_id, qty)
    VALUES (${cartId}, ${productId}, GREATEST(${delta}, 1))
    ON CONFLICT (cart_id, product_id)
    DO UPDATE SET qty = cart_items.qty + GREATEST(${delta}, 1)
  `;
  res.status(200).json(await getCartWithTotal(cartId));
}
