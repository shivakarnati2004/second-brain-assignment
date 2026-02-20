import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { requireSessionUser } from '@/lib/auth';
import type { GraphEdge, GraphNode, KnowledgeItem } from '@/types';

type ItemRow = Pick<KnowledgeItem, 'id' | 'title' | 'type' | 'tags' | 'summary' | 'content'>;

function normalizeTokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(token => token.length >= 4)
    .slice(0, 120);
}

function overlapScore(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0;
  const aSet = new Set(a);
  const bSet = new Set(b);
  let intersection = 0;
  aSet.forEach(token => {
    if (bSet.has(token)) intersection++;
  });
  const unionSet = new Set<string>();
  aSet.forEach(token => unionSet.add(token));
  bSet.forEach(token => unionSet.add(token));
  const union = unionSet.size;
  return union === 0 ? 0 : intersection / union;
}

function buildEdges(items: ItemRow[]): GraphEdge[] {
  const edges: GraphEdge[] = [];

  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const left = items[i];
      const right = items[j];

      const tagScore = overlapScore(left.tags || [], right.tags || []);
      const leftTokens = normalizeTokens(`${left.title} ${left.summary || ''} ${left.content}`);
      const rightTokens = normalizeTokens(`${right.title} ${right.summary || ''} ${right.content}`);
      const tokenScore = overlapScore(leftTokens, rightTokens);

      const score = Number((tagScore * 0.65 + tokenScore * 0.35).toFixed(3));
      if (score < 0.18) continue;

      const reason = tagScore >= tokenScore ? 'Tag similarity' : 'Content similarity';
      edges.push({
        id: `${left.id}-${right.id}`,
        source: left.id,
        target: right.id,
        weight: score,
        reason,
      });
    }
  }

  return edges
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 220);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await requireSessionUser(req, res);
  if (!user) return;

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const requestedLimit = Number(req.query.limit || 90);
    const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 20), 200) : 90;

    const items = await query<ItemRow>(
      `SELECT id, title, type, tags, summary, content
       FROM knowledge_items
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [user.id, limit]
    );

    const nodes: GraphNode[] = items.map(item => ({
      id: item.id,
      label: item.title,
      type: item.type,
      tags: item.tags || [],
    }));

    const edges = buildEdges(items);

    return res.status(200).json({ data: { nodes, edges } });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to load graph data' });
  }
}
