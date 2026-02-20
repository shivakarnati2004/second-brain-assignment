import Head from 'next/head';
import Link from 'next/link';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { KnowledgeItem } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import AddItemModal from '@/components/AddItemModal';
import ChatPanel from '@/components/ChatPanel';
import KnowledgeCard from '@/components/KnowledgeCard';
import KnowledgeGraph from '@/components/KnowledgeGraph';
import CommandPalette from '@/components/CommandPalette';
import StatsBar from '@/components/StatsBar';
import SkeletonCard from '@/components/SkeletonCard';

const TYPE_FILTERS: { label: string; value: string }[] = [
  { label: 'All', value: 'all' },
  { label: 'Notes', value: 'note' },
  { label: 'Links', value: 'link' },
  { label: 'Insights', value: 'insight' },
  { label: 'Articles', value: 'article' },
];

export default function Dashboard() {
  const router = useRouter();
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [search, setSearch] = useState('');
  const [sourceNameFilter, setSourceNameFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sort, setSort] = useState('created_at');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showQuery, setShowQuery] = useState(false);
  const [showGraph, setShowGraph] = useState(false);
  const [showPalette, setShowPalette] = useState(false);
  const [selectedItem, setSelectedItem] = useState<KnowledgeItem | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (sourceNameFilter) params.set('sourceName', sourceNameFilter);
      if (typeFilter !== 'all') params.set('type', typeFilter);
      params.set('sort', sort);

      const res = await fetch(`/api/knowledge?${params}`);
      const data = await res.json();
      setItems(data.data || []);
    } catch {
      toast.error('Failed to load knowledge items');
    } finally {
      setLoading(false);
    }
  }, [search, sourceNameFilter, typeFilter, sort]);

  useEffect(() => {
    const verifyAuth = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) {
          await router.replace('/login');
          return;
        }
        setAuthChecked(true);
      } catch {
        await router.replace('/login');
      }
    };

    verifyAuth();
  }, [router]);

  useEffect(() => {
    if (!authChecked) return;
    const timer = setTimeout(fetchItems, 300);
    return () => clearTimeout(timer);
  }, [authChecked, fetchItems]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const isPaletteShortcut = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k';
      if (isPaletteShortcut) {
        event.preventDefault();
        setShowPalette(true);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      await router.push('/login');
    } catch {
      toast.error('Failed to logout');
    }
  };

  if (!authChecked) {
    return null;
  }

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/knowledge/${id}`, { method: 'DELETE' });
      setItems(prev => prev.filter(i => i.id !== id));
      if (selectedItem?.id === id) setSelectedItem(null);
      toast.success('Item deleted');
    } catch {
      toast.error('Delete failed');
    }
  };

  const handleItemAdded = (item: KnowledgeItem) => {
    setItems(prev => [item, ...prev]);
    toast.success('Knowledge captured! AI is processing...', { duration: 3000 });
  };

  const paletteActions = useMemo(() => [
    {
      id: 'capture',
      label: 'Capture new knowledge',
      hint: 'Open modal',
      run: () => setShowAddModal(true),
    },
    {
      id: 'focus-search',
      label: 'Focus search',
      hint: 'Dashboard',
      run: () => searchInputRef.current?.focus(),
    },
    {
      id: 'toggle-chat',
      label: showQuery ? 'Hide brain chat' : 'Show brain chat',
      hint: 'Panel',
      run: () => setShowQuery(prev => !prev),
    },
    {
      id: 'toggle-graph',
      label: showGraph ? 'Hide knowledge graph' : 'Show knowledge graph',
      hint: 'Panel',
      run: () => setShowGraph(prev => !prev),
    },
    {
      id: 'focus-chat',
      label: 'Focus chat input',
      hint: 'Brain chat',
      run: () => {
        setShowQuery(true);
        requestAnimationFrame(() => {
          window.dispatchEvent(new CustomEvent('focus-chat-input'));
        });
      },
    },
    {
      id: 'logout',
      label: 'Logout',
      hint: 'Session',
      run: () => {
        void handleLogout();
      },
    },
  ], [showGraph, showQuery]);

  return (
    <>
      <Head>
        <title>Dashboard — Second Brain</title>
      </Head>

      {/* Mesh bg */}
      <div className="mesh-bg">
        <div className="mesh-blob" style={{ width: 500, height: 500, background: 'var(--color-neural)', top: '10%', left: '-10%', opacity: 0.08 }} />
        <div className="mesh-blob" style={{ width: 400, height: 400, background: 'var(--color-aurora)', bottom: '20%', right: '-5%', opacity: 0.07, animationDelay: '8s' }} />
      </div>

      <div style={{ position: 'relative', zIndex: 1, minHeight: '100vh' }}>
        {/* Top nav */}
        <div style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          backdropFilter: 'blur(20px)',
          background: 'rgba(5,5,8,0.85)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', color: 'inherit' }}>
                  <span style={{ fontSize: 20 }}>🧠</span>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16 }}>Second Brain</span>
                </Link>
                <span style={{ color: 'rgba(255,255,255,0.15)' }}>/</span>
                <span style={{ color: 'var(--color-muted)', fontSize: 14 }}>Dashboard</span>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  className="btn-ghost"
                  style={{ padding: '8px 16px', fontSize: 13 }}
                  onClick={() => setShowQuery(!showQuery)}
                  aria-label={showQuery ? 'Close brain chat' : 'Open brain chat'}
                >
                  {showQuery ? '✕ Close' : '◎ Brain Chat'}
                </button>
                <button
                  className="btn-ghost"
                  style={{ padding: '8px 16px', fontSize: 13 }}
                  onClick={() => setShowGraph(!showGraph)}
                  aria-label={showGraph ? 'Hide knowledge graph' : 'Show knowledge graph'}
                >
                  {showGraph ? '◐ Hide Graph' : '◉ Graph'}
                </button>
                <button
                  className="btn-primary"
                  style={{ padding: '8px 16px', fontSize: 13 }}
                  onClick={() => setShowAddModal(true)}
                  aria-label="Open capture modal"
                >
                  + Capture
                </button>
                <button
                  className="btn-ghost"
                  style={{ padding: '8px 16px', fontSize: 13 }}
                  onClick={() => setShowPalette(true)}
                  aria-label="Open command palette"
                >
                  ⌘/Ctrl+K
                </button>
                <button
                  className="btn-ghost"
                  style={{ padding: '8px 16px', fontSize: 13 }}
                  onClick={handleLogout}
                  aria-label="Log out"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>

        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '24px' }}>
          {/* Stats */}
          <StatsBar />

          {/* Chat panel */}
          <AnimatePresence>
            {showQuery && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                style={{ overflow: 'hidden' }}
              >
                <ChatPanel />
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {showGraph && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                style={{ overflow: 'hidden' }}
              >
                <KnowledgeGraph />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Search & filters */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: '1 1 300px' }}>
              <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-muted)', fontSize: 16 }}>⌕</span>
              <input
                ref={searchInputRef}
                id="dashboard-search"
                type="text"
                className="brain-input"
                placeholder="Search your brain..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                aria-label="Search knowledge items"
                style={{ paddingLeft: 40 }}
              />
            </div>

            <div style={{ position: 'relative', flex: '1 1 220px' }}>
              <input
                type="text"
                className="brain-input"
                placeholder="Filter by source name..."
                value={sourceNameFilter}
                onChange={e => setSourceNameFilter(e.target.value)}
                aria-label="Filter by source name"
              />
            </div>

            {/* Type filters */}
            <div style={{ display: 'flex', gap: 6 }}>
              {TYPE_FILTERS.map(f => (
                <button
                  key={f.value}
                  onClick={() => setTypeFilter(f.value)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 10,
                    border: '1px solid',
                    fontSize: 13,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    borderColor: typeFilter === f.value ? 'var(--color-aurora)' : 'rgba(255,255,255,0.1)',
                    background: typeFilter === f.value ? 'rgba(78,205,196,0.12)' : 'rgba(255,255,255,0.04)',
                    color: typeFilter === f.value ? 'var(--color-aurora)' : 'var(--color-muted)',
                  }}
                  aria-pressed={typeFilter === f.value}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <select
              className="brain-input"
              value={sort}
              onChange={e => setSort(e.target.value)}
              style={{ width: 'auto', minWidth: 140 }}
              aria-label="Sort knowledge items"
            >
              <option value="created_at">Newest first</option>
              <option value="title">A → Z</option>
            </select>
          </div>

          {/* Count */}
          <div style={{ marginBottom: 16, color: 'var(--color-muted)', fontSize: 13 }}>
            {loading ? '...' : `${items.length} item${items.length !== 1 ? 's' : ''}`}
          </div>

          {/* Grid */}
          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
              {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : items.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ textAlign: 'center', padding: '80px 20px' }}
            >
              <div style={{ fontSize: 64, marginBottom: 20 }}>🌌</div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 28, marginBottom: 12 }}>
                {search || typeFilter !== 'all' ? 'No items found' : 'Your brain is empty'}
              </h3>
              <p style={{ color: 'var(--color-muted)', marginBottom: 24 }}>
                {search || typeFilter !== 'all' ? 'Try adjusting your filters' : 'Start capturing knowledge to fill the void'}
              </p>
              {!search && typeFilter === 'all' && (
                <button className="btn-primary" onClick={() => setShowAddModal(true)}>
                  Add First Item →
                </button>
              )}
            </motion.div>
          ) : (
            <motion.div
              style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}
            >
              <AnimatePresence>
                {items.map((item, i) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.4, delay: Math.min(i * 0.05, 0.4) }}
                  >
                    <KnowledgeCard
                      item={item}
                      onDelete={handleDelete}
                      onClick={() => setSelectedItem(item)}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showAddModal && (
          <AddItemModal
            onClose={() => setShowAddModal(false)}
            onAdded={handleItemAdded}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedItem && (
          <ItemDetailModal
            item={selectedItem}
            onClose={() => setSelectedItem(null)}
            onDelete={() => { handleDelete(selectedItem.id); }}
          />
        )}
      </AnimatePresence>

      <CommandPalette
        open={showPalette}
        onClose={() => setShowPalette(false)}
        actions={paletteActions}
      />
    </>
  );
}

function ItemDetailModal({ item, onClose, onDelete }: { item: KnowledgeItem; onClose: () => void; onDelete: () => void }) {
  const customMetadataEntries = Object.entries(item.metadata?.custom || {});

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.97 }}
        onClick={e => e.stopPropagation()}
        className="glass"
        style={{ width: '100%', maxWidth: 680, maxHeight: '80vh', borderRadius: 24, overflow: 'auto', padding: 36 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <span className={`tag-pill type-${item.type}`}>{item.type}</span>
          <div style={{ display: 'flex', gap: 8 }}>
            {item.ai_processed && (
              <span style={{ fontSize: 11, color: 'var(--color-aurora)', background: 'rgba(78,205,196,0.1)', padding: '3px 10px', borderRadius: 999 }}>✦ AI processed</span>
            )}
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: 'var(--color-muted)', cursor: 'pointer', fontSize: 18 }}
            >
              ✕
            </button>
          </div>
        </div>

        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, marginBottom: 16, fontWeight: 700 }}>{item.title}</h2>

        {item.summary && (
          <div style={{
            background: 'rgba(157,78,221,0.08)',
            border: '1px solid rgba(157,78,221,0.2)',
            borderRadius: 12,
            padding: '16px 20px',
            marginBottom: 20,
          }}>
            <div style={{ fontSize: 11, color: 'var(--color-neural)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.1em' }}>AI Summary</div>
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, lineHeight: 1.7 }}>{item.summary}</p>
          </div>
        )}

        <div style={{ color: 'rgba(255,255,255,0.7)', lineHeight: 1.8, marginBottom: 20, whiteSpace: 'pre-wrap' }}>{item.content}</div>

        {item.source_url && (
          <a href={item.source_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-aurora)', fontSize: 13, display: 'block', marginBottom: 16 }}>
            🔗 {item.source_url}
          </a>
        )}

        {(item.metadata?.source_name || item.metadata?.captured_at || customMetadataEntries.length > 0) && (
          <div className="glass" style={{ borderRadius: 12, padding: 14, marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: 'var(--color-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Metadata
            </div>

            {item.metadata?.source_name && (
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', marginBottom: 6 }}>
                Source name: <span style={{ color: 'rgba(255,255,255,0.95)' }}>{item.metadata.source_name}</span>
              </div>
            )}

            {item.metadata?.captured_at && (
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', marginBottom: customMetadataEntries.length > 0 ? 8 : 0 }}>
                Captured at: <span style={{ color: 'rgba(255,255,255,0.95)' }}>{new Date(item.metadata.captured_at).toLocaleString()}</span>
              </div>
            )}

            {customMetadataEntries.length > 0 && (
              <div style={{ display: 'grid', gap: 4 }}>
                {customMetadataEntries.map(([key, value]) => (
                  <div key={key} style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>
                    {key}: <span style={{ color: 'rgba(255,255,255,0.95)' }}>{value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
          {item.tags.map(tag => (
            <span key={tag} className="tag-pill"># {tag}</span>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <span style={{ color: 'var(--color-muted)', fontSize: 12 }}>
            {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
          </span>
          <button
            onClick={() => { onDelete(); onClose(); }}
            style={{ background: 'rgba(255,107,53,0.1)', border: '1px solid rgba(255,107,53,0.2)', color: 'var(--color-ember)', borderRadius: 8, padding: '6px 16px', cursor: 'pointer', fontSize: 13 }}
          >
            Delete
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
