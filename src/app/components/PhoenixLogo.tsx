/**
 * PhoenixLogo — inline SVG brand mark.
 *
 * A black phoenix with an orange outline, rendered as vector paths so it works
 * everywhere with no image-asset pipeline (fixes the logo failing to load on
 * production/Vercel). Reads as an upswept firebird: spread flame-wings, a raised
 * head, and a three-tongue flame tail.
 *
 * Fill is near-black so the mark reads on light grounds; the orange outline
 * defines it on dark grounds (e.g. the black circular badge on the landing page).
 */
interface PhoenixLogoProps {
  className?: string;
  /** Outline / accent color. Defaults to Black Phoenix orange. */
  accent?: string;
  /** Body fill. Defaults to near-black. */
  fill?: string;
  title?: string;
}

export default function PhoenixLogo({
  className,
  accent = '#ea580c',
  fill = '#0a0a0a',
  title = 'Black Phoenix',
}: PhoenixLogoProps) {
  return (
    <svg
      viewBox="0 0 120 120"
      className={className}
      role="img"
      aria-label={title}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{title}</title>
      <g
        stroke={accent}
        strokeWidth={3}
        strokeLinejoin="round"
        strokeLinecap="round"
      >
        {/* Left wing — swept flame */}
        <path
          d="M60 50 C 40 44 20 40 8 26 C 20 40 24 52 44 56 C 30 56 20 64 14 78 C 30 66 46 64 58 62 Z"
          fill={fill}
        />
        {/* Right wing — mirror of the left */}
        <path
          d="M60 50 C 80 44 100 40 112 26 C 100 40 96 52 76 56 C 90 56 100 64 106 78 C 90 66 74 64 62 62 Z"
          fill={fill}
        />
        {/* Tail — three flame tongues */}
        <path
          d="M53 72 C 48 84 48 94 51 102 C 54 92 56 84 57 76 Z"
          fill={fill}
        />
        <path
          d="M67 72 C 72 84 72 94 69 102 C 66 92 64 84 63 76 Z"
          fill={fill}
        />
        <path
          d="M60 74 C 56 86 57 98 60 108 C 63 98 64 86 60 74 Z"
          fill={fill}
        />
        {/* Body / neck */}
        <path
          d="M60 26 C 53 32 51 42 55 56 C 56 68 58 78 60 86 C 62 78 64 68 65 56 C 69 42 67 32 60 26 Z"
          fill={fill}
        />
        {/* Head */}
        <circle cx="60" cy="24" r="7.5" fill={fill} />
        {/* Beak / crest, raised up-left */}
        <path d="M56 18 L47 12 L58 20 Z" fill={fill} />
        {/* Feather accents (interior detail) */}
        <path d="M40 52 C 33 50 27 47 22 42" fill="none" />
        <path d="M80 52 C 87 50 93 47 98 42" fill="none" />
      </g>
      {/* Eye */}
      <circle cx="61" cy="23" r="1.6" fill={accent} />
    </svg>
  );
}
