# Engram V2 Specification

**Version:** 2.0.0  
**Date:** February 28, 2026  
**Author:** Terronex  
**Status:** Final

---

## Abstract

Engram is a binary format for storing semantic memory with embedded vectors. V2 extends the format with **typed links** between nodes, enabling knowledge graphs and reasoning chains beyond hierarchical parent-child relationships.

## Design Principles

1. **Backward Compatible** — V2 readers handle V1 files seamlessly
2. **Forward Compatible** — V1 readers ignore unknown V2 fields
3. **Minimal** — Only add what provides clear value
4. **Portable** — One file, works everywhere
5. **Cross-SDK Parity** — TypeScript, Python, Rust, Go remain interoperable

---

## File Structure

```
┌─────────────────────────────────────────────────────────┐
│ MAGIC          │ 6 bytes   │ "ENGRAM" (ASCII)          │
├────────────────┼───────────┼───────────────────────────┤
│ VERSION        │ 2 bytes   │ uint16 LE                 │
├────────────────┼───────────┼───────────────────────────┤
│ HEADER_LEN     │ 4 bytes   │ uint32 LE                 │
├────────────────┼───────────┼───────────────────────────┤
│ HEADER         │ variable  │ MessagePack               │
├────────────────┼───────────┼───────────────────────────┤
│ PAYLOAD        │ variable  │ MessagePack               │
└─────────────────────────────────────────────────────────┘
```

### Magic Bytes

```
0x45 0x4E 0x47 0x52 0x41 0x4D  →  "ENGRAM"
```

### Version

| Version | Bytes         | Description           |
|---------|---------------|-----------------------|
| 1.0     | `0x01 0x00`   | Original format       |
| 2.0     | `0x02 0x00`   | Graph extensions      |

---

## Header Schema

```typescript
interface Header {
  // Timestamps (Unix milliseconds)
  created: number;
  modified: number;
  
  // Format version
  version: [number, number];  // [major, minor]
  
  // Integrity check (SHA-256 of payload bytes)
  integrity?: string;
  
  // V2: Embedding configuration
  embedding: {
    model: string;        // e.g., "all-MiniLM-L6-v2"
    dimensions: number;   // e.g., 384
    provider: string;     // "local" | "ollama" | "openai"
  };
  
  // V2: Spatial metadata (optional)
  spatial?: {
    dimensions: 2 | 3;
    projection: "umap" | "tsne" | "pca" | "manual";
  };
  
  // V2: Custom link types beyond defaults (optional)
  linkTypes?: string[];
}
```

### Default Embedding

For V1 files and V2 files without explicit config:

```typescript
const DEFAULT_EMBEDDING = {
  model: "all-MiniLM-L6-v2",
  dimensions: 384,
  provider: "local"
};
```

---

## Node Schema

```typescript
interface Node {
  // ═══════════════════════════════════════════════════════════
  // CORE FIELDS (V1, required)
  // ═══════════════════════════════════════════════════════════
  
  id: string;                    // Unique identifier
  type: "text" | "image" | "audio" | "chunk";
  content: string;               // Memory content
  embedding: number[];           // Vector (default: 384 floats)
  timestamp: number;             // Unix milliseconds
  
  parentId: string | null;       // Parent node ID
  children: string[];            // Child node IDs
  tags: string[];                // User/system tags
  
  // ═══════════════════════════════════════════════════════════
  // GRAPH FIELDS (V2, optional)
  // ═══════════════════════════════════════════════════════════
  
  links?: Link[];                // Non-hierarchical connections
  position?: Position;           // Spatial coordinates
  confidence?: number;           // 0.0 - 1.0 reliability score
}
```

---

## Link Schema

Links enable graph relationships beyond the parent-child tree.

