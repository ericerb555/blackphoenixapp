/**
 * The Phoenix, rendered as flowing energy.
 *
 * WHAT MAKES THE MOTION LOOK ALIVE RATHER THAN RANDOM
 *
 * Curl noise. The particles are displaced by the curl of a potential field,
 * which is divergence-free — meaning the flow never compresses into clumps
 * or drains out of regions. That single property is the difference between
 * "swirling energy currents" and "jittering dots". Each particle is also
 * sprung back toward its home pixel on the logo, so the silhouette survives
 * however far the current carries it.
 *
 * Every particle additionally runs a slow excursion cycle: it detaches,
 * travels, and is drawn home again. The cycles are out of phase, so at any
 * moment a minority of the bird is in flight and the shape still reads.
 *
 * WHY THE WHOLE SIMULATION IS IN THE VERTEX SHADER
 *
 * There is no per-frame CPU work and no per-particle JavaScript at all. The
 * attributes are uploaded once; each frame changes a handful of uniforms.
 * Forty thousand particles cost the main thread the same as four, which is
 * what makes 60fps achievable while the rest of the command centre is
 * fetching and rendering real application screens beside it.
 *
 * WHAT IS REAL AND WHAT IS NOT
 *
 * The brief says the states must follow actual system events. They do: the
 * state is a prop, and the command centre drives it from whether a request
 * is in flight, whether the ledger has a running call, whether the approval
 * queue is non-empty. LISTENING is driven by a real microphone analyser.
 * SPEAKING is the one state with nothing real behind it yet, because no
 * text-to-speech is connected — `audioLevel` is the input it will use, and
 * until something feeds it the state is inert rather than faked.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import {
  loadPhoenixParticles, budgetFor, BRAND_ORANGE, BRAND_EMBER,
  type ParticleField,
} from './phoenixParticleSource';

/** Camera distance. Shared with the shader so depth shading agrees with it. */
const CAM_DIST = 3.15;

export type PhoenixState =
  | 'idle' | 'listening' | 'thinking' | 'speaking'
  | 'working' | 'success' | 'alert';

/**
 * Per-state motion. One row per state so the whole personality is readable
 * in one place rather than spread through the shader.
 *
 *  flow      how fast the currents move
 *  spread    how far a particle may stray from its home pixel
 *  swirl     rotation about the body's axis
 *  glow      overall emission
 *  jitter    high-frequency unrest; the tell for "something is wrong"
 *  warm      0 = brand orange, 1 = pushed toward alarm red
 *  stream    pulls particles sideways, toward the panel being worked on
 */
const MOODS: Record<PhoenixState, {
  flow: number; spread: number; swirl: number;
  glow: number; jitter: number; warm: number; stream: number;
}> = {
  idle:      { flow: 0.30, spread: 0.034, swirl: 0.10, glow: 1.00, jitter: 0.00, warm: 0.0, stream: 0.0 },
  listening: { flow: 0.45, spread: 0.052, swirl: 0.14, glow: 1.25, jitter: 0.03, warm: 0.0, stream: 0.0 },
  thinking:  { flow: 1.70, spread: 0.165, swirl: 0.65, glow: 1.45, jitter: 0.06, warm: 0.0, stream: 0.0 },
  speaking:  { flow: 0.75, spread: 0.066, swirl: 0.20, glow: 1.35, jitter: 0.02, warm: 0.0, stream: 0.0 },
  working:   { flow: 1.15, spread: 0.105, swirl: 0.35, glow: 1.30, jitter: 0.03, warm: 0.0, stream: 0.5 },
  success:   { flow: 0.90, spread: 0.110, swirl: 0.45, glow: 1.90, jitter: 0.00, warm: 0.0, stream: 0.0 },
  alert:     { flow: 0.95, spread: 0.078, swirl: 0.08, glow: 1.40, jitter: 0.22, warm: 1.0, stream: 0.0 },
};

