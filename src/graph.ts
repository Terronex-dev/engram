/**
 * Engram V2 Graph Extensions
 * 
 * Graph traversal, spatial positions, and auto-linking
 */

import { MemoryNode, MemoryLink, LinkType } from './types';
import { MemoryTree, cosineSimilarity } from './core';

// ============== POSITION ==============

export interface Position {
  x: number;
  y: number;
  z?: number;
  pinned?: boolean;
}

// ============== GRAPH TRAVERSAL ==============

export class MemoryGraph {
  private tree: MemoryTree;
  private links: Map<string, MemoryLink> = new Map();
  private outgoingLinks: Map<string, Set<string>> = new Map(); // nodeId -> Set<linkId>
  private incomingLinks: Map<string, Set<string>> = new Map(); // nodeId -> Set<linkId>
  private positions: Map<string, Position> = new Map();

  constructor(tree: MemoryTree, links: MemoryLink[] = []) {
    this.tree = tree;
    for (const link of links) {
      this.addLink(link);
    }
  }

  // ============== LINK MANAGEMENT ==============

  addLink(link: MemoryLink): void {
    this.links.set(link.id, link);

    // Index outgoing
    if (!this.outgoingLinks.has(link.sourceId)) {
      this.outgoingLinks.set(link.sourceId, new Set());
    }
    this.outgoingLinks.get(link.sourceId)!.add(link.id);

    // Index incoming
    if (!this.incomingLinks.has(link.targetId)) {
      this.incomingLinks.set(link.targetId, new Set());
    }
    this.incomingLinks.get(link.targetId)!.add(link.id);

    // If bidirectional, add reverse indexes
    if (link.bidirectional) {
      if (!this.outgoingLinks.has(link.targetId)) {
        this.outgoingLinks.set(link.targetId, new Set());
      }
      this.outgoingLinks.get(link.targetId)!.add(link.id);

      if (!this.incomingLinks.has(link.sourceId)) {
        this.incomingLinks.set(link.sourceId, new Set());
      }
      this.incomingLinks.get(link.sourceId)!.add(link.id);
    }
  }

  removeLink(linkId: string): void {
    const link = this.links.get(linkId);
    if (!link) return;

    // Remove from indexes
    this.outgoingLinks.get(link.sourceId)?.delete(linkId);
    this.incomingLinks.get(link.targetId)?.delete(linkId);

    if (link.bidirectional) {
      this.outgoingLinks.get(link.targetId)?.delete(linkId);
      this.incomingLinks.get(link.sourceId)?.delete(linkId);
    }

    this.links.delete(linkId);
  }

  getLink(linkId: string): MemoryLink | undefined {
    return this.links.get(linkId);
  }

  getAllLinks(): MemoryLink[] {
    return Array.from(this.links.values());
  }

  // ============== GRAPH QUERIES ==============

  /**
   * Get all links for a node
   */
  getLinks(
    nodeId: string,
    direction: 'outgoing' | 'incoming' | 'both' = 'both'
  ): MemoryLink[] {
    const linkIds = new Set<string>();

    if (direction === 'outgoing' || direction === 'both') {
      const outgoing = this.outgoingLinks.get(nodeId);
      if (outgoing) {
        for (const id of outgoing) linkIds.add(id);
      }
    }

    if (direction === 'incoming' || direction === 'both') {
      const incoming = this.incomingLinks.get(nodeId);
      if (incoming) {
        for (const id of incoming) linkIds.add(id);
      }
    }

    return Array.from(linkIds).map(id => this.links.get(id)!).filter(Boolean);
  }

  /**
   * Get nodes linked to a given node, optionally filtered by link type
   */
  getLinkedNodes(nodeId: string, type?: LinkType): MemoryNode[] {
    const links = this.getLinks(nodeId, 'both');
    const nodeIds = new Set<string>();

    for (const link of links) {
      if (type && link.type !== type) continue;

      if (link.sourceId === nodeId) {
        nodeIds.add(link.targetId);
      } else if (link.targetId === nodeId) {
        nodeIds.add(link.sourceId);
      }
    }

    return Array.from(nodeIds)
      .map(id => this.tree.get(id))
      .filter((n): n is MemoryNode => n !== undefined);
  }

  /**
   * Get nodes that support a given node (link type = 'supports' or 'elaborates')
   */
  getSupporting(nodeId: string): MemoryNode[] {
    const links = this.getLinks(nodeId, 'incoming');
    const nodeIds = new Set<string>();

    for (const link of links) {
      if (link.type === 'related' || link.type === 'elaborates') {
        nodeIds.add(link.sourceId);
      }
    }

    return Array.from(nodeIds)
      .map(id => this.tree.get(id))
      .filter((n): n is MemoryNode => n !== undefined);
  }

  /**
   * Get nodes that contradict a given node
   */
  getContradicting(nodeId: string): MemoryNode[] {
    return this.getLinkedNodes(nodeId, 'contradicts');
  }

