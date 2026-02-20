import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { queryBrain } from '@/lib/gemini';
import { KnowledgeItem } from '@/types';
import { requireSessionUser } from '@/lib/auth';
import { getRelevantKnowledgeItems } from '@/lib/semantic';

function buildFallbackAnswer(userQuery: string, items: KnowledgeItem[]): { answer: string; sourceIds: string[] } {
  if (!items.length) {
    return {
      answer: 'I could not generate an AI response right now, but your knowledge base appears empty. Add some notes and try again.',
      sourceIds: [],
    };
  }

  const topItems = items.slice(0, 3);
  const bullets = topItems
    .map(item => `- ${item.title}${item.summary ? `: ${item.summary}` : ''}`)
    .join('\n');

  return {
    answer: `I could not reach the AI model for a full response, but here are the most relevant items for your query ("${userQuery}"):\n${bullets}`,
    sourceIds: topItems.map(item => item.id),
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await requireSessionUser(req, res);
  if (!user) return;

  const { query: userQuery } = req.body;

  if (!userQuery?.trim()) {
    return res.status(400).json({ error: 'Query is required' });
  }

  try {
    const items = await getRelevantKnowledgeItems({
      queryText: userQuery,
      userId: user.id,
      limit: 50,
    });

    let answer = '';
    let sourceIds: string[] = [];

    try {
      const ai = await queryBrain(userQuery, items);
      answer = ai.answer;
      sourceIds = ai.sourceIds;
    } catch {
      const fallback = buildFallbackAnswer(userQuery, items);
      answer = fallback.answer;
      sourceIds = fallback.sourceIds;
    }

    // Store query for history
    await query(
      `INSERT INTO brain_queries (user_id, query, answer, sources) VALUES ($1, $2, $3, $4)`,
      [user.id, userQuery, answer, sourceIds]
    );

    // Get source items
    const sources = sourceIds.length > 0
      ? items.filter(item => sourceIds.includes(item.id))
      : [];

    return res.status(200).json({ data: { answer, sources } });
  } catch (err: any) {
    const message = err instanceof Error ? err.message : 'Unexpected error while querying brain';

    if (message.includes('DATABASE_URL environment variable is not set')) {
      return res.status(500).json({
        error: 'Database is not configured. Set DATABASE_URL in .env.local.',
        code: 'DATABASE_CONFIG_ERROR',
      });
    }

    if (message.includes('relation "knowledge_items" does not exist') || message.includes('relation "brain_queries" does not exist')) {
      return res.status(500).json({
        error: 'Database tables are missing. Run npm run db:init.',
        code: 'DATABASE_SCHEMA_ERROR',
      });
    }

    if (message.toLowerCase().includes('api key') || message.toLowerCase().includes('gemini')) {
      return res.status(500).json({
        error: 'Gemini API is not configured correctly. Check GEMINI_API_KEY.',
        code: 'GEMINI_CONFIG_ERROR',
      });
    }

    return res.status(500).json({
      error: 'Failed to process your query. Please try again.',
      code: 'QUERY_PROCESSING_ERROR',
    });
  }
}
