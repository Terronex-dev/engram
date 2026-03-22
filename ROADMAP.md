# Engram Roadmap

## Phase 1 (v2.2.0): Task-Aware Retrieval Routing [SHIPPED]

Context-driven reranking so search results reflect what the agent is
actually trying to do, not just raw embedding similarity.

- Task context-driven reranking via `rerankWithContext`
- Access pattern logging and learning via `recordAccess`
- Intent-tag matching (configurable intent-to-tag mapping)
- Graph-neighbor boosting (linked nodes near recent work get promoted)
- Content-type / domain matching (code nodes for debugging, text for research)
- Recency-weighted usefulness scoring from access history
- New SearchOptions fields: `taskContext`, `graph`, `recentNodeIds`
- New types: `TaskContext`, `AccessEntry`, `RerankOptions`
- Fully backward compatible with v2.1.x

## Phase 2 (v2.3.0): Hierarchical Cluster Summaries [PLANNED]

Scale retrieval to 100k+ nodes by clustering related memories and
searching clusters before individual nodes.

- Automatic clustering of related memories based on access patterns from Phase 1
- Cluster-level summary embeddings for faster coarse search
- Two-stage retrieval: cluster search then node search within matching clusters
- Scales to 100k+ nodes without linear search degradation
- Cluster maintenance: incremental updates as new nodes are added

## Phase 3 (v2.4.0): Memory Metacognition [PLANNED]

Let the agent reason about what it does and does not know.

- Knowledge gap detection from failed or low-relevance queries
- Gap nodes as a first-class memory type (explicit "I don't know about X" records)
- Automatic gap filling when new relevant information arrives
- "What don't I know about X?" query support
- Confidence calibration across the memory store
