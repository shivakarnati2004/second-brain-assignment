export default function SkeletonCard() {
  return (
    <div className="glass" style={{ borderRadius: 18, padding: 22 }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <div className="skeleton" style={{ width: 60, height: 22, borderRadius: 999 }} />
      </div>
      <div className="skeleton" style={{ width: '85%', height: 20, borderRadius: 6, marginBottom: 8 }} />
      <div className="skeleton" style={{ width: '60%', height: 20, borderRadius: 6, marginBottom: 16 }} />
      <div className="skeleton" style={{ width: '100%', height: 14, borderRadius: 4, marginBottom: 6 }} />
      <div className="skeleton" style={{ width: '100%', height: 14, borderRadius: 4, marginBottom: 6 }} />
      <div className="skeleton" style={{ width: '70%', height: 14, borderRadius: 4, marginBottom: 16 }} />
      <div style={{ display: 'flex', gap: 6 }}>
        <div className="skeleton" style={{ width: 60, height: 20, borderRadius: 999 }} />
        <div className="skeleton" style={{ width: 70, height: 20, borderRadius: 999 }} />
      </div>
    </div>
  );
}
