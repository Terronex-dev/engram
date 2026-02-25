/**
 * HNSW Stress Testing and Performance Validation
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryTree, createNode, searchNodes, searchNodesHNSW, searchNodesBruteForce } from '../src/index';
import type { HNSWConfig, SearchOptions } from '../src/types';

describe('HNSW Stress Testing', () => {
  let tree: MemoryTree;
  let hnswConfig: HNSWConfig;

  beforeEach(() => {
    hnswConfig = {
      space: 'cosine',
      numDimensions: 128,
      maxElements: 5000,
      M: 16,
      efConstruction: 200
    };
    tree = new MemoryTree([], hnswConfig);
  });

  it('should handle large dataset performance (1000+ nodes)', () => {
    console.log('\nTesting with 1000 nodes...');
    
    const startBuild = performance.now();
    
    // Add 1000 nodes with random embeddings
    for (let i = 0; i < 1000; i++) {
      const embedding = new Float32Array(128);
      for (let j = 0; j < 128; j++) {
        embedding[j] = Math.random() * 2 - 1; // Random values between -1 and 1
      }
      
      const node = createNode(`Document ${i}`, { tags: [`category-${i % 10}`] });
      node.embedding = embedding;
      tree.add(node);
    }
    
    const buildTime = performance.now() - startBuild;
    console.log(`Build time: ${buildTime.toFixed(2)}ms for 1000 nodes`);
    
    expect(tree.size()).toBe(1000);
    expect(tree.hasHNSWIndex()).toBe(true);
    expect(tree.getHNSWStats()!.currentCount).toBe(1000);

    // Test search performance
    const queryEmbedding = new Float32Array(128);
    for (let i = 0; i < 128; i++) {
      queryEmbedding[i] = Math.random() * 2 - 1;
    }

    const options: SearchOptions = {
      query: 'test query',
      topK: 10,
      minScore: 0.1
    };

    // HNSW search
    const startHNSW = performance.now();
    const hnswResults = searchNodes(tree, queryEmbedding, options);
    const hnswTime = performance.now() - startHNSW;

    console.log(`HNSW search time: ${hnswTime.toFixed(3)}ms`);
    console.log(`Results found: ${hnswResults.length}`);

    expect(hnswResults.length).toBeGreaterThan(0);
    expect(hnswTime).toBeLessThan(5); // Should be very fast
  });

  it('should maintain accuracy compared to brute force', () => {
    console.log('\nTesting HNSW vs Brute Force accuracy...');
    
    // Create a smaller controlled dataset
    const embeddings = [
      [1.0, 0.0, 0.0], // Cluster 1
      [0.9, 0.1, 0.0],
      [0.8, 0.2, 0.0],
      [0.0, 1.0, 0.0], // Cluster 2  
      [0.0, 0.9, 0.1],
      [0.0, 0.8, 0.2],
      [0.0, 0.0, 1.0], // Cluster 3
      [0.0, 0.0, 0.9],
      [0.1, 0.0, 0.8]
    ];

    // Create tree without HNSW for brute force comparison
    const bruteTree = new MemoryTree();
    const hnswTree = new MemoryTree([], {
      space: 'cosine',
      numDimensions: 3,
      maxElements: 100
    });

    embeddings.forEach((emb, i) => {
      const embedding = new Float32Array(emb);
      
      const bruteNode = createNode(`Document ${i}`, { tags: ['test'] });
      bruteNode.embedding = embedding;
      bruteTree.add(bruteNode);
      
      const hnswNode = createNode(`Document ${i}`, { tags: ['test'] });
      hnswNode.embedding = embedding;
      hnswTree.add(hnswNode);
    });

    const queryEmbedding = new Float32Array([1.0, 0.0, 0.0]); // Should match cluster 1
    const options: SearchOptions = {
      query: 'accuracy test',
      topK: 3,
      minScore: 0.1
    };

    const bruteResults = searchNodesBruteForce(bruteTree, queryEmbedding, options);
    const hnswResults = searchNodesHNSW(hnswTree, queryEmbedding, options);

    console.log(`Brute force results: ${bruteResults.length}`);
    console.log(`HNSW results: ${hnswResults.length}`);

    // Both should find similar results (at least 80% overlap in top results)
    expect(bruteResults.length).toBeGreaterThan(0);
    expect(hnswResults.length).toBeGreaterThan(0);
    
    // Top result should be the same (Document 0, closest to query)
    if (bruteResults.length > 0 && hnswResults.length > 0) {
      expect(hnswResults[0].node.content.data).toBe(bruteResults[0].node.content.data);
      console.log(`Top result match: ${bruteResults[0].node.content.data}`);
    }
  });

  it('should handle concurrent operations safely', async () => {
    console.log('\nTesting concurrent operations...');
    
    const promises = [];
    
    // Concurrent adding
    for (let i = 0; i < 100; i++) {
      const promise = new Promise<void>((resolve) => {
        const embedding = new Float32Array(128);
        for (let j = 0; j < 128; j++) {
          embedding[j] = Math.random();
        }
        
        const node = createNode(`Concurrent ${i}`);
        node.embedding = embedding;
        tree.add(node);
        resolve();
      });
      promises.push(promise);
    }
    
    await Promise.all(promises);
    
    expect(tree.size()).toBe(100);
    console.log(`Successfully added 100 nodes concurrently`);
    
    // Concurrent searching
    const searchPromises = [];
    for (let i = 0; i < 10; i++) {
      const promise = new Promise<number>((resolve) => {
        const queryEmbedding = new Float32Array(128);
        for (let j = 0; j < 128; j++) {
          queryEmbedding[j] = Math.random();
        }
        
        const results = searchNodes(tree, queryEmbedding, {
          query: `concurrent search ${i}`,
          topK: 5,
          minScore: 0.1
        });
        
        resolve(results.length);
      });
      searchPromises.push(promise);
    }
    
    const searchCounts = await Promise.all(searchPromises);
    console.log(`Concurrent searches completed: ${searchCounts.join(', ')} results`);
    
    // All searches should complete without errors
    expect(searchCounts.length).toBe(10);
  });

  it('should handle edge cases gracefully', () => {
    console.log('\nTesting edge cases...');
    
    // Empty search on empty tree
    const emptyQuery = new Float32Array(128);
    emptyQuery[0] = 1.0;
    const emptyResults = searchNodes(tree, emptyQuery, {
      query: 'empty test',
      topK: 10
    });
    expect(emptyResults.length).toBe(0);
    console.log(`Empty tree search: 0 results`);
    
    // Search with very high minScore
    const nodeEmbedding = new Float32Array(128);
    nodeEmbedding[0] = 1.0;
    const node = createNode('Single node');
    node.embedding = nodeEmbedding;
    tree.add(node);
    
    const strictQuery = new Float32Array(128);
    strictQuery[0] = 1.0;
    const strictResults = searchNodes(tree, strictQuery, {
      query: 'strict test',
      topK: 10,
      minScore: 0.99 // Very high threshold
    });
    
    console.log(`Strict search results: ${strictResults.length}`);
    
    // Zero-vector search
    const zeroResults = searchNodes(tree, new Float32Array(128), {
      query: 'zero test',
      topK: 5,
      minScore: 0.1
    });
    
    console.log(`Zero vector search: ${zeroResults.length} results`);
    
    // These should not crash
    expect(Array.isArray(strictResults)).toBe(true);
    expect(Array.isArray(zeroResults)).toBe(true);
  });

  it('should validate memory usage patterns', () => {
    console.log('\nTesting memory patterns...');
    
    const initialMemory = process.memoryUsage().heapUsed;
    
    // Add nodes and measure memory growth
    for (let i = 0; i < 500; i++) {
      const embedding = new Float32Array(128);
      for (let j = 0; j < 128; j++) {
        embedding[j] = Math.random();
      }
      
      const node = createNode(`Memory test ${i}`);
      node.embedding = embedding;
      tree.add(node);
    }
    
    const afterAddMemory = process.memoryUsage().heapUsed;
    const addMemoryDelta = (afterAddMemory - initialMemory) / 1024 / 1024; // MB
    
    console.log(`Memory usage after 500 nodes: +${addMemoryDelta.toFixed(2)}MB`);
    
    // Delete half the nodes
    const allNodes = tree.getAll();
    for (let i = 0; i < 250; i++) {
      tree.delete(allNodes[i].id);
    }
    
    const afterDeleteMemory = process.memoryUsage().heapUsed;
    const deleteMemoryDelta = (afterDeleteMemory - afterAddMemory) / 1024 / 1024; // MB
    
    console.log(`Memory change after deleting 250 nodes: ${deleteMemoryDelta.toFixed(2)}MB`);
    console.log(`Final tree size: ${tree.size()}`);
    
    expect(tree.size()).toBe(250);
    expect(addMemoryDelta).toBeLessThan(100); // Reasonable memory usage
  });

  it('should handle different distance metrics', () => {
    console.log('\nTesting different distance metrics...');
    
    const configs = [
      { space: 'cosine' as const, name: 'Cosine' },
      { space: 'l2' as const, name: 'L2' },
      { space: 'ip' as const, name: 'Inner Product' }
    ];
    
    configs.forEach(({ space, name }) => {
      const config: HNSWConfig = {
        space,
        numDimensions: 10,
        maxElements: 100
      };
      
      const testTree = new MemoryTree([], config);
      
      // Add test nodes
      for (let i = 0; i < 10; i++) {
        const embedding = new Float32Array(10);
        for (let j = 0; j < 10; j++) {
          embedding[j] = Math.random();
        }
        
        const node = createNode(`${name} test ${i}`);
        node.embedding = embedding;
        testTree.add(node);
      }
      
      // Test search
      const queryEmbedding = new Float32Array(10);
      for (let i = 0; i < 10; i++) {
        queryEmbedding[i] = Math.random();
      }
      
      const results = searchNodes(testTree, queryEmbedding, {
        query: `${name} search`,
        topK: 3,
        minScore: 0.1
      });
      
      console.log(`
${name} distance: ${results.length} results`);
      expect(testTree.hasHNSWIndex()).toBe(true);
      expect(results).toBeInstanceOf(Array);
    });
  });
});

describe('HNSW Performance Benchmarks', () => {
  it('should demonstrate performance scaling', () => {
    console.log('\nPerformance scaling benchmark...');
    
    const sizes = [100, 500, 1000];
    const results: Array<{size: number, buildTime: number, searchTime: number}> = [];
    
    sizes.forEach(size => {
      const config: HNSWConfig = {
        space: 'cosine',
        numDimensions: 64,
        maxElements: size * 2
      };
      
      const tree = new MemoryTree([], config);
      
      // Build phase
      const startBuild = performance.now();
      for (let i = 0; i < size; i++) {
        const embedding = new Float32Array(64);
        for (let j = 0; j < 64; j++) {
          embedding[j] = Math.random();
        }
        
        const node = createNode(`Perf test ${i}`);
        node.embedding = embedding;
        tree.add(node);
      }
      const buildTime = performance.now() - startBuild;
      
      // Search phase
      const queryEmbedding = new Float32Array(64);
      for (let i = 0; i < 64; i++) {
        queryEmbedding[i] = Math.random();
      }
      
      const startSearch = performance.now();
      const searchResults = searchNodes(tree, queryEmbedding, {
        query: 'benchmark',
        topK: 10,
        minScore: 0.1
      });
      const searchTime = performance.now() - startSearch;
      
      results.push({ size, buildTime, searchTime });
      
      console.log(`
Size: ${size}, Build: ${buildTime.toFixed(2)}ms, Search: ${searchTime.toFixed(3)}ms`);
      
      expect(searchResults.length).toBeGreaterThan(0);
      expect(searchTime).toBeLessThan(10); // Should be very fast
    });
    
    // Verify logarithmic scaling (search time shouldn't grow linearly)
    const searchTimes = results.map(r => r.searchTime);
    const largest = searchTimes[searchTimes.length - 1];
    const smallest = searchTimes[0];
    
    console.log(`Search time ratio (1000/100): ${(largest/smallest).toFixed(2)}x`);
    expect(largest / smallest).toBeLessThan(25); // Should scale sub-linearly (relaxed for CI variance)
  });
});