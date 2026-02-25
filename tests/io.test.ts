/**
 * Engram I/O Tests
 */

import { describe, test, expect } from 'vitest';
import { 
  ensureEngramExtension, 
  writeEngram, 
  readEngram,
  migrateV2toEngram,
  writeEngramFile,
  readEngramFile,
  StreamingWriter
} from '../src/io';
import { EngramFile, MemoryNode } from '../src/types';
import { unlinkSync, existsSync } from 'fs';

describe('Engram I/O', () => {
  
  test('ensureEngramExtension', () => {
    expect(ensureEngramExtension('test')).toBe('test.engram');
    expect(ensureEngramExtension('test.engram')).toBe('test.engram');
    expect(ensureEngramExtension('test.ENGRAM')).toBe('test.ENGRAM');
    expect(ensureEngramExtension('file.json')).toBe('file.json.engram');
  });

  test('basic write/read cycle', async () => {
    const testFile: EngramFile = {
      header: {
        version: [1, 0],
        created: Date.now(),
        modified: Date.now(),
        security: {
          encrypted: false,
          algorithm: 'none',
          kdf: 'none',
          integrity: Buffer.alloc(32)
        },
        metadata: {
          source: 'test',
          tags: ['unit-test']
        },
        schema: {
          embeddingModel: 'test-model',
          embeddingDims: 384,
          chunkStrategy: 'paragraph',
          modalities: ['text']
        },
        stats: {
          totalChunks: 1,
          totalTokens: 10,
          rootNodes: 1,
          maxDepth: 0,
          entityCount: 0,
          linkCount: 0
        }
      },
      nodes: [{
        id: 'test-node',
        parentId: null,
        children: [],
        depth: 0,
        path: '/test',
        content: {
          type: 'text',
          data: 'test content',
          tokens: 2
        },
        embedding: new Float32Array([0.1, 0.2, 0.3]),
        temporal: {
          created: Date.now(),
          modified: Date.now(),
          accessed: Date.now(),
          decayTier: 'hot'
        },
        quality: {
          score: 0.8,
          confidence: 0.9,
          source: 'direct'
        },
        metadata: {
          custom: {},
          tags: ['test']
        }
      }],
      entities: [],
      links: []
    };

    // Test write
    const buffer = await writeEngram(testFile);
    expect(buffer.length).toBeGreaterThan(0);
    
    // Verify magic bytes
    expect(buffer.subarray(0, 6).toString()).toBe('ENGRAM');
    
    // Test read
    const readFile = await readEngram(buffer);
    expect(readFile.header.version).toEqual([1, 0]);
    expect(readFile.nodes).toHaveLength(1);
    expect(readFile.nodes[0].id).toBe('test-node');
    expect(readFile.nodes[0].content.data).toBe('test content');
  });

  test('file read/write with disk operations', async () => {
    const testFilename = 'test-io-output';
    
    const testFile: EngramFile = {
      header: {
        version: [1, 0],
        created: Date.now(),
        modified: Date.now(),
        security: {
          encrypted: false,
          algorithm: 'none',
          kdf: 'none', 
          integrity: Buffer.alloc(32)
        },
        metadata: { source: 'test' },
        schema: {
          embeddingModel: 'test-model',
          embeddingDims: 384,
          chunkStrategy: 'paragraph',
          modalities: ['text']
        },
        stats: {
          totalChunks: 1,
          totalTokens: 5,
          rootNodes: 1,
          maxDepth: 0,
          entityCount: 0,
          linkCount: 0
        }
      },
      nodes: [{
        id: 'disk-test-node',
        parentId: null,
        children: [],
        depth: 0,
        path: '/disk-test',
        content: {
          type: 'text',
          data: 'disk test content',
          tokens: 3
        },
        embedding: new Float32Array([0.5, 0.6, 0.7]),
        temporal: {
          created: Date.now(),
          modified: Date.now(),
          accessed: Date.now(),
          decayTier: 'hot'
        },
        quality: {
          score: 0.7,
          confidence: 0.8,
          source: 'direct'
        },
        metadata: {
          custom: {},
          tags: ['disk-test']
        }
      }],
      entities: [],
      links: []
    };

    try {
      // Test writeEngramFile
      const actualFilename = await writeEngramFile(testFilename, testFile);
      expect(actualFilename).toBe('test-io-output.engram');
      expect(existsSync(actualFilename)).toBe(true);
      
      // Test readEngramFile
      const readFile = await readEngramFile(actualFilename);
      expect(readFile.nodes).toHaveLength(1);
      expect(readFile.nodes[0].content.data).toBe('disk test content');
      
    } finally {
      // Cleanup
      if (existsSync('test-io-output.engram')) {
        unlinkSync('test-io-output.engram');
      }
    }
  });

  test('encrypted write/read cycle', async () => {
    const testFile: EngramFile = {
      header: {
        version: [1, 0],
        created: Date.now(),
        modified: Date.now(),
        security: {
          encrypted: false,
          algorithm: 'none',
          kdf: 'none',
          integrity: Buffer.alloc(32)
        },
        metadata: { source: 'test' },
        schema: {
          embeddingModel: 'test-model',
          embeddingDims: 384,
          chunkStrategy: 'paragraph',
          modalities: ['text']
        },
        stats: {
          totalChunks: 1,
          totalTokens: 5,
          rootNodes: 1,
          maxDepth: 0,
          entityCount: 0,
          linkCount: 0
        }
      },
      nodes: [{
        id: 'encrypted-node',
        parentId: null,
        children: [],
        depth: 0,
        path: '/encrypted',
        content: {
          type: 'text',
          data: 'secret content',
          tokens: 2
        },
        embedding: new Float32Array([0.9, 0.8, 0.7]),
        temporal: {
          created: Date.now(),
          modified: Date.now(),
          accessed: Date.now(),
          decayTier: 'hot'
        },
        quality: {
          score: 0.9,
          confidence: 0.95,
          source: 'direct'
        },
        metadata: {
          custom: {},
          tags: ['encrypted']
        }
      }],
      entities: [],
      links: []
    };

    const password = 'test-password-123';
    
    // Test encrypted write
    const buffer = await writeEngram(testFile, { encrypt: true, password });
    expect(buffer.length).toBeGreaterThan(0);
    
    // Test encrypted read
    const readFile = await readEngram(buffer, { password });
    expect(readFile.nodes).toHaveLength(1);
    expect(readFile.nodes[0].content.data).toBe('secret content');
    
    // Test read without password should fail
    await expect(readEngram(buffer)).rejects.toThrow('File is encrypted. Provide a password.');
    
    // Test read with wrong password should fail
    await expect(readEngram(buffer, { password: 'wrong-password' })).rejects.toThrow();
  });

  test('migrateV2toEngram', () => {
    const v2Data = {
      version: 2,
      created: Date.now() - 1000,
      chunks: [
        {
          content: 'First chunk content',
          embedding: [0.1, 0.2, 0.3, 0.4],
          metadata: { source: 'test' }
        },
        {
          content: 'Second chunk content', 
          embedding: [0.5, 0.6, 0.7, 0.8],
          metadata: { type: 'note' }
        }
      ]
    };

    const engram = migrateV2toEngram(v2Data);
    
    expect(engram.header.version).toEqual([1, 0]);
    expect(engram.nodes).toHaveLength(2);
    expect(engram.nodes[0].content.data).toBe('First chunk content');
    expect(engram.nodes[1].content.data).toBe('Second chunk content');
    expect(engram.nodes[0].embedding).toEqual(new Float32Array([0.1, 0.2, 0.3, 0.4]));
    expect(engram.nodes[0].metadata.custom).toEqual({ source: 'test' });
    expect(engram.nodes[0].metadata.tags).toContain('migrated-from-v2');
  });

  test('StreamingWriter basic operations', async () => {
    const writer = new StreamingWriter();
    
    const testNode: MemoryNode = {
      id: 'stream-test',
      parentId: null,
      children: [],
      depth: 0,
      path: '/stream',
      content: {
        type: 'text',
        data: 'streaming content',
        tokens: 2
      },
      embedding: new Float32Array([0.1, 0.2, 0.3]),
      temporal: {
        created: Date.now(),
        modified: Date.now(),
        accessed: Date.now(),
        decayTier: 'hot'
      },
      quality: {
        score: 0.8,
        confidence: 0.9,
        source: 'direct'
      },
      metadata: {
        custom: {},
        tags: ['stream-test']
      }
    };

    // Test append
    const nodeId = await writer.append(testNode);
    expect(nodeId).toBe('stream-test');
    
    // Test getState
    const state = writer.getState();
    expect(state.nodes).toHaveLength(1);
    expect(state.nodes[0].id).toBe('stream-test');
    
    // Test update
    await writer.update(nodeId, { 'content.data': 'updated content' });
    
    // Test checkpoint and position
    const initialPosition = writer.getPosition();
    await writer.checkpoint();
    expect(writer.getPosition()).toBe(initialPosition);
    
    // Test delete
    await writer.delete(nodeId);
    const finalState = writer.getState();
    expect(finalState.nodes).toHaveLength(0);
  });

  test('invalid file format handling', async () => {
    // Test invalid magic bytes
    const badMagic = Buffer.from('BADMAG');
    await expect(readEngram(badMagic)).rejects.toThrow('Invalid Engram file: bad magic bytes');
    
    // Test unsupported version
    const badVersion = Buffer.concat([
      Buffer.from('ENGRAM'),
      Buffer.from([99, 0]), // version 99.0
      Buffer.alloc(100)
    ]);
    await expect(readEngram(badVersion)).rejects.toThrow('Unsupported version: 99.0');
  });
});