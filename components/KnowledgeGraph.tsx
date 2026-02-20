import { useEffect, useMemo, useState } from 'react';
import ReactFlow, { Background, Controls, MiniMap, MarkerType, Node, Edge } from 'reactflow';
import 'reactflow/dist/style.css';
import type { GraphEdge, GraphNode } from '@/types';

const TYPE_COLORS: Record<string, string> = {
  note: 'var(--color-aurora)',
  link: 'var(--color-ember)',
  insight: 'var(--color-neural)',
  article: 'var(--color-aurora)',
};

interface GraphPayload {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

function layoutNodes(items: GraphNode[]): Node[] {
  const radius = Math.max(220, items.length * 7);
  const centerX = 360;
  const centerY = 260;

  return items.map((item, index) => {
    const angle = (index / Math.max(items.length, 1)) * Math.PI * 2;
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);

    return {
      id: item.id,
      position: { x, y },
      data: { label: item.label },
      style: {
        border: `1px solid ${TYPE_COLORS[item.type] || 'var(--color-border)'}`,
        background: 'rgba(10,10,18,0.95)',
        color: 'var(--color-text)',
        borderRadius: 12,
        padding: '8px 10px',
        fontSize: 12,
        width: 180,
      },
    };
  });
}

function mapEdges(edges: GraphEdge[]): Edge[] {
  return edges.map(edge => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    markerEnd: { type: MarkerType.ArrowClosed },
    label: `${Math.round(edge.weight * 100)}%`,
    style: {
      stroke: 'rgba(78,205,196,0.45)',
      strokeWidth: Math.max(1.2, Math.min(3, edge.weight * 4)),
    },
    labelStyle: { fill: 'var(--color-muted)', fontSize: 11 },
  }));
}

export default function KnowledgeGraph() {
  const [data, setData] = useState<GraphPayload>({ nodes: [], edges: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    const run = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/graph?limit=90');
        const json = await res.json();
        if (alive && res.ok) {
          setData(json.data || { nodes: [], edges: [] });
        }
      } finally {
        if (alive) setLoading(false);
      }
    };

    run();
    return () => {
      alive = false;
    };
  }, []);

  const nodes = useMemo(() => layoutNodes(data.nodes), [data.nodes]);
  const edges = useMemo(() => mapEdges(data.edges), [data.edges]);

  if (loading) {
    return (
      <div className="glass" style={{ borderRadius: 18, padding: 18 }} aria-busy="true" aria-live="polite">
        <div style={{ color: 'var(--color-muted)', fontSize: 13 }}>Loading knowledge graph...</div>
      </div>
    );
  }

  if (!data.nodes.length) {
    return (
      <div className="glass" style={{ borderRadius: 18, padding: 18 }}>
        <div style={{ color: 'var(--color-muted)', fontSize: 13 }}>Add more items to visualize relationships.</div>
      </div>
    );
  }

  return (
    <div className="glass" style={{ borderRadius: 18, padding: 10 }}>
      <div style={{ height: 520 }} aria-label="Knowledge relationship graph">
        <ReactFlow nodes={nodes} edges={edges} fitView nodesConnectable={false} nodesDraggable>
          <MiniMap
            nodeColor={() => 'rgba(157,78,221,0.6)'}
            maskColor="rgba(5,5,8,0.7)"
            style={{ background: 'rgba(5,5,8,0.9)' }}
          />
          <Controls />
          <Background color="rgba(255,255,255,0.08)" gap={20} />
        </ReactFlow>
      </div>
    </div>
  );
}
