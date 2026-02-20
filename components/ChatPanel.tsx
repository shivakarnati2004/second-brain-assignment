import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatMessage, ChatSession } from '@/types';

export default function ChatPanel() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const loadSessions = async () => {
      setLoadingSessions(true);
      try {
        const res = await fetch('/api/chat');
        const data = await res.json();
        if (res.ok) {
          setSessions(data.data || []);
        }
      } finally {
        setLoadingSessions(false);
      }
    };

    loadSessions();
  }, []);

  useEffect(() => {
    const focusInput = () => inputRef.current?.focus();
    window.addEventListener('focus-chat-input', focusInput as EventListener);
    return () => window.removeEventListener('focus-chat-input', focusInput as EventListener);
  }, []);

  const loadSessionMessages = async (sessionId: string) => {
    const res = await fetch(`/api/chat/${sessionId}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || 'Failed to load session');

    setActiveSessionId(sessionId);
    setMessages(data.data.messages || []);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sending) return;

    const outgoing = input.trim();
    setInput('');
    setSending(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: outgoing,
          sessionId: activeSessionId || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to send message');

      const session = data.data.session as ChatSession;
      const userMessage = data.data.userMessage as ChatMessage;
      const assistantMessage = data.data.assistantMessage as ChatMessage;

      setActiveSessionId(userMessage.session_id);
      setMessages(prev => [...prev, userMessage, assistantMessage]);

      setSessions(prev => {
        const existing = prev.find(s => s.id === session.id);
        if (existing) {
          return [
            { ...existing, updated_at: new Date().toISOString() },
            ...prev.filter(s => s.id !== existing.id),
          ];
        }
        return [session, ...prev];
      });
    } catch (err) {
      const errorText = err instanceof Error ? err.message : 'Failed to send message';
      const fallbackMessage: ChatMessage = {
        id: `local-${Date.now()}`,
        session_id: activeSessionId || 'local',
        role: 'assistant',
        content: errorText,
        sources: [],
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev, fallbackMessage]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="glass" style={{ borderRadius: 20, padding: 22 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 16 }}>
        <div style={{ borderRight: '1px solid rgba(255,255,255,0.08)', paddingRight: 12 }}>
          <div style={{ fontSize: 12, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
            Chats
          </div>
          <button
            className="btn-ghost"
            style={{ width: '100%', marginBottom: 10, padding: '8px 10px', fontSize: 12 }}
            onClick={() => {
              setActiveSessionId(null);
              setMessages([]);
            }}
            aria-label="Start new chat"
          >
            + New Chat
          </button>

          <div style={{ display: 'grid', gap: 8, maxHeight: 360, overflow: 'auto' }}>
            {loadingSessions ? (
              <span style={{ color: 'var(--color-muted)', fontSize: 12 }}>Loading...</span>
            ) : sessions.length === 0 ? (
              <span style={{ color: 'var(--color-muted)', fontSize: 12 }}>No sessions yet</span>
            ) : (
              sessions.map(session => (
                <button
                  key={session.id}
                  onClick={() => loadSessionMessages(session.id)}
                  aria-label={`Open chat session ${session.title}`}
                  style={{
                    textAlign: 'left',
                    border: '1px solid rgba(255,255,255,0.08)',
                    background: activeSessionId === session.id ? 'rgba(157,78,221,0.12)' : 'rgba(255,255,255,0.03)',
                    color: 'rgba(255,255,255,0.85)',
                    borderRadius: 10,
                    padding: '10px 10px',
                    cursor: 'pointer',
                    fontSize: 12,
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>{session.title}</div>
                  <div style={{ color: 'var(--color-muted)', fontSize: 11 }}>Updated {new Date(session.updated_at).toLocaleString()}</div>
                </button>
              ))
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 360 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, var(--color-neural), var(--color-aurora))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>
              ◎
            </div>
            <div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700 }}>Brain Chat</h3>
              <p style={{ fontSize: 12, color: 'var(--color-muted)' }}>Multi-turn AI conversation over your knowledge base</p>
            </div>
          </div>

          <div style={{ flex: 1, overflow: 'auto', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 12, marginBottom: 12, background: 'rgba(255,255,255,0.02)' }}>
            {messages.length === 0 ? (
              <p style={{ color: 'var(--color-muted)', fontSize: 13 }}>
                Start a chat by asking a question like “What do I know about AI?”.
              </p>
            ) : (
              <AnimatePresence>
                {messages.map(msg => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                      marginBottom: 10,
                      display: 'flex',
                      justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                    }}
                  >
                    <div
                      style={{
                        maxWidth: '78%',
                        borderRadius: 12,
                        padding: '10px 12px',
                        fontSize: 13,
                        lineHeight: 1.6,
                        background: msg.role === 'user' ? 'rgba(78,205,196,0.15)' : 'rgba(157,78,221,0.12)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: 'rgba(255,255,255,0.88)',
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {msg.content}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>

          <form onSubmit={handleSend} style={{ display: 'flex', gap: 10 }}>
            <input
              ref={inputRef}
              id="chat-input"
              className="brain-input"
              placeholder="Ask your brain..."
              value={input}
              onChange={e => setInput(e.target.value)}
              disabled={sending}
              aria-label="Chat message input"
            />
            <button
              type="submit"
              className="btn-primary"
              disabled={sending || !input.trim()}
              style={{ minWidth: 110, whiteSpace: 'nowrap' }}
              aria-label="Send message"
            >
              {sending ? 'Thinking...' : 'Send →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
