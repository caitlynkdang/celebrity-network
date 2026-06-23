import json

import networkx as nx
from networkx.algorithms.community import greedy_modularity_communities


def load_graph(path: str = "data/network.json") -> nx.Graph:
    """
    Load network JSON into a weighted undirected graph.
    Multiple edges between the same pair are collapsed into one
    with weight = number of shared projects.
    """
    with open(path) as f:
        data = json.load(f)

    G = nx.Graph()

    for node in data["nodes"]:
        G.add_node(node["id"], name=node["name"])

    for edge in data["edges"]:
        u, v = edge["source"], edge["target"]
        ctx = {"relation": edge["relation"], "context": edge["context"]}
        if G.has_edge(u, v):
            G[u][v]["weight"] += 1
            G[u][v]["contexts"].append(ctx)
        else:
            G.add_edge(u, v, weight=1, relation=edge["relation"], contexts=[ctx])

    return G


def summary(G: nx.Graph) -> dict:
    """High-level graph statistics."""
    components = list(nx.connected_components(G))
    largest = max(components, key=len)
    return {
        "nodes": G.number_of_nodes(),
        "edges": G.number_of_edges(),
        "density": round(nx.density(G), 4),
        "connected_components": len(components),
        "largest_component": len(largest),
        "avg_degree": round(sum(d for _, d in G.degree()) / G.number_of_nodes(), 2),
        "avg_clustering": round(nx.average_clustering(G), 4),
    }


def centrality(G: nx.Graph) -> dict[str, dict]:
    """Compute degree, betweenness, closeness, and PageRank."""
    return {
        "degree": nx.degree_centrality(G),
        "betweenness": nx.betweenness_centrality(G, weight="weight"),
        "closeness": nx.closeness_centrality(G),
        "pagerank": nx.pagerank(G, weight="weight"),
    }


def communities(G: nx.Graph) -> dict[str, int]:
    """Assign each node a community ID via greedy modularity."""
    result = greedy_modularity_communities(G)
    return {node: i for i, community in enumerate(result) for node in community}


def shortest_path(G: nx.Graph, source: str, target: str) -> list[str]:
    """
    Return the shortest path between two celebrities by name.
    Returns an empty list if either name is not found or no path exists.
    """
    name_to_qid = {attrs["name"]: qid for qid, attrs in G.nodes(data=True)}
    src_qid = name_to_qid.get(source)
    tgt_qid = name_to_qid.get(target)

    if not src_qid or not tgt_qid:
        missing = [n for n, q in [(source, src_qid), (target, tgt_qid)] if not q]
        print(f"  Not found in graph: {missing}")
        return []

    try:
        path = nx.shortest_path(G, src_qid, tgt_qid)
        return [G.nodes[qid]["name"] for qid in path]
    except nx.NetworkXNoPath:
        return []


def top_n(scores: dict[str, float], G: nx.Graph, n: int = 10) -> list[dict]:
    """Return top-n nodes by score, with names resolved."""
    ranked = sorted(scores.items(), key=lambda x: x[1], reverse=True)[:n]
    return [{"name": G.nodes[qid]["name"], "score": round(score, 4)} for qid, score in ranked]


def enrich_and_export(G: nx.Graph, output_path: str = "data/network_enriched.json") -> str:
    """
    Attach centrality scores and community labels to each node,
    then write a self-contained JSON suitable for D3.js.
    """
    c = centrality(G)
    comm = communities(G)

    nodes = [
        {
            "id": qid,
            "name": attrs["name"],
            "degree_centrality": round(c["degree"].get(qid, 0), 4),
            "betweenness_centrality": round(c["betweenness"].get(qid, 0), 4),
            "closeness_centrality": round(c["closeness"].get(qid, 0), 4),
            "pagerank": round(c["pagerank"].get(qid, 0), 6),
            "community": comm.get(qid, -1),
        }
        for qid, attrs in G.nodes(data=True)
    ]

    edges = [
        {
            "source": u,
            "target": v,
            "weight": attrs["weight"],
            "relation": attrs["relation"],
            "contexts": attrs["contexts"],
        }
        for u, v, attrs in G.edges(data=True)
    ]

    with open(output_path, "w") as f:
        json.dump({"nodes": nodes, "edges": edges}, f, indent=2)

    return output_path


if __name__ == "__main__":
    G = load_graph()

    print("=== Graph Summary ===")
    for k, v in summary(G).items():
        print(f"  {k}: {v}")

    c = centrality(G)

    print("\n=== Top 10 by PageRank ===")
    for row in top_n(c["pagerank"], G):
        print(f"  {row['name']}: {row['score']}")

    print("\n=== Top 10 by Betweenness Centrality ===")
    for row in top_n(c["betweenness"], G):
        print(f"  {row['name']}: {row['score']}")

    print("\n=== Top 10 by Degree Centrality ===")
    for row in top_n(c["degree"], G):
        print(f"  {row['name']}: {row['score']}")

    print("\n=== Shortest Path: Taylor Swift → Selena Gomez ===")
    path = shortest_path(G, "Taylor Swift", "Selena Gomez")
    print(f"  {' → '.join(path) if path else 'No path found'}")

    out = enrich_and_export(G)
    print(f"\n=== Enriched export saved → {out} ===")
