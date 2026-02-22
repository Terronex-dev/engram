# Version History

**Current Version: 1.0.4**

## Release Timeline

### v1.0.4 (2026-02-22)
- **Status:** ✅ Published to NPM
- **NPM:** `npm install @terronex/engram@1.0.4`
- **Changes:** Comprehensive branding cleanup, removed all AIF-BIN v3 references
- **Technical:** No functional changes, pure documentation cleanup

### v1.0.3 (2026-02-22) 
- **Status:** ✅ Published to NPM
- **Changes:** Added automatic .engram file extension handling
- **New Functions:** `writeEngramFile()`, `readEngramFile()`, `ensureEngramExtension()`
- **Developer Experience:** Auto-extension when saving files

### v1.0.2 (2026-02-22)
- **Status:** ✅ Published to NPM  
- **Changes:** CRITICAL BUG FIX - Fixed npm package module resolution
- **Technical:** Removed conflicting ESM build, CommonJS only
- **Impact:** Package now actually usable (v1.0.0 and v1.0.1 were broken)

### v1.0.1 (2026-02-22)
- **Status:** ❌ Broken (module resolution issues)
- **Changes:** Attempted module resolution fix
- **Issue:** TypeScript dual-build conflict persisted

### v1.0.0 (2026-02-22)
- **Status:** ❌ Broken (module resolution issues) 
- **Changes:** Initial public release with HNSW performance improvements
- **Performance:** 400x improvement over brute force search
- **Issue:** "Cannot find module './types'" error made package unusable

## Version Update Process

When releasing a new version:

1. **Update version in 3 places:**
   - `package.json` → `"version": "x.x.x"`
   - `src/index.ts` → `export const VERSION = 'x.x.x'`
   - `VERSION.md` → Add new entry at top

2. **Update CHANGELOG.md** with changes

3. **Build and test:**
   ```bash
   npm run build && npm test
   ```

4. **Commit and tag:**
   ```bash
   git add -A
   git commit -m "release: bump to vx.x.x"
   git tag vx.x.x
   git push origin main --tags
   ```

5. **Publish to NPM:**
   ```bash
   npm publish
   ```

## Semantic Versioning

- **MAJOR** (x.0.0): Breaking API changes
- **MINOR** (1.x.0): New features, backward compatible
- **PATCH** (1.0.x): Bug fixes, backward compatible

**Current:** All releases so far are PATCH releases (bug fixes and improvements)