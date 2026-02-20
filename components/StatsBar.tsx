import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface Stats {
  counts: {
    total: number;
    notes: number;
    links: number;
    insights: number;
    articles: number;
    ai_processed: number;
  };
  top_tags: Array<{ tag: string; count: number }>;
}

export default function StatsBar() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch('/api/stats')
      .then(r => r.json())
      .then(d => setStats(d.data))
      .catch(() => {});
  }, []);

  if (!stats) return null;

  const STAT_ITEMS = [
    { label: 'Total Items', value: stats.counts.total, color: 'var(--color-aurora)' },
    { label: 'Notes', value: stats.counts.notes, color: 'var(--color-aurora)' },
    { label: 'Links', value: stats.counts.links, color: 'var(--color-ember)' },
    { label: 'Insights', value: stats.counts.insights, color: 'var(--color-neural)' },
    { label: 'AI Processed', value: stats.counts.ai_processed, color: '#a8e6cf' },
  ];

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        {STAT_ITEMS.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className="glass"
            style={{ padding: '12px 20px', borderRadius: 12, minWidth: 110 }}
          >
            <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-display)', color: s.color }}>
              {s.value}
            </div>
            <div style={{ fontSize: 11, color: 'var(--color-muted)', marginTop: 2 }}>{s.label}</div>
          </motion.div>
        ))}
      </div>

      {stats.top_tags.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Top tags:</span>
          {stats.top_tags.slice(0, 10).map(t => (
            <span key={t.tag} className="tag-pill">
              # {t.tag} <span style={{ opacity: 0.5 }}>({t.count})</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
