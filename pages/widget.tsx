import Head from 'next/head';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Widget() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ answer: string; sources: any[] } | null>(null);

  const publicApiKey = process.env.NEXT_PUBLIC_PUBLIC_BRAIN_API_KEY;

  const handleQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || loading) return;

    if (!publicApiKey) {
      setResult({
        answer: 'Widget API key is missing. Set NEXT_PUBLIC_PUBLIC_BRAIN_API_KEY.',
        sources: [],
      });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/public/brain/query?q=${encodeURIComponent(query)}`, {
        headers: {
          'X-API-Key': publicApiKey,
        },
      });
      const data = await res.json();

      if (!res.ok) {
        const errorMessage = data?.error || 'Error querying brain.';
        throw new Error(errorMessage);
      }

      if (!data?.answer || !Array.isArray(data.sources)) {
        throw new Error('Received an invalid response from the server.');
      }

      setResult({ answer: data.answer, sources: data.sources });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error querying brain.';
      setResult({ answer: errorMessage, sources: [] });
    } finally {
      setLoading(false);
    }
  };

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const widgetUrl = `${appUrl}/widget`;
  const iframeCode = `<iframe src="${widgetUrl}" width="400" height="500" frameborder="0" style="border-radius:16px"></iframe>`;

  return (
    <>
      <Head>
        <title>Brain Widget — Second Brain</title>
      </Head>

      <div style={{ minHeight: '100vh', background: 'var(--color-bg)', padding: 40 }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 40, marginBottom: 8 }}>
            Embeddable Widget
          </h1>
          <p style={{ color: 'var(--color-muted)', marginBottom: 48 }}>
            Embed your brain's query interface anywhere
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40 }}>
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, marginBottom: 20 }}>Live Preview</h2>
              <div className="glass" style={{ borderRadius: 20, padding: 28, maxWidth: 400 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                  <span style={{ fontSize: 20 }}>🧠</span>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>Second Brain</span>
                </div>

                <form onSubmit={handleQuery}>
                  <input
                    className="brain-input"
                    placeholder="Ask anything..."
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    style={{ marginBottom: 10 }}
                  />
                  <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={loading}>
                    {loading ? 'Thinking...' : 'Ask Brain →'}
                  </button>
                </form>

                <AnimatePresence>
                  {result && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      style={{ marginTop: 16 }}
                    >
                      <div style={{
                        background: 'rgba(157,78,221,0.08)',
                        border: '1px solid rgba(157,78,221,0.2)',
                        borderRadius: 12,
                        padding: 16,
                        fontSize: 13,
                        lineHeight: 1.7,
                        color: 'rgba(255,255,255,0.8)',
                      }}>
                        {result.answer}
                      </div>
                      {result.sources.length > 0 && (
                        <div style={{ marginTop: 10 }}>
                          <div style={{ fontSize: 11, color: 'var(--color-muted)', marginBottom: 6 }}>Sources:</div>
                          {result.sources.map((s: any) => (
                            <div key={s.id} style={{ fontSize: 12, color: 'var(--color-muted)', padding: '4px 0' }}>
                              → {s.title}
                            </div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, marginBottom: 20 }}>Embed Code</h2>

              <div className="glass" style={{ borderRadius: 16, padding: 24, marginBottom: 24 }}>
                <div style={{ fontSize: 12, color: 'var(--color-muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  iframe Embed
                </div>
                <code style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  color: 'var(--color-aurora)',
                  display: 'block',
                  wordBreak: 'break-all',
                  lineHeight: 1.6,
                }}>
                  {iframeCode}
                </code>
              </div>

              <div className="glass" style={{ borderRadius: 16, padding: 24 }}>
                <div style={{ fontSize: 12, color: 'var(--color-muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  REST API
                </div>
                <code style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-aurora)', display: 'block', lineHeight: 1.8 }}>
                  GET /api/public/brain/query<br />
                  <span style={{ color: 'var(--color-muted)' }}>?q=your+question</span><br />
                  Header: <span style={{ color: 'var(--color-muted)' }}>X-API-Key: your_public_key</span><br /><br />
                  <span style={{ color: 'rgba(255,255,255,0.4)' }}>Returns:</span><br />
                  {'{'}<br />
                  <span style={{ paddingLeft: 16 }}>&quot;answer&quot;: &quot;...&quot;,</span><br />
                  <span style={{ paddingLeft: 16 }}>&quot;sources&quot;: [...]</span><br />
                  {'}'}
                </code>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
