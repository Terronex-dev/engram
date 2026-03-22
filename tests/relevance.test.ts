/**
 * Tests for task-aware retrieval routing (v2.2)
 */
import { describe, it, expect } from 'vitest';
import { rerankWithContext, recordAccess } from '../src/relevance';
import { MemoryGraph } from '../src/graph';
import { MemoryTree, createNode, createLink } from '../src/core';
import type { SearchResult, MemoryNode, TaskContext, RerankOptions } from '../src/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeNode(
  content: string,
  overrides: Partial<MemoryNode> & {
    tags?: string[];
    contentType?: MemoryNode['content']['type'];
  } = {},
): MemoryNode {
  const base = createNode(content, {
    type: overrides.contentType ?? 'text',
    tags: overrides.tags,
  });
  return {
    ...base,
    ...overrides,
    content: {
      ...base.content,
      type: overrides.contentType ?? base.content.type,
    },
    metadata: {
      ...base.metadata,
      tags: overrides.tags ?? base.metadata.tags,
      accessLog: overrides.metadata?.accessLog ?? base.metadata.accessLog,
    },
  } as MemoryNode;
}

function result(node: MemoryNode, score: number): SearchResult {
  return { node, score };
}

// ---------------------------------------------------------------------------
// rerankWithContext
// ---------------------------------------------------------------------------

describe('rerankWithContext', () => {
  it('returns empty array for empty candidates', () => {
    const opts: RerankOptions = { taskContext: { intent: 'debugging' } };
    expect(rerankWithContext([], opts)).toEqual([]);
  });

  it('returns candidates unchanged in order when no signals match', () => {
    const a = makeNode('alpha');
    const b = makeNode('beta');
    const candidates = [result(a, 0.9), result(b, 0.8)];
    const opts: RerankOptions = { taskContext: { intent: 'debugging' } };
    const out = rerankWithContext(candidates, opts);
    expect(out[0].node.id).toBe(a.id);
    expect(out[1].node.id).toBe(b.id);
  });

  // ---- Tag-intent matching ----

  it('boosts nodes whose tags match the task intent', () => {
    const tagged = makeNode('fix the crash', { tags: ['error-fix', 'bug'] });
    const plain = makeNode('unrelated note');
    // plain has higher base score
    const candidates = [result(plain, 0.9), result(tagged, 0.7)];
    const opts: RerankOptions = {
      taskContext: { intent: 'debugging' },
      intentMatchBoost: 0.25,
    };
    const out = rerankWithContext(candidates, opts);
    // tagged (0.7 + 0.25 = 0.95) should now outrank plain (0.9)
    expect(out[0].node.id).toBe(tagged.id);
  });

  it('uses default intentMatchBoost of 0.15 when not specified', () => {
    const tagged = makeNode('research paper', { tags: ['research'] });
    const plain = makeNode('something else');
    const candidates = [result(plain, 0.85), result(tagged, 0.75)];
    const opts: RerankOptions = { taskContext: { intent: 'research' } };
    const out = rerankWithContext(candidates, opts);
    // tagged: 0.75 + 0.15 = 0.90 > plain: 0.85
    expect(out[0].node.id).toBe(tagged.id);
  });

  // ---- Access pattern scoring ----

  it('boosts nodes with useful access history for the same intent', () => {
    const now = Date.now();
    const useful = makeNode('useful memory', {
      metadata: {
        accessLog: [
          { timestamp: now - 1000, intent: 'debugging', useful: true },
          { timestamp: now - 500, intent: 'debugging', useful: true },
        ],
      },
    });
    const noaccess = makeNode('no history');
    const candidates = [result(noaccess, 0.8), result(useful, 0.75)];
    const opts: RerankOptions = {
      taskContext: { intent: 'debugging' },
      accessPatternWeight: 0.15,
      intentMatchBoost: 0, // isolate access pattern effect
    };
    const out = rerankWithContext(candidates, opts);
    expect(out[0].node.id).toBe(useful.id);
  });

  it('penalizes nodes marked not useful for the same intent', () => {
    const now = Date.now();
    const notUseful = makeNode('bad memory', {
      metadata: {
        accessLog: [
          { timestamp: now - 100, intent: 'debugging', useful: false },
        ],
      },
    });
    const neutral = makeNode('neutral');
    // same base score - the penalty should push notUseful down
    const candidates = [result(notUseful, 0.8), result(neutral, 0.8)];
    const opts: RerankOptions = {
      taskContext: { intent: 'debugging' },
      accessPatternWeight: 0.2,
      intentMatchBoost: 0,
    };
    const out = rerankWithContext(candidates, opts);
    expect(out[0].node.id).toBe(neutral.id);
  });

  // ---- Graph neighbor boost ----

  it('boosts nodes linked to recently-accessed nodes via graph', () => {
    const a = makeNode('node A');
    const b = makeNode('node B');
    const c = makeNode('node C');

    const tree = new MemoryTree([a, b, c]);
    const link = createLink(a.id, b.id, 'related');
    const graph = new MemoryGraph(tree, [link]);

    // b is linked to a; a is recently accessed
    const candidates = [result(c, 0.9), result(b, 0.82)];
    const opts: RerankOptions = {
      taskContext: { intent: 'debugging' },
      graphNeighborBoost: 0.1,
      intentMatchBoost: 0,
    };
    const out = rerankWithContext(candidates, opts, graph, [a.id]);
    // b gets 0.82 + 0.1 = 0.92 > c at 0.9
    expect(out[0].node.id).toBe(b.id);
  });

  it('does not apply graph boost when graph is not provided', () => {
    const a = makeNode('node A');
    const b = makeNode('node B');
    const candidates = [result(a, 0.9), result(b, 0.8)];
    const opts: RerankOptions = {
      taskContext: { intent: 'debugging' },
      graphNeighborBoost: 0.5,
      intentMatchBoost: 0,
    };
    const out = rerankWithContext(candidates, opts, undefined, ['some-id']);
    expect(out[0].node.id).toBe(a.id);
    expect(out[0].score).toBe(0.9);
  });

  // ---- Content-type matching ----

  it('boosts code nodes for code domain', () => {
    const codeNode = makeNode('function fix() {}', { contentType: 'code' });
    const textNode = makeNode('some documentation');
    const candidates = [result(textNode, 0.85), result(codeNode, 0.82)];
    const opts: RerankOptions = {
      taskContext: { intent: 'debugging', domain: 'code' },
      intentMatchBoost: 0,
    };
    const out = rerankWithContext(candidates, opts);
    // code: 0.82 + 0.05 = 0.87 > text: 0.85
    expect(out[0].node.id).toBe(codeNode.id);
  });

  it('boosts text nodes for research domain', () => {
    const codeNode = makeNode('const x = 1;', { contentType: 'code' });
    const textNode = makeNode('analysis results');
    const candidates = [result(codeNode, 0.85), result(textNode, 0.82)];
    const opts: RerankOptions = {
      taskContext: { intent: 'research', domain: 'research' },
      intentMatchBoost: 0,
    };
    const out = rerankWithContext(candidates, opts);
    // text: 0.82 + 0.05 = 0.87 > code: 0.85
    expect(out[0].node.id).toBe(textNode.id);
  });

  // ---- Combined signals ----

  it('combines multiple boosting signals', () => {
    const now = Date.now();
    const superNode = makeNode('perfect match', {
      tags: ['error-fix'],
      contentType: 'code',
      metadata: {
        accessLog: [
          { timestamp: now - 100, intent: 'debugging', useful: true },
        ],
      },
    });
    const plainNode = makeNode('irrelevant text');
    // plainNode has higher base score
    const candidates = [result(plainNode, 0.95), result(superNode, 0.7)];
    const opts: RerankOptions = {
      taskContext: { intent: 'debugging', domain: 'code' },
      intentMatchBoost: 0.15,
      accessPatternWeight: 0.1,
    };
    const out = rerankWithContext(candidates, opts);
    // superNode: 0.7 + 0.15 (tag) + 0.1 (access) + 0.05 (content) = 1.0
    // plainNode: 0.95
    expect(out[0].node.id).toBe(superNode.id);
  });

  // ---- Backward compatibility ----

  it('handles nodes without accessLog gracefully', () => {
    const node = makeNode('old node');
    // Explicitly ensure no accessLog
    delete (node.metadata as any).accessLog;
    const candidates = [result(node, 0.8)];
    const opts: RerankOptions = {
      taskContext: { intent: 'debugging' },
      accessPatternWeight: 0.5,
    };
    const out = rerankWithContext(candidates, opts);
    expect(out).toHaveLength(1);
    expect(out[0].score).toBe(0.8);
  });
});

