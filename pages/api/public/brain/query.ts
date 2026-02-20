import type { NextApiRequest, NextApiResponse } from 'next';
import { queryBrain } from '@/lib/gemini';
import { KnowledgeItem } from '@/types';
import { getRelevantKnowledgeItems } from '@/lib/semantic';

// Public API endpoint - GET /api/public/brain/query?q=your+question
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const originHeader = req.headers.origin;
  const allowedOrigins = (process.env.PUBLIC_BRAIN_ALLOWED_ORIGINS || '')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);

  if (originHeader && allowedOrigins.includes(originHeader)) {
    res.setHeader('Access-Control-Allow-Origin', originHeader);
  }

  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!process.env.PUBLIC_BRAIN_API_KEY) {
    return res.status(500).json({
      error: 'Public API key is not configured. Set PUBLIC_BRAIN_API_KEY.',
      code: 'PUBLIC_API_CONFIG_ERROR',
    });
  }

  if (originHeader && !allowedOrigins.includes(originHeader)) {
    return res.status(403).json({
      error: 'Origin is not allowed for public brain API.',
      code: 'PUBLIC_API_ORIGIN_FORBIDDEN',
    });
  }

  const providedApiKey = req.headers['x-api-key'];
  if (providedApiKey !== process.env.PUBLIC_BRAIN_API_KEY) {
    return res.status(401).json({
      error: 'Invalid public API key.',
      code: 'PUBLIC_API_UNAUTHORIZED',
    });
  }

  const userQuery = req.method === 'GET' 
    ? req.query.q as string 
    : req.body?.query;

  if (!userQuery?.trim()) {
    return res.status(400).json({
      error: 'Query parameter "q" is required',
      example: '/api/public/brain/query?q=what+do+I+know+about+AI',
    });
  }

  try {
    const items = await getRelevantKnowledgeItems({
      queryText: userQuery,
      limit: 50,
    });

    const { answer, sourceIds } = await queryBrain(userQuery, items);

    const sources = items
      .filter(item => sourceIds.includes(item.id))
      .map(item => ({
        id: item.id,
        title: item.title,
        summary: item.summary,
        tags: item.tags,
      }));

    return res.status(200).json({
      query: userQuery,
      answer,
      sources,
      total_knowledge_items: items.length,
      timestamp: new Date().toISOString(),
    });
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