const VERT = /* glsl */`
  attribute float aEdge;
  attribute float aThick;   // 0 at a feather tip, 1 through the chest
  attribute vec3  aSeed;

  uniform float uTime;
  uniform float uFlow;
  uniform float uSpread;
  uniform float uSwirl;
  uniform float uJitter;
  uniform float uStream;
  uniform float uBurst;     // success: one-shot expansion
  uniform float uAudio;     // 0..1 live level, mic or speech
  uniform float uBreath;
  uniform float uSize;
  uniform float uProj;      // viewportHeight / (2 tan(fov/2)) — see below
  uniform float uCamDist;
  uniform float uStill;     // 1 = reduced motion: hold the formed shape

  varying float vEdge;
  varying float vSpeed;
  varying float vFade;
  varying float vNear;      // 1 at the front of the volume, 0 at the back

  // A smooth vector potential. Sines rather than a noise texture: no upload,
  // no sampler, and at this scale the eye cannot tell the difference.
  vec3 potential(vec3 p, float t) {
    return vec3(
      sin(p.y * 2.7 + t * 0.70) + 0.55 * sin(p.z * 4.1 - t * 1.05),
      cos(p.z * 2.3 - t * 0.83) + 0.55 * cos(p.x * 3.7 + t * 0.92),
      sin(p.x * 2.9 + t * 0.61) + 0.55 * sin(p.y * 4.3 - t * 1.13)
    );
  }

  // Curl of that potential: divergence-free, so the flow swirls and never
  // piles particles up in a corner of the shape.
  vec3 curl(vec3 p, float t) {
    const float e = 0.12;
    vec3 dx = vec3(e, 0.0, 0.0), dy = vec3(0.0, e, 0.0), dz = vec3(0.0, 0.0, e);
    vec3 px0 = potential(p - dx, t), px1 = potential(p + dx, t);
    vec3 py0 = potential(p - dy, t), py1 = potential(p + dy, t);
    vec3 pz0 = potential(p - dz, t), pz1 = potential(p + dz, t);
    vec3 c = vec3(
      (py1.z - py0.z) - (pz1.y - pz0.y),
      (pz1.x - pz0.x) - (px1.z - px0.z),
      (px1.y - px0.y) - (py1.x - py0.x)
    ) / (2.0 * e);
    /*
     * Soft-normalised, so uSpread is a distance rather than a coefficient.
     * The raw curl of this potential runs to about 4, which meant every
     * "spread" value in MOODS was secretly four times what it read as and
     * the silhouette stayed loose at every state including idle.
     */
    return c / (1.0 + length(c) * 0.75);
  }

  void main() {
    vec3 home = position;
    float t = uTime;

    // Excursion: this particle leaves the shape and is drawn back. Phases
    // are spread by seed, so only a slice of the bird is ever in flight.
    float rate  = 0.045 + aSeed.y * 0.065;
    float phase = fract(aSeed.x + t * rate);
    float out_  = smoothstep(0.00, 0.18, phase) * smoothstep(0.62, 0.24, phase);
    // Most particles stay home; the few that travel, travel properly.
    // Raised from 0.72: at a quarter of the cloud adrift the silhouette
    // was being eaten from the edge inward. A tenth reads as life; a
    // quarter reads as the shape coming apart.
    float travels = step(0.90, aSeed.z);
    float excursion = out_ * travels * 1.7;

    vec3 flowVec = curl(home * 1.35 + vec3(0.0, 0.0, t * 0.09), t * uFlow);

    // Circulation about the body's vertical axis — the sense of energy
    // going somewhere, as opposed to merely vibrating.
    vec3 axis = vec3(-home.y, home.x, 0.0);
    vec3 swirlVec = axis * uSwirl * (0.6 + 0.8 * aSeed.z);

    float unrest = uJitter * sin(t * 23.0 + aSeed.x * 61.0);

    vec3 disp = flowVec * (uSpread * (1.0 + excursion))
              + swirlVec * 0.13
              + vec3(unrest, unrest * 0.7, 0.0);

    // Working: a current peels off toward the panel on the right.
    disp.x += uStream * excursion * 0.55;

    // Audio widens the whole field. Edge particles lead the ripple, which
    // is what makes a voice look like it is moving through the outline.
    disp *= 1.0 + uAudio * (0.55 + aEdge * 0.75);

    // Success: a brief outward bloom along each particle's own radius.
    vec3 outward = normalize(home + vec3(0.0001));
    disp += outward * uBurst * (0.35 + aSeed.z * 0.35);

    float breathe = 1.0 + uBreath * 0.022 * sin(t * 0.9 + aSeed.z * 2.0);
    vec3 pos = (home * breathe + disp * (1.0 - uStill));

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;

    /*
     * Where this particle sits through the depth of the solid, AFTER the
     * rotation has been applied. This is what makes it read as an object
     * rather than a picture: the near face burns and the far face sinks
     * away, and which face is which changes as the bird turns.
     */
    vNear = clamp((uCamDist + mv.z + 1.0) * 0.5, 0.0, 1.0);

    /*
     * Where this particle sits through the depth of the solid, AFTER the
     * rotation has been applied. This is what makes it read as an object
     * rather than a picture: the near face burns and the far face sinks
     * away, and which face is which changes as the bird turns.
     */

    float travelled = length(disp);
    vSpeed = clamp(travelled * 3.2, 0.0, 1.0);
    // Particles far from home dim — they read as sparks thrown off rather
    // than as the shape having grown fuzzy edges.
    vFade = 1.0 - smoothstep(0.10, 0.62, travelled);
    vEdge = aEdge;

    /*
     * uSize is a WORLD size, and uProj converts world units to pixels for
     * this viewport and field of view. The first version used a hardcoded
     * 300, which made every particle about 200px across — 28,000 of those
     * additively blended is three thousand times more light than the frame
     * can hold, and the phoenix came out as a white blob.
     */
    // Thicker parts of the solid carry heavier particles, so the chest
    // reads as mass and the feather tips as filigree. Also the reason
    // aThick exists: an unused attribute is stripped by the compiler.
    float size = uSize * (0.55 + aSeed.z * 0.85) * (1.0 + aEdge * 0.35)
               * (0.8 + aThick * 0.5);
    gl_PointSize = clamp(size * uProj / max(-mv.z, 0.1), 1.0, 14.0);
  }
`;

