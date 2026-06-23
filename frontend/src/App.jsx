import { useState, useEffect, useMemo, useCallback } from 'react'
import NetworkGraph from './components/NetworkGraph.jsx'
import NodePanel from './components/NodePanel.jsx'
import Legend from './components/Legend.jsx'

export default function App() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [selectedNode, setSelectedNode] = useState(null)

  useEffect(() => {
    fetch('/network_enriched.json')
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(setData)
      .catch(e => setError(e.message))
  }, [])

  // Map from QID → node for fast lookup
  const nodeMap = useMemo(() => {
    if (!data) return {}
    return Object.fromEntries(data.nodes.map(n => [n.id, n]))
  }, [data])

  // Adjacency list: QID → [{ id, name, relation, context }]
  const adjacency = useMemo(() => {
    if (!data) return {}
    const map = {}
    data.edges.forEach(e => {
      ;(map[e.source] ??= []).push({ id: e.target, name: nodeMap[e.target]?.name ?? e.target, relation: e.relation, context: e.contexts?.[0]?.context ?? '' })
      ;(map[e.target] ??= []).push({ id: e.source, name: nodeMap[e.source]?.name ?? e.source, relation: e.relation, context: e.contexts?.[0]?.context ?? '' })
    })
    return map
  }, [data, nodeMap])

  const connections = useMemo(
    () => (selectedNode ? adjacency[selectedNode.id] ?? [] : []),
    [selectedNode, adjacency]
  )

  const handleNodeClick = useCallback((node) => setSelectedNode(node), [])

  if (error) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 12 }}>
      <div style={{ color: '#ef4444', fontSize: 16 }}>Failed to load network data</div>
      <div style={{ color: '#64748b', fontSize: 13 }}>
        Run <code style={{ background: '#1e293b', padding: '2px 6px', borderRadius: 4 }}>python src/graph.py</code> first to generate the data.
      </div>
      <div style={{ color: '#475569', fontSize: 12 }}>{error}</div>
    </div>
  )

  if (!data) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#64748b' }}>
      Loading network…
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', position: 'relative' }}>
      {/* Header */}
      <div style={{
        padding:     '10px 20px',
        borderBottom: '1px solid #1e293b',
        display:     'flex',
        alignItems:  'center',
        gap:         12,
        flexShrink:  0,
      }}>
        <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.01em' }}>Celebrity Network</span>
        <span style={{ fontSize: 12, color: '#475569' }}>scroll to zoom · drag to pan · click node to explore</span>
      </div>

      {/* Graph */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <NetworkGraph
          data={data}
          selectedId={selectedNode?.id ?? null}
          onNodeClick={handleNodeClick}
        />
        <NodePanel
          node={selectedNode}
          connections={connections}
          onClose={() => setSelectedNode(null)}
        />
      </div>

      {/* Legend */}
      <Legend stats={{ nodes: data.nodes.length, edges: data.edges.length }} />
    </div>
  )
}
