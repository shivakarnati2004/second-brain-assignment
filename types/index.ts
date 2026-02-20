export type KnowledgeType = 'note' | 'link' | 'insight' | 'article';

export interface KnowledgeMetadata {
  source_name?: string;
  captured_at?: string;
  custom?: Record<string, string>;
}

export interface KnowledgeItem {
  id: string;
  user_id?: string;
  title: string;
  content: string;
  type: KnowledgeType;
  summary?: string;
  tags: string[];
  source_url?: string;
  metadata?: KnowledgeMetadata;
  ai_processed: boolean;
  embedding?: number[];
  created_at: string;
  updated_at: string;
}

export interface CreateKnowledgeItem {
  title: string;
  content: string;
  type: KnowledgeType;
  tags?: string[];
  source_url?: string;
  metadata?: KnowledgeMetadata;
}

export interface BrainQuery {
  id: string;
  query: string;
  answer?: string;
  sources?: string[];
  created_at: string;
}

export type ChatRole = 'user' | 'assistant' | 'system';

export interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: ChatRole;
  content: string;
  sources?: string[];
  created_at: string;
}

export interface CreateChatRequest {
  message: string;
  sessionId?: string;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface UploadExtractionResult {
  title: string;
  content: string;
  suggestedType: KnowledgeType;
  tags: string[];
  source_name?: string;
  summary?: string;
  metadata?: Record<string, string>;
}

export interface GraphNode {
  id: string;
  label: string;
  type: KnowledgeType;
  tags: string[];
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  weight: number;
  reason: string;
}
