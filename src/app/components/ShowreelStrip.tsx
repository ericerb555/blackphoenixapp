/**
 * ShowreelStrip — the reels a visitor sees on the landing page.
 *
 * Three vertical tiles that play themselves: kitchens, bathrooms, and trash
 * removal. Content and timing live in `showreels.ts`, which is tested; this
 * file only draws them.
 *
 * WHAT MAKES IT READ AS A REEL RATHER THAN A SLIDESHOW
 *
 * Stills drift instead of sitting still, beats cross-dissolve instead of
 * blinking, and the caption changes with the picture. `ReelRenderer` reached
 * the same three conclusions for the reels we post to Instagram; these are
 * the cheap half of that, done in CSS because nothing here is recorded.
 *
 * THREE THINGS IT DELIBERATELY DOES NOT DO
 *
 * **It does not play off screen.** Three tiles dissolving forever at the top
 * of a page somebody has scrolled past is battery and, on a phone, data. An
 * IntersectionObserver stops the clock, and because the clock is an
 * accumulated elapsed time rather than a wall-clock reading, a tile resumes
 * where it stopped instead of jumping.
 *
 * **It does not move for somebody who asked it not to.** `prefers-reduced-
 * motion` drops the drift and shortens the dissolve to almost nothing. The
 * reel still advances — the content is the point, the movement is decoration.
 *
 * **It does not re-render per frame.** The drift is a CSS animation, so React
 * is only involved when the beat changes — about once every three seconds per
 * tile, rather than sixty times a second times three.
 */
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Camera } from 'lucide-react';
import { SUPABASE_ORIGIN } from '../lib/apiConfig';
import {
  SHOWREELS,
  REEL_LOGO,
  CROSSFADE_SECONDS,
  BEAT_SECONDS,
  beatAt,
  galleryUrl,
  playableReels,
  awaitingFootage,
  type Showreel,
} from '../lib/showreels';

/** How often the beat is recalculated. Four times a second is imperceptible. */
const TICK_MS = 250;

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(query.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

function ReelTile({
  reel,
  onOpen,
  reduced,
}: {
  reel: Showreel;
  onOpen?: () => void;
  reduced: boolean;
}) {
  const frameRef = useRef<HTMLDivElement | null>(null);
  /** Seconds this tile has actually been on screen. Not wall-clock. */
  const elapsedRef = useRef(0);
  const [index, setIndex] = useState(0);
  const [videoDead, setVideoDead] = useState(false);

  const useVideo = Boolean(reel.videoUrl) && !videoDead;
  const beats = reel.beats || [];
  const beat = beats[index];

  useEffect(() => {
    const el = frameRef.current;
    if (!el || useVideo || beats.length <= 1) return;

    let timer: ReturnType<typeof setInterval> | null = null;
    let last = 0;

    const stop = () => {
      if (timer) { clearInterval(timer); timer = null; }
    };
    const start = () => {
      if (timer) return;
      last = Date.now();
      timer = setInterval(() => {
        const now = Date.now();
        // Clamped so a laptop waking from sleep advances one beat rather
        // than skipping through an hour of them.
        elapsedRef.current += Math.min((now - last) / 1000, 1);
        last = now;
        setIndex((was) => {
          const next = beatAt(reel, elapsedRef.current);
          return next === was ? was : next;
        });
      }, TICK_MS);
    };

    const observer = new IntersectionObserver(
      ([entry]) => (entry.isIntersecting ? start() : stop()),
      { threshold: 0.2 },
    );
    observer.observe(el);
    return () => { observer.disconnect(); stop(); };
  }, [reel, useVideo, beats.length]);

  const fade = reduced ? 0.15 : CROSSFADE_SECONDS;
  const seconds = Number(beat?.seconds) > 0 ? Number(beat?.seconds) : BEAT_SECONDS;
  const clickable = Boolean(onOpen);

  return (
    <figure className="m-0 flex flex-col gap-3">
      <div
        ref={frameRef}
        onClick={onOpen}
        role={clickable ? 'button' : undefined}
        tabIndex={clickable ? 0 : undefined}
        onKeyDown={(e) => { if (clickable && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onOpen!(); } }}
        className={`group relative overflow-hidden rounded-2xl ${clickable ? 'cursor-pointer' : ''}`}
        style={{
          aspectRatio: '9 / 16',
          background: '#0b0b0b',
          border: '1px solid rgba(234,88,12,0.22)',
        }}
      >
        {useVideo ? (
          <video
            src={reel.videoUrl!}
            muted
            loop
            playsInline
            autoPlay
            preload="metadata"
            onError={() => setVideoDead(true)}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          beats.map((b, i) => {
            const active = i === index;
            const src = b.image ? galleryUrl(SUPABASE_ORIGIN, b.image) : '';
            return (
              <div
                key={`${reel.id}-${i}`}
                aria-hidden={!active}
                className="absolute inset-0"
                style={{
                  opacity: active ? 1 : 0,
                  /*
                   * A beat drawn as TYPE cuts rather than dissolves.
                   * Crossfading two photographs looks like a dissolve;
                   * crossfading two pieces of centred text looks like a
                   * printing fault, because for half a second both captions
                   * are legible on top of each other.
                   */
                  transition: `opacity ${src ? fade : 0.12}s ease-in-out`,
                  // The incoming beat covers the outgoing one rather than
                  // blending under it.
                  zIndex: active ? 2 : 1,
                }}
              >
                {src ? (
                  <>
                    <img
                      src={src}
                      alt={b.caption}
                      loading={i === 0 ? 'eager' : 'lazy'}
                      decoding="async"
                      className="h-full w-full object-cover"
                      style={
                        active && !reduced
                          ? { animation: `reelDrift ${seconds + fade}s ease-out both` }
                          : undefined
                      }
                    />
                    {/*
                      The caption lives INSIDE its own beat, so it fades with
                      the picture it describes. Held in the shared overlay it
                      switched the instant the index changed, while the old
                      photograph was still most of the way visible — for the
                      ~0.7s of the dissolve the tile showed a bathroom at
                      rough-in captioned "floor set and spaced". A quarter of
                      every beat was captioned wrong.
                    */}
                    <div
                      className="pointer-events-none absolute inset-x-0 bottom-0 px-3 pb-6 pt-12"
                      style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.88), rgba(0,0,0,0.3) 60%, transparent)' }}
                    >
                      <p className="text-[12px] font-semibold leading-snug text-white drop-shadow">
                        {b.caption}
                      </p>
                    </div>
                  </>
                ) : (
                  /* No photograph for this beat — the brand carries it. See
                     the note in showreels.ts about not borrowing a stock one.
                     It has to look DESIGNED rather than empty: a dark panel
                     with small type on it just reads as a tile that failed to
                     load, which is worse than no tile at all. */
                  <div
                    className="flex h-full w-full flex-col items-center justify-center gap-4 px-5 text-center"
                    style={{
                      background:
                        'radial-gradient(130% 80% at 50% 8%, rgba(234,88,12,0.30) 0%, rgba(120,40,8,0.14) 38%, #0b0b0b 72%)',
                    }}
                  >
                    <img src={REEL_LOGO} alt="" className="h-20 w-auto drop-shadow-[0_0_18px_rgba(234,88,12,0.45)]" />
                    <p
                      className="text-[17px] font-black uppercase leading-tight tracking-wide text-white"
                      style={{ textShadow: '0 2px 18px rgba(0,0,0,0.6)' }}
                    >
                      {b.caption}
                    </p>
                    <span className="h-[2px] w-10 rounded-full bg-orange-500/80" />
                  </div>
                )}
              </div>
            );
          })
        )}

        {/*
          Pips sit above every beat layer and stay in the shared overlay —
          unlike the caption, a pip lighting up a fraction early reads as the
          reel moving on, which is what it is.
        */}
        {!useVideo && beats.length > 1 && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex gap-1 px-3 pb-2" aria-hidden>
            {beats.map((_, i) => (
              <span
                key={i}
                className="h-[3px] flex-1 rounded-full"
                style={{ background: i === index ? '#f97316' : 'rgba(255,255,255,0.28)', transition: 'background 300ms' }}
              />
            ))}
          </div>
        )}

        {/* The mark, top-left, small. */}
        <img
          src={REEL_LOGO}
          alt=""
          aria-hidden
          className="pointer-events-none absolute left-2.5 top-2.5 z-10 h-7 w-auto opacity-80 drop-shadow"
        />
      </div>

      <figcaption>
        <p className="text-[11px] font-black uppercase tracking-widest text-orange-400">{reel.kicker}</p>
        <p className="mt-0.5 text-sm font-bold leading-snug text-white">{reel.title}</p>
        {awaitingFootage(reel) && (
          <p className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-gray-500">
            <Camera className="h-3 w-3" /> Photos from the next job go here
          </p>
        )}
      </figcaption>
    </figure>
  );
}

