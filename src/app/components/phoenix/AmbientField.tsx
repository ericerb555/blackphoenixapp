/**
 * The dark around the Phoenix, made of particles.
 *
 * WHAT IT IS FOR
 *
 * At rest this is almost nothing: a field of very dark motes filling the
 * screen, enough to tell you the space around him is a medium rather than
 * an empty background. You should have to look to see it.
 *
 * When somebody speaks it becomes the point. Rings travel outward from the
 * mark and the motes they pass through flash white, so a voice visibly
 * propagates into the room instead of stopping at the edge of the bird.
 *
 * WHY RINGS AND NOT A GLOW
 *
 * A field that brightens uniformly says "sound is happening". Rings say
 * where it came from and which way it is going, and because they keep
 * travelling after the impulse that made them, they read as an echo. That
 * is the whole difference between a level meter and a wave.
 *
 * WHAT DRIVES IT, AND THE HONEST LIMIT
 *
 * While YOU talk it is driven by speech-recognition events — one ring per
 * word. That is coarser than a waveform and it is the only real signal
 * available: the microphone stream had to be removed because holding the
 * device stopped the recogniser from acquiring it. A word is a true
 * impulse; it fires when you said something, not when a door closed.
 *
 * While HE talks it is driven by the actual amplitude of his voice, which
 * is continuous, so his rings are finer-grained than yours.
 */
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const VERT = /* glsl */`
  attribute float aSeed;

  uniform float uTime;
  uniform float uTalk;     // 0..1 energy in the room
  uniform float uProj;
  uniform float uSize;

  varying float vRing;
  varying float vTwinkle;

  void main() {
    vec3 p = position;

    // A slow drift, so the field is not a frozen starfield. Tiny — this
    // should read as dust hanging in air, not as snow falling.
    p.x += sin(uTime * 0.11 + aSeed * 31.0) * 0.045;
    p.y += cos(uTime * 0.09 + aSeed * 17.0) * 0.045;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;

    /*
     * Rings travelling outward from the centre, where the bird is.
     *
     * Raising a clamped sine to a high power turns a smooth wave into
     * narrow crests with wide dark gaps — the difference between the whole
     * field pulsing and a ring you can watch move.
     */
    float radius = length(p.xy);
    float phase  = radius * 2.6 - uTime * 2.1;
    float ring   = pow(max(sin(phase), 0.0), 9.0);

    // Falls off with distance, so the far corners are a whisper and the
    // energy plainly came from the middle.
    float reach = 1.0 - smoothstep(0.6, 4.2, radius);

    vRing = ring * reach * uTalk;

    // Per-mote shimmer at its own rate, so lit particles sparkle rather
    // than switching on together like a row of bulbs.
    vTwinkle = 0.55 + 0.45 * sin(uTime * (2.0 + aSeed * 6.0) + aSeed * 90.0);

    float size = uSize * (0.5 + aSeed * 0.9) * (1.0 + vRing * 2.6);
    gl_PointSize = clamp(size * uProj / max(-mv.z, 0.1), 1.0, 9.0);
  }
`;

const FRAG = /* glsl */`
  precision highp float;

  uniform float uRest;     // how visible the field is when nothing is said

  varying float vRing;
  varying float vTwinkle;

  void main() {
    vec2 d = gl_PointCoord - 0.5;
    float r2 = dot(d, d);
    if (r2 > 0.25) discard;
    float a = exp(-r2 * 16.0);

    /*
     * Near-black at rest, white on a crest.
     *
     * Not pure black: a black mote on a black screen is nothing at all,
     * and the field has to be faintly present or the ripple appears to
     * travel through a void and arrives from nowhere.
     */
    vec3 dim  = vec3(0.16, 0.14, 0.13);
    vec3 lit  = vec3(1.0, 0.97, 0.92);
    vec3 col  = mix(dim, lit, clamp(vRing * 1.6, 0.0, 1.0));

    float alpha = (uRest + vRing * 0.95 * vTwinkle) * a;
    if (alpha < 0.004) discard;

    gl_FragColor = vec4(col, alpha);
  }
`;

export interface AmbientFieldProps {
  /** Live 0..1 amplitude, used while Phoenix himself is speaking. */
  audioLevelRef?: React.MutableRefObject<number>;
  /** Spikes to 1 on each word heard. Consumed and cleared by this component. */
  pulseRef?: React.MutableRefObject<number>;
  /** Hold still for anyone who asked the system not to animate. */
  reducedMotion?: boolean;
  count?: number;
  camDist: number;
}

export default function AmbientField({
  audioLevelRef, pulseRef, reducedMotion, count = 5200, camDist,
}: AmbientFieldProps) {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const energy = useRef(0);

  const geom = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const seed = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      /*
       * sqrt of a uniform variate gives an even AREA density. Without it
       * the motes crowd the centre, which is the one place they are least
       * wanted — that is where the bird is.
       */
      const r = Math.sqrt(Math.random()) * 4.4;
      const a = Math.random() * Math.PI * 2;
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = Math.sin(a) * r * 0.78;   // wider than tall, like the screen
      pos[i * 3 + 2] = (Math.random() - 0.5) * 2.6;
      seed[i] = Math.random();
    }

    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 8);
    return g;
  }, [count]);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uTalk: { value: 0 },
    uProj: { value: 1000 },
    uSize: { value: 0.0075 },
    uRest: { value: 0.1 },
  }), []);

  useFrame(({ size, camera }, delta) => {
    const m = matRef.current;
    if (!m) return;
    const dt = Math.min(delta, 0.05);

    const fov = (camera as THREE.PerspectiveCamera).fov ?? 45;
    m.uniforms.uProj.value = size.height / (2 * Math.tan((fov * Math.PI) / 360));
    m.uniforms.uTime.value += reducedMotion ? 0 : dt;

    /*
     * Energy decays rather than tracking the input.
     *
     * A word is an instant, and a ring has to outlive the instant that
     * threw it or there is nothing to watch travel. Roughly a second and a
     * half of ring-making per word, which overlaps naturally with the next
     * word in ordinary speech.
     */
    if (pulseRef && pulseRef.current > 0) {
      energy.current = Math.max(energy.current, pulseRef.current);
      pulseRef.current = 0;
    }
    const live = audioLevelRef ? audioLevelRef.current : 0;
    if (live > energy.current) energy.current = live;

    energy.current = Math.max(0, energy.current - dt * 0.7);
    m.uniforms.uTalk.value = reducedMotion ? 0 : energy.current;
  });

  return (
    <points geometry={geom} frustumCulled={false} position={[0, 0, -0.6]}>
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
  );
}
