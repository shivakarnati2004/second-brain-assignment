import { KnowledgeItem } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { motion } from 'framer-motion';

const TYPE_ICONS: Record<string, string> = {
  note: '📝',
  link: '🔗',
  insight: '💡',
  article: '📄',
};

interface Props {
  item: KnowledgeItem;
  onDelete: (id: string) => void;
  onClick: () => void;
}

export default function KnowledgeCard({ item, onDelete, onClick }: Props) {
  return (
    <div
      className="glass glass-hover"
      style={{ borderRadius: 18, padding: 22, cursor: 'pointer', position: 'relative', overflow: 'hidden' }}
      onClick={onClick}
      onKeyDown={event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`Open details for ${item.title}`}
    >
      {/* Subtle accent line */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0,
        height: 2,
        background: item.type === 'note' ? 'linear-gradient(90deg, var(--color-aurora), transparent)' :
                    item.type === 'link' ? 'linear-gradient(90deg, var(--color-ember), transparent)' :
                    item.type === 'insight' ? 'linear-gradient(90deg, var(--color-neural), transparent)' :
                    'linear-gradient(90deg, var(--color-aurora), transparent)',
        opacity: 0.6,
      }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>{TYPE_ICONS[item.type]}</span>
          <span className={`tag-pill type-${item.type}`}>{item.type}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {item.ai_processed && (
            <span title="AI processed" style={{ fontSize: 11, color: 'var(--color-aurora)', opacity: 0.7 }}>✦</span>
          )}
          <button
            onClick={e => { e.stopPropagation(); onDelete(item.id); }}
            aria-label={`Delete ${item.title}`}
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255,255,255,0.2)',
              cursor: 'pointer',
              fontSize: 14,
              padding: '2px 6px',
              borderRadius: 6,
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-ember)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.2)')}
          >
            ✕
          </button>
        </div>
      </div>

      <h3 style={{
        fontFamily: 'var(--font-display)',
        fontSize: 17,
        fontWeight: 700,
        marginBottom: 10,
        lineHeight: 1.3,
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
      }}>
        {item.title}
      </h3>

      {item.summary ? (
        <p style={{
          color: 'rgba(255,255,255,0.55)',
          fontSize: 13,
          lineHeight: 1.6,
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          marginBottom: 14,
          fontStyle: 'italic',
        }}>
          {item.summary}
        </p>
      ) : (
        <p style={{
          color: 'rgba(255,255,255,0.45)',
          fontSize: 13,
          lineHeight: 1.6,
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          marginBottom: 14,
        }}>
          {item.content}
        </p>
      )}

      {item.tags.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
          {item.tags.slice(0, 4).map(tag => (
            <span key={tag} className="tag-pill"># {tag}</span>
          ))}
          {item.tags.length > 4 && (
            <span className="tag-pill">+{item.tags.length - 4}</span>
          )}
        </div>
      )}

      <div style={{ color: 'var(--color-muted)', fontSize: 11, opacity: 0.7 }}>
        {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
      </div>
    </div>
  );
}
