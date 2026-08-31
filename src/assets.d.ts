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
