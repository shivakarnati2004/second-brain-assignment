import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface PaletteAction {
  id: string;
  label: string;
  hint?: string;
  run: () => void;
}

interface Props {
  open: boolean;
  onClose: () => void;
  actions: PaletteAction[];
}

export default function CommandPalette({ open, onClose, actions }: Props) {
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setIndex(0);
    }
  }, [open]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return actions;
    return actions.filter(action => action.label.toLowerCase().includes(normalized));
  }, [actions, query]);

  useEffect(() => {
    if (index > filtered.length - 1) {
      setIndex(0);
    }
  }, [filtered.length, index]);

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setIndex(prev => Math.min(prev + 1, Math.max(filtered.length - 1, 0)));
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setIndex(prev => Math.max(prev - 1, 0));
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      const action = filtered[index];
      if (!action) return;
      action.run();
      onClose();
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 320,
            background: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(6px)',
            padding: 20,
          }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            onClick={event => event.stopPropagation()}
            className="glass"
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            style={{
              maxWidth: 620,
              margin: '8vh auto 0',
              borderRadius: 16,
              overflow: 'hidden',
            }}
          >
            <input
              className="brain-input"
              value={query}
              onChange={event => setQuery(event.target.value)}
              onKeyDown={onKeyDown}
              autoFocus
              placeholder="Type a command..."
              aria-label="Type a command"
              style={{ borderRadius: 0, border: 'none', borderBottom: '1px solid rgba(255,255,255,0.08)' }}
            />

            <div role="listbox" aria-label="Command results" style={{ maxHeight: 320, overflow: 'auto' }}>
              {filtered.length === 0 ? (
                <div style={{ padding: 12, color: 'var(--color-muted)', fontSize: 13 }}>No matching commands.</div>
              ) : (
                filtered.map((action, actionIndex) => (
                  <button
                    key={action.id}
                    type="button"
                    onMouseEnter={() => setIndex(actionIndex)}
                    onClick={() => {
                      action.run();
                      onClose();
                    }}
                    aria-selected={index === actionIndex}
                    style={{
                      width: '100%',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                      background: index === actionIndex ? 'rgba(78,205,196,0.12)' : 'transparent',
                      color: 'var(--color-text)',
                      padding: '11px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span style={{ fontSize: 14 }}>{action.label}</span>
                    {action.hint ? <span style={{ fontSize: 12, color: 'var(--color-muted)' }}>{action.hint}</span> : null}
                  </button>
                ))
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
