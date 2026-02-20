import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { summarizeContent, generateTags, generateEmbedding } from '@/lib/gemini';
import { KnowledgeItem, CreateKnowledgeItem } from '@/types';
import { requireSessionUser } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await requireSessionUser(req, res);
  if (!user) return;

  if (req.method === 'GET') {
    try {
      const { search, type, tags, sort = 'created_at', sourceName } = req.query;

      let sql = 'SELECT * FROM knowledge_items WHERE user_id = $1';
      const params: any[] = [user.id];

      if (search) {
        params.push(`%${search}%`);
        sql += ` AND (title ILIKE $${params.length} OR content ILIKE $${params.length} OR summary ILIKE $${params.length})`;
      }

      if (type && type !== 'all') {
        params.push(type);
        sql += ` AND type = $${params.length}`;
      }

      if (tags) {
        const tagArray = Array.isArray(tags) ? tags : [tags];
        params.push(tagArray);
        sql += ` AND tags && $${params.length}`;
      }

      if (sourceName) {
        params.push(`%${sourceName}%`);
        sql += ` AND source_name ILIKE $${params.length}`;
      }

      const sortField = sort === 'title' ? 'title' : 'created_at';
      const sortDir = sort === 'title' ? 'ASC' : 'DESC';
      sql += ` ORDER BY ${sortField} ${sortDir}`;

      const items = await query<KnowledgeItem>(sql, params);
      return res.status(200).json({ data: items });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const { title, content, type, tags = [], source_url, metadata = {} }: CreateKnowledgeItem = req.body;

      if (!title || !content || !type) {
        return res.status(400).json({ error: 'Title, content, and type are required' });
      }

      const safeMetadata = {
        source_name: metadata?.source_name || null,
        captured_at: metadata?.captured_at || null,
        custom: metadata?.custom && typeof metadata.custom === 'object' ? metadata.custom : {},
      };

      // Insert basic item first
      const [item] = await query<KnowledgeItem>(
        `INSERT INTO knowledge_items (user_id, title, content, type, tags, source_url, source_name, captured_at, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          user.id,
          title,
          content,
          type,
          tags,
          source_url || null,
          safeMetadata.source_name,
          safeMetadata.captured_at,
          JSON.stringify(safeMetadata),
        ]
      );

      // Process with AI asynchronously (non-blocking for fast response)
      processWithAI(item.id, title, content, tags).catch(console.error);

      return res.status(201).json({ data: item });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ error: 'Method not allowed' });
}

async function processWithAI(id: string, title: string, content: string, existingTags: string[]) {
  try {
    const [summary, aiTags, embedding] = await Promise.all([
      summarizeContent(title, content),
      generateTags(title, content, existingTags),
      generateEmbedding(`${title}\n\n${content}`),
    ]);

    const embeddingLiteral = embedding.length ? `[${embedding.join(',')}]` : null;

    try {
      await query(
        `UPDATE knowledge_items 
         SET summary = $1, tags = $2, embedding = CASE WHEN $3 IS NULL THEN embedding ELSE $3::vector END, ai_processed = TRUE, updated_at = NOW()
         WHERE id = $4`,
        [summary, aiTags, embeddingLiteral, id]
      );
    } catch {
      await query(
        `UPDATE knowledge_items 
         SET summary = $1, tags = $2, ai_processed = TRUE, updated_at = NOW()
         WHERE id = $3`,
        [summary, aiTags, id]
      );
    }
  } catch (err) {
    console.error('AI processing failed for item', id, err);
  }
}
