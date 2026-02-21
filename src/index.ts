/**
 * AIF-BIN v3
 * 
 * Hierarchical, temporal, multi-modal AI memory format
 * 
 * @packageDocumentation
 */

// Types
export * from './types';

// Core
export {
  generateId,
  MemoryTree,
  getDecayTier,
  touchNode,
  isExpired,
  cosineSimilarity,
  searchNodes,
  createNode,
  createLink
} from './core';

// I/O
export {
  writeAifBinV3,
  readAifBinV3,
  StreamingWriter,
  migrateV2toV3,
  WriteOptions,
  ReadOptions
} from './io';

// Version info
export const VERSION = '3.0.0';
export const FORMAT_VERSION = [3, 0] as const;
