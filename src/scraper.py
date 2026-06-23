import json
import time
from dataclasses import dataclass
from typing import Optional

import requests

SPARQL_ENDPOINT = "https://query.wikidata.org/sparql"
WIKIDATA_API = "https://www.wikidata.org/w/api.php"
HEADERS = {"User-Agent": "celebrity-network-scraper/0.1 (research project)"}


def _get(url: str, params: dict, retries: int = 5) -> requests.Response:
    """GET with exponential backoff on 429 / 5xx."""
    delay = 2
    for attempt in range(retries):
        resp = requests.get(url, params=params, headers=HEADERS)
        if resp.status_code == 429 or resp.status_code >= 500:
            wait = delay * (2 ** attempt)
            print(f"    Rate limited ({resp.status_code}), retrying in {wait}s…")
            time.sleep(wait)
            continue
        resp.raise_for_status()
        return resp
    resp.raise_for_status()
    return resp


@dataclass
class Node:
    qid: str
    name: str


@dataclass
class Edge:
    source: str   # QID
    target: str   # QID
    relation: str # "spouse" | "sibling" | "child" | "costar" | "collaborator"
    context: str  # film/song title, or "" for personal relations


def search_person(name: str) -> Optional[str]:
    """Return the QID for the best person match by name."""
    resp = _get(WIKIDATA_API, {
        "action": "wbsearchentities",
        "search": name,
        "language": "en",
        "type": "item",
        "format": "json",
        "limit": 5,
    })
    results = resp.json().get("search", [])
    celebrity_keywords = {
        "actor", "actress", "singer", "musician", "rapper",
        "model", "filmmaker", "director", "celebrity", "artist",
    }
    for r in results:
        desc = r.get("description", "").lower()
        if any(w in desc for w in celebrity_keywords):
            return r["id"]
    return results[0]["id"] if results else None


def get_label(qid: str) -> str:
    """Fetch the English label for a QID."""
    resp = _get(WIKIDATA_API, {
        "action": "wbgetentities",
        "ids": qid,
        "props": "labels",
        "languages": "en",
        "format": "json",
    })
    entity = resp.json().get("entities", {}).get(qid, {})
    return entity.get("labels", {}).get("en", {}).get("value", qid)


def _sparql(query: str) -> list[dict]:
    time.sleep(0.5)  # respect rate limits
    resp = _get(SPARQL_ENDPOINT, {"query": query, "format": "json"})
    return resp.json()["results"]["bindings"]


def get_family_relations(qid: str) -> tuple[list[Edge], list[Node]]:
    """Returns edges and the new nodes discovered (with labels from SPARQL)."""
    query = f"""
SELECT ?relType ?related ?relatedLabel WHERE {{
  VALUES (?prop ?relType) {{
    (wdt:P26 "spouse")
    (wdt:P3373 "sibling")
    (wdt:P40 "child")
  }}
  wd:{qid} ?prop ?related .
  SERVICE wikibase:label {{ bd:serviceParam wikibase:language "en" }}
}}
"""
    edges, nodes, seen = [], [], set()
    for row in _sparql(query):
        target_qid = row["related"]["value"].split("/")[-1]
        edges.append(Edge(source=qid, target=target_qid, relation=row["relType"]["value"], context=""))
        if target_qid not in seen:
            nodes.append(Node(qid=target_qid, name=row["relatedLabel"]["value"]))
            seen.add(target_qid)
    return edges, nodes


def get_film_costars(qid: str, limit: int = 50) -> tuple[list[Edge], list[Node]]:
    query = f"""
SELECT ?film ?filmLabel ?costar ?costarLabel WHERE {{
  ?film wdt:P161 wd:{qid} .
  ?film wdt:P161 ?costar .
  FILTER(?costar != wd:{qid})
  ?costar wdt:P31 wd:Q5 .
  SERVICE wikibase:label {{ bd:serviceParam wikibase:language "en" }}
}} LIMIT {limit}
"""
    edges, nodes, seen = [], [], set()
    for row in _sparql(query):
        costar_qid = row["costar"]["value"].split("/")[-1]
        edges.append(Edge(
            source=qid,
            target=costar_qid,
            relation="costar",
            context=row["filmLabel"]["value"],
        ))
        if costar_qid not in seen:
            nodes.append(Node(qid=costar_qid, name=row["costarLabel"]["value"]))
            seen.add(costar_qid)
    return edges, nodes


