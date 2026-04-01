export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { endpoint } = req.query;
  const SHOP = 'atelier-weaves.myshopify.com';
  const API_KEY = process.env.SHOPIFY_API_KEY;
  const API_SECRET = process.env.SHOPIFY_API_SECRET;
  const credentials = Buffer.from(`${API_KEY}:${API_SECRET}`).toString('base64');

  const urls = {
    products: `https://${SHOP}/admin/api/2026-01/products.json?limit=250&status=active`,
    orders: `https://${SHOP}/admin/api/2026-01/orders.json?limit=50&status=open`,
  };

  if (!urls[endpoint]) return res.status(400).json({ error: 'Endpoint invalide' });

  try {
    const response = await fetch(urls[endpoint], {
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
    });
    const data = await response.json();
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
