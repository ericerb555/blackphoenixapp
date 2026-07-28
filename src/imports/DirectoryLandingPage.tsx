/**
 * Orphaned Figma-import duplicate. The canonical, maintained component lives at
 * `src/app/pages/DirectoryLandingPage.tsx` and is what the router actually uses.
 * This file is imported by nothing, but the project's preview compiler enumerates
 * every .tsx, and the old body referenced modules under `../components/*` /
 * `../config/*` / `../utils/*` that don't exist at this path — producing a
 * "Failed to load module" (ModuleFetchError) in the preview. Re-exporting the
 * real component keeps this path resolvable without maintaining a second copy.
 */
export { default } from "../app/pages/DirectoryLandingPage";
