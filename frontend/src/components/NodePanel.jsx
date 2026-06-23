import { useState } from 'react'

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

const METRIC_INFO = {
  PageRank:     'Overall star power — measures influence based on who you\'re connected to, not just how many people.',
  Degree:       'Direct connections — the percentage of people in the network this person is directly linked to.',
  Betweenness:  'Bridge score — how often this person is the only link between two different groups. High = key connector.',
  Closeness:    'Reach — how quickly this person can connect to anyone in the network through friends of friends.',
}

function InfoTooltip({ text }) {
  const [visible, setVisible] = useState(false)
  return (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <span
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        style={{
          display:      'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 14, height: 14, borderRadius: '50%',
          background: '#334155', color: '#94a3b8',
          fontSize: 9, fontWeight: 700, cursor: 'default',
          marginLeft: 4, flexShrink: 0, userSelect: 'none',
        }}
      >i</span>
      {visible && (
        <span style={{
          position:   'absolute', bottom: '120%', left: '50%',
          transform:  'translateX(-50%)',
          background: '#0f172a', border: '1px solid #334155',
          borderRadius: 6, padding: '7px 10px',
          fontSize: 11, color: '#cbd5e1', lineHeight: 1.5,
          width: 200, zIndex: 300, pointerEvents: 'none',
          whiteSpace: 'normal', textAlign: 'left',
        }}>
          {text}
        </span>
      )}
    </span>
  )
}

function Stat({ label, value }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9' }}>{value}</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 3 }}>
        <span style={{ fontSize: 11, color: '#64748b' }}>{label}</span>
        {METRIC_INFO[label] && <InfoTooltip text={METRIC_INFO[label]} />}
      </div>
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
      position:     'absolute',
      top:          60,
      right:        16,
      width:        280,
      background:   '#1e293b',
      border:       '1px solid #334155',
      borderRadius: 10,
      padding:      20,
      zIndex:       100,
      maxHeight:    'calc(100vh - 100px)',
      overflowY:    'auto',
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
        <Stat label="PageRank"    value={`${(node.pagerank * 100).toFixed(2)}%`} />
        <Stat label="Degree"      value={(node.degree_centrality * 100).toFixed(1) + '%'} />
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
