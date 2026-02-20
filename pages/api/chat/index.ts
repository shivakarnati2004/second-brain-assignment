import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { chatWithBrain } from '@/lib/gemini';
import { ChatMessage, ChatSession, CreateChatRequest, KnowledgeItem } from '@/types';
import { requireSessionUser } from '@/lib/auth';
import { getRelevantKnowledgeItems } from '@/lib/semantic';

function buildFallbackChatAnswer(message: string, knowledgeItems: KnowledgeItem[]) {
  const top = knowledgeItems.slice(0, 3);
  if (!top.length) {
    return {
      answer: 'I could not reach the AI model right now, and your knowledge base is currently empty. Add notes and try again.',
      sourceIds: [] as string[],
    };
  }

  const bullets = top
    .map(item => `- ${item.title}${item.summary ? `: ${item.summary}` : ''}`)
    .join('\n');

  return {
    answer: `I could not reach the AI model for your message ("${message}") right now. Here are relevant items from your knowledge base:\n${bullets}`,
    sourceIds: top.map(item => item.id),
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await requireSessionUser(req, res);
  if (!user) return;

  if (req.method === 'GET') {
    try {
      const sessions = await query<ChatSession>(
        `SELECT id, title, created_at, updated_at
         FROM chat_sessions
         WHERE user_id = $1
         ORDER BY updated_at DESC
         LIMIT 30`,
        [user.id]
      );

      return res.status(200).json({ data: sessions });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to load chat sessions' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { message, sessionId }: CreateChatRequest = req.body;

      if (!message?.trim()) {
        return res.status(400).json({ error: 'Message is required' });
      }

      let activeSessionId = sessionId;
      let session: ChatSession | undefined;

      if (!activeSessionId) {
        const title = message.trim().slice(0, 60);
        const [newSession] = await query<ChatSession>(
          `INSERT INTO chat_sessions (user_id, title)
           VALUES ($1, $2)
           RETURNING id, title, created_at, updated_at`,
          [user.id, title]
        );
        activeSessionId = newSession.id;
        session = newSession;
      } else {
        const [existingSession] = await query<ChatSession>(
          `SELECT id, title, created_at, updated_at
           FROM chat_sessions
           WHERE id = $1 AND user_id = $2`,
          [activeSessionId, user.id]
        );

        if (!existingSession) {
          return res.status(404).json({ error: 'Chat session not found' });
        }
        session = existingSession;
      }

      const history = await query<ChatMessage>(
        `SELECT id, session_id, role, content, sources, created_at
         FROM chat_messages
         WHERE session_id = $1
         ORDER BY created_at ASC
         LIMIT 50`,
        [activeSessionId]
      );

      const knowledgeItems = await getRelevantKnowledgeItems({
        queryText: message.trim(),
        userId: user.id,
        limit: 50,
      });

      let answer = '';
      let sourceIds: string[] = [];

      try {
        const ai = await chatWithBrain(
          message.trim(),
          knowledgeItems,
          history
            .filter(m => m.role === 'user' || m.role === 'assistant')
            .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))
        );
        answer = ai.answer;
        sourceIds = ai.sourceIds;
      } catch {
        const fallback = buildFallbackChatAnswer(message.trim(), knowledgeItems);
        answer = fallback.answer;
        sourceIds = fallback.sourceIds;
      }

      const [userMessage] = await query<ChatMessage>(
        `INSERT INTO chat_messages (session_id, role, content)
         VALUES ($1, 'user', $2)
         RETURNING id, session_id, role, content, sources, created_at`,
        [activeSessionId, message.trim()]
      );

      const [assistantMessage] = await query<ChatMessage>(
        `INSERT INTO chat_messages (session_id, role, content, sources)
         VALUES ($1, 'assistant', $2, $3)
         RETURNING id, session_id, role, content, sources, created_at`,
        [activeSessionId, answer, sourceIds]
      );

      await query(`UPDATE chat_sessions SET updated_at = NOW() WHERE id = $1`, [activeSessionId]);

      const sources = sourceIds.length > 0
        ? knowledgeItems.filter(item => sourceIds.includes(item.id))
        : [];

      return res.status(200).json({
        data: {
          session,
          userMessage,
          assistantMessage,
          sources,
        },
      });
    } catch (err: any) {
      const message = err instanceof Error ? err.message : 'Unexpected error while chatting';

      if (message.includes('relation "chat_sessions" does not exist') || message.includes('relation "chat_messages" does not exist')) {
        return res.status(500).json({
          error: 'Chat tables are missing. Run npm run db:init.',
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
        error: 'Failed to process chat message. Please try again.',
        code: 'CHAT_PROCESSING_ERROR',
      });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ error: 'Method not allowed' });
}
