/**
 * Core functionality tests for AIF-BIN v3
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryTree, generateId, createNode, getDecayTier } from '../src/index';
import type { MemoryNode } from '../src/types';

describe('MemoryTree', () => {
  let tree: MemoryTree;
  
  beforeEach(() => {
    tree = new MemoryTree();
  });

  describe('basic operations', () => {
    it('should create empty tree', () => {
      expect(tree.size()).toBe(0);
      expect(tree.getAll()).toEqual([]);
      expect(tree.getRoots()).toEqual([]);
    });

    it('should add root node', () => {
      const node = createTestNode();
      
      const id = tree.add(node);
      
      expect(id).toBe(node.id);
      expect(tree.size()).toBe(1);
      expect(tree.get(id)).toEqual(node);
      expect(tree.getRoots()).toHaveLength(1);
    });

    it('should add child node', () => {
      const parent = createTestNode();
      tree.add(parent);

      const child = createTestNode({ parentId: parent.id });
      tree.add(child);

      expect(tree.size()).toBe(2);
      expect(tree.getChildren(parent.id)).toHaveLength(1);
      expect(tree.getParent(child.id)).toEqual(parent);
    });

    it('should update node', () => {
      const node = createTestNode();
      tree.add(node);

      const updates = { 
        content: { ...node.content, data: 'updated content' }
      };
      tree.update(node.id, updates);

      const updated = tree.get(node.id);
      expect(updated?.content.data).toBe('updated content');
      expect(updated?.temporal.modified).toBeGreaterThan(node.temporal.modified);
    });

    it('should delete node', () => {
      const node = createTestNode();
      tree.add(node);

      tree.delete(node.id);

      expect(tree.get(node.id)).toBeUndefined();
      expect(tree.size()).toBe(0);
    });
  });

  describe('tree navigation', () => {
    let parent: MemoryNode;
    let child1: MemoryNode;
    let child2: MemoryNode;
    let grandchild: MemoryNode;

    beforeEach(() => {
      parent = createTestNode();
      tree.add(parent);

      child1 = createTestNode({ parentId: parent.id });
      child2 = createTestNode({ parentId: parent.id });
      tree.add(child1);
      tree.add(child2);

      grandchild = createTestNode({ parentId: child1.id });
      tree.add(grandchild);
    });

    it('should get children', () => {
      const children = tree.getChildren(parent.id);
      expect(children).toHaveLength(2);
      expect(children.map(c => c.id).sort()).toEqual([child1.id, child2.id].sort());
    });

    it('should get siblings', () => {
      const siblings = tree.getSiblings(child1.id);
      expect(siblings).toHaveLength(1);
      expect(siblings[0].id).toBe(child2.id);
    });

    it('should get ancestors', () => {
      const ancestors = tree.getAncestors(grandchild.id);
      expect(ancestors).toHaveLength(2);
      expect(ancestors[0].id).toBe(child1.id);
      expect(ancestors[1].id).toBe(parent.id);
    });

    it('should get descendants', () => {
      const descendants = tree.getDescendants(parent.id);
      expect(descendants).toHaveLength(3);
      expect(descendants.map(d => d.id).sort()).toEqual(
        [child1.id, child2.id, grandchild.id].sort()
      );
    });
  });
});

describe('Temporal Intelligence', () => {
  it('should determine decay tier based on age', () => {
    const now = Date.now();
    
    // Hot (recent)
    const hotNode = createTestNode({
      temporal: {
        created: now - 1000 * 60 * 60, // 1 hour ago
        modified: now - 1000 * 60 * 60,
        accessed: now - 1000 * 60 * 60,
        decayTier: 'hot'
      }
    });
    
    expect(getDecayTier(hotNode)).toBe('hot');

    // Cold (old)
    const coldNode = createTestNode({
      temporal: {
        created: now - 1000 * 60 * 60 * 24 * 60, // 60 days ago
        modified: now - 1000 * 60 * 60 * 24 * 60,
        accessed: now - 1000 * 60 * 60 * 24 * 60,
        decayTier: 'cold'
      }
    });
    
    expect(getDecayTier(coldNode)).toBe('cold');
  });
});

describe('ID Generation', () => {
  it('should generate unique IDs', () => {
    const id1 = generateId();
    const id2 = generateId();
    
    expect(id1).toBeDefined();
    expect(id2).toBeDefined();
    expect(id1).not.toBe(id2);
    expect(typeof id1).toBe('string');
    expect(id1.length).toBeGreaterThan(10);
  });
});

// Helper function to create test nodes
function createTestNode(overrides: Partial<MemoryNode> = {}): MemoryNode {
  const now = Date.now();
  
  return createNode({
    id: generateId(),
    parentId: null,
    children: [],
    depth: 0,
    path: '/',
    content: {
      type: 'text',
      data: 'Test content'
    },
    temporal: {
      created: now,
      modified: now,
      accessed: now,
      decayTier: 'hot'
    },
    quality: {
      score: 0.8,
      confidence: 0.9,
      source: 'direct'
    },
    metadata: {},
    ...overrides
  });
}