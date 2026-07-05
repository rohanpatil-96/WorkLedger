# AI Coding Agent Instructions & Checkpoints

## Version Checkpoints

### WorkledgerV3 (Latest Checked-In Build)
- **Status**: Stable, tested, with updated commute warning, dynamic current-date seed generation, customized brand logo colors, high-visibility report column styling (Inkwell #2C3639 for table columns), and week number format (e.g. W2, W17).
- **Date Saved**: 2026-07-05
- **Files Stored**:
  - `/checkpoints/WorkledgerV3/index.html`
  - `/checkpoints/WorkledgerV3/package.json`
  - `/checkpoints/WorkledgerV3/src` (Full source directory)

---

## Restoring Checkpoint "WorkledgerV3"

If the user ever requests to:
- "revert to WorkledgerV3"
- "revert to the last stable version"

The acting agent **MUST** perform the following restoration:
1. Copy all files recursively from `/checkpoints/WorkledgerV3` to the active workspace (replacing `index.html`, `package.json`, and the entire `src` directory).
2. Run `install_applet_dependencies` to sync dependencies.
3. Validate and build using `lint_applet` and `compile_applet`.