const FRAG = /* glsl */`
  precision highp float;

  uniform vec3  uOrange;
  uniform vec3  uEmber;
  uniform float uGlow;
  uniform float uWarm;
  uniform float uOpacity;

  varying float vEdge;
  varying float vSpeed;
  varying float vFade;
  varying float vNear;

  void main() {
    // Soft round sprite. Discarding the corners keeps the additive pile-up
    // from turning dense regions into squares.
    vec2 d = gl_PointCoord - 0.5;
    float r2 = dot(d, d);
    if (r2 > 0.25) discard;
    /*
     * Tightened from 11. A wide gaussian makes every particle a little
     * cloud, and forty thousand little clouds is fog — the silhouette goes
     * soft even when the positions are exact. A hard core with a short
     * falloff keeps the edge legible.
     */
    float a = exp(-r2 * 19.0) + 0.25 * exp(-r2 * 6.0);

    // Body glows ember, outline burns brand orange, and anything moving
    // fast heats toward white — so motion itself is visible as temperature.
    // The outline is the shape. Giving it a clear brightness lead over
    // the body is what separates "a phoenix" from "a glowing mass".
    vec3 base = mix(uEmber, uOrange * 1.25, vEdge);
    base = mix(base, vec3(1.0, 0.78, 0.52), vSpeed * 0.55);
    // Alert pushes the whole field red without touching the geometry.
    base = mix(base, vec3(1.0, 0.18, 0.12), uWarm * 0.75);

    /*
     * Depth. The far side of the solid is dimmer and deeper red; the near
     * side is hot. Without this the volume is there geometrically and
     * invisible to the eye, because every particle is the same brightness
     * and the cloud flattens back into a silhouette.
     */
    float lum = mix(0.28, 1.35, vNear);
    base = mix(base * vec3(0.75, 0.55, 0.6), base, vNear);

    gl_FragColor = vec4(base * uGlow * lum, a * uOpacity * (0.3 + 0.7 * vFade));
  }
`;

/* ── the points ──────────────────────────────────────────────────────── */

