import { query } from '@/lib/db';
import { generateEmbedding } from '@/lib/gemini';
import { KnowledgeItem } from '@/types';

let vectorSupportChecked = false;
let vectorSupported = false;

async function checkVectorSupport(): Promise<boolean> {
  if (vectorSupportChecked) return vectorSupported;

  try {
    const [result] = await query<{ exists: boolean }>(
      `SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'knowledge_items'
          AND column_name = 'embedding'
      ) as exists`
    );

    vectorSupported = !!result?.exists;
  } catch {
    vectorSupported = false;
  } finally {
    vectorSupportChecked = true;
  }

  return vectorSupported;
}

function toVectorLiteral(values: number[]): string {
  return `[${values.join(',')}]`;
}

export async function getRelevantKnowledgeItems(options: {
  queryText: string;
  userId?: string;
  limit?: number;
}): Promise<KnowledgeItem[]> {
  const { queryText, userId, limit = 50 } = options;
  const trimmedQuery = queryText.trim();

  const lexicalItems = trimmedQuery
    ? await query<KnowledgeItem>(
        `SELECT id, user_id, title, content, summary, tags, type, source_url, metadata, ai_processed, created_at, updated_at
         FROM knowledge_items
         WHERE ${userId ? 'user_id = $1 AND' : ''}
           (title ILIKE $${userId ? 2 : 1} OR content ILIKE $${userId ? 2 : 1} OR COALESCE(summary, '') ILIKE $${userId ? 2 : 1})
         ORDER BY updated_at DESC
         LIMIT ${limit}`,
        userId ? [userId, `%${trimmedQuery}%`] : [`%${trimmedQuery}%`]
      )
    : [];

  const where = userId ? 'WHERE user_id = $1' : '';
  const whereParams = userId ? [userId] : [];

  const fallbackItems = await query<KnowledgeItem>(
    `SELECT id, user_id, title, content, summary, tags, type, source_url, metadata, ai_processed, created_at, updated_at
     FROM knowledge_items
     ${where}
     ORDER BY created_at DESC
     LIMIT ${limit}`,
    whereParams
  );

  if (!trimmedQuery) return fallbackItems;

  const supportsVectors = await checkVectorSupport();
  if (!supportsVectors) {
    return lexicalItems.length > 0 ? lexicalItems : fallbackItems;
  }

  try {
    const embedding = await generateEmbedding(trimmedQuery);
    if (!embedding.length) return fallbackItems;

    const vectorLiteral = toVectorLiteral(embedding);
    const semanticItems = await query<KnowledgeItem>(
      `SELECT id, user_id, title, content, summary, tags, type, source_url, metadata, ai_processed, created_at, updated_at
       FROM knowledge_items
       WHERE ${userId ? 'user_id = $1 AND' : ''} embedding IS NOT NULL
       ORDER BY embedding <=> $${userId ? 2 : 1}::vector
       LIMIT ${limit}`,
      userId ? [userId, vectorLiteral] : [vectorLiteral]
    );

    if (semanticItems.length > 0) {
      const merged = [...semanticItems];
      for (const lexicalItem of lexicalItems) {
        if (!merged.find(item => item.id === lexicalItem.id)) {
          merged.push(lexicalItem);
        }
        if (merged.length >= limit) break;
      }
      return merged.slice(0, limit);
    }
  } catch {
    return lexicalItems.length > 0 ? lexicalItems : fallbackItems;
  }

  return lexicalItems.length > 0 ? lexicalItems : fallbackItems;
}
