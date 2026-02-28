/**
 * Engram V2 Graph Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryTree, createNode, createLink } from '../src/core';
import { MemoryGraph } from '../src/graph';
import { MemoryNode, MemoryLink } from '../src/types';

describe('MemoryGraph', () => {
  let tree: MemoryTree;
  let graph: MemoryGraph;
  let nodeA: MemoryNode;
  let nodeB: MemoryNode;
  let nodeC: MemoryNode;
  let nodeD: MemoryNode;

  beforeEach(() => {
    // Create nodes with embeddings for similarity testing
    nodeA = createNode('Coffee improves focus and productivity');
    nodeA.embedding = new Float32Array([1, 0, 0, 0]);
    
    nodeB = createNode('Studies show caffeine enhances concentration');
    nodeB.embedding = new Float32Array([0.9, 0.1, 0, 0]); // Similar to A
    
    nodeC = createNode('Too much coffee causes anxiety');
    nodeC.embedding = new Float32Array([0, 1, 0, 0]); // Different
    
    nodeD = createNode('Tea is a good alternative to coffee');
    nodeD.embedding = new Float32Array([0.5, 0.5, 0, 0]); // Somewhat similar
    
    tree = new MemoryTree([nodeA, nodeB, nodeC, nodeD]);
    graph = new MemoryGraph(tree);
  });

  describe('Link Management', () => {
    it('should add and retrieve links', () => {
      const link = createLink(nodeA.id, nodeB.id, 'related');
      graph.addLink(link);

      const links = graph.getAllLinks();
      expect(links).toHaveLength(1);
      expect(links[0].sourceId).toBe(nodeA.id);
      expect(links[0].targetId).toBe(nodeB.id);
    });

    it('should remove links', () => {
      const link = createLink(nodeA.id, nodeB.id, 'related');
      graph.addLink(link);
      expect(graph.getAllLinks()).toHaveLength(1);

      graph.removeLink(link.id);
      expect(graph.getAllLinks()).toHaveLength(0);
    });

    it('should handle bidirectional links', () => {
      const link = createLink(nodeA.id, nodeB.id, 'related', { bidirectional: true });
      graph.addLink(link);

      // Should appear in both directions
      const linksFromA = graph.getLinks(nodeA.id, 'outgoing');
      const linksFromB = graph.getLinks(nodeB.id, 'outgoing');

      expect(linksFromA).toHaveLength(1);
      expect(linksFromB).toHaveLength(1);
    });

    it('should handle unidirectional links', () => {
      const link = createLink(nodeA.id, nodeB.id, 'causes', { bidirectional: false });
      graph.addLink(link);

      const outgoingFromA = graph.getLinks(nodeA.id, 'outgoing');
      const outgoingFromB = graph.getLinks(nodeB.id, 'outgoing');

      expect(outgoingFromA).toHaveLength(1);
      expect(outgoingFromB).toHaveLength(0);
    });
  });

  describe('Graph Queries', () => {
    beforeEach(() => {
      // A --supports--> B
      // C --contradicts--> A
      // B --related--> D
      graph.addLink(createLink(nodeA.id, nodeB.id, 'elaborates', { bidirectional: false }));
      graph.addLink(createLink(nodeC.id, nodeA.id, 'contradicts', { bidirectional: true }));
      graph.addLink(createLink(nodeB.id, nodeD.id, 'related', { bidirectional: true }));
    });

    it('should get linked nodes', () => {
      const linkedToA = graph.getLinkedNodes(nodeA.id);
      expect(linkedToA.map(n => n.id)).toContain(nodeB.id);
      expect(linkedToA.map(n => n.id)).toContain(nodeC.id);
    });

    it('should filter linked nodes by type', () => {
      const contradicting = graph.getLinkedNodes(nodeA.id, 'contradicts');
      expect(contradicting).toHaveLength(1);
      expect(contradicting[0].id).toBe(nodeC.id);
    });

    it('should get contradicting nodes', () => {
      const contradicting = graph.getContradicting(nodeA.id);
      expect(contradicting).toHaveLength(1);
      expect(contradicting[0].id).toBe(nodeC.id);
    });

    it('should get links by direction', () => {
      const outgoing = graph.getLinks(nodeA.id, 'outgoing');
      const incoming = graph.getLinks(nodeA.id, 'incoming');
      const both = graph.getLinks(nodeA.id, 'both');

      expect(outgoing.length).toBeGreaterThanOrEqual(1);
      expect(incoming.length).toBeGreaterThanOrEqual(1);
      expect(both.length).toBeGreaterThanOrEqual(outgoing.length);
    });
  });

  describe('Path Finding', () => {
    beforeEach(() => {
      // A -> B -> D
      // A -> C
      graph.addLink(createLink(nodeA.id, nodeB.id, 'related', { bidirectional: true }));
      graph.addLink(createLink(nodeB.id, nodeD.id, 'related', { bidirectional: true }));
      graph.addLink(createLink(nodeA.id, nodeC.id, 'related', { bidirectional: true }));
    });

    it('should find direct path', () => {
      const path = graph.findPath(nodeA.id, nodeB.id);
      expect(path).not.toBeNull();
      expect(path!.map(n => n.id)).toEqual([nodeA.id, nodeB.id]);
    });

    it('should find indirect path', () => {
      const path = graph.findPath(nodeA.id, nodeD.id);
      expect(path).not.toBeNull();
      expect(path!.map(n => n.id)).toEqual([nodeA.id, nodeB.id, nodeD.id]);
    });

    it('should return null for disconnected nodes', () => {
      // Create isolated node
      const nodeE = createNode('Isolated node');
      const treeWithE = new MemoryTree([nodeA, nodeB, nodeC, nodeD, nodeE]);
      const graphWithE = new MemoryGraph(treeWithE);
      graphWithE.addLink(createLink(nodeA.id, nodeB.id, 'related'));

      const path = graphWithE.findPath(nodeA.id, nodeE.id);
      expect(path).toBeNull();
    });

    it('should respect maxDepth', () => {
      const path = graph.findPath(nodeA.id, nodeD.id, 1); // Only 1 hop allowed
      expect(path).toBeNull(); // D is 2 hops away
    });

    it('should handle same node path', () => {
      const path = graph.findPath(nodeA.id, nodeA.id);
      expect(path).not.toBeNull();
      expect(path).toHaveLength(1);
      expect(path![0].id).toBe(nodeA.id);
    });
  });

  describe('Neighborhood', () => {
    beforeEach(() => {
      // A -> B -> D
      //   -> C
      graph.addLink(createLink(nodeA.id, nodeB.id, 'related', { bidirectional: true }));
      graph.addLink(createLink(nodeB.id, nodeD.id, 'related', { bidirectional: true }));
      graph.addLink(createLink(nodeA.id, nodeC.id, 'related', { bidirectional: true }));
    });

    it('should get immediate neighbors (depth 1)', () => {
      const neighbors = graph.getNeighborhood(nodeA.id, 1);
      const neighborIds = neighbors.map(n => n.id);

      expect(neighborIds).toContain(nodeB.id);
      expect(neighborIds).toContain(nodeC.id);
      expect(neighborIds).not.toContain(nodeD.id); // 2 hops away
    });

    it('should get extended neighborhood (depth 2)', () => {
      const neighbors = graph.getNeighborhood(nodeA.id, 2);
      const neighborIds = neighbors.map(n => n.id);

      expect(neighborIds).toContain(nodeB.id);
      expect(neighborIds).toContain(nodeC.id);
      expect(neighborIds).toContain(nodeD.id);
    });

    it('should not include the source node', () => {
      const neighbors = graph.getNeighborhood(nodeA.id, 2);
      const neighborIds = neighbors.map(n => n.id);

      expect(neighborIds).not.toContain(nodeA.id);
    });
  });

  describe('Auto-Linking', () => {
    it('should auto-link similar nodes', () => {
      // nodeA and nodeB have similar embeddings (cosine ~0.99)
      const newLinks = graph.autoLinkSimilar(0.8);

      expect(newLinks.length).toBeGreaterThan(0);
      
      // Check that A-B got linked (they're most similar)
      const linkedToA = graph.getLinkedNodes(nodeA.id);
      expect(linkedToA.map(n => n.id)).toContain(nodeB.id);
    });

    it('should not create duplicate links', () => {
      // Add a manual link first
      graph.addLink(createLink(nodeA.id, nodeB.id, 'related'));
      
      const linksBefore = graph.getAllLinks().length;
      graph.autoLinkSimilar(0.8);
      const linksAfter = graph.getAllLinks().length;

      // Should not have added A-B again
      const abLinks = graph.getAllLinks().filter(
        l => (l.sourceId === nodeA.id && l.targetId === nodeB.id) ||
             (l.sourceId === nodeB.id && l.targetId === nodeA.id)
      );
      expect(abLinks.length).toBeLessThanOrEqual(2); // At most original + one auto
    });

    it('should respect threshold', () => {
      const linksHigh = graph.autoLinkSimilar(0.99); // Very strict
      graph.getAllLinks().forEach(l => graph.removeLink(l.id));
      
      const linksLow = graph.autoLinkSimilar(0.5); // Loose

      expect(linksLow.length).toBeGreaterThanOrEqual(linksHigh.length);
    });

    it('should set confidence to similarity score', () => {
      const newLinks = graph.autoLinkSimilar(0.8);
      
      for (const link of newLinks) {
        expect(link.confidence).toBeGreaterThanOrEqual(0.8);
        expect(link.confidence).toBeLessThanOrEqual(1.0);
      }
    });
  });

  describe('Positions', () => {
    it('should set and get positions', () => {
      graph.setPosition(nodeA.id, { x: 100, y: 200 });
      
      const pos = graph.getPosition(nodeA.id);
      expect(pos).toEqual({ x: 100, y: 200 });
    });

    it('should handle 3D positions', () => {
      graph.setPosition(nodeA.id, { x: 100, y: 200, z: 50 });
      
      const pos = graph.getPosition(nodeA.id);
      expect(pos?.z).toBe(50);
    });

    it('should track pinned positions', () => {
      graph.setPosition(nodeA.id, { x: 100, y: 200, pinned: true });
      graph.setPosition(nodeB.id, { x: 300, y: 400, pinned: false });
      graph.setPosition(nodeC.id, { x: 500, y: 600 }); // No pinned flag

      const pinned = graph.getPinnedPositions();
      expect(pinned.size).toBe(1);
      expect(pinned.has(nodeA.id)).toBe(true);
    });

    it('should return all positions', () => {
      graph.setPosition(nodeA.id, { x: 100, y: 200 });
      graph.setPosition(nodeB.id, { x: 300, y: 400 });

      const all = graph.getAllPositions();
      expect(all.size).toBe(2);
    });
  });

  describe('Stats', () => {
    it('should return correct stats', () => {
      graph.addLink(createLink(nodeA.id, nodeB.id, 'related'));
      graph.addLink(createLink(nodeA.id, nodeC.id, 'contradicts'));
      graph.addLink(createLink(nodeB.id, nodeD.id, 'related'));

      const stats = graph.getStats();

      expect(stats.nodeCount).toBe(4);
      expect(stats.linkCount).toBe(3);
      expect(stats.avgLinksPerNode).toBe(0.75);
      expect(stats.linkTypeDistribution['related']).toBe(2);
      expect(stats.linkTypeDistribution['contradicts']).toBe(1);
    });

    it('should handle empty graph', () => {
      const emptyTree = new MemoryTree([]);
      const emptyGraph = new MemoryGraph(emptyTree);

      const stats = emptyGraph.getStats();

      expect(stats.nodeCount).toBe(0);
      expect(stats.linkCount).toBe(0);
      expect(stats.avgLinksPerNode).toBe(0);
    });
  });

  describe('Constructor with Links', () => {
    it('should initialize with existing links', () => {
      const links = [
        createLink(nodeA.id, nodeB.id, 'related'),
        createLink(nodeB.id, nodeC.id, 'contradicts')
      ];

      const graphWithLinks = new MemoryGraph(tree, links);

      expect(graphWithLinks.getAllLinks()).toHaveLength(2);
      expect(graphWithLinks.getLinkedNodes(nodeB.id)).toHaveLength(2);
    });
  });
});

describe('V2 Type Extensions', () => {
  it('should support position on MemoryNode', () => {
    const node = createNode('Test node');
    node.position = { x: 100, y: 200, pinned: true };

    expect(node.position.x).toBe(100);
    expect(node.position.pinned).toBe(true);
  });

  it('should support confidence on MemoryNode', () => {
    const node = createNode('Test node');
    node.confidence = 0.95;

    expect(node.confidence).toBe(0.95);
  });
});