  /**
   * Find shortest path between two nodes using BFS
   */
  findPath(fromId: string, toId: string, maxDepth: number = 10): MemoryNode[] | null {
    if (fromId === toId) {
      const node = this.tree.get(fromId);
      return node ? [node] : null;
    }

    const visited = new Set<string>();
    const queue: Array<{ nodeId: string; path: string[] }> = [
      { nodeId: fromId, path: [fromId] }
    ];

    while (queue.length > 0) {
      const { nodeId, path } = queue.shift()!;

      if (path.length > maxDepth) continue;
      if (visited.has(nodeId)) continue;
      visited.add(nodeId);

      const linkedNodes = this.getLinkedNodes(nodeId);
      for (const linked of linkedNodes) {
        if (linked.id === toId) {
          const fullPath = [...path, toId];
          return fullPath
            .map(id => this.tree.get(id))
            .filter((n): n is MemoryNode => n !== undefined);
        }

        if (!visited.has(linked.id)) {
          queue.push({ nodeId: linked.id, path: [...path, linked.id] });
        }
      }
    }

    return null;
  }

  /**
   * Get all nodes within N hops of a given node
   */
  getNeighborhood(nodeId: string, depth: number = 2): MemoryNode[] {
    const visited = new Set<string>();
    const result: MemoryNode[] = [];
    const queue: Array<{ nodeId: string; currentDepth: number }> = [
      { nodeId, currentDepth: 0 }
    ];

    while (queue.length > 0) {
      const { nodeId: currentId, currentDepth } = queue.shift()!;

      if (visited.has(currentId)) continue;
      visited.add(currentId);

      const node = this.tree.get(currentId);
      if (node && currentId !== nodeId) {
        result.push(node);
      }

      if (currentDepth < depth) {
        const linkedNodes = this.getLinkedNodes(currentId);
        for (const linked of linkedNodes) {
          if (!visited.has(linked.id)) {
            queue.push({ nodeId: linked.id, currentDepth: currentDepth + 1 });
          }
        }
      }
    }

    return result;
  }

  // ============== AUTO-LINKING ==============

  /**
   * Automatically create 'similar_to' links for nodes with high embedding similarity
   */
  autoLinkSimilar(threshold: number = 0.85): MemoryLink[] {
    const nodes = this.tree.getAll().filter(n => n.embedding);
    const newLinks: MemoryLink[] = [];
    const existingPairs = new Set<string>();

    // Index existing links to avoid duplicates
    for (const link of this.links.values()) {
      const key1 = `${link.sourceId}:${link.targetId}`;
      const key2 = `${link.targetId}:${link.sourceId}`;
      existingPairs.add(key1);
      existingPairs.add(key2);
    }

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const nodeA = nodes[i];
        const nodeB = nodes[j];

        if (!nodeA.embedding || !nodeB.embedding) continue;

        const pairKey = `${nodeA.id}:${nodeB.id}`;
        if (existingPairs.has(pairKey)) continue;

        const similarity = cosineSimilarity(nodeA.embedding, nodeB.embedding);

        if (similarity >= threshold) {
          const link: MemoryLink = {
            id: `auto-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            sourceId: nodeA.id,
            targetId: nodeB.id,
            type: 'related',
            confidence: similarity,
            bidirectional: true,
            created: Date.now(),
            createdBy: 'system'
          };

          this.addLink(link);
          newLinks.push(link);
          existingPairs.add(pairKey);
          existingPairs.add(`${nodeB.id}:${nodeA.id}`);
        }
      }
    }

    return newLinks;
  }

  // ============== POSITIONS ==============

  setPosition(nodeId: string, position: Position): void {
    this.positions.set(nodeId, position);
  }

  getPosition(nodeId: string): Position | undefined {
    return this.positions.get(nodeId);
  }

  getAllPositions(): Map<string, Position> {
    return new Map(this.positions);
  }

  /**
   * Get only pinned positions (for serialization)
   */
  getPinnedPositions(): Map<string, Position> {
    const pinned = new Map<string, Position>();
    for (const [nodeId, pos] of this.positions) {
      if (pos.pinned) {
        pinned.set(nodeId, pos);
      }
    }
    return pinned;
  }

  // ============== STATS ==============

  getStats(): {
    nodeCount: number;
    linkCount: number;
    avgLinksPerNode: number;
    linkTypeDistribution: Record<string, number>;
  } {
    const nodeCount = this.tree.size();
    const linkCount = this.links.size;
    const avgLinksPerNode = nodeCount > 0 ? linkCount / nodeCount : 0;

    const linkTypeDistribution: Record<string, number> = {};
    for (const link of this.links.values()) {
      linkTypeDistribution[link.type] = (linkTypeDistribution[link.type] || 0) + 1;
    }

    return {
      nodeCount,
      linkCount,
      avgLinksPerNode,
      linkTypeDistribution
    };
  }
}
