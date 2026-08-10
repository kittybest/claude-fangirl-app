import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const DATA_KEY = 'fangirl:data';
const BACKUP_KEY = 'fangirl:data:backup-pre-artists';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // Snapshot the current data, but never overwrite an existing snapshot —
  // the point is to keep the state from before the artist migration ran.
  if (req.method === 'POST') {
    try {
      const data = await redis.get(DATA_KEY);
      if (!data) return res.status(400).json({ error: 'No data to back up' });
      const raw = typeof data === 'string' ? data : JSON.stringify(data);
      const result = await redis.set(BACKUP_KEY, raw, { nx: true });
      return res.status(200).json({ ok: true, skipped: result === null });
    } catch (err) {
      console.error('Failed to create backup:', err);
      return res.status(500).json({ error: 'Failed to create backup' });
    }
  }

  if (req.method === 'GET') {
    try {
      const data = await redis.get(BACKUP_KEY);
      if (!data) return res.status(404).json({ error: 'No backup found' });
      const parsed = typeof data === 'string' ? JSON.parse(data) : data;
      return res.status(200).json(parsed);
    } catch (err) {
      console.error('Failed to get backup:', err);
      return res.status(500).json({ error: 'Failed to get backup' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
