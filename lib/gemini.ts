import { GoogleGenerativeAI } from '@google/generative-ai';
import type { GenerativeModel } from '@google/generative-ai';

let cachedModel: GenerativeModel | null = null;
let cachedEmbeddingModel: GenerativeModel | null = null;

function getGeminiModel(): GenerativeModel {
  if (cachedModel) return cachedModel;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    throw new Error('Gemini API key is missing. Set GEMINI_API_KEY in .env.local.');
  }

  const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const genAI = new GoogleGenerativeAI(apiKey);
  cachedModel = genAI.getGenerativeModel({ model: modelName });
  return cachedModel;
}

function getGeminiEmbeddingModel(): GenerativeModel {
  if (cachedEmbeddingModel) return cachedEmbeddingModel;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    throw new Error('Gemini API key is missing. Set GEMINI_API_KEY in .env.local.');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  cachedEmbeddingModel = genAI.getGenerativeModel({ model: 'text-embedding-004' });
  return cachedEmbeddingModel;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const cleaned = text.trim();
  if (!cleaned) return [];

  const result = await getGeminiEmbeddingModel().embedContent(cleaned);
  return result.embedding.values || [];
}

export async function summarizeContent(title: string, content: string): Promise<string> {
  const prompt = `Summarize the following knowledge item concisely in 2-3 sentences. Focus on key insights.

Title: ${title}
Content: ${content}

Provide only the summary, no preamble.`;

  const result = await getGeminiModel().generateContent(prompt);
  return result.response.text().trim();
}

export async function generateTags(title: string, content: string, existingTags: string[] = []): Promise<string[]> {
  const prompt = `Generate 3-6 relevant tags for this knowledge item. Return ONLY a JSON array of lowercase strings, no explanation.

Title: ${title}
Content: ${content}
${existingTags.length > 0 ? `User-provided tags: ${existingTags.join(', ')}` : ''}

Example output: ["machine-learning", "productivity", "research"]
Return only valid JSON array.`;

  const result = await getGeminiModel().generateContent(prompt);
  const text = result.response.text().trim();
  
  try {
    const match = text.match(/\[[\s\S]*?\]/);
    if (match) {
      const tags = JSON.parse(match[0]);
      return Array.from(new Set([...existingTags, ...tags])).slice(0, 8);
    }
  } catch {}
  
  return existingTags;
}

export async function queryBrain(
  userQuery: string,
  knowledgeItems: Array<{ id: string; title: string; content: string; summary?: string; tags: string[] }>
): Promise<{ answer: string; sourceIds: string[] }> {
  if (knowledgeItems.length === 0) {
    return {
      answer: "Your Second Brain is empty. Add some knowledge items first, then I can answer questions about them.",
      sourceIds: [],
    };
  }

  const context = knowledgeItems
    .map((item, i) => `[${i + 1}] ID:${item.id}\nTitle: ${item.title}\nContent: ${item.content}\n${item.summary ? `Summary: ${item.summary}` : ''}\nTags: ${item.tags.join(', ')}`)
    .join('\n\n---\n\n');

  const prompt = `You are an AI assistant for a personal knowledge management system. Answer the user's question based ONLY on the knowledge items provided below. Be specific, insightful, and reference relevant items.

KNOWLEDGE BASE:
${context}

USER QUESTION: ${userQuery}

Instructions:
1. Answer based on the knowledge provided
2. Reference specific items when relevant (use their titles)
3. If the knowledge base doesn't contain relevant information, say so clearly
4. Be conversational but insightful
5. End with a brief insight or connection if applicable

Also identify which item IDs are most relevant to this query. Return your response as JSON:
{
  "answer": "your answer here",
  "relevantIds": ["id1", "id2"]
}`;

  const result = await getGeminiModel().generateContent(prompt);
  const text = result.response.text().trim();

  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      return {
        answer: parsed.answer || text,
        sourceIds: parsed.relevantIds || [],
      };
    }
  } catch {}

  return { answer: text, sourceIds: [] };
}

