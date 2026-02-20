import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { KnowledgeItem } from '@/types';

interface QueryResult {
  answer: string;
  sources: KnowledgeItem[];
}

export default function QueryPanel() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [history, setHistory] = useState<Array<{ query: string; result: QueryResult }>>([]);

  const handleQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || loading) return;

    setLoading(true);
    const currentQuery = query;
    setQuery('');

    try {
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: currentQuery }),
      });

      const data = await res.json();
      if (!res.ok) {
        const errorMessage = data?.error || 'Failed to query the brain. Please try again.';
        throw new Error(errorMessage);
      }

      const newResult = data?.data;
      if (!newResult?.answer || !Array.isArray(newResult.sources)) {
        throw new Error('Received an invalid response from the server.');
      }

      setResult(newResult);
      setHistory(prev => [{ query: currentQuery, result: newResult }, ...prev].slice(0, 5));
    } catch (err) {
      const errorMessage = err instanceof Error
        ? err.message
        : 'Failed to query the brain. Please try again.';
      setResult({ answer: errorMessage, sources: [] });
    } finally {
      setLoading(false);
    }
  };

  const EXAMPLE_QUERIES = ['What do I know about AI?', 'What are my key insights?', 'Summarize my research notes'];
  const isEmptyBrainState =
    !!result &&
    result.sources.length === 0 &&
    result.answer.toLowerCase().includes('second brain is empty');

  return (
    <div className="glass" style={{ borderRadius: 20, padding: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--color-neural), var(--color-aurora))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16,
        }}>◎</div>
        <div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700 }}>Ask Your Brain</h3>
          <p style={{ fontSize: 12, color: 'var(--color-muted)' }}>Conversationally query your knowledge base</p>
        </div>
      </div>

      {/* Example queries */}
      {!result && !loading && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          {EXAMPLE_QUERIES.map(q => (
            <button
              key={q}
              onClick={() => setQuery(q)}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'var(--color-muted)',
                padding: '6px 14px',
                borderRadius: 999,
                fontSize: 12,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(157,78,221,0.4)'; e.currentTarget.style.color = 'var(--color-neural)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'var(--color-muted)'; }}
            >
              {q}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={handleQuery} style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <input
          className="brain-input"
          placeholder="What do you want to know from your brain?"
          value={query}
          onChange={e => setQuery(e.target.value)}
          disabled={loading}
        />
        <button
          type="submit"
          className="btn-primary"
          disabled={loading || !query.trim()}
          style={{ whiteSpace: 'nowrap', minWidth: 100 }}
        >
          {loading ? '...' : 'Ask →'}
        </button>
      </form>

      {/* Loading */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 0' }}
          >
            <div style={{ display: 'flex', gap: 4 }}>
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className="loading-dot"
                  style={{
                    width: 8, height: 8,
                    borderRadius: '50%',
                    background: 'var(--color-neural)',
                  }}
                />
              ))}
            </div>
            <span style={{ color: 'var(--color-muted)', fontSize: 13 }}>Searching your knowledge base...</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Result */}
      <AnimatePresence>
        {result && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div style={{
              background: 'rgba(157,78,221,0.06)',
              border: '1px solid rgba(157,78,221,0.15)',
              borderRadius: 14,
              padding: 20,
              marginBottom: 16,
            }}>
              <div style={{ fontSize: 11, color: 'var(--color-neural)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
                ✦ Brain Response
              </div>
              <p style={{ lineHeight: 1.8, color: 'rgba(255,255,255,0.85)', fontSize: 14 }}>{result.answer}</p>
            </div>

            {isEmptyBrainState && (
              <div
                className="glass"
                style={{
                  borderRadius: 12,
                  padding: 14,
                  marginBottom: 16,
                  border: '1px solid rgba(78,205,196,0.2)',
                }}
              >
                <p style={{ fontSize: 13, color: 'var(--color-muted)', lineHeight: 1.7 }}>
                  Add your first note, article, or insight from the dashboard, then ask again for grounded responses.
                </p>
              </div>
            )}

            {result.sources.length > 0 && (
              <div>
                <div style={{ fontSize: 11, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
                  Sources ({result.sources.length})
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {result.sources.map(s => (
                    <div
                      key={s.id}
                      className="glass"
                      style={{ padding: '8px 14px', borderRadius: 10, fontSize: 13 }}
                    >
                      <span className={`type-${s.type}`}>{s.type}</span>
                      <span style={{ marginLeft: 8, color: 'rgba(255,255,255,0.7)' }}>{s.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