export default function ShowreelStrip({ onNavigate }: { onNavigate?: (path: string) => void }) {
  const reduced = usePrefersReducedMotion();
  const reels = playableReels(SHOWREELS);
  if (reels.length === 0) return null;

  /*
   * `flex justify-center` rather than relying on `mx-auto`, which is also the
   * pattern the sections above and below use. The hero headline overflows the
   * viewport horizontally, so the containing block is wider than the window
   * and `mx-auto` centres against the wrong width — the section ends up flush
   * to the left edge with the first tile clipped off.
   */
  return (
    <section className="flex w-full justify-center px-4 py-12" aria-label="Recent work">
      {/* Scoped to this component; the drift is decoration and belongs with it. */}
      <style>{`
        @keyframes reelDrift {
          from { transform: scale(1.001) translate3d(0, 0, 0); }
          to   { transform: scale(1.075) translate3d(0, -1.2%, 0); }
        }
      `}</style>

      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-widest text-orange-400">
              On the tools
            </p>
            <h2 className="text-2xl font-black text-white sm:text-3xl">Work we actually did</h2>
            <p className="mt-1 text-sm text-gray-400">
              Every frame is our own job — no stock photography.
            </p>
          </div>
          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('work')}
              className="inline-flex items-center gap-1.5 self-start rounded-lg border border-orange-500/40 bg-orange-500/10 px-4 py-2 text-sm font-bold text-orange-400 transition hover:bg-orange-500/20 sm:self-auto"
            >
              See the full gallery <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-3">
          {/*
            Two across on a phone, three from md. The third tile orphans into
            a half-row on a phone, which is the right trade: letting it span
            both columns would give a 9:16 tile the full screen width and make
            it about two and a half screens tall.
          */}
          {reels.map((reel) => (
            <ReelTile
              key={reel.id}
              reel={reel}
              reduced={reduced}
              onOpen={onNavigate ? () => onNavigate('work') : undefined}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
