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
 *  jitter    unrest; the tell for "something is wrong"
 *  warm      0 = brand orange, 1 = pushed toward alarm red
 *  stream    pulls particles sideways, toward the panel being worked on
 *  audio     how far the live audio level moves the particles
 *
 * AUDIO IS ZERO EVERYWHERE EXCEPT SPEAKING, DELIBERATELY.
 *
 * Driving the shape from the microphone made Phoenix twitch while you
 * talked, which reads as nervousness rather than attention — and it is the
 * wrong idea anyway: the voice that should move him is his own. Listening
 * is shown by a steady lift in brightness, not by motion.
 */
const MOODS: Record<PhoenixState, {
  flow: number; spread: number; swirl: number;
  glow: number; jitter: number; warm: number; stream: number; audio: number;
}> = {
  idle:      { flow: 0.10, spread: 0.030, swirl: 0.05, glow: 1.00, jitter: 0.000, warm: 0.0, stream: 0.0, audio: 0.0 },
  listening: { flow: 0.12, spread: 0.034, swirl: 0.06, glow: 1.30, jitter: 0.000, warm: 0.0, stream: 0.0, audio: 0.0 },
  thinking:  { flow: 0.55, spread: 0.110, swirl: 0.24, glow: 1.45, jitter: 0.010, warm: 0.0, stream: 0.0, audio: 0.0 },
  speaking:  { flow: 0.26, spread: 0.055, swirl: 0.09, glow: 1.35, jitter: 0.000, warm: 0.0, stream: 0.0, audio: 1.0 },
  working:   { flow: 0.40, spread: 0.090, swirl: 0.16, glow: 1.30, jitter: 0.008, warm: 0.0, stream: 0.4, audio: 0.0 },
  success:   { flow: 0.34, spread: 0.095, swirl: 0.20, glow: 1.90, jitter: 0.000, warm: 0.0, stream: 0.0, audio: 0.0 },
  alert:     { flow: 0.32, spread: 0.068, swirl: 0.04, glow: 1.40, jitter: 0.070, warm: 1.0, stream: 0.0, audio: 0.0 },
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
  varying float vWave;      // on a crest of the speech wave

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
    // Roughly a third of the old rate: a particle now takes most of a
    // minute to leave and return, which reads as circulation. Faster than
    // that and it reads as agitation.
    float rate  = 0.016 + aSeed.y * 0.024;
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

    /*
     * 6.0, down from 23.0. Twenty-three radians a second is 3.7Hz, which
     * the eye reads as a shake rather than as unease — and it was running
     * during LISTENING, so Phoenix twitched whenever anybody spoke.
     */
    float unrest = uJitter * sin(t * 6.0 + aSeed.x * 61.0);

    vec3 disp = flowVec * (uSpread * (1.0 + excursion))
              + swirlVec * 0.13
              + vec3(unrest, unrest * 0.7, 0.0);

    // Working: a current peels off toward the panel on the right.
    disp.x += uStream * excursion * 0.55;

    // Audio widens the whole field. Edge particles lead the ripple, which
    // is what makes a voice look like it is moving through the outline.
    // Halved. At the old gain a loud syllable threw the silhouette apart;
    // now the voice swells the form rather than scattering it.
    disp *= 1.0 + uAudio * (0.28 + aEdge * 0.34);

    /*
     * THE VOICE, AS A TRAVELLING WAVE.
     *
     * A uniform swell says "there is sound". A wave says where it came
     * from: crests leave the body and run outward along the wings, so the
     * speech visibly propagates through him rather than inflating him.
     *
     * Rings of CONSTANT RADIUS, because the bird is widest across the
     * wings and the wave reaching both tips at once is what makes it look
     * like one event rather than two.
     *
     * Only positive lobes are kept and then squared, which turns a sine
     * into discrete bands with dark between them. A raw sine reads as a
     * wobble; separated crests read as pulses.
     */
    float radius = length(home.xy);
    float crest  = sin(radius * 6.5 - t * 2.4);
    float band   = pow(max(crest, 0.0), 2.5);
    float wave   = band * uAudio;

    disp += outward * wave * 0.085;
    vWave = wave;

    // Success: a brief outward bloom along each particle's own radius.
    vec3 outward = normalize(home + vec3(0.0001));
    disp += outward * uBurst * (0.35 + aSeed.z * 0.35);

    float breathe = 1.0 + uBreath * 0.020 * sin(t * 0.42 + aSeed.z * 2.0);
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
  varying float vWave;

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

    /*
     * The crest is lit, not just displaced. Moving particles a tenth of a
     * unit is nearly invisible at this scale; a band of heat sweeping
     * outward is the thing you actually see, and it is free — the wave was
     * already computed in the vertex stage.
     */
    base = mix(base, vec3(1.0, 0.80, 0.46), clamp(vWave * 1.7, 0.0, 0.8));
    lum *= 1.0 + vWave * 1.3;

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
    c.audio  += (target.audio  - c.audio)  * k;

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
    // Scaled by the state's own audio gain, which is zero everywhere but
    // SPEAKING. Smoothing eased from 12 to 7 so a consonant is a swell
    // rather than a flinch.
    const wanted = liveLevel * c.audio;
    u.uAudio.value += (wanted - u.uAudio.value) * (1 - Math.exp(-dt * 7));
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
      groupRef.current.rotation.y = Math.sin(t * 0.075) * 0.45;
      groupRef.current.rotation.x = Math.sin(t * 0.048) * 0.07;
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

/* ── the instrument ring ─────────────────────────────────────────────── */

/**
 * The arcs around the Phoenix.
 *
 * WHAT MAKES THIS READ AS AN INSTRUMENT RATHER THAN A HALO
 *
 * Gaps. A complete circle is decoration; an arc with a gap in it looks like
 * a gauge, because gauges are the only round things in life that are not
 * closed. Four of them at different radii, counter-rotating at rates that
 * do not divide into each other, so the pattern never visibly repeats.
 *
 * And tick marks. A ring of short radial strokes reads as graduation — a
 * scale something could be measured against — which is most of the
 * difference between a sci-fi interface and a glowing circle.
 *
 * Everything here is thin, dim and subordinate. The bird is the subject;
 * if you find yourself looking at the rings, they are too bright.
 */
function Arc({
  radius, gap, speed, opacity, tilt, colour,
}: {
  radius: number; gap: number; speed: number;
  opacity: number; tilt: [number, number, number]; colour: string;
}) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.z += Math.min(delta, 0.05) * speed;
  });
  return (
    <mesh ref={ref} rotation={tilt}>
      {/* thetaLength short of a full turn is the gap. */}
      <ringGeometry args={[radius, radius + 0.006, 160, 1, 0, Math.PI * 2 * (1 - gap)]} />
      <meshBasicMaterial color={colour} transparent opacity={opacity} side={THREE.DoubleSide} />
    </mesh>
  );
}

