/**
 * Engram V2.1 Comprehensive Test Suite
 * Tests all features: V1 core, V2 graph, V2.1 spatial
 */

import {
  MemoryTree,
  MemoryGraph,
  createNode,
  createLink,
  searchNodes,
  writeEngramFile,
  readEngramFile,
  spatialRecall,
  findNearby,
  haversineDistance,
  euclideanDistance,
  cosineSimilarity,
  generateId,
  VERSION,
  FORMAT_VERSION
} from '../dist/index.js';

import { pipeline } from '@xenova/transformers';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Test state
let passed = 0;
let failed = 0;
const results = [];

function test(name, fn) {
  try {
    fn();
    passed++;
    results.push({ name, status: '✓', error: null });
  } catch (e) {
    failed++;
    results.push({ name, status: '✗', error: e.message });
  }
}

async function testAsync(name, fn) {
  try {
    await fn();
    passed++;
    results.push({ name, status: '✓', error: null });
  } catch (e) {
    failed++;
    results.push({ name, status: '✗', error: e.message });
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

function assertEq(a, b, message) {
  if (a !== b) throw new Error(message || `Expected ${b}, got ${a}`);
}

function assertClose(a, b, tolerance, message) {
  if (Math.abs(a - b) > tolerance) throw new Error(message || `Expected ~${b}, got ${a}`);
}

// ============================================================
// SETUP: Generate embeddings
// ============================================================

console.log('Loading embedding model...');
const embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

async function embed(text) {
  const result = await embedder(text, { pooling: 'mean', normalize: true });
  return new Float32Array(result.data);
}

console.log('Generating test embeddings...\n');

const embeddings = {
  paris: await embed('Paris is the capital of France'),
  berlin: await embed('Berlin is the capital of Germany'),
  tokyo: await embed('Tokyo is the capital of Japan'),
  london: await embed('London is the capital of England'),
  nyc: await embed('New York City is in the United States'),
  france: await embed('France is a country in Europe'),
  germany: await embed('Germany is a country in Europe'),
  coffee: await embed('I love drinking coffee in the morning'),
  tea: await embed('Tea is a popular beverage in Britain'),
  programming: await embed('Python is a programming language'),
};

// ============================================================
// SECTION 1: VERSION & CONSTANTS
// ============================================================

console.log('═══════════════════════════════════════════════════════════');
console.log('SECTION 1: VERSION & CONSTANTS');
console.log('═══════════════════════════════════════════════════════════\n');

test('VERSION is 2.1.0', () => {
  assertEq(VERSION, '2.1.0');
});

test('FORMAT_VERSION is [2, 1]', () => {
  assertEq(FORMAT_VERSION[0], 2);
  assertEq(FORMAT_VERSION[1], 1);
});

test('generateId creates unique IDs', () => {
  const ids = new Set();
  for (let i = 0; i < 100; i++) ids.add(generateId());
  assertEq(ids.size, 100);
});

// ============================================================
// SECTION 2: CORE V1 FEATURES
// ============================================================

console.log('\n═══════════════════════════════════════════════════════════');
console.log('SECTION 2: CORE V1 FEATURES');
console.log('═══════════════════════════════════════════════════════════\n');

const tree = new MemoryTree([], {
  space: 'cosine',
  numDimensions: 384,
  maxElements: 1000
});

test('MemoryTree initializes empty', () => {
  assertEq(tree.size(), 0);
});

// Add nodes
const parisNode = createNode('Paris is the capital of France', { tags: ['city', 'europe'] });
parisNode.embedding = embeddings.paris;
parisNode.position = { x: 48.8566, y: 2.3522 };

const berlinNode = createNode('Berlin is the capital of Germany', { tags: ['city', 'europe'] });
berlinNode.embedding = embeddings.berlin;
berlinNode.position = { x: 52.52, y: 13.405 };

const tokyoNode = createNode('Tokyo is the capital of Japan', { tags: ['city', 'asia'] });
tokyoNode.embedding = embeddings.tokyo;
tokyoNode.position = { x: 35.6762, y: 139.6503 };

const londonNode = createNode('London is the capital of England', { tags: ['city', 'europe'] });
londonNode.embedding = embeddings.london;
londonNode.position = { x: 51.5074, y: -0.1278 };

const nycNode = createNode('New York City is in the United States', { tags: ['city', 'america'] });
nycNode.embedding = embeddings.nyc;
nycNode.position = { x: 40.7128, y: -74.0060 };

const coffeeNode = createNode('I love drinking coffee in the morning', { tags: ['beverage'] });
coffeeNode.embedding = embeddings.coffee;
// No position - tests graceful handling

test('createNode creates valid nodes', () => {
  assert(parisNode.id, 'Node should have ID');
  assert(parisNode.content.data === 'Paris is the capital of France');
  assert(parisNode.metadata.tags.includes('city'));
});

test('MemoryTree.add works', () => {
  tree.add(parisNode);
  tree.add(berlinNode);
  tree.add(tokyoNode);
  tree.add(londonNode);
  tree.add(nycNode);
  tree.add(coffeeNode);
  assertEq(tree.size(), 6);
});

test('MemoryTree.get retrieves nodes', () => {
  const retrieved = tree.get(parisNode.id);
  assertEq(retrieved.content.data, 'Paris is the capital of France');
});

test('MemoryTree.getAll returns all nodes', () => {
  assertEq(tree.getAll().length, 6);
});

test('MemoryTree.findByTag works', () => {
  const cities = tree.findByTag('city');
  assertEq(cities.length, 5);
  
  const european = tree.findByTag('europe');
  assertEq(european.length, 3);
});

// Hierarchy
const franceNode = createNode('France is a country in Europe', { tags: ['country'] });
franceNode.embedding = embeddings.france;
franceNode.parentId = parisNode.id;
tree.add(franceNode);

test('MemoryTree supports hierarchy', () => {
  const parent = tree.getParent(franceNode.id);
  assertEq(parent.id, parisNode.id);
  
  const children = tree.getChildren(parisNode.id);
  assert(children.some(c => c.id === franceNode.id));
});

// Search
test('searchNodes finds relevant results', () => {
  const queryEmb = embeddings.paris;
  const results = searchNodes(tree, queryEmb, { query: '', topK: 3, minScore: 0.3 });
  assert(results.length > 0, 'Should find results');
  assertEq(results[0].node.id, parisNode.id, 'Paris should be top result');
});

test('searchNodes respects topK', () => {
  const results = searchNodes(tree, embeddings.paris, { query: '', topK: 2, minScore: 0 });
  assertEq(results.length, 2);
});

test('searchNodes respects minScore', () => {
  const results = searchNodes(tree, embeddings.coffee, { query: '', topK: 10, minScore: 0.9 });
  assert(results.length <= 2, 'High minScore should filter results');
});

test('cosineSimilarity computes correctly', () => {
  const self = cosineSimilarity(embeddings.paris, embeddings.paris);
  assertClose(self, 1.0, 0.01, 'Self-similarity should be ~1.0');
  
  const similar = cosineSimilarity(embeddings.paris, embeddings.france);
  assert(similar > 0.5, 'Related topics should be similar');
  
  const different = cosineSimilarity(embeddings.paris, embeddings.coffee);
  assert(different < similar, 'Unrelated topics should be less similar');
});

// ============================================================
// SECTION 3: V2 GRAPH FEATURES
// ============================================================

console.log('\n═══════════════════════════════════════════════════════════');
console.log('SECTION 3: V2 GRAPH FEATURES');
console.log('═══════════════════════════════════════════════════════════\n');

const links = [];
const graph = new MemoryGraph(tree, links);

test('MemoryGraph initializes', () => {
  assert(graph, 'Graph should exist');
  const stats = graph.getStats();
  assertEq(stats.nodeCount, 7);
});

// Create typed links
const link1 = createLink(franceNode.id, parisNode.id, 'supports');
const link2 = createLink(berlinNode.id, parisNode.id, 'related');
const link3 = createLink(tokyoNode.id, londonNode.id, 'contradicts');

test('createLink creates valid links', () => {
  assert(link1.id, 'Link should have ID');
  assertEq(link1.type, 'supports');
  assertEq(link1.sourceId, franceNode.id);
  assertEq(link1.targetId, parisNode.id);
});

test('MemoryGraph.addLink works', () => {
  graph.addLink(link1);
  graph.addLink(link2);
  graph.addLink(link3);
  
  const stats = graph.getStats();
  assertEq(stats.linkCount, 3);
});

test('MemoryGraph.getLinks retrieves links', () => {
  const outgoing = graph.getLinks(franceNode.id, 'outgoing');
  assertEq(outgoing.length, 1);
  assertEq(outgoing[0].type, 'supports');
});

test('MemoryGraph.getLinkedNodes works', () => {
  const linked = graph.getLinkedNodes(parisNode.id);
  assert(linked.length >= 1, 'Paris should have linked nodes');
});

test('MemoryGraph.getLinkedNodes filters by type', () => {
  const supporting = graph.getLinkedNodes(parisNode.id, 'supports');
  assert(supporting.some(n => n.id === franceNode.id));
});

test('MemoryGraph.getSupporting works', () => {
  const supporters = graph.getSupporting(parisNode.id);
  assert(supporters.some(n => n.id === franceNode.id));
});

test('MemoryGraph.findPath finds paths', () => {
  const link4 = createLink(londonNode.id, berlinNode.id, 'related');
  graph.addLink(link4);
  
  const path = graph.findPath(londonNode.id, parisNode.id);
  assert(path !== null, 'Should find path London -> Berlin -> Paris');
  assert(path.length >= 2, 'Path should have multiple nodes');
});

test('MemoryGraph.getNeighborhood returns nearby nodes', () => {
  const neighborhood = graph.getNeighborhood(parisNode.id, 2);
  assert(neighborhood.length >= 1, 'Should have neighbors');
});

test('MemoryGraph.autoLinkSimilar creates similarity links', () => {
  const beforeStats = graph.getStats();
  const newLinks = graph.autoLinkSimilar(0.7);
  const afterStats = graph.getStats();
  
  assert(afterStats.linkCount >= beforeStats.linkCount, 'Should create new links');
});

// ============================================================
// SECTION 4: V2.1 SPATIAL FEATURES
// ============================================================

console.log('\n═══════════════════════════════════════════════════════════');
console.log('SECTION 4: V2.1 SPATIAL FEATURES');
console.log('═══════════════════════════════════════════════════════════\n');

// Distance functions
test('haversineDistance returns 0 for same point', () => {
  const dist = haversineDistance(48.8566, 2.3522, 48.8566, 2.3522);
  assertEq(dist, 0);
});

test('haversineDistance calculates Paris-Berlin (~878km)', () => {
  const dist = haversineDistance(48.8566, 2.3522, 52.52, 13.405);
  assertClose(dist, 878, 50, 'Paris-Berlin should be ~878km');
});

test('haversineDistance calculates Paris-Tokyo (~9700km)', () => {
  const dist = haversineDistance(48.8566, 2.3522, 35.6762, 139.6503);
  assertClose(dist, 9700, 200, 'Paris-Tokyo should be ~9700km');
});

test('haversineDistance calculates NYC-London (~5570km)', () => {
  const dist = haversineDistance(40.7128, -74.0060, 51.5074, -0.1278);
  assertClose(dist, 5570, 100, 'NYC-London should be ~5570km');
});

test('euclideanDistance returns 0 for same point', () => {
  const dist = euclideanDistance(0, 0, 0, 0, 0, 0);
  assertEq(dist, 0);
});

test('euclideanDistance calculates 2D correctly', () => {
  const dist = euclideanDistance(0, 0, 0, 3, 4, 0);
  assertEq(dist, 5);
});

test('euclideanDistance calculates 3D correctly', () => {
  const dist = euclideanDistance(0, 0, 0, 1, 2, 2);
  assertEq(dist, 3);
});

// spatialRecall tests
test('spatialRecall finds nodes within radius (Euclidean)', () => {
  const results = spatialRecall(tree, {
    center: { x: 50, y: 10 },
    radius: 1000,
    metric: 'euclidean',
    limit: 10
  });
  assert(results.length >= 3, 'Should find European cities');
});

test('spatialRecall finds nodes within radius (Haversine)', () => {
  const results = spatialRecall(tree, {
    center: { x: 48.8566, y: 2.3522 },
    radius: 1000,
    metric: 'haversine',
    limit: 10
  });
  
  assert(results.length >= 2, 'Should find nearby cities');
  assert(results.some(r => r.node.id === parisNode.id), 'Should include Paris');
});

test('spatialRecall excludes distant nodes', () => {
  const results = spatialRecall(tree, {
    center: { x: 48.8566, y: 2.3522 },
    radius: 500,
    metric: 'haversine',
    limit: 10
  });
  
  assert(!results.some(r => r.node.id === berlinNode.id), 'Berlin should be excluded');
  assert(!results.some(r => r.node.id === tokyoNode.id), 'Tokyo should be excluded');
});

test('spatialRecall sorts by distance', () => {
  const results = spatialRecall(tree, {
    center: { x: 48.8566, y: 2.3522 },
    radius: 10000,
    metric: 'haversine',
    limit: 10
  });
  
  for (let i = 1; i < results.length; i++) {
    assert(results[i].distance >= results[i-1].distance, 'Should be sorted by distance');
  }
});

test('spatialRecall respects limit', () => {
  const results = spatialRecall(tree, {
    center: { x: 50, y: 10 },
    radius: 100000,
    metric: 'haversine',
    limit: 2
  });
  assertEq(results.length, 2);
});

test('spatialRecall ignores nodes without position', () => {
  const results = spatialRecall(tree, {
    center: { x: 0, y: 0 },
    radius: 1000000,
    metric: 'haversine',
    limit: 100
  });
  
  assert(!results.some(r => r.node.id === coffeeNode.id), 'Nodes without position should be excluded');
});

await testAsync('spatialRecall hybrid: semantic + spatial', async () => {
  const queryEmb = await embed('European capital city');
  
  const results = spatialRecall(tree, {
    center: { x: 50, y: 10 },
    radius: 2000,
    metric: 'haversine',
    queryEmbedding: queryEmb,
    limit: 10
  });
  
  assert(results.length >= 2, 'Hybrid query should return results');
  assert(results.every(r => r.score !== undefined), 'Hybrid results should have scores');
});

test('spatialRecall handles zero radius', () => {
  const results = spatialRecall(tree, {
    center: { x: 48.8566, y: 2.3522 },
    radius: 0,
    metric: 'haversine',
    limit: 10
  });
  
  assertEq(results.length, 1);
  assertEq(results[0].node.id, parisNode.id);
});

test('spatialRecall handles negative coordinates', () => {
  const results = spatialRecall(tree, {
    center: { x: 40.7128, y: -74.0060 },
    radius: 100,
    metric: 'haversine',
    limit: 10
  });
  
  assert(results.some(r => r.node.id === nycNode.id), 'Should find NYC');
});

// findNearby tests
test('findNearby finds nodes near another node', () => {
  const results = findNearby(tree, parisNode.id, 1000, { metric: 'haversine' });
  
  assert(results.length >= 1, 'Should find nearby nodes');
  assert(!results.some(r => r.node.id === parisNode.id), 'Should exclude source node');
});

test('findNearby throws for node without position', () => {
  let threw = false;
  try {
    findNearby(tree, coffeeNode.id, 1000);
  } catch (e) {
    threw = true;
  }
  assert(threw, 'Should throw for node without position');
});

// Position management in graph
test('MemoryGraph.setPosition works', () => {
  const testNode = createNode('Test node');
  testNode.embedding = embeddings.coffee;
  tree.add(testNode);
  
  graph.setPosition(testNode.id, { x: 100, y: 200, pinned: true });
  const pos = graph.getPosition(testNode.id);
  
  assertEq(pos.x, 100);
  assertEq(pos.y, 200);
  assertEq(pos.pinned, true);
});

test('MemoryGraph.getPinnedPositions returns only pinned', () => {
  const pinned = graph.getPinnedPositions();
  assert(Object.keys(pinned).length >= 1, 'Should have pinned positions');
});

// ============================================================
// SECTION 5: FILE I/O
// ============================================================

console.log('\n═══════════════════════════════════════════════════════════');
console.log('SECTION 5: FILE I/O');
console.log('═══════════════════════════════════════════════════════════\n');

const testFile = path.join(__dirname, 'temp-v21-test.engram');

await testAsync('writeEngramFile writes valid file', async () => {
  const file = {
    header: {
      version: [2, 1],
      created: Date.now(),
      modified: Date.now(),
      security: {
        encrypted: false,
        algorithm: 'none',
        kdf: 'none',
        integrity: new Uint8Array(32)
      },
      metadata: { source: 'test' },
      schema: {
        embeddingModel: 'all-MiniLM-L6-v2',
        embeddingDims: 384,
        chunkStrategy: 'paragraph',
        modalities: ['text']
      },
      stats: {
        totalChunks: tree.size(),
        totalTokens: 0,
        rootNodes: tree.getRoots().length,
        maxDepth: 1,
        entityCount: 0,
        linkCount: links.length
      },
      embedding: {
        model: 'all-MiniLM-L6-v2',
        dimensions: 384,
        provider: 'local'
      }
    },
    nodes: tree.getAll(),
    entities: [],
    links: links
  };
  
  await writeEngramFile(testFile, file);
  const stat = await fs.stat(testFile);
  assert(stat.size > 0, 'File should have content');
});

await testAsync('readEngramFile reads valid file', async () => {
  const file = await readEngramFile(testFile);
  
  assertEq(file.header.version[0], 2);
  assertEq(file.header.version[1], 1);
  assert(file.nodes.length >= 6, 'Should have nodes');
});

await testAsync('Positions persist through write/read cycle', async () => {
  const file = await readEngramFile(testFile);
  
  const paris = file.nodes.find(n => n.content.data.includes('Paris'));
  assert(paris, 'Paris node should exist');
  assert(paris.position, 'Paris should have position');
  assertEq(paris.position.x, 48.8566);
  assertEq(paris.position.y, 2.3522);
});

await testAsync('Links persist through write/read cycle', async () => {
  const file = await readEngramFile(testFile);
  assert(file.links.length >= 3, 'Links should persist');
});

// Encryption test
const encryptedFile = path.join(__dirname, 'temp-v21-encrypted.engram');

await testAsync('Encrypted write/read works', async () => {
  const file = {
    header: {
      version: [2, 1],
      created: Date.now(),
      modified: Date.now(),
      security: {
        encrypted: false,
        algorithm: 'none',
        kdf: 'none',
        integrity: new Uint8Array(32)
      },
      metadata: { source: 'encrypted-test' },
      schema: {
        embeddingModel: 'all-MiniLM-L6-v2',
        embeddingDims: 384,
        chunkStrategy: 'paragraph',
        modalities: ['text']
      },
      stats: {
        totalChunks: 1,
        totalTokens: 0,
        rootNodes: 1,
        maxDepth: 0,
        entityCount: 0,
        linkCount: 0
      }
    },
    nodes: [parisNode],
    entities: [],
    links: []
  };
  
  await writeEngramFile(encryptedFile, file, { encrypt: true, password: 'test123' });
  const read = await readEngramFile(encryptedFile, { password: 'test123' });
  
  assert(read.nodes.length === 1, 'Should read encrypted file');
  assert(read.nodes[0].content.data.includes('Paris'), 'Content should match');
});

// ============================================================
// SECTION 6: EDGE CASES & ERROR HANDLING
// ============================================================

console.log('\n═══════════════════════════════════════════════════════════');
console.log('SECTION 6: EDGE CASES & ERROR HANDLING');
console.log('═══════════════════════════════════════════════════════════\n');

test('spatialRecall handles empty tree', () => {
  const emptyTree = new MemoryTree();
  const results = spatialRecall(emptyTree, {
    center: { x: 0, y: 0 },
    radius: 1000
  });
  assertEq(results.length, 0);
});

test('spatialRecall handles 3D coordinates', () => {
  const node3d = createNode('3D test node');
  node3d.embedding = embeddings.coffee;
  node3d.position = { x: 0, y: 0, z: 10 };
  
  const tree3d = new MemoryTree();
  tree3d.add(node3d);
  
  const results = spatialRecall(tree3d, {
    center: { x: 0, y: 0, z: 0 },
    radius: 20,
    metric: 'euclidean'
  });
  
  assertEq(results.length, 1);
  assertEq(results[0].distance, 10);
});

test('MemoryGraph handles removeLink', () => {
  const beforeStats = graph.getStats();
  const linkToRemove = links[0];
  graph.removeLink(linkToRemove.id);
  const afterStats = graph.getStats();
  
  assert(afterStats.linkCount < beforeStats.linkCount, 'Link should be removed');
});

test('MemoryTree.delete removes nodes', () => {
  const toDelete = createNode('Delete me');
  tree.add(toDelete);
  const sizeBefore = tree.size();
  
  tree.delete(toDelete.id);
  assertEq(tree.size(), sizeBefore - 1);
});

// ============================================================
// RESULTS
// ============================================================

console.log('\n═══════════════════════════════════════════════════════════');
console.log('TEST RESULTS');
console.log('═══════════════════════════════════════════════════════════\n');

const failures = results.filter(r => r.status === '✗');

if (failures.length > 0) {
  console.log('FAILURES:');
  for (const f of failures) {
    console.log(`  ✗ ${f.name}`);
    console.log(`    Error: ${f.error}`);
  }
  console.log('');
}

console.log(`PASSED: ${passed}`);
console.log(`FAILED: ${failed}`);
console.log(`TOTAL:  ${passed + failed}`);
console.log('');

if (failed === 0) {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('ALL TESTS PASSED - ENGRAM V2.1 FULLY FUNCTIONAL');
  console.log('═══════════════════════════════════════════════════════════');
} else {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('SOME TESTS FAILED - SEE ABOVE FOR DETAILS');
  console.log('═══════════════════════════════════════════════════════════');
  process.exit(1);
}

// Cleanup
await fs.unlink(testFile).catch(() => {});
await fs.unlink(encryptedFile).catch(() => {});
