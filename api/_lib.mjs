// Shared helpers for every /api/* function — Neon client + cart-cookie handling.
import { neon } from "@neondatabase/serverless";

export const sql = neon(process.env.DATABASE_URL);

// Parses the raw Cookie header (Vercel Node functions don't do this for you).
export function getCookie(req, name) {
  const header = req.headers.cookie || "";
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return null;
}

// Ensures a cart row exists for this visitor, creating one + setting the
// cookie on first visit. Returns the cart id either way.
export async function getOrCreateCartId(req, res) {
  const existing = getCookie(req, "cart_id");
  if (existing) {
    const [row] = await sql`SELECT id FROM carts WHERE id = ${existing}`;
    if (row) return existing;
  }
  const [row] = await sql`INSERT INTO carts DEFAULT VALUES RETURNING id`;
  res.setHeader(
    "Set-Cookie",
    `cart_id=${row.id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`,
  );
  return row.id;
}

export async function readJsonBody(req) {
  if (req.body && typeof req.body === "object") return req.body; // Vercel may auto-parse
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

export async function getCartWithTotal(cartId) {
  const items = await sql`
    SELECT ci.product_id, ci.qty, p.slug, p.name, p.icon, p.price_cents, p.bg
    FROM cart_items ci JOIN products p ON p.id = ci.product_id
    WHERE ci.cart_id = ${cartId}
    ORDER BY p.id
  `;
  const total_cents = items.reduce((sum, i) => sum + i.qty * i.price_cents, 0);
  return { cart_id: cartId, items, total_cents };
}
