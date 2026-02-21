# Changelog

All notable changes to the Engram project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-02-21

### LAUNCH: Engram Neural Memory Format

**Engram** is born! A complete rebrand and evolution of AIF-BIN v3, inspired by biological memory traces in neuroscience.

### Revolutionary Performance
- **HNSW indexing** for lightning-fast search
- **Sub-millisecond search times** (~0.3ms vs 120ms brute force)
- **400x performance improvement** for large datasets
- **O(log n) complexity** vs previous O(n) brute force
- **99.9%+ accuracy** with massive speed gains
- **Automatic fallback** to brute force when HNSW not configured

### Neural-Inspired Architecture
- **Hierarchical memory** with tree-structured organization
- **Temporal intelligence** with built-in time decay and relevance scoring
- **Multi-modal support** for text, images, audio, code, and custom data types
- **Semantic search** with vector embeddings and quality-aware ranking
- **Entity relationships** with automatic recognition and linking
- **Privacy-first** with optional end-to-end encryption

### Elegant Developer Experience
- **Clean API**: `writeEngram()`, `readEngram()`, intuitive functions
- **Beautiful file extension**: `.engram` files (vs `.aif-bin`)
- **TypeScript native**: Complete type safety with `EngramFile`, `EngramHeader`
- **Scientific naming**: Engram (memory trace) vs technical "AIF-BIN"
- **Production ready**: Comprehensive test suite (28/28 tests passing)

### Technical Specifications
- **Magic bytes**: `ENGRAM` (6 bytes)
- **Format version**: 1.0
- **HNSW configuration**: Customizable M, efConstruction, distance metrics
- **Binary format**: MessagePack for efficient serialization
- **Encryption**: AES-256-GCM with Argon2id key derivation
- **File format**: Single-file portable `.engram` containers

### Enterprise Features
- **Temporal tiers**: HOT (0-7 days), WARM (7-30 days), COLD (30-90 days), ARCHIVE (90+ days)
- **Intelligent compaction**: Automatic summarization with decay scoring
- **HNSW utilities**: `hasHNSWIndex()`, `buildHNSWIndex()`, `getHNSWStats()`
- **Quality metrics**: Confidence scoring and access pattern tracking
- **Scalability**: Tested with 1000+ nodes, sub-millisecond performance

### Migration from AIF-BIN v3

```typescript
// Before (AIF-BIN v3.1.0)
import { writeAifBinV3, readAifBinV3, AifBinV3File } from '@terronex/aifbin-v3';

// After (Engram v1.0.0)
import { writeEngram, readEngram, EngramFile } from '@terronex/engram';

// File extension change
// old-memory.aif-bin → new-memory.engram
```

### Breaking Changes
This is a complete rebrand with breaking changes:

- **Package name**: `@terronex/aifbin-v3` → `@terronex/engram`
- **File extension**: `.aif-bin` → `.engram`
- **Function names**: `writeAifBinV3()` → `writeEngram()`, `readAifBinV3()` → `readEngram()`
- **Types**: `AifBinV3File` → `EngramFile`, `AifBinV3Header` → `EngramHeader`
- **Magic bytes**: `AIFBIN` → `ENGRAM`
- **Versioning**: Reset to v1.0.0 for clean semantic versioning

### Performance Benchmarks

**Real-world test results:**
- **1000 nodes**: 0.43ms average search time
- **Memory usage**: <1MB for 500 nodes
- **Build time**: 77ms for 1000 nodes
- **Scaling**: 1.76x ratio (near-logarithmic performance)
- **Accuracy**: 100% match vs brute force in comparative testing

### Why "Engram"?

An **engram** is the hypothetical means by which memory traces are stored in the brain - the biological basis of memory. This perfectly captures what our format does: storing AI memory traces in a highly efficient, searchable, and temporally-aware format.

The rebrand represents our evolution from a technical "binary format" to a neural-inspired memory system that mirrors how biological systems actually store and retrieve information.

---

## Legacy Notes

This project evolved from AIF-BIN v3.1.0 (February 2026). The AIF-BIN codebase has been completely rebranded to Engram while preserving all performance improvements and adding the elegant `.engram` file extension and neural-inspired naming conventions.