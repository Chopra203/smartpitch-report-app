// api/verify-license.js
// Vercel Serverless Function — SmartPitch Pro License Verification
// Calls the Lemon Squeezy License API server-side so the API key is never exposed to the browser.
// Required env var: LEMONSQUEEZY_API_KEY (set in each Vercel project's Settings → Environment Variables)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ valid: false, error: 'Method not allowed' });

  const { license_key, instance_id, action = 'activate' } = req.body || {};

  if (!license_key || typeof license_key !== 'string') {
    return res.status(400).json({ valid: false, error: 'License key is required.' });
  }

  const API_KEY = process.env.LEMONSQUEEZY_API_KEY;
  if (!API_KEY) {
    console.error('LEMONSQUEEZY_API_KEY env var not set');
    return res.status(500).json({ valid: false, error: 'Server configuration error.' });
  }

  try {
    let endpoint, body;

    if (action === 'validate' && instance_id) {
      endpoint = 'https://api.lemonsqueezy.com/v1/licenses/validate';
      body = { license_key: license_key.trim(), instance_id };
    } else {
      const browserId = instance_id || `sp-web-${Date.now()}`;
      endpoint = 'https://api.lemonsqueezy.com/v1/licenses/activate';
      body = { license_key: license_key.trim(), instance_name: browserId };
    }

    const lsRes = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await lsRes.json();

    const succeeded = data.activated === true || data.valid === true;
    const isActive  = data.license_key?.status === 'active';

    if (succeeded && isActive) {
      return res.status(200).json({ valid: true, instance_id: data.instance?.id || instance_id });
    }

    if (data.license_key?.status && data.license_key.status !== 'active') {
      return res.status(200).json({ valid: false, error: 'Your SmartPitch Pro subscription is no longer active.' });
    }

    return res.status(200).json({ valid: false, error: data.error || 'Invalid license key. Please check and try again.' });

  } catch (err) {
    console.error('License verification error:', err);
    return res.status(500).json({ valid: false, error: 'Verification failed. Check your connection and try again.' });
  }
}