def get_music_collaborations(qid: str, limit: int = 50) -> tuple[list[Edge], list[Node]]:
    query = f"""
SELECT ?work ?workLabel ?collab ?collabLabel WHERE {{
  ?work wdt:P175 wd:{qid} .
  ?work wdt:P175 ?collab .
  FILTER(?collab != wd:{qid})
  ?collab wdt:P31 wd:Q5 .
  SERVICE wikibase:label {{ bd:serviceParam wikibase:language "en" }}
}} LIMIT {limit}
"""
    edges, nodes, seen = [], [], set()
    for row in _sparql(query):
        collab_qid = row["collab"]["value"].split("/")[-1]
        edges.append(Edge(
            source=qid,
            target=collab_qid,
            relation="collaborator",
            context=row["workLabel"]["value"],
        ))
        if collab_qid not in seen:
            nodes.append(Node(qid=collab_qid, name=row["collabLabel"]["value"]))
            seen.add(collab_qid)
    return edges, nodes


def build_network(
    seed_names: list[str],
    depth: int = 1,
    max_nodes: int = 500,
) -> dict:
    """
    Build a celebrity network starting from seed names.
    depth=1: fetch relationships for seeds only.
    depth=2: also fetch for their direct connections.
    max_nodes: stop expanding once this many nodes are collected.
    """
    nodes: dict[str, Node] = {}
    edges: list[Edge] = []

    seed_qids = []
    for name in seed_names:
        qid = search_person(name)
        if not qid:
            print(f"  Not found: {name}")
            continue
        label = get_label(qid)
        nodes[qid] = Node(qid=qid, name=label)
        seed_qids.append(qid)
        print(f"  Resolved: {name} → {qid} ({label})")

    to_process = set(seed_qids)
    processed: set[str] = set()

    for d in range(depth):
        # Use tighter per-node limits at deeper levels to control size
        limit = 50 if d == 0 else 20

        next_round: set[str] = set()
        total = len(to_process)
        for i, qid in enumerate(to_process, 1):
            if qid in processed:
                continue
            if len(nodes) >= max_nodes:
                print(f"  Reached max_nodes={max_nodes}, stopping expansion.")
                break
            processed.add(qid)
            print(f"  [{d+1}/{depth}] ({i}/{total}) {nodes[qid].name} — {len(nodes)} nodes so far")

            family_edges, family_nodes = get_family_relations(qid)
            for n in family_nodes:
                if n.qid not in nodes:
                    nodes[n.qid] = n
                    next_round.add(n.qid)
            edges.extend(family_edges)

            film_edges, film_nodes = get_film_costars(qid, limit=limit)
            music_edges, music_nodes = get_music_collaborations(qid, limit=limit)

            for n in film_nodes + music_nodes:
                if n.qid not in nodes:
                    nodes[n.qid] = n
                    next_round.add(n.qid)
            edges.extend(film_edges + music_edges)

        to_process = next_round

    return {
        "nodes": [{"id": n.qid, "name": n.name} for n in nodes.values()],
        "edges": [
            {"source": e.source, "target": e.target, "relation": e.relation, "context": e.context}
            for e in edges
        ],
    }


if __name__ == "__main__":
    import sys

    seeds = sys.argv[1:] or ["Taylor Swift", "Beyoncé"]
    print(f"Building network for: {seeds}")
    network = build_network(seeds, depth=2, max_nodes=500)

    output_path = "data/network.json"
    with open(output_path, "w") as f:
        json.dump(network, f, indent=2)

    print(f"\nSaved → {output_path}")
    print(f"  {len(network['nodes'])} nodes")
    print(f"  {len(network['edges'])} edges")
