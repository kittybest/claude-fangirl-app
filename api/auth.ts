import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'POST') {
    const { password } = req.body;
    const correct = process.env.APP_PASSWORD;
    if (!correct) return res.status(500).json({ error: 'Password not configured' });
    return res.status(200).json({ ok: password === correct });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
