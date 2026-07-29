/**
 * StoreAmbientBackground — the animated "light sweeping up & down" backdrop
 * borrowed from the landing page CTA buttons, scaled up to sit behind the
 * whole storefront. It's a fixed, non-interactive layer (pointer-events: none)
 * pinned at the lowest z-index so every product, card, and control renders on
 * top of it. Colors match the brand orange (#fb923c / #ea580c).
 */
export function StoreAmbientBackground() {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: -10, background: '#080808' }}
    >
      {/* Scoped keyframes so this effect is self-contained. */}
      <style>{`
        @keyframes storeScanDown { 0% { transform: translateY(-40vh); } 100% { transform: translateY(140vh); } }
        @keyframes storeScanUp   { 0% { transform: translateY(140vh); } 100% { transform: translateY(-40vh); } }
        @keyframes storeGridFloat { 0%,100% { opacity: 0.04; transform: translateY(0); } 50% { opacity: 0.08; transform: translateY(-8px); } }
        @keyframes storeGlowPulse { 0%,100% { opacity: 0.35; } 50% { opacity: 0.6; } }
        .store-scan-down { animation: storeScanDown 7s linear infinite; }
        .store-scan-up   { animation: storeScanUp 9s linear infinite; }
        .store-grid      { animation: storeGridFloat 6s ease-in-out infinite; }
        .store-glow      { animation: storeGlowPulse 5s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .store-scan-down, .store-scan-up, .store-grid, .store-glow { animation: none; }
        }
      `}</style>

      {/* Deep radial vignette for depth */}
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(120% 80% at 50% 0%, rgba(26,8,0,0.9) 0%, #080808 60%)' }}
      />

      {/* Faint floating grid */}
      <div
        className="store-grid absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(rgba(251,146,60,1) 1px, transparent 1px), linear-gradient(90deg, rgba(251,146,60,1) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          opacity: 0.05,
        }}
      />

      {/* Two light beams sweeping vertically — the "up and down" light. */}
      <div
        className="store-scan-down absolute left-0 right-0"
        style={{ height: '38vh', background: 'linear-gradient(to bottom, transparent, rgba(251,146,60,0.10), transparent)' }}
      />
      <div
        className="store-scan-up absolute left-0 right-0"
        style={{ height: '30vh', background: 'linear-gradient(to bottom, transparent, rgba(234,88,12,0.07), transparent)' }}
      />

      {/* Soft ambient glows top & bottom */}
      <div
        className="store-glow absolute -top-40 left-1/2 -translate-x-1/2"
        style={{ width: '80vw', height: '40vh', background: 'radial-gradient(closest-side, rgba(251,146,60,0.14), transparent)', filter: 'blur(40px)' }}
      />
      <div
        className="store-glow absolute -bottom-40 left-1/2 -translate-x-1/2"
        style={{ width: '70vw', height: '36vh', background: 'radial-gradient(closest-side, rgba(234,88,12,0.10), transparent)', filter: 'blur(48px)', animationDelay: '2.5s' }}
      />
    </div>
  );
}

export default StoreAmbientBackground;
