import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { requireSessionUser } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const user = await requireSessionUser(req, res);
  if (!user) return;

  try {
    const [counts] = await query<any>(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE type = 'note') as notes,
        COUNT(*) FILTER (WHERE type = 'link') as links,
        COUNT(*) FILTER (WHERE type = 'insight') as insights,
        COUNT(*) FILTER (WHERE type = 'article') as articles,
        COUNT(*) FILTER (WHERE ai_processed = TRUE) as ai_processed
      FROM knowledge_items
      WHERE user_id = $1
    `, [user.id]);

    const tags = await query<any>(`
      SELECT UNNEST(tags) as tag, COUNT(*) as count 
      FROM knowledge_items 
      WHERE user_id = $1
      GROUP BY tag 
      ORDER BY count DESC 
      LIMIT 20
    `, [user.id]);

    return res.status(200).json({
      data: {
        counts: {
          total: parseInt(counts.total),
          notes: parseInt(counts.notes),
          links: parseInt(counts.links),
          insights: parseInt(counts.insights),
          articles: parseInt(counts.articles),
          ai_processed: parseInt(counts.ai_processed),
        },
        top_tags: tags.map(t => ({ tag: t.tag, count: parseInt(t.count) })),
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
