import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { ChatMessage, ChatSession } from '@/types';
import { requireSessionUser } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { sessionId } = req.query;
  const user = await requireSessionUser(req, res);
  if (!user) return;

  if (typeof sessionId !== 'string') {
    return res.status(400).json({ error: 'Invalid session id' });
  }

  if (req.method === 'GET') {
    try {
      const [session] = await query<ChatSession>(
        `SELECT id, title, created_at, updated_at
         FROM chat_sessions
         WHERE id = $1 AND user_id = $2`,
        [sessionId, user.id]
      );

      if (!session) {
        return res.status(404).json({ error: 'Chat session not found' });
      }

      const messages = await query<ChatMessage>(
        `SELECT id, session_id, role, content, sources, created_at
         FROM chat_messages
         WHERE session_id = $1
         ORDER BY created_at ASC`,
        [sessionId]
      );

      return res.status(200).json({ data: { session, messages } });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to load chat session' });
    }
  }

  res.setHeader('Allow', ['GET']);
  return res.status(405).json({ error: 'Method not allowed' });
}
