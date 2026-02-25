# Contributing to Engram

## Development

```bash
git clone https://github.com/Terronex-dev/engram.git
cd engram
npm install
npm test
npm run build
```

## Structure

```
src/
  core.ts         MemoryTree, MemoryNode, tree operations
  hnsw.ts         HNSW approximate nearest neighbor index
  io.ts           Read/write .engram files (MessagePack binary)
  types.ts        TypeScript interfaces and types
  index.ts        Public API exports
tests/
  core.test.ts    MemoryTree operations
  hnsw.test.ts    HNSW index correctness
  io.test.ts      File I/O round-trip
  hnsw-stress.test.ts  Performance and edge cases
```

## Code Style

- TypeScript strict mode, ESM (NodeNext)
- Named exports only
- No default exports

## Testing

```bash
npm test           # All tests
npx vitest run     # Verbose output
```

28 tests across 4 suites. All must pass before merge.

## Pull Requests

1. Fork the repo
2. Create a feature branch
3. Make changes
4. Run `npm test` and `npm run build`
5. Open a PR with a descriptive title

## License

MIT. Contributions licensed under MIT.
