export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { endpoint } = req.query;
  const SHOP = 'atelier-weaves.myshopify.com';
  const CLIENT_ID = process.env.SHOPIFY_CLIENT_ID;
  const CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET;

  try {
    // Étape 1 : Obtenir un token temporaire
    const tokenRes = await fetch(`https://${SHOP}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: 'client_credentials',
      }),
    });
    const { access_token } = await tokenRes.json();

    // Étape 2 : Utiliser le token pour appeler l'API
    const urls = {
      products: `https://${SHOP}/admin/api/2026-01/products.json?limit=250&status=active`,
      orders: `https://${SHOP}/admin/api/2026-01/orders.json?limit=50&status=open`,
    };
    if (!urls[endpoint]) return res.status(400).json({ error: 'Endpoint invalide' });

    const response = await fetch(urls[endpoint], {
      headers: { 'X-Shopify-Access-Token': access_token },
    });
    const data = await response.json();
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
