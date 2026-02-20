import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { KnowledgeItem } from '@/types';
import { requireSessionUser } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  const user = await requireSessionUser(req, res);
  if (!user) return;

  if (req.method === 'GET') {
    try {
      const [item] = await query<KnowledgeItem>(
        'SELECT * FROM knowledge_items WHERE id = $1 AND user_id = $2',
        [id, user.id]
      );
      if (!item) return res.status(404).json({ error: 'Not found' });
      return res.status(200).json({ data: item });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'DELETE') {
    try {
      await query('DELETE FROM knowledge_items WHERE id = $1 AND user_id = $2', [id, user.id]);
      return res.status(200).json({ message: 'Deleted successfully' });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'PATCH') {
    try {
      const { title, content, tags, source_url, metadata } = req.body;

      const safeMetadata = metadata && typeof metadata === 'object'
        ? {
            source_name: metadata.source_name || null,
            captured_at: metadata.captured_at || null,
            custom: metadata.custom && typeof metadata.custom === 'object' ? metadata.custom : {},
          }
        : null;

      const [item] = await query<KnowledgeItem>(
        `UPDATE knowledge_items 
         SET title = COALESCE($1, title),
             content = COALESCE($2, content),
             tags = COALESCE($3, tags),
             source_url = COALESCE($4, source_url),
             source_name = COALESCE($5, source_name),
             captured_at = COALESCE($6, captured_at),
             metadata = COALESCE($7, metadata),
             updated_at = NOW()
         WHERE id = $8 AND user_id = $9
         RETURNING *`,
        [
          title,
          content,
          tags,
          source_url,
          safeMetadata?.source_name ?? null,
          safeMetadata?.captured_at ?? null,
          safeMetadata ? JSON.stringify(safeMetadata) : null,
          id,
          user.id,
        ]
      );
      return res.status(200).json({ data: item });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  res.setHeader('Allow', ['GET', 'DELETE', 'PATCH']);
  return res.status(405).json({ error: 'Method not allowed' });
}