/** Graduation marks. The thing that makes a circle look like a scale. */
function Ticks({ radius, count, length, opacity, colour, speed }: {
  radius: number; count: number; length: number;
  opacity: number; colour: string; speed: number;
}) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.z += Math.min(delta, 0.05) * speed;
  });

  const marks = useMemo(() => {
    const out: { x: number; y: number; r: number; long: boolean }[] = [];
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      out.push({
        x: Math.cos(a) * radius,
        y: Math.sin(a) * radius,
        r: a,
        // Every fifth is longer, the way a real scale marks its intervals.
        long: i % 5 === 0,
      });
    }
    return out;
  }, [radius, count]);

  return (
    <group ref={ref} rotation={[1.28, 0, 0]}>
      {marks.map((m, i) => (
        <mesh key={i} position={[m.x, m.y, 0]} rotation={[0, 0, m.r]}>
          <planeGeometry args={[m.long ? length * 2.1 : length, 0.005]} />
          <meshBasicMaterial
            color={colour}
            transparent
            opacity={m.long ? opacity * 1.8 : opacity}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}

function Rings({ state }: { state: PhoenixState }) {
  // Only two states change the instruments: thinking spins them up, alert
  // turns them. Everything else leaves them alone, so when they DO move
  // it means something.
  const busy = state === 'thinking' || state === 'working';
  const rate = busy ? 2.4 : 1;
  const colour = state === 'alert' ? '#f43f5e' : '#ea580c';
  const dim = state === 'alert' ? 1.5 : 1;

  return (
    <group>
      <Arc radius={1.38} gap={0.22} speed={0.16 * rate}  opacity={0.30 * dim} tilt={[1.30, 0, 0]} colour={colour} />
      <Arc radius={1.52} gap={0.55} speed={-0.11 * rate} opacity={0.22 * dim} tilt={[1.30, 0, 0]} colour={colour} />
      <Arc radius={1.78} gap={0.08} speed={0.05 * rate}  opacity={0.11 * dim} tilt={[1.22, 0.30, 0]} colour={colour} />
      <Arc radius={2.05} gap={0.70} speed={-0.07 * rate} opacity={0.16 * dim} tilt={[1.34, -0.22, 0]} colour={colour} />
      <Ticks radius={1.64} count={60} length={0.045} opacity={0.14 * dim} colour={colour} speed={-0.03 * rate} />
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

  /**
   * How big this component's own box is.
   *
   * WHY THIS IS MEASURED AND REPORTED
   *
   * A canvas in a zero-height box draws nothing, throws nothing, and logs
   * nothing. It is indistinguishable from a broken shader, a failed image
   * decode, or a component that never mounted — and this one has now had
   * a collapsed box twice, for two unrelated CSS reasons, each costing a
   * round trip of "I still cannot see it".
   *
   * So it measures itself and says so. A thing that cannot be drawn should
   * never be silent about why.
   */
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    const el = hostRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([entry]) => {
      const r = entry.contentRect;
      setBox({ w: Math.round(r.width), h: Math.round(r.height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const tooSmall = box !== null && (box.w < 40 || box.h < 40);

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
      <div ref={hostRef} className={`flex items-center justify-center ${className || ''}`}>
        <p className="max-w-xs text-center text-sm text-rose-300">
          The Phoenix could not be built from the logo: {failed}
        </p>
      </div>
    );
  }

  /*
   * Named, not blank. This is the state that has wasted the most time.
   * It is styled to be unmissable because an invisible diagnostic is the
   * same as no diagnostic.
   */
  if (tooSmall) {
    return (
      <div
        ref={hostRef}
        className={`flex items-center justify-center overflow-visible ${className || ''}`}
      >
        <p className="whitespace-nowrap rounded border border-amber-500/50 bg-amber-500/10 px-2 py-1 text-center font-mono text-[10px] text-amber-300">
          Phoenix has no room to draw — {box!.w}×{box!.h}px
        </p>
      </div>
    );
  }

  /*
   * Say that it is forming.
   *
   * Until now a slow sample — or a WebGL context the browser refused —
   * rendered an empty div, which is indistinguishable from the feature
   * being broken. It took a round trip of "I do not see the Phoenix" to
   * find that out, which is exactly the cost of a silent blank.
   */
  if (!field) {
    return (
      <div ref={hostRef} className={`flex items-center justify-center ${className || ''}`}>
        <p className="animate-pulse font-mono text-[10px] uppercase tracking-[0.3em] text-orange-400/50">
          forming
        </p>
      </div>
    );
  }

  return (
    <div ref={hostRef} className={className}>
      <Canvas
        camera={{ position: [0, 0, CAM_DIST], fov: 45 }}
        // Capped: a 3x retina display would otherwise quadruple the fill
        // cost of an additive particle field for no visible gain.
        dpr={[1, 1.75]}
        gl={{ antialias: false, alpha: true, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => {
          // Some machines hand back a context and then lose it — a driver
          // reset, a GPU switch on a laptop lid close. Without this the
          // canvas simply stops and nothing says why.
          gl.domElement.addEventListener('webglcontextlost', (e) => {
            e.preventDefault();
            setFailed('The graphics context was lost. Reload to bring him back.');
          });
        }}
      >
        {(
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