function Swarm({
  field, state, audioLevel, audioLevelRef, reducedMotion, onFps,
}: {
  field: ParticleField;
  state: PhoenixState;
  audioLevel: number;
  audioLevelRef?: React.MutableRefObject<number>;
  reducedMotion: boolean;
  onFps?: (fps: number) => void;
}) {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const groupRef = useRef<THREE.Group>(null);
  const { invalidate, size: viewport, camera } = useThree();

  /**
   * Brightness has to fall as the count rises.
   *
   * Additive blending means total light is proportional to the number of
   * particles. Without this, doubling the particle slider doubles the
   * exposure and the bird washes out — the denser setting would look
   * strictly worse, which is the opposite of what a quality slider should do.
   */
  const densityOpacity = useMemo(
    () => Math.min(0.85, Math.max(0.07, 0.85 * Math.sqrt(9000 / Math.max(field.count, 1)))),
    [field.count],
  );

  // Where the mood is now, as opposed to where it is heading. Lerped every
  // frame so a state change is a transition rather than a cut.
  const now = useRef({ ...MOODS.idle });
  const burst = useRef(0);
  const prevState = useRef<PhoenixState>(state);

  const uniforms = useMemo(() => ({
    uTime:    { value: 0 },
    uFlow:    { value: MOODS.idle.flow },
    uSpread:  { value: MOODS.idle.spread },
    uSwirl:   { value: MOODS.idle.swirl },
    uJitter:  { value: 0 },
    uStream:  { value: 0 },
    uBurst:   { value: 0 },
    uAudio:   { value: 0 },
    uBreath:  { value: 1 },
    uSize:    { value: 0.0052 },
    uProj:    { value: 1000 },
    uCamDist: { value: CAM_DIST },
    uStill:   { value: reducedMotion ? 1 : 0 },
    uGlow:    { value: 1 },
    uWarm:    { value: 0 },
    uOpacity: { value: 0.9 },
    uOrange:  { value: new THREE.Vector3(...BRAND_ORANGE) },
    uEmber:   { value: new THREE.Vector3(...BRAND_EMBER) },
  }), [reducedMotion]);

  // Success is a moment, not a condition: entering it fires a one-shot.
  useEffect(() => {
    if (state === 'success' && prevState.current !== 'success') burst.current = 1;
    prevState.current = state;
  }, [state]);

  const frames = useRef({ n: 0, t: 0 });

  useFrame((_, delta) => {
    const m = matRef.current;
    if (!m) return;

    const dt = Math.min(delta, 0.05);          // a backgrounded tab must not lurch
    const target = MOODS[state];
    const k = 1 - Math.exp(-dt * 3.2);          // framerate-independent easing

    const c = now.current;
    c.flow   += (target.flow   - c.flow)   * k;
    c.spread += (target.spread - c.spread) * k;
    c.swirl  += (target.swirl  - c.swirl)  * k;
    c.glow   += (target.glow   - c.glow)   * k;
    c.jitter += (target.jitter - c.jitter) * k;
    c.warm   += (target.warm   - c.warm)   * k;
    c.stream += (target.stream - c.stream) * k;

    burst.current = Math.max(0, burst.current - dt * 1.3);
    const b = burst.current;

    const u = m.uniforms;

    // World units to pixels, for THIS canvas. Recomputed rather than
    // assumed, so the bird is the same density on a laptop and a 4K panel.
    const fov = (camera as THREE.PerspectiveCamera).fov ?? 45;
    u.uProj.value = viewport.height / (2 * Math.tan((fov * Math.PI) / 360));
    u.uOpacity.value = densityOpacity;

    u.uTime.value   += dt * (reducedMotion ? 0 : 1);
    u.uFlow.value    = c.flow;
    u.uSpread.value  = c.spread;
    u.uSwirl.value   = c.swirl;
    u.uJitter.value  = c.jitter;
    u.uStream.value  = c.stream;
    u.uWarm.value    = c.warm;
    /*
     * The ref wins when it is supplied. A live voice changes sixty times a
     * second, and routing that through a React prop re-renders this whole
     * tree on every frame to deliver one float — while competing for the
     * main thread with the frame it is trying to animate.
     */
    const liveLevel = audioLevelRef ? audioLevelRef.current : audioLevel;
    u.uAudio.value  += (liveLevel - u.uAudio.value) * (1 - Math.exp(-dt * 12));
    // Easing out of a cubic so the bloom snaps and settles.
    u.uBurst.value   = b * b * (3 - 2 * b) * 0.55;
    u.uGlow.value    = c.glow * (1 + b * 0.8);

    if (groupRef.current && !reducedMotion) {
      /*
       * A slow yaw with a little pitch. Wide enough that the solid reads as
       * a solid — you have to see the far wing swing behind the body to
       * believe there is a behind — and slow enough that the bird never
       * stops facing you.
       */
      const t = u.uTime.value;
      groupRef.current.rotation.y = Math.sin(t * 0.17) * 0.55;
      groupRef.current.rotation.x = Math.sin(t * 0.11) * 0.09;
    }

    const f = frames.current;
    f.n += 1; f.t += dt;
    if (f.t >= 1) { onFps?.(Math.round(f.n / f.t)); f.n = 0; f.t = 0; }

    invalidate();
  });

  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(field.positions, 3));
    g.setAttribute('aEdge', new THREE.BufferAttribute(field.edge, 1));
    g.setAttribute('aThick', new THREE.BufferAttribute(field.thickness, 1));
    g.setAttribute('aSeed', new THREE.BufferAttribute(field.seed, 3));
    // The swarm leaves its home pixels, so a bounding sphere computed from
    // the attributes would cull the bird the moment it spread. Set wide.
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 4);
    return g;
  }, [field]);

  // Explicit disposal. A WebGL buffer is not garbage collected by React
  // unmounting the element that referenced it.
  useEffect(() => () => { geom.dispose(); }, [geom]);

  return (
    <group ref={groupRef}>
      <points geometry={geom} frustumCulled={false}>
        <shaderMaterial
          ref={matRef}
          uniforms={uniforms}
          vertexShader={VERT}
          fragmentShader={FRAG}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
}

