# AI Coding Agent Instructions & Checkpoints

## Version Checkpoints

### WorkledgerV3 (Latest Checked-In Build)
- **Status**: Stable, tested, with updated commute warning, dynamic current-date seed generation, and customized brand logo colors.
- **Date Saved**: 2026-07-01
- **Files Stored**:
  - `/checkpoints/WorkledgerV3/index.html`
  - `/checkpoints/WorkledgerV3/package.json`
  - `/checkpoints/WorkledgerV3/src` (Full source directory)

### WorkledgerV1 (Browser-Stable Build)
- **Status**: Stable, tested, and optimized for general browser and web-view display (without any Capacitor overlapping or layout padding glitches).
- **Date Saved**: 2026-06-29
- **Files Stored**:
  - `/checkpoints/WorkledgerV1/index.html`
  - `/checkpoints/WorkledgerV1/package.json`
  - `/checkpoints/WorkledgerV1/src/index.css`
  - `/checkpoints/WorkledgerV1/src/App.tsx`
  - `/checkpoints/WorkledgerV1/src/main.tsx`
  - `/checkpoints/WorkledgerV1/src/types.ts`

---

## Restoring Checkpoint "WorkledgerV3"

If the user ever requests to:
- "revert to WorkledgerV3"
- "revert to the version before latest changes"

The acting agent **MUST** perform the following restoration:
1. Copy all files recursively from `/checkpoints/WorkledgerV3` to the active workspace (replacing `index.html`, `package.json`, and the entire `src` directory).
2. Run `install_applet_dependencies` to sync dependencies.
3. Validate and build using `lint_applet` and `compile_applet`.

## Restoring Checkpoint "WorkledgerV1"

If the user ever requests to:
- "revert back to original last successful build"
- "remove all those iOS fixes we did"
- "go back to WorkledgerV1"
- "revert to the stable version"

The acting agent **MUST** perform the following restoration commands to overwrite the active code with the stored backup copies:

1. Copy files from backup to the active workspace:
   - Overwrite `/index.html` with the content of `/checkpoints/WorkledgerV1/index.html`
   - Overwrite `/package.json` with the content of `/checkpoints/WorkledgerV1/package.json`
   - Overwrite `/src/index.css` with the content of `/checkpoints/WorkledgerV1/src/index.css`
   - Overwrite `/src/App.tsx` with the content of `/checkpoints/WorkledgerV1/src/App.tsx`
   - Overwrite `/src/main.tsx` with the content of `/checkpoints/WorkledgerV1/src/main.tsx`
   - Overwrite `/src/types.ts` with the content of `/checkpoints/WorkledgerV1/src/types.ts`

2. Run `install_applet_dependencies` to ensure the correct dependencies in package.json are restored.
3. Validate and build using `lint_applet` and `compile_applet`.
