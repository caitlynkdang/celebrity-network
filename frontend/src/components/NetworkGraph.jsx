import { useEffect, useRef } from 'react'
import * as d3 from 'd3'

const RELATION_COLORS = {
  costar:       '#475569',
  collaborator: '#059669',
  spouse:       '#db2777',
  sibling:      '#d97706',
  child:        '#d97706',
}

export default function NetworkGraph({ data, selectedId, focusNodeId, onNodeClick }) {
  const svgRef   = useRef(null)
  const nodeRef  = useRef(null)
  const linkRef  = useRef(null)
  const edgesRef = useRef(null)
  const zoomRef  = useRef(null)
  const nodesRef = useRef(null)

  // Build simulation once per data load
  useEffect(() => {
    if (!data || !svgRef.current) return
    const el = svgRef.current
    const width  = el.clientWidth  || 900
    const height = el.clientHeight || 700

    const nodes = data.nodes.map(d => ({ ...d }))
    const edges = data.edges.map(d => ({ ...d }))
    edgesRef.current = edges
    nodesRef.current = nodes

    const svg = d3.select(el)
    svg.selectAll('*').remove()

    const g = svg.append('g')
    const zoom = d3.zoom().scaleExtent([0.05, 10]).on('zoom', e => g.attr('transform', e.transform))
    svg.call(zoom)
    zoomRef.current = zoom

    const maxPR = d3.max(nodes, d => d.pagerank) || 1
    const radius = d3.scaleSqrt().domain([0, maxPR]).range([4, 22])
    const color  = d3.scaleOrdinal(d3.schemeTableau10)

    const sim = d3.forceSimulation(nodes)
      .force('link',    d3.forceLink(edges).id(d => d.id).distance(70).strength(0.4))
      .force('charge',  d3.forceManyBody().strength(-150))
      .force('center',  d3.forceCenter(0, 0))
      .force('collide', d3.forceCollide().radius(d => radius(d.pagerank) + 4))

    const link = g.append('g')
      .selectAll('line')
      .data(edges)
      .join('line')
      .attr('stroke', d => RELATION_COLORS[d.relation] ?? '#475569')
      .attr('stroke-opacity', 0.5)
      .attr('stroke-width', d => Math.sqrt(d.weight) + 0.5)

    const node = g.append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .style('cursor', 'pointer')
      .call(
        d3.drag()
          .on('start', (e, d) => { if (!e.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y })
          .on('drag',  (e, d) => { d.fx = e.x; d.fy = e.y })
          .on('end',   (e, d) => { if (!e.active) sim.alphaTarget(0); d.fx = null; d.fy = null })
      )

    node.append('circle')
      .attr('r',            d => radius(d.pagerank))
      .attr('fill',         d => color(d.community))
      .attr('stroke',       '#0f172a')
      .attr('stroke-width', 1.5)

    // Label only top 5% by pagerank
    const labelFloor = d3.quantile(nodes.map(d => d.pagerank).sort(d3.ascending), 0.95) ?? 0
    node.filter(d => d.pagerank >= labelFloor)
      .append('text')
      .text(d => d.name)
      .attr('dy', d => -radius(d.pagerank) - 4)
      .attr('text-anchor', 'middle')
      .attr('fill', '#f1f5f9')
      .attr('font-size', 11)
      .attr('font-weight', 600)
      .style('pointer-events', 'none')

    // Tooltip
    const tip = d3.select('body').append('div')
      .style('position',       'fixed')
      .style('background',     'rgba(15,23,42,0.95)')
      .style('color',          '#e2e8f0')
      .style('padding',        '8px 12px')
      .style('border-radius',  '6px')
      .style('font-size',      '12px')
      .style('line-height',    '1.7')
      .style('pointer-events', 'none')
      .style('border',         '1px solid #334155')
      .style('opacity',        0)
      .style('z-index',        1000)

    node
      .on('mouseover', (event, d) => {
        tip.html(
          `<strong>${d.name}</strong><br/>` +
          `PageRank: ${(d.pagerank * 100).toFixed(2)}%<br/>` +
          `Connections: ${Math.round(d.degree_centrality * (nodes.length - 1))}`
        ).style('opacity', 1)
      })
      .on('mousemove', e => tip.style('left', `${e.clientX + 14}px`).style('top', `${e.clientY - 8}px`))
      .on('mouseout',  () => tip.style('opacity', 0))
      .on('click', (event, d) => { event.stopPropagation(); onNodeClick?.(d) })

    svg.on('click', () => onNodeClick?.(null))

    sim.on('tick', () => {
      link
        .attr('x1', d => d.source.x).attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x).attr('y2', d => d.target.y)
      node.attr('transform', d => `translate(${d.x},${d.y})`)
    })

    nodeRef.current = node
    linkRef.current = link

    return () => { sim.stop(); tip.remove() }
  }, [data])

  // Zoom to focused node
  useEffect(() => {
    if (!focusNodeId || !zoomRef.current || !nodesRef.current || !svgRef.current) return
    const target = nodesRef.current.find(n => n.id === focusNodeId)
    if (!target || target.x == null) return
    const el = svgRef.current
    d3.select(el).transition().duration(600).call(
      zoomRef.current.transform,
      d3.zoomIdentity
        .translate(el.clientWidth / 2, el.clientHeight / 2)
        .scale(3)
        .translate(-target.x, -target.y)
    )
  }, [focusNodeId])

  // Highlight selected node + its neighbors
  useEffect(() => {
    const node  = nodeRef.current
    const link  = linkRef.current
    const edges = edgesRef.current
    if (!node || !link) return

    if (!selectedId) {
      node.select('circle').attr('opacity', 1).attr('stroke', '#0f172a').attr('stroke-width', 1.5)
      link.attr('opacity', 0.5)
      return
    }

    const neighbors = new Set()
    ;(edges ?? []).forEach(e => {
      const src = typeof e.source === 'object' ? e.source.id : e.source
      const tgt = typeof e.target === 'object' ? e.target.id : e.target
      if (src === selectedId) neighbors.add(tgt)
      if (tgt === selectedId) neighbors.add(src)
    })

    node.select('circle')
      .attr('opacity',      d => d.id === selectedId || neighbors.has(d.id) ? 1 : 0.1)
      .attr('stroke',       d => d.id === selectedId ? '#fff' : '#0f172a')
      .attr('stroke-width', d => d.id === selectedId ? 3 : 1.5)

    link.attr('opacity', d => {
      const src = typeof d.source === 'object' ? d.source.id : d.source
      const tgt = typeof d.target === 'object' ? d.target.id : d.target
      return src === selectedId || tgt === selectedId ? 0.9 : 0.04
    })
  }, [selectedId])

  return <svg ref={svgRef} style={{ width: '100%', height: '100%' }} />
}