/* ── holographic rings ───────────────────────────────────────────────── */

function Rings({ state }: { state: PhoenixState }) {
  const a = useRef<THREE.Mesh>(null);
  const b = useRef<THREE.Mesh>(null);
  const fast = state === 'thinking' || state === 'working';

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const s = fast ? 2.6 : 1;
    if (a.current) a.current.rotation.z += dt * 0.18 * s;
    if (b.current) b.current.rotation.z -= dt * 0.11 * s;
  });

  const colour = state === 'alert' ? '#f43f5e' : '#ea580c';

  return (
    <group>
      <mesh ref={a} rotation={[1.35, 0, 0]}>
        <ringGeometry args={[1.45, 1.46, 128]} />
        <meshBasicMaterial color={colour} transparent opacity={0.3} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={b} rotation={[1.2, 0.35, 0]}>
        <ringGeometry args={[1.72, 1.727, 128]} />
        <meshBasicMaterial color={colour} transparent opacity={0.16} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/* ── the component ───────────────────────────────────────────────────── */

export interface PhoenixParticleBrainProps {
  state?: PhoenixState;
  /** 0..1. Mic level while listening, speech level while speaking. */
  audioLevel?: number;
  /**
   * The same thing as a ref, for anything that updates at frame rate.
   * Preferred over the plain number — see the note inside Swarm.
   */
  audioLevelRef?: React.MutableRefObject<number>;
  /** Override the device budget. The prototype exposes this; the app will not. */
  particleCount?: number;
  className?: string;
  onFps?: (fps: number) => void;
  onReady?: (count: number) => void;
}

export default function PhoenixParticleBrain({
  state = 'idle',
  audioLevel = 0,
  audioLevelRef,
  particleCount,
  className,
  onFps,
  onReady,
}: PhoenixParticleBrainProps) {
  const [field, setField] = useState<ParticleField | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  const reducedMotion = useMemo(
    () => typeof matchMedia !== 'undefined'
      && matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );

  useEffect(() => {
    let alive = true;
    const count = particleCount ?? budgetFor();
    // The URL rather than a bundler import, so this component can be handed
    // a different asset later without a rebuild.
    import('../../../imports/BPB_phoenix_full_color_logo.png')
      .then((m) => loadPhoenixParticles(m.default, count))
      .then((f) => { if (alive) { setField(f); onReady?.(f.count); } })
      .catch((e) => { if (alive) setFailed(e?.message || 'Could not read the logo.'); });
    return () => { alive = false; };
  }, [particleCount]);

  if (failed) {
    return (
      <div className={`flex items-center justify-center ${className || ''}`}>
        <p className="max-w-xs text-center text-sm text-rose-300">
          The Phoenix could not be built from the logo: {failed}
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      <Canvas
        camera={{ position: [0, 0, CAM_DIST], fov: 45 }}
        // Capped: a 3x retina display would otherwise quadruple the fill
        // cost of an additive particle field for no visible gain.
        dpr={[1, 1.75]}
        gl={{ antialias: false, alpha: true, powerPreference: 'high-performance' }}
      >
        {field && (
          <>
            <Swarm
              field={field}
              state={state}
              audioLevel={audioLevel}
              audioLevelRef={audioLevelRef}
              reducedMotion={reducedMotion}
              onFps={onFps}
            />
            <Rings state={state} />
          </>
        )}
      </Canvas>
    </div>
  );
}
