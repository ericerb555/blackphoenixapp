/**
 * Asset imports.
 *
 * Vite turns `import logo from './logo.png'` into a URL string at build time.
 * TypeScript knows nothing about that and reports "Cannot find module" for
 * every image in the codebase — fifteen of them, which is most of the noise in
 * a type check and none of it real.
 *
 * These declarations tell the type checker what Vite already does, so the
 * remaining "cannot find module" errors are ones worth looking at.
 */
declare module '*.png' {
  const src: string;
  export default src;
}

declare module '*.jpg' {
  const src: string;
  export default src;
}

declare module '*.jpeg' {
  const src: string;
  export default src;
}

declare module '*.gif' {
  const src: string;
  export default src;
}

declare module '*.webp' {
  const src: string;
  export default src;
}

declare module '*.avif' {
  const src: string;
  export default src;
}

declare module '*.svg' {
  const src: string;
  export default src;
}

declare module '*.mp4' {
  const src: string;
  export default src;
}

declare module '*.webm' {
  const src: string;
  export default src;
}

/**
 * Stylesheets.
 *
 * Vite treats `import './x.css'` as a side effect that injects the stylesheet
 * and yields no value. TypeScript has no idea, so every CSS import — the app's
 * own `styles/index.css` included — was reported as a missing module.
 */
declare module '*.css';

/**
 * Vite's `?url` suffix.
 *
 * `import url from './thing.mjs?url'` tells Vite to emit the file as an asset
 * and hand back its hashed URL rather than bundling its contents. Needed for
 * MapLibre's web worker: the library resolves it with
 * `new URL('./maplibre-gl-worker.mjs', ...)`, which the bundler cannot rewrite,
 * so production asked for an unhashed path that was never emitted and the
 * worker 404'd. The map drew its canvas and then silently never finished
 * loading.
 */
declare module '*?url' {
  const url: string;
  export default url;
}
