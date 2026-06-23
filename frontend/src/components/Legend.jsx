const ITEMS = [
  { label: 'Co-star',       color: '#475569' },
  { label: 'Collaborator',  color: '#059669' },
  { label: 'Spouse',        color: '#db2777' },
  { label: 'Sibling/Child', color: '#d97706' },
]

export default function Legend({ stats }) {
  return (
    <div style={{
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'space-between',
      padding:        '8px 20px',
      background:     '#0f172a',
      borderTop:      '1px solid #1e293b',
      flexShrink:     0,
    }}>
      <div style={{ display: 'flex', gap: 20 }}>
        {ITEMS.map(({ label, color }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 10, height: 2, background: color, display: 'inline-block' }} />
            <span style={{ fontSize: 12, color: '#64748b' }}>{label}</span>
          </div>
        ))}
      </div>
      {stats && (
        <div style={{ display: 'flex', gap: 20 }}>
          <span style={{ fontSize: 12, color: '#64748b' }}>{stats.nodes} nodes</span>
          <span style={{ fontSize: 12, color: '#64748b' }}>{stats.edges} edges</span>
        </div>
      )}
    </div>
  )
}
