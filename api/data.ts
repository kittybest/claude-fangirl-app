import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const DATA_KEY = 'fangirl:data';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    try {
      const data = await redis.get(DATA_KEY);
      if (!data) return res.status(200).json({ shows: [], schedules: [], expenses: [], series: [] });
      const parsed = typeof data === 'string' ? JSON.parse(data) : data;
      return res.status(200).json(parsed);
    } catch (err) {
      console.error('Failed to get data:', err);
      return res.status(500).json({ error: 'Failed to get data' });
    }
  }

  if (req.method === 'PUT') {
    try {
      const { shows, schedules, expenses, series } = req.body;
      await redis.set(DATA_KEY, JSON.stringify({ shows, schedules, expenses, series: series || [] }));
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error('Failed to save data:', err);
      return res.status(500).json({ error: 'Failed to save data' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
