import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { KnowledgeItem, KnowledgeType, UploadExtractionResult } from '@/types';

interface Props {
  onClose: () => void;
  onAdded: (item: KnowledgeItem) => void;
}

const TYPES: KnowledgeType[] = ['note', 'link', 'insight', 'article'];

export default function AddItemModal({ onClose, onAdded }: Props) {
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    title: '',
    content: '',
    type: 'note' as KnowledgeType,
    tags: '',
    source_url: '',
    source_name: '',
    captured_at: '',
  });
  const [metadataPairs, setMetadataPairs] = useState<Array<{ key: string; value: string }>>([{ key: '', value: '' }]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    titleInputRef.current?.focus();

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', onEscape);
    return () => window.removeEventListener('keydown', onEscape);
  }, [onClose]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || 'Upload extraction failed');
      }

      const extracted = data.data as UploadExtractionResult;
      setForm(prev => ({
        ...prev,
        title: extracted.title || prev.title,
        content: extracted.content || prev.content,
        type: extracted.suggestedType || prev.type,
        tags: extracted.tags?.join(', ') || prev.tags,
        source_name: extracted.source_name || prev.source_name,
      }));

      if (extracted.metadata) {
        const metadataEntries = Object.entries(extracted.metadata).map(([key, value]) => ({
          key,
          value,
        }));
        if (metadataEntries.length > 0) {
          setMetadataPairs(metadataEntries);
        }
      }

      toast.success('File processed and fields auto-filled');
    } catch (err: any) {
      toast.error(err.message || 'Failed to extract file metadata');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) {
      toast.error('Title and content are required');
      return;
    }

    setLoading(true);
    try {
      const customMetadata = metadataPairs.reduce<Record<string, string>>((acc, pair) => {
        const trimmedKey = pair.key.trim();
        const trimmedValue = pair.value.trim();
        if (trimmedKey && trimmedValue) acc[trimmedKey] = trimmedValue;
        return acc;
      }, {});

      const res = await fetch('/api/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title.trim(),
          content: form.content.trim(),
          type: form.type,
          tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
          source_url: form.source_url.trim() || undefined,
          metadata: {
            source_name: form.source_name.trim() || undefined,
            captured_at: form.captured_at || undefined,
            custom: customMetadata,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      onAdded(data.data);
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20 }}
        onClick={e => e.stopPropagation()}
        className="glass"
        role="dialog"
        aria-modal="true"
        aria-labelledby="capture-knowledge-title"
        style={{ width: '100%', maxWidth: 580, borderRadius: 24, padding: 36 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <h2 id="capture-knowledge-title" style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700 }}>
            Capture Knowledge
          </h2>
          <button aria-label="Close capture modal" onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--color-muted)', cursor: 'pointer', fontSize: 20 }}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 20 }}>
            <label htmlFor="upload-file" style={{ fontSize: 12, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 8 }}>
              Upload document <span style={{ opacity: 0.5 }}>(PDF, images, text, DOCX)</span>
            </label>
            <input
              id="upload-file"
              type="file"
              className="brain-input"
              accept=".pdf,.txt,.md,.markdown,.csv,.json,.docx,image/*"
              onChange={handleFileUpload}
              aria-label="Upload a document for metadata extraction"
              disabled={uploading}
            />
            {uploading && <div style={{ marginTop: 8, color: 'var(--color-muted)', fontSize: 12 }}>Extracting content and metadata...</div>}
          </div>

          {/* Type selector */}
          <div style={{ marginBottom: 20 }}>
            <label htmlFor="capture-type" style={{ fontSize: 12, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 8 }}>Type</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {TYPES.map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, type: t }))}
                  className={`tag-pill type-${t}`}
                  style={{
                    cursor: 'pointer',
                    padding: '6px 16px',
                    opacity: form.type === t ? 1 : 0.4,
                    transform: form.type === t ? 'scale(1.05)' : 'scale(1)',
                    transition: 'all 0.2s',
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div style={{ marginBottom: 16 }}>
            <label htmlFor="capture-title" style={{ fontSize: 12, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 8 }}>Title *</label>
            <input
              id="capture-title"
              ref={titleInputRef}
              className="brain-input"
              placeholder="What's this about?"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              aria-label="Knowledge title"
              required
            />
          </div>

          {/* Content */}
          <div style={{ marginBottom: 16 }}>
            <label htmlFor="capture-content" style={{ fontSize: 12, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 8 }}>Content *</label>
            <textarea
              id="capture-content"
              className="brain-input"
              placeholder="Capture your knowledge, insight, or note..."
              value={form.content}
              onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
              aria-label="Knowledge content"
              required
              rows={5}
              style={{ resize: 'vertical', minHeight: 120 }}
            />
          </div>

          {/* Tags */}
          <div style={{ marginBottom: 16 }}>
            <label htmlFor="capture-tags" style={{ fontSize: 12, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 8 }}>
              Tags <span style={{ opacity: 0.5 }}>(comma-separated)</span>
            </label>
            <input
              id="capture-tags"
              className="brain-input"
              placeholder="ai, productivity, research..."
              value={form.tags}
              onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
              aria-label="Knowledge tags"
            />
          </div>

          {/* Source URL */}
          {(form.type === 'link' || form.type === 'article') && (
            <div style={{ marginBottom: 20 }}>
              <label htmlFor="capture-source-url" style={{ fontSize: 12, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 8 }}>Source URL</label>
              <input
                id="capture-source-url"
                className="brain-input"
                placeholder="https://..."
                type="url"
                value={form.source_url}
                onChange={e => setForm(f => ({ ...f, source_url: e.target.value }))}
                aria-label="Source URL"
              />
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <label htmlFor="capture-source-name" style={{ fontSize: 12, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 8 }}>
              Source Name <span style={{ opacity: 0.5 }}>(optional)</span>
            </label>
            <input
              id="capture-source-name"
              className="brain-input"
              placeholder="Book, Podcast, Person, Website..."
              value={form.source_name}
              onChange={e => setForm(f => ({ ...f, source_name: e.target.value }))}
              aria-label="Source name"
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label htmlFor="capture-captured-at" style={{ fontSize: 12, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 8 }}>
              Captured At <span style={{ opacity: 0.5 }}>(optional)</span>
            </label>
            <input
              id="capture-captured-at"
              className="brain-input"
              type="datetime-local"
              value={form.captured_at}
              onChange={e => setForm(f => ({ ...f, captured_at: e.target.value }))}
              aria-label="Captured date and time"
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <label style={{ fontSize: 12, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Custom Metadata <span style={{ opacity: 0.5 }}>(key-value)</span>
              </label>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setMetadataPairs(prev => [...prev, { key: '', value: '' }])}
                style={{ padding: '4px 10px', fontSize: 12 }}
              >
                + Add
              </button>
            </div>

            <div style={{ display: 'grid', gap: 8 }}>
              {metadataPairs.map((pair, idx) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8 }}>
                  <input
                    className="brain-input"
                    placeholder="key"
                    value={pair.key}
                    onChange={e => setMetadataPairs(prev => prev.map((p, i) => i === idx ? { ...p, key: e.target.value } : p))}
                  />
                  <input
                    className="brain-input"
                    placeholder="value"
                    value={pair.value}
                    onChange={e => setMetadataPairs(prev => prev.map((p, i) => i === idx ? { ...p, value: e.target.value } : p))}
                  />
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => setMetadataPairs(prev => prev.length > 1 ? prev.filter((_, i) => i !== idx) : [{ key: '', value: '' }])}
                    style={{ padding: '0 10px' }}
                  >
                    −
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button type="button" className="btn-ghost" onClick={onClose} style={{ flex: 1 }}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" style={{ flex: 2 }} disabled={loading}>
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <span className="loading-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: 'white', display: 'inline-block' }} />
                  <span className="loading-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: 'white', display: 'inline-block' }} />
                  <span className="loading-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: 'white', display: 'inline-block' }} />
                </span>
              ) : 'Capture → Brain'}
            </button>
          </div>
        </form>

        <p style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: 'var(--color-muted)' }}>
          ✦ AI will auto-summarize and tag this item
        </p>
      </motion.div>
    </motion.div>
  );
}
