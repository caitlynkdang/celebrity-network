import { useState } from 'react'

export default function SearchBar({ nodes, onSelect }) {
  const [query, setQuery] = useState('')
  const [open, setOpen]   = useState(false)

  const results = query.length < 2
    ? []
    : nodes
        .filter(n => n.name.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 8)

  function select(node) {
    setQuery(node.name)
    setOpen(false)
    onSelect(node)
  }

  return (
    <div style={{ position: 'relative', width: 220 }}>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Search celebrity…"
          style={{
            width: '100%',
            background:   '#1e293b',
            border:       '1px solid #334155',
            borderRadius:  6,
            padding:      '5px 28px 5px 10px',
            color:        '#f1f5f9',
            fontSize:      13,
            outline:      'none',
          }}
        />
        {query && (
          <button
            onMouseDown={() => { setQuery(''); setOpen(false); onSelect(null) }}
            style={{
              position:   'absolute', right: 6,
              background: 'none', border: 'none',
              color: '#64748b', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 0,
            }}
          >×</button>
        )}
      </div>

      {open && results.length > 0 && (
        <div style={{
          position:   'absolute', top: '100%', left: 0, right: 0, marginTop: 4,
          background: '#1e293b', border: '1px solid #334155', borderRadius: 6,
          zIndex: 200, overflow: 'hidden',
        }}>
          {results.map(n => (
            <div
              key={n.id}
              onMouseDown={() => select(n)}
              style={{
                padding: '7px 12px', fontSize: 13, color: '#e2e8f0', cursor: 'pointer',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#334155'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {n.name}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