```typescript
interface Link {
  target: string;                // Target node ID
  type: LinkType;                // Relationship type
  weight?: number;               // 0.0 - 1.0 strength (default: 1.0)
  bidirectional?: boolean;       // Default: false
  created?: number;              // Unix milliseconds
}

type LinkType =
  | "related"        // General association
  | "supports"       // Evidence for a claim
  | "contradicts"    // Conflicts with
  | "follows"        // Temporal or logical sequence
  | "derived_from"   // Created from this source
  | "similar_to"     // High embedding similarity (auto-generated)
  | string;          // Custom types allowed
```

### Default Link Types

| Type           | Semantics                                    |
|----------------|----------------------------------------------|
| `related`      | General association between nodes            |
| `supports`     | Source provides evidence for target          |
| `contradicts`  | Source conflicts with target                 |
| `follows`      | Source comes after target (sequence)         |
| `derived_from` | Source was created from target               |
| `similar_to`   | High embedding similarity (auto-inferred)    |

### Link Direction

Links are **unidirectional** by default:

```
A ──supports──▶ B

Y A supports B
N B does NOT support A
```

Set `bidirectional: true` for symmetric relationships:

```
A ◀──related──▶ B

Y A relates to B
Y B relates to A
```

---

## Position Schema

Positions are **optional**. Store only for user-pinned nodes.

```typescript
interface Position {
  x: number;           // X coordinate
  y: number;           // Y coordinate
  z?: number;          // Z coordinate (optional, for 3D)
  pinned?: boolean;    // If true, don't auto-recompute
}
```

### Position Computation

For nodes without stored positions, compute via dimensionality reduction:

| Method | Speed   | Quality | Use Case          |
|--------|---------|---------|-------------------|
| UMAP   | Fast    | Good    | Default choice    |
| t-SNE  | Slow    | Better  | Publication       |
| PCA    | Fastest | Basic   | Quick preview     |

Positions derived from embeddings should NOT be stored (recompute on load).

---

## Backward Compatibility

### V2 Reader + V1 File

```typescript
function load(buffer: Uint8Array): Brain {
  const version = readVersion(buffer);  // bytes 6-7
  
  if (version === 1) {
    const v1Data = parseV1(buffer);
    return {
      ...v1Data,
      header: {
        ...v1Data.header,
        embedding: DEFAULT_EMBEDDING  // Assume V1 default
      }
    };
  }
  
  return parseV2(buffer);
}
```

### V1 Reader + V2 File

MessagePack ignores unknown fields. V1 readers will:

- Y Read all V1 fields correctly
- Y Function normally
- N Ignore `links`, `position`, `confidence`

---

## Payload Structure

The payload is a MessagePack-encoded object:

```typescript
interface Payload {
  nodes: Node[];
}
```

### Serialization Notes

1. **Embeddings**: Serialize as array of numbers (float64 in MessagePack)
2. **Integrity**: Compute SHA-256 of payload bytes BEFORE encoding header
3. **Compression**: Not specified; implementers may compress payload externally

---

## Graph API

V2-compliant implementations SHOULD provide these methods:

```typescript
interface EngramV2 {
  // === V1 Methods (unchanged) ===
  add(content: string, parentId?: string, tags?: string[]): Promise<string>;
  recall(query: string, limit?: number): Promise<Node[]>;
  get(id: string): Node | null;
  delete(id: string): Promise<void>;
  save(): Promise<void>;
  
  // === V2 Link Methods ===
  addLink(sourceId: string, targetId: string, type: LinkType, weight?: number): void;
  removeLink(sourceId: string, targetId: string): void;
  getLinks(nodeId: string, direction?: "outgoing" | "incoming" | "both"): Link[];
  getLinkedNodes(nodeId: string, type?: LinkType): Node[];
  
  // === V2 Graph Traversal ===
  findPath(fromId: string, toId: string, maxDepth?: number): Node[] | null;
  getNeighborhood(nodeId: string, depth?: number): Node[];
  
  // === V2 Auto-Linking ===
  autoLinkSimilar(threshold?: number): number;  // Returns count of links created
}
```

---