// ---------------------------------------------------------------------------
// recordAccess
// ---------------------------------------------------------------------------

describe('recordAccess', () => {
  it('appends an entry to an empty accessLog', () => {
    const node = makeNode('test node');
    const updated = recordAccess(node, 'debugging', true);
    expect(updated.metadata.accessLog).toHaveLength(1);
    expect(updated.metadata.accessLog![0].intent).toBe('debugging');
    expect(updated.metadata.accessLog![0].useful).toBe(true);
    expect(typeof updated.metadata.accessLog![0].timestamp).toBe('number');
  });

  it('appends to existing accessLog without mutating original', () => {
    const now = Date.now();
    const node = makeNode('test node');
    node.metadata.accessLog = [{ timestamp: now - 1000, intent: 'research' }];
    const updated = recordAccess(node, 'debugging', false);
    // Original unchanged
    expect(node.metadata.accessLog).toHaveLength(1);
    // Updated has both entries
    expect(updated.metadata.accessLog).toHaveLength(2);
    expect(updated.metadata.accessLog![1].intent).toBe('debugging');
    expect(updated.metadata.accessLog![1].useful).toBe(false);
  });

  it('updates temporal.accessed to current time', () => {
    const node = makeNode('test node');
    const oldAccessed = node.temporal.accessed;
    // Small delay to ensure time difference
    const updated = recordAccess(node);
    expect(updated.temporal.accessed).toBeGreaterThanOrEqual(oldAccessed);
  });

  it('works with no intent or useful flag', () => {
    const node = makeNode('test node');
    const updated = recordAccess(node);
    expect(updated.metadata.accessLog).toHaveLength(1);
    expect(updated.metadata.accessLog![0].intent).toBeUndefined();
    expect(updated.metadata.accessLog![0].useful).toBeUndefined();
  });

  it('does not mutate the original node', () => {
    const node = makeNode('immutable test');
    const original = { ...node, metadata: { ...node.metadata } };
    recordAccess(node, 'planning', true);
    expect(node.metadata.accessLog).toEqual(original.metadata.accessLog);
  });
});
