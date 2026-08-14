import { getOrCreateCartId, getCartWithTotal } from "../_lib.mjs";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "GET only" });
  const cartId = await getOrCreateCartId(req, res);
  res.status(200).json(await getCartWithTotal(cartId));
}