export async function chatWithBrain(
  userMessage: string,
  knowledgeItems: Array<{ id: string; title: string; content: string; summary?: string; tags: string[] }>,
  history: Array<{ role: 'user' | 'assistant'; content: string }> = []
): Promise<{ answer: string; sourceIds: string[] }> {
  const historyContext = history
    .slice(-12)
    .map((m, i) => `${i + 1}. ${m.role.toUpperCase()}: ${m.content}`)
    .join('\n');

  const knowledgeContext = knowledgeItems
    .slice(0, 40)
    .map(
      (item, i) =>
        `[${i + 1}] ID:${item.id}\nTitle: ${item.title}\nContent: ${item.content}\n${item.summary ? `Summary: ${item.summary}` : ''}\nTags: ${item.tags.join(', ')}`
    )
    .join('\n\n---\n\n');

  const prompt = `You are the conversational assistant for a personal knowledge management system called Second Brain.

Conversation history:
${historyContext || 'No previous messages.'}

Knowledge base entries:
${knowledgeContext || 'No knowledge entries available.'}

Latest user message:
${userMessage}

Instructions:
1. Reply conversationally and clearly.
2. Ground answers in the knowledge base when relevant.
3. If knowledge is missing, clearly say what is missing and suggest what to add.
4. Keep response concise and useful.
5. Return strict JSON with keys answer and relevantIds.

Output format:
{
  "answer": "...",
  "relevantIds": ["id1", "id2"]
}`;

  const result = await getGeminiModel().generateContent(prompt);
  const text = result.response.text().trim();

  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      return {
        answer: parsed.answer || text,
        sourceIds: Array.isArray(parsed.relevantIds) ? parsed.relevantIds : [],
      };
    }
  } catch {}

  return { answer: text, sourceIds: [] };
}

export async function extractTextFromImage(buffer: Buffer, mimeType: string): Promise<string> {
  const prompt = `Extract all meaningful text visible in this image.
Return only plain text with line breaks preserved where useful.
If no readable text exists, return an empty string.`;

  const result = await getGeminiModel().generateContent([
    { text: prompt },
    {
      inlineData: {
        mimeType,
        data: buffer.toString('base64'),
      },
    },
  ]);

  return result.response.text().trim();
}

function parseJsonObject(text: string): Record<string, any> {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return {};

  try {
    return JSON.parse(match[0]);
  } catch {
    return {};
  }
}

export async function extractMetadataFromContent(
  sourceName: string,
  content: string
): Promise<{
  title: string;
  summary: string;
  tags: string[];
  source_name: string;
  suggestedType: 'note' | 'link' | 'insight' | 'article';
}> {
  const prompt = `You are extracting metadata for a personal knowledge base item.

Source: ${sourceName}
Content:
${content.slice(0, 10000)}

Return strict JSON only:
{
  "title": "concise title",
  "summary": "1-2 sentence summary",
  "tags": ["lowercase-tag"],
  "source_name": "best source label",
  "suggestedType": "note|link|insight|article"
}`;

  const result = await getGeminiModel().generateContent(prompt);
  const parsed = parseJsonObject(result.response.text().trim());

  const tags = Array.isArray(parsed.tags)
    ? parsed.tags.filter((tag: unknown) => typeof tag === 'string').map((tag: string) => tag.toLowerCase()).slice(0, 8)
    : [];

  const suggestedType = ['note', 'link', 'insight', 'article'].includes(parsed.suggestedType)
    ? parsed.suggestedType
    : 'note';

  return {
    title: typeof parsed.title === 'string' && parsed.title.trim() ? parsed.title.trim() : sourceName,
    summary: typeof parsed.summary === 'string' ? parsed.summary.trim() : '',
    tags,
    source_name: typeof parsed.source_name === 'string' && parsed.source_name.trim() ? parsed.source_name.trim() : sourceName,
    suggestedType,
  };
}