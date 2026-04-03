// api/shopify.js — Atelier Weaves MRP v3.3
// Proxy sécurisé Vercel → Shopify Admin API
// Variables d'environnement requises : SHOPIFY_CLIENT_ID, SHOPIFY_CLIENT_SECRET

const SHOP = 'atelier-weaves.myshopify.com';
const API_VERSION = '2025-01';

let cachedToken = null;
let tokenExpiry = 0;

async function getAccessToken() {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;

  const res = await fetch(`https://${SHOP}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.SHOPIFY_CLIENT_ID,
      client_secret: process.env.SHOPIFY_CLIENT_SECRET,
      grant_type: 'client_credentials',
    }),
  });

  if (!res.ok) throw new Error(`Token error: ${res.status}`);
  const data = await res.json();
  cachedToken = data.access_token;
  tokenExpiry = Date.now() + 23 * 60 * 60 * 1000; // 23h
  return cachedToken;
}

async function shopifyFetch(path, token) {
  const res = await fetch(`https://${SHOP}/admin/api/${API_VERSION}/${path}`, {
    headers: {
      'X-Shopify-Access-Token': token,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) throw new Error(`Shopify API error: ${res.status} on ${path}`);
  return res.json();
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { endpoint } = req.query;

  try {
    const token = await getAccessToken();

    // ── Produits (page 1) ──────────────────────────────────────
    if (endpoint === 'products') {
      const data = await shopifyFetch(
        'products.json?limit=250&status=active&fields=id,title,status,variants,tags',
        token
      );
      return res.status(200).json(data);
    }

    // ── Produits (page 2 si >250) ──────────────────────────────
    if (endpoint === 'products2') {
      // Récupère les 250 suivants via page_info (simplification : on refetch avec since_id)
      const first = await shopifyFetch(
        'products.json?limit=250&status=active&fields=id,title,status,variants,tags',
        token
      );
      if (!first.products || first.products.length < 250) {
        return res.status(200).json({ products: [] });
      }
      const lastId = first.products[first.products.length - 1].id;
      const second = await shopifyFetch(
        `products.json?limit=250&status=active&fields=id,title,status,variants,tags&since_id=${lastId}`,
        token
      );
      return res.status(200).json(second);
    }

    // ── Commandes ─────────────────────────────────────────────
    if (endpoint === 'orders') {
      // Récupère les 250 dernières commandes (tous statuts)
      const data = await shopifyFetch(
        'orders.json?limit=250&status=any&fields=id,name,order_number,created_at,financial_status,fulfillment_status,total_price,billing_address,line_items,tags',
        token
      );
      return res.status(200).json(data);
    }

    // ── Inventaire d'un variant ────────────────────────────────
    if (endpoint === 'inventory') {
      const { variant_id } = req.query;
      if (!variant_id) return res.status(400).json({ error: 'variant_id requis' });
      const data = await shopifyFetch(
        `variants/${variant_id}.json?fields=id,inventory_quantity,sku`,
        token
      );
      return res.status(200).json(data);
    }

    return res.status(400).json({ error: `Endpoint inconnu : ${endpoint}` });

  } catch (err) {
    console.error('[Shopify Proxy]', err.message);
    return res.status(500).json({ error: err.message });
  }
}
