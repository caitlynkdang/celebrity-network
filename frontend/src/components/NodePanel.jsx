const RELATION_LABEL = {
  costar:       'Co-star',
  collaborator: 'Collaborator',
  spouse:       'Spouse',
  sibling:      'Sibling',
  child:        'Child',
}

const RELATION_COLOR = {
  costar:       '#94a3b8',
  collaborator: '#10b981',
  spouse:       '#ec4899',
  sibling:      '#fbbf24',
  child:        '#fbbf24',
}

function Stat({ label, value }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9' }}>{value}</div>
      <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{label}</div>
    </div>
  )
}

export default function NodePanel({ node, connections, onClose }) {
  if (!node) return null

  const byRelation = connections.reduce((acc, c) => {
    ;(acc[c.relation] ??= []).push(c)
    return acc
  }, {})

  return (
    <div style={{
      position:    'absolute',
      top:         60,
      right:       16,
      width:       280,
      background:  '#1e293b',
      border:      '1px solid #334155',
      borderRadius: 10,
      padding:     20,
      zIndex:      100,
      maxHeight:   'calc(100vh - 100px)',
      overflowY:   'auto',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9', lineHeight: 1.3 }}>{node.name}</div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>Community {node.community}</div>
        </div>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 18, cursor: 'pointer', lineHeight: 1 }}
        >×</button>
      </div>

      {/* Stats grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12,
        background: '#0f172a', borderRadius: 8, padding: '12px 8px', marginBottom: 20,
      }}>
        <Stat label="PageRank" value={`${(node.pagerank * 100).toFixed(2)}%`} />
        <Stat label="Degree"   value={(node.degree_centrality * 100).toFixed(1) + '%'} />
        <Stat label="Betweenness" value={node.betweenness_centrality.toFixed(3)} />
        <Stat label="Closeness"   value={node.closeness_centrality.toFixed(3)} />
      </div>

      {/* Connections */}
      <div style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Connections ({connections.length})
      </div>

      {Object.entries(byRelation).map(([rel, items]) => (
        <div key={rel} style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: RELATION_COLOR[rel] ?? '#94a3b8', flexShrink: 0 }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: RELATION_COLOR[rel] ?? '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {RELATION_LABEL[rel] ?? rel} ({items.length})
            </span>
          </div>
          {items.map((c, i) => (
            <div key={i} style={{ paddingLeft: 14, marginBottom: 4 }}>
              <div style={{ fontSize: 13, color: '#e2e8f0' }}>{c.name}</div>
              {c.context && (
                <div style={{ fontSize: 11, color: '#475569' }}>{c.context}</div>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