## Auto-Linking Algorithm

Implementations MAY auto-generate `similar_to` links:

```typescript
function autoLinkSimilar(nodes: Node[], threshold = 0.85): Link[] {
  const links: Link[] = [];
  
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const similarity = cosineSimilarity(
        nodes[i].embedding,
        nodes[j].embedding
      );
      
      if (similarity >= threshold) {
        links.push({
          source: nodes[i].id,
          target: nodes[j].id,
          type: "similar_to",
          weight: similarity,
          bidirectional: true
        });
      }
    }
  }
  
  return links;
}
```

---

## File Size Impact

| Component              | V1        | V2          | Delta   |
|------------------------|-----------|-------------|---------|
| Node base              | ~1.5 KB   | ~1.5 KB     | 0%      |
| Links (avg 3/node)     | —         | ~100 bytes  | +7%     |
| Position (if pinned)   | —         | ~24 bytes   | +2%     |
| Embedding config       | —         | ~50 bytes   | +0.1%   |
| **Typical total**      | ~1.5 KB   | ~1.6 KB     | **~10%**|

---

## Example File

### Hex Dump (Header Region)

```
00000000: 454e 4752 414d 0200 b401 0000 ...
          ├─────────┤├───┤├───────┤
          │         │    │
          ENGRAM    v2.0 header_len=436
```

### Decoded Header

```json
{
  "created": 1740700800000,
  "modified": 1740704400000,
  "version": [2, 0],
  "embedding": {
    "model": "all-MiniLM-L6-v2",
    "dimensions": 384,
    "provider": "local"
  }
}
```

### Decoded Node

```json
{
  "id": "mm7x9k2f-abc123",
  "type": "text",
  "content": "Coffee improves focus and productivity",
  "embedding": [0.0234, -0.0891, 0.1456, ...],
  "timestamp": 1740700800000,
  "parentId": null,
  "children": [],
  "tags": ["health", "productivity"],
  
  "links": [
    {
      "target": "mm7x9k2f-def456",
      "type": "supports",
      "weight": 0.92
    },
    {
      "target": "mm7x9k2f-ghi789",
      "type": "contradicts",
      "weight": 0.78
    }
  ],
  "position": {
    "x": 234.5,
    "y": 567.8,
    "pinned": true
  },
  "confidence": 0.85
}
```

---

## SDK Checklist

Implementations MUST:

- [ ] Read V1 and V2 files
- [ ] Write V2 files with correct version byte
- [ ] Include embedding config in header
- [ ] Support optional `links`, `position`, `confidence` fields
- [ ] Ignore unknown fields (forward compatibility)

Implementations SHOULD:

- [ ] Provide `addLink`, `getLinks`, `getLinkedNodes` methods
- [ ] Provide `findPath`, `getNeighborhood` for graph traversal
- [ ] Provide `autoLinkSimilar` for automatic link inference

---

## Future Considerations (Not This Spec)

Reserved for potential V2.x or V3:

- **Encryption**: Optional payload encryption (AES-256-GCM)
- **Compression**: Built-in payload compression
- **Streaming**: Chunked format for large files
- **Multi-embedding**: Multiple vector spaces per node
- **Temporal links**: Valid-from/valid-until timestamps
- **Link metadata**: Arbitrary key-value on links

---

## Summary

Engram V2 transforms the memory format from a **tree** to a **graph**:

| Feature            | V1  | V2  |
|--------------------|-----|-----|
| Semantic search    | Y   | Y   |
| Hierarchical tree  | Y   | Y   |
| Typed links        | N   | Y   |
| Graph traversal    | N   | Y   |
| Spatial positions  | N   | Y   |
| Confidence scores  | N   | Y   |
| Embedding config   | N   | Y   |

The format remains simple, portable, and efficient while enabling knowledge graph capabilities essential for agent reasoning.

---

## License

This specification is released under MIT License.

---

*Engram V2: From trees to graphs. From search to reasoning.*
