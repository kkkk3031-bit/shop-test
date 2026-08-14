// Applies schema.sql then seeds the 8 demo products (idempotent — safe to re-run).
import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";

const sql = neon(process.env.DATABASE_URL);

const PRODUCTS = [
  { slug: "aero-headphones", icon: "🎧", cat: "Audio", name: "Aero Wireless Headphones", price: 7900, was: 9900, bg: "linear-gradient(135deg,#1e2538,#0e1320)" },
  { slug: "pulse-watch", icon: "⌚", cat: "Wearables", name: "Pulse Smart Watch", price: 12900, was: null, bg: "linear-gradient(135deg,#161c2c,#0a0d17)" },
  { slug: "voyage-backpack", icon: "🎒", cat: "Bags", name: "Voyage Daily Backpack", price: 5400, was: 6800, bg: "linear-gradient(135deg,#1e2538,#0e1320)" },
  { slug: "nova-grooming-kit", icon: "🧴", cat: "Care", name: "Nova Grooming Kit", price: 3200, was: null, bg: "linear-gradient(135deg,#161c2c,#0a0d17)" },
  { slug: "glow-lamp", icon: "💡", cat: "Home", name: "Glow Ambient Lamp", price: 4100, was: null, bg: "linear-gradient(135deg,#1e2538,#0e1320)" },
  { slug: "drift-sunglasses", icon: "🕶️", cat: "Accessories", name: "Drift Sunglasses", price: 3800, was: 4900, bg: "linear-gradient(135deg,#161c2c,#0a0d17)" },
  { slug: "mech-keyboard", icon: "⌨️", cat: "Tech", name: "Mech Compact Keyboard", price: 8900, was: null, bg: "linear-gradient(135deg,#1e2538,#0e1320)" },
  { slug: "stride-sneakers", icon: "👟", cat: "Footwear", name: "Stride Runner Sneakers", price: 7400, was: 9500, bg: "linear-gradient(135deg,#161c2c,#0a0d17)" },
];

async function main() {
  const schema = readFileSync(new URL("./schema.sql", import.meta.url), "utf8");
  // Neon's http driver runs one statement per call — split on semicolons.
  for (const stmt of schema.split(";").map(s => s.trim()).filter(Boolean)) {
    await sql.query(stmt);
  }
  console.log("schema applied");

  for (const p of PRODUCTS) {
    await sql`
      INSERT INTO products (slug, name, category, icon, price_cents, was_cents, bg)
      VALUES (${p.slug}, ${p.name}, ${p.cat}, ${p.icon}, ${p.price}, ${p.was}, ${p.bg})
      ON CONFLICT (slug) DO UPDATE SET
        name = EXCLUDED.name, category = EXCLUDED.category, icon = EXCLUDED.icon,
        price_cents = EXCLUDED.price_cents, was_cents = EXCLUDED.was_cents, bg = EXCLUDED.bg
    `;
  }
  const { length } = await sql`SELECT id FROM products`;
  console.log(`seeded — ${length} products in db`);
}

main().catch((e) => { console.error(e); process.exit(1); });
