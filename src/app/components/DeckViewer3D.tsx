/**
 * DeckViewer3D — the 3D, framing and plan views, all from one model.
 *
 * The members come from buildMembers(), and each view is a different camera and
 * filter over the same geometry:
 *
 *   3D       — a presentation rendering: sky, sun, textured lumber, real house
 *   Framing  — structure only, decking and rails hidden, edges outlined
 *   Plan     — orthographic from above with dimensions
 *
 * Because all of them read the same array, a joist that moves moves everywhere.
 * A framing plan that disagrees with the rendering is the thing a plans examiner
 * catches, and drawing the views separately is how that happens.
 *
 * THE RULE THIS FILE KEEPS: nothing is fetched at runtime. Two bugs in this
 * project came from breaking it — drei's Text fetches a font from Google and
 * rendered a framing plan with no labels when it failed, and Environment
 * preset="park" fetches an HDRI, which left the 3D view lit by two bare
 * directional lights and looking like moulded plastic. So the sky is the
 * procedural shader, the environment is built from in-scene lightformers, every
 * texture is drawn on a canvas, and every label is a canvas texture rather than
 * a webfont. All of it also means the capture for the permit packet contains
 * exactly what is on screen, because it is all real WebGL.
 */
import { Suspense, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import {
  OrbitControls, Grid, Environment, Lightformer, Line, Sky, ContactShadows, SoftShadows,
} from '@react-three/drei';
import { EffectComposer, N8AO, Bloom, SMAA, Vignette, HueSaturation } from '@react-three/postprocessing';
import * as THREE from 'three';
import { Box, Layers, Ruler, Hammer, Sparkles, Loader2, Download, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import {
  buildMembers, MEMBER_COLOR, STRUCTURAL_KINDS,
  type DeckModel, type Member,
} from '../lib/deckModel';
import {
  woodTexture, woodRoughness, grassTexture, sidingTexture, concreteTexture, shingleTexture,
} from '../lib/deckTextures';
import FramingPlanCanvas from './FramingPlanCanvas';
import DeckScenery from './DeckScenery';
import {
  deckingFinish, railFinish, finishSummary,
  type DeckingFinish, type RailFinish,
} from '../lib/deckFinishes';

export type ViewMode = '3d' | 'framing' | 'plan' | 'framing-detail';

/**
 * Render treatments, the way a visualisation studio would offer them. Time of
 * day is doing most of the work here: the same deck at golden hour and at dusk
 * with the lights on sells two different things, and dusk is the one that sells
 * a lighting package.
 */
export const RENDER_STYLES = [
  { id: 'afternoon', label: 'Late afternoon', hint: 'Warm low sun, long shadows — the standard listing shot' },
  { id: 'midday', label: 'Bright midday', hint: 'Clean and neutral, shows colour most accurately' },
  { id: 'dusk', label: 'Dusk, lights on', hint: 'Deck lighting glowing against a blue hour sky' },
  { id: 'overcast', label: 'Soft overcast', hint: 'Even light, no harsh shadows — best for showing material' },
  { id: 'autumn', label: 'Autumn', hint: 'Turned leaves and low warm light' },
];

/** Where the sun is. Shared by the sky shader and the shadow-casting light so
 *  the shadows fall where the bright part of the sky says they should. */
const SUN = new THREE.Vector3(22, 20, 12);

/** Presentation colours — warmer and more varied than the flat diagram set. */
const RENDER_COLOR: Record<string, string> = {
  ledger: '#9a7f55',
  joist: '#a98a5f',
  rim: '#9a7f55',
  beam: '#8a6f4a',
  post: '#8a6f4a',
  decking: '#b98d5c',
  footing: '#9c9a94',
  rail: '#7d6244',
  stair: '#b98d5c',
  blocking: '#9a7f55',
};

/**
 * Textures are cached by kind and by how many times they tile, because a
 * CanvasTexture uploads to the GPU on first use. Cloning per repeat rather than
 * mutating a shared texture keeps a 16ft joist and a 4in baluster from fighting
 * over the same repeat value.
 */
const texCache = new Map<string, THREE.Texture>();

/**
 * Geometry cache, keyed by size.
 *
 * A deck is mostly repeated parts — every decking board is the same board, every
 * baluster the same baluster. Building a BoxGeometry per member meant a couple
 * of hundred separate buffers describing about a dozen distinct shapes, and it
 * had to be rebuilt whenever anything upstream re-rendered. Sharing them keeps
 * the scene light enough to afford ambient occlusion and soft shadows, which is
 * where the realism actually comes from.
 */
const geoCache = new Map<string, THREE.BufferGeometry>();

function geometryFor(member: Member): THREE.BufferGeometry {
  const [sx, sy, sz] = member.size;
  const key = `${member.shape || 'box'}:${sx.toFixed(4)}:${sy.toFixed(4)}:${sz.toFixed(4)}`;
  const hit = geoCache.get(key);
  if (hit) return hit;

  const g = member.shape === 'round'
    // size is [diameter, diameter, length]; a cylinder's axis is its local Y,
    // which is why the raking pieces carry an extra quarter turn.
    ? new THREE.CylinderGeometry(sx / 2, sx / 2, sz, 16)
    : new THREE.BoxGeometry(sx, sy, sz);

  geoCache.set(key, g);
  return g;
}

function tiled(
  kind: string, seed: number, rx: number, ry: number,
  hex?: string, grain = 1,
): THREE.Texture {
  const qx = Math.max(1, Math.round(rx));
  const qy = Math.max(1, Math.round(ry));
  const colour = hex || RENDER_COLOR[kind] || '#a98a5f';
  const key = `${kind}:${seed}:${qx}:${qy}:${colour}:${grain.toFixed(2)}`;
  const hit = texCache.get(key);
  if (hit) return hit;

  const base = kind === 'footing' ? concreteTexture() : woodTexture(colour, seed, true, grain);
  const t = base.clone();
  t.needsUpdate = true;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(qx, qy);
  texCache.set(key, t);
  return t;
}

/**
 * One piece of lumber.
 *
 * Framing view gets a visible edge outline and flat colour, because in a
 * structural drawing the joint between two members matters more than the
 * surface of either. The 3D view gets grain, a roughness map so light catches
 * the surface unevenly, and a small per-member tone shift — a deck where every
 * board is the identical colour is the single clearest sign of a render.
 */
function MemberMesh({ member, outlined, realistic, deckFin, railFin }: {
  member: Member; outlined: boolean; realistic: boolean;
  deckFin: DeckingFinish; railFin: RailFinish;
}) {
  const geo = useMemo(() => geometryFor(member), [member.size, member.shape]);
  const edges = useMemo(() => (outlined ? new THREE.EdgesGeometry(geo) : null), [geo, outlined]);

  // Stable per-member seed, so a board keeps its grain and its tone as the
  // camera moves rather than shimmering between frames.
  const seed = useMemo(() => {
    let h = 0;
    for (let i = 0; i < member.id.length; i++) h = (h * 31 + member.id.charCodeAt(i)) >>> 0;
    return (h % 8) + 1;
  }, [member.id]);

  /**
   * A fraction of an inch of misalignment on the boards, in the 3D view only.
   *
   * Real decking is laid by a person: boards sit a hair proud of each other and
   * a hair out of parallel, and that tiny irregularity is a large part of what
   * the eye uses to decide something was built rather than generated. Perfectly
   * coincident planes also fight each other for the same pixels, which reads as
   * a hard machine edge.
   *
   * Presentation only. The plan and framing views draw the members exactly where
   * the model puts them, because those are measured drawings and a sixteenth of
   * an inch of artistic licence has no business in one.
   */
  const jitter = useMemo(() => {
    const base = { pos: member.pos, rot: member.rot ?? ([0, 0, 0] as [number, number, number]) };
    if (!realistic || (member.kind !== 'decking' && member.kind !== 'stair')) return base;
    const n = (seed - 4.5) / 4.5;               // -1 to 1, stable per board
    return {
      pos: [
        member.pos[0] + n * 0.004,
        member.pos[1] + Math.abs(n) * 0.003,
        member.pos[2] + n * 0.003,
      ] as [number, number, number],
      rot: [base.rot[0], base.rot[1] + n * 0.0016, base.rot[2]] as [number, number, number],
    };
  }, [member.pos, member.rot, member.kind, realistic, seed]);

  const material = useMemo(() => {
    if (!realistic) {
      return new THREE.MeshStandardMaterial({
        color: MEMBER_COLOR[member.kind],
        roughness: member.kind === 'footing' ? 0.95 : 0.75,
        metalness: 0,
      });
    }

    const [sx, sy, sz] = member.size;
    const long = Math.max(sx, sy, sz);

    // Railings take their look from the chosen finish rather than from the
    // member kind, because a cable rail and a wood rail are the same kind.
    if (member.kind === 'rail') {
      if (member.part === 'infill') {
        const glass = railFin.infill === 'glass';
        return new THREE.MeshStandardMaterial({
          color: railFin.infillHex,
          roughness: railFin.infillRoughness,
          metalness: railFin.infillMetalness,
          transparent: glass,
          opacity: railFin.infillOpacity,
          side: glass ? THREE.DoubleSide : THREE.FrontSide,
        });
      }
      const hex = member.part === 'hand' ? railFin.handHex : railFin.frameHex;
      // A wooden frame still wants grain; a powder-coated or vinyl one does not.
      const woodFrame = railFin.frameMetalness < 0.2 && railFin.frameRoughness > 0.7;
      return new THREE.MeshStandardMaterial({
        color: hex,
        map: woodFrame ? tiled('rail', seed, Math.max(1, long / 2), 1, hex, 0.85) : undefined,
        roughness: railFin.frameRoughness,
        metalness: railFin.frameMetalness,
      });
    }

    // The walking surface and the stair treads are the finish the customer
    // picked; everything below them is framing lumber and stays framing lumber.
    const isSurface = member.kind === 'decking'
      || (member.kind === 'stair' && !member.id.startsWith('stringer'));

    if (isSurface) {
      const mat = new THREE.MeshStandardMaterial({
        map: tiled('decking', seed, Math.max(1, long / 2), 1, deckFin.hex, deckFin.grain),
        roughnessMap: deckFin.grain > 0.3 ? woodRoughness(seed) : undefined,
        // Grain you can see across rather than only in the colour. Scaled by
        // the finish, since a PVC board really is that smooth.
        bumpMap: woodRoughness(seed),
        bumpScale: 0.012 * deckFin.grain,
        roughness: deckFin.roughness,
        metalness: 0,
      });
      // Board-to-board variation, scaled by how much the product actually
      // varies. Sawn cedar is all over the place; a PVC board is not, and
      // rendering them with the same scatter misrepresents both.
      mat.color.offsetHSL(0, 0, (seed - 4.5) * 0.014 * deckFin.variation);
      return mat;
    }

    const map = tiled(member.kind, seed, Math.max(1, long / 2), 1);
    const rough = woodRoughness(seed);

    const mat = new THREE.MeshStandardMaterial({
      map,
      roughnessMap: member.kind === 'footing' ? undefined : rough,
      roughness: member.kind === 'footing' ? 0.96 : 0.78,
      metalness: 0,
    });
    // A slight tone shift per board. Boards from the same lift are never the
    // same colour, and the eye reads uniformity as fake immediately.
    mat.color.offsetHSL(0, 0, (seed - 4.5) * 0.011);
    return mat;
  }, [member.kind, member.id, member.part, member.size, realistic, seed, deckFin, railFin]);

  return (
    <group position={jitter.pos} rotation={jitter.rot}>
      <mesh geometry={geo} material={material} castShadow receiveShadow />
      {edges && (
        <lineSegments geometry={edges}>
          <lineBasicMaterial color="#1a1a1a" />
        </lineSegments>
      )}
    </group>
  );
}

/**
 * The house the deck attaches to.
 *
 * Worth the geometry: without a door and a roof edge there is no sense of
 * scale, and a deck floating against a blank panel is most of why the old view
 * read as a diagram. The door also shows the thing that decides deck height —
 * the surface sits just below the threshold.
 */
function House({ model, realistic }: { model: DeckModel; realistic: boolean }) {
  const wallW = model.widthFt + 16;
  const wallH = Math.max(12, model.heightFt + 11);

  const siding = useMemo(() => {
    if (!realistic) return null;
    const t = sidingTexture('#d9d3c7', 6).clone();
    t.needsUpdate = true;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    // Eight courses per tile at 6in exposure, so one tile is four feet.
    t.repeat.set(Math.max(1, Math.round(wallW / 4)), Math.max(1, Math.round(wallH / 4)));
    return t;
  }, [realistic, wallW, wallH]);

  const shingles = useMemo(() => (realistic ? shingleTexture('#4a4744') : null), [realistic]);

  // Door sill sits just above the deck surface, which is where it belongs and
  // where anyone looking at the picture expects to see it.
  const doorH = 6.7;
  const doorW = 6;
  const doorSill = model.heightFt + 0.1;

  return (
    <group>
      {/* Wall */}
      <mesh position={[0, wallH / 2, -0.5]} receiveShadow castShadow>
        <boxGeometry args={[wallW, wallH, 1]} />
        {realistic
          ? <meshStandardMaterial map={siding!} roughness={0.88} metalness={0} />
          : <meshStandardMaterial color="#d8d2c8" roughness={0.9} />}
      </mesh>

      {realistic && (
        <>
          {/* Slider, set into the wall so it reads as an opening. */}
          <mesh position={[0, doorSill + doorH / 2, 0.06]}>
            <boxGeometry args={[doorW, doorH, 0.12]} />
            <meshStandardMaterial color="#2b3138" roughness={0.12} metalness={0.25} />
          </mesh>
          {/* Glass, slightly proud, catching the sky. */}
          <mesh position={[0, doorSill + doorH / 2, 0.14]}>
            <boxGeometry args={[doorW - 0.55, doorH - 0.5, 0.04]} />
            <meshStandardMaterial color="#9fc4d8" roughness={0.05} metalness={0.4}
              transparent opacity={0.72} />
          </mesh>
          {/* Centre stile, so it reads as a two-panel slider. */}
          <mesh position={[0, doorSill + doorH / 2, 0.18]}>
            <boxGeometry args={[0.18, doorH - 0.5, 0.05]} />
            <meshStandardMaterial color="#2b3138" roughness={0.12} metalness={0.25} />
          </mesh>

          {/* Roof overhang with a soffit — gives the wall a top edge instead of
              letting it end in mid-air. */}
          <mesh position={[0, wallH, 0.9]} rotation={[-0.30, 0, 0]} castShadow>
            <boxGeometry args={[wallW, 0.25, 4.5]} />
            <meshStandardMaterial map={shingles!} roughness={0.94} metalness={0} />
          </mesh>
          <mesh position={[0, wallH - 0.45, 1.9]}>
            <boxGeometry args={[wallW, 0.7, 0.3]} />
            <meshStandardMaterial color="#efeae1" roughness={0.8} />
          </mesh>

          {/* Corner boards, which is what tells you it is a real wall. */}
          {[-wallW / 2 + 0.3, wallW / 2 - 0.3].map((x, i) => (
            <mesh key={i} position={[x, wallH / 2, 0.06]}>
              <boxGeometry args={[0.6, wallH, 0.12]} />
              <meshStandardMaterial color="#efeae1" roughness={0.85} />
            </mesh>
          ))}
        </>
      )}
    </group>
  );
}

/**
 * A dimension label.
 *
 * Drawn to a canvas and mapped onto a plane rather than using drei's Text,
 * which fetches a webfont and silently renders nothing when the fetch fails —
 * exactly the bug that left the framing plan unlabelled. This also means the
 * label survives into the permit-packet capture, because it is real geometry in
 * the WebGL buffer rather than a DOM overlay sitting on top of it.
 */
function Label({ position, text, color = '#ea580c', size = 0.9 }: {
  position: [number, number, number]; text: string; color?: string; size?: number;
}) {
  const { texture, aspect } = useMemo(() => {
    const pad = 16;
    const font = 64;
    const c = document.createElement('canvas');
    const ctx = c.getContext('2d')!;
    ctx.font = `700 ${font}px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif`;
    const w = Math.ceil(ctx.measureText(text).width) + pad * 2;
    const h = font + pad * 2;
    c.width = w; c.height = h;

    const g = c.getContext('2d')!;
    g.clearRect(0, 0, w, h);
    // A soft white plate behind the text, so a dimension stays readable over
    // grass, decking or a shadow without needing a leader line.
    g.fillStyle = 'rgba(255,255,255,0.92)';
    g.beginPath();
    const r = 12;
    g.moveTo(r, 0); g.arcTo(w, 0, w, h, r); g.arcTo(w, h, 0, h, r);
    g.arcTo(0, h, 0, 0, r); g.arcTo(0, 0, w, 0, r); g.closePath(); g.fill();

    g.font = `700 ${font}px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif`;
    g.fillStyle = color;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, w / 2, h / 2 + 2);

    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return { texture: t, aspect: w / h };
  }, [text, color]);

  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[size * aspect, size]} />
      <meshBasicMaterial map={texture} transparent depthTest={false} toneMapped={false} />
    </mesh>
  );
}

/** A dimension line with its measurement, for the plan view. */
function Dimension({ from, to, label }: {
  from: [number, number, number]; to: [number, number, number]; label: string;
}) {
  const mid: [number, number, number] = [
    (from[0] + to[0]) / 2, (from[1] + to[1]) / 2 + 0.4, (from[2] + to[2]) / 2,
  ];
  return (
    <group>
      <Line points={[from, to]} color="#ea580c" lineWidth={1.5} />
      <Label position={mid} text={label} />
    </group>
  );
}

function Scene({ model, mode }: { model: DeckModel; mode: ViewMode }) {
  const members = useMemo(() => buildMembers(model), [model]);
  const visible = useMemo(
    () => ((mode === 'framing' || mode === 'framing-detail')
      ? members.filter(m => STRUCTURAL_KINDS.includes(m.kind))
      : members),
    [members, mode],
  );

  // The two measured drawings: flat light, overhead, no shadows.
  const isPlan = mode === 'plan' || mode === 'framing-detail';
  const realistic = mode === '3d';
  const halfW = model.widthFt / 2;

  const grass = useMemo(() => {
    if (!realistic) return null;
    const t = grassTexture().clone();
    t.needsUpdate = true;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(30, 30);
    return t;
  }, [realistic]);

  const reach = Math.max(model.widthFt, model.depthFt);
  const deckFin = useMemo(() => deckingFinish(model.deckingFinish), [model.deckingFinish]);
  const railFin = useMemo(() => railFinish(model.railFinish), [model.railFinish]);

  return (
    <>
      {realistic ? (
        <>
          {/* Percentage-closer soft shadows. A real shadow is sharp where the
              post meets the ground and spreads as it gets further away; a
              uniformly blurry or uniformly hard shadow is one of the strongest
              tells that an image was rendered rather than photographed. */}
          <SoftShadows size={14} samples={12} focus={0.6} />

          {/* Procedural sky — a shader, not a downloaded HDRI. */}
          <Sky sunPosition={SUN} turbidity={5} rayleigh={1.4} mieCoefficient={0.006} mieDirectionalG={0.82} />

          {/* Sky fill, warm bounce off the ground, and the sun itself. Skylight
              is what a mid-morning exterior actually looks like; a single
              directional light is what a diagram looks like. */}
          <hemisphereLight args={['#cfe3f5', '#6d7a52', 0.85]} />
          <directionalLight
            position={SUN} intensity={2.6} color="#fff3e0" castShadow
            shadow-mapSize={[2048, 2048]}
            shadow-bias={-0.0004}
            shadow-normalBias={0.02}
            shadow-camera-left={-reach * 1.6} shadow-camera-right={reach * 1.6}
            shadow-camera-top={reach * 1.6} shadow-camera-bottom={-reach * 1.6}
            shadow-camera-near={0.5} shadow-camera-far={reach * 6}
          />
          {/* Cool fill from the opposite side so shadowed faces are readable
              rather than black, as a bounce card would do on a real shoot. */}
          <directionalLight position={[-reach, reach * 0.6, -reach * 0.5]} intensity={0.35} color="#bcd4ea" />

          {/* Reflections, built in-scene. Environment renders these lightformers
              to a cubemap, so there is nothing to download and nothing to fail. */}
          <Environment resolution={256}>
            <Lightformer intensity={1.3} color="#ffffff" position={[0, 12, 0]} scale={[24, 24, 1]}
              rotation={[Math.PI / 2, 0, 0]} />
            <Lightformer intensity={0.6} color="#a8c8e8" position={[-14, 6, -8]} scale={[16, 10, 1]} />
            <Lightformer intensity={0.5} color="#f0e0c8" position={[14, 5, 8]} scale={[16, 10, 1]} />
            <Lightformer intensity={0.35} color="#7b8a5c" position={[0, -6, 0]} scale={[30, 30, 1]}
              rotation={[-Math.PI / 2, 0, 0]} />
          </Environment>
        </>
      ) : (
        <>
          <ambientLight intensity={isPlan ? 1.1 : 0.55} />
          {!isPlan && (
            <>
              <directionalLight
                position={[18, 26, 14]} intensity={2.0} castShadow
                shadow-mapSize={[2048, 2048]}
                shadow-camera-left={-30} shadow-camera-right={30}
                shadow-camera-top={30} shadow-camera-bottom={-30}
              />
              <directionalLight position={[-14, 10, -10]} intensity={0.4} />
            </>
          )}
        </>
      )}

      {mode !== 'plan' && <House model={model} realistic={realistic} />}

      {visible.map(m => (
        <MemberMesh key={m.id} member={m} outlined={mode !== '3d'} realistic={realistic}
          deckFin={deckFin} railFin={railFin} />
      ))}

      {/* Ground plane, so shadows land on something and height reads correctly. */}
      {!isPlan && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
          <planeGeometry args={[160, 160]} />
          {realistic
            ? <meshStandardMaterial map={grass!} roughness={1} metalness={0} />
            : <meshStandardMaterial color="#6f7d58" roughness={1} />}
        </mesh>
      )}

      {/* The yard. A structure alone on an infinite green plane reads as a
          diagram however good its materials are — there is nothing irregular in
          frame to compare it against. */}
      {realistic && <DeckScenery widthFt={model.widthFt} depthFt={model.depthFt} />}

      {/* Soft occlusion where the structure meets the lawn. The directional
          shadow gives the hard sun edge; this gives the darkening right under
          the deck that stops it looking pasted onto the grass. */}
      {realistic && (
        <ContactShadows position={[0, 0.01, model.depthFt / 2]}
          scale={reach * 3} blur={2.4} opacity={0.55} far={model.heightFt + 4} resolution={1024} />
      )}

      {isPlan && mode !== 'framing-detail' && (
        <>
          <Grid position={[0, -0.01, 0]} args={[80, 80]} cellSize={1} cellColor="#d4d4d4"
            sectionSize={5} sectionColor="#a3a3a3" fadeDistance={90} infiniteGrid />
          <Dimension from={[-halfW, model.heightFt, model.depthFt + 2]} to={[halfW, model.heightFt, model.depthFt + 2]}
            label={`${model.widthFt}'-0"`} />
          <Dimension from={[halfW + 2, model.heightFt, 0]} to={[halfW + 2, model.heightFt, model.depthFt]}
            label={`${model.depthFt}'-0"`} />
        </>
      )}
    </>
  );
}

/**
 * Frames the camera on the deck whatever its size, so it never opens off-screen.
 *
 * It has to move the camera THROUGH the orbit controls rather than around them.
 * OrbitControls keeps its own idea of where the camera is — an angle and a
 * distance from its target — and reads that on every drag. Setting
 * camera.position and calling lookAt() behind its back left those two
 * disagreeing, so the first drag after any change snapped the camera back to
 * the angle the controls still remembered and then span from there. That is the
 * view "twisting around": not a wild camera, but two things each certain they
 * own it.
 *
 * Writing the target and calling update() makes the controls recompute their
 * angle and distance from where the camera actually is, so the next drag
 * continues from what is on screen. The controls own the target outright for
 * the same reason — a static target prop would overwrite this on every render
 * and put the fight straight back.
 */
function CameraRig({ model, mode }: { model: DeckModel; mode: ViewMode }) {
  const done = useRef<string>('');
  useFrame(({ camera, controls }) => {
    const key = `${mode}-${model.widthFt}-${model.depthFt}-${model.heightFt}`;
    if (done.current === key) return;
    done.current = key;

    const reach = Math.max(model.widthFt, model.depthFt);
    const target = new THREE.Vector3();

    if (mode === 'plan' || mode === 'framing-detail') {
      camera.position.set(0, reach * (mode === 'framing-detail' ? 3.1 : 1.8), model.depthFt / 2 + 0.001);
      target.set(0, 0, model.depthFt / 2);
    } else if (mode === '3d') {
      // A three-quarter view from a bit above standing height, which is where
      // an architectural photograph is taken from. The old camera looked down
      // from twice the deck's width and turned everything into a model.
      camera.position.set(reach * 1.15, model.heightFt + reach * 0.42, model.depthFt + reach * 1.25);
      target.set(0, model.heightFt * 0.75, model.depthFt / 2);
    } else {
      camera.position.set(reach * 0.95, reach * 0.72, model.depthFt + reach * 0.95);
      target.set(0, model.heightFt / 2, model.depthFt / 2);
    }

    const orbit = controls as any;
    if (orbit?.target?.copy) {
      orbit.target.copy(target);
      orbit.update();
    } else {
      camera.lookAt(target);
    }
    camera.updateProjectionMatrix();
  });
  return null;
}

export default function DeckViewer3D({
  model,
  mode: controlledMode,
  onModeChange,
  height = 460,
  hideTabs = false,
  onCaptureReady,
}: {
  model: DeckModel;
  mode?: ViewMode;
  onModeChange?: (m: ViewMode) => void;
  height?: number;
  /** Hide the view switcher when the caller drives the mode (permit packet). */
  hideTabs?: boolean;
  /**
   * Hands back a function that grabs the current frame as a PNG data URL, so a
   * printable set can include the actual drawings rather than a description of
   * them. Works because the canvas is created with preserveDrawingBuffer —
   * without it WebGL clears the buffer after each frame and the capture is
   * blank.
   */
  onCaptureReady?: (capture: () => string | null) => void;
}) {
  const [internal, setInternal] = useState<ViewMode>('3d');
  const mode = controlledMode ?? internal;
  const setMode = onModeChange ?? setInternal;

  // Kept alongside whatever the parent asked for, so the photoreal button can
  // grab a frame without the caller having to wire a capture through.
  const grab = useRef<(() => string | null) | null>(null);
  const [rendering, setRendering] = useState(false);
  const [shot, setShot] = useState<{ url: string; disclaimer: string } | null>(null);
  const [style, setStyle] = useState('afternoon');

  const photoreal = async () => {
    const frame = grab.current?.();
    if (!frame) { toast.error('Could not read the 3D view.'); return; }
    setRendering(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/house-capture/photoreal`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token || publicAnonKey}`,
            apikey: publicAnonKey,
          },
          body: JSON.stringify({
            shot: frame,
            deck: model,
            style,
            // The renderer is told the actual product names, so a PVC deck does
            // not come back looking like oiled cedar.
            finish: finishSummary(model.deckingFinish, model.railFinish),
          }),
        },
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || `Render failed (${res.status}).`);
      setShot({ url: json.url, disclaimer: json.disclaimer });
    } catch (err: any) {
      toast.error(err?.message || 'The render failed.');
    } finally {
      setRendering(false);
    }
  };

  const TABS: { id: ViewMode; label: string; icon: any; hint: string }[] = [
    { id: '3d', label: '3D', icon: Box, hint: 'How it will look' },
    { id: 'framing', label: 'Framing', icon: Layers, hint: 'Structure only — decking hidden' },
    { id: 'plan', label: 'Plan', icon: Ruler, hint: 'Dimensioned, from above' },
    { id: 'framing-detail', label: 'Framing detail', icon: Hammer, hint: 'Framing plan with sizes, hangers and fasteners called out' },
  ];

  const isPlanish = mode === 'plan' || mode === 'framing-detail';

  return (
    <div className="space-y-3">
      {!hideTabs && (
      <div className="flex items-center gap-2 flex-wrap">
        {TABS.map(t => {
          const Icon = t.icon;
          const on = mode === t.id;
          return (
            <button key={t.id} onClick={() => setMode(t.id)} title={t.hint}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition ${
                on ? 'bg-[#ea580c] text-white' : 'bg-[#0A0A0A] border border-[#2A2A2A] text-gray-400 hover:text-white'
              }`}>
              <Icon className="w-4 h-4" /> {t.label}
            </button>
          );
        })}
        <span className="text-xs text-gray-500 ml-1">
          {TABS.find(t => t.id === mode)?.hint} · drag to orbit, scroll to zoom
        </span>
        {mode === '3d' && (
          // The viewport is a live WebGL scene; the render people picture when
          // they say "photoreal" is an offline path-traced image. This does
          // that pass over whatever is currently on screen, so the angle you
          // set up is the angle you get back.
          <div className="ml-auto flex items-center gap-2">
            <select value={style} onChange={e => setStyle(e.target.value)}
              title={RENDER_STYLES.find(s => s.id === style)?.hint}
              className="px-2.5 py-2 rounded-xl text-sm bg-[#0A0A0A] border border-[#2A2A2A] text-gray-300 focus:outline-none focus:border-[#ea580c]">
              {RENDER_STYLES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
            <button onClick={photoreal} disabled={rendering}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-40"
              style={{ background: 'rgba(234,88,12,0.16)', border: '1px solid rgba(234,88,12,0.5)' }}>
              {rendering ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {rendering ? 'Rendering' : 'Photoreal render'}
            </button>
          </div>
        )}
      </div>
      )}

      {mode === 'framing-detail' ? (
        // A framing plan is a flat drawing, and 2D canvas text needs nothing
        // fetched at runtime — the WebGL text this replaces rendered geometry
        // with no labels whenever its font failed to load.
        <div style={{ height }} className="overflow-auto rounded-2xl border border-[#2A2A2A] bg-white">
          <FramingPlanCanvas model={model} onCaptureReady={onCaptureReady} />
        </div>
      ) : (
      <div className="rounded-2xl overflow-hidden border border-[#2A2A2A]"
        style={{ height, background: isPlanish ? '#ffffff' : '#0d1117' }}>
        <Canvas
          shadows={!isPlanish}
          // A longer lens than the old 42°. Architectural photographs are shot
          // long to keep verticals parallel; a wide lens splays the posts and
          // is most of what made this read as a game asset rather than a house.
          camera={{ fov: isPlanish ? 26 : mode === '3d' ? 30 : 42, near: 0.1, far: 600 }}
          gl={{ antialias: true, preserveDrawingBuffer: true }}
          onCreated={({ gl }) => {
            gl.toneMapping = THREE.ACESFilmicToneMapping;
            gl.toneMappingExposure = mode === '3d' ? 0.92 : 1;
            gl.shadowMap.type = THREE.PCFSoftShadowMap;
            // Force a draw before reading, so the first capture is not blank.
            const capture = () => {
              try { return gl.domElement.toDataURL('image/png'); } catch { return null; }
            };
            grab.current = capture;
            onCaptureReady?.(capture);
          }}
        >
          <Suspense fallback={null}>
            <Scene model={model} mode={mode} />
            <CameraRig model={model} mode={mode} />
            <OrbitControls
              makeDefault
              enablePan
              // No target prop: CameraRig owns it. Setting it here as well
              // would overwrite the rig's value on every render and put the
              // camera back to fighting itself.
              // Plan view stays overhead: letting it tilt turns a measured
              // drawing into a bad perspective view.
              minPolarAngle={isPlanish ? 0 : 0.05}
              maxPolarAngle={isPlanish ? 0.001 : Math.PI / 2.05}
            />

            {/*
              The pass that does most of the work.

              Ambient occlusion is the single biggest difference between a real
              image and a lit 3D scene: light does not reach into the corner
              where a post meets a beam, and without that darkening every joint
              looks pasted together. N8AO computes it per pixel from depth and
              normals, which catches every inside corner in the framing that no
              amount of lamp placement would.

              Everything else here is camera behaviour rather than lighting —
              real lenses vignette slightly, real sensors do not resolve a
              perfect stair-step edge, and film has a little more colour in it
              than a linear render does. Only on the 3D view: a measured drawing
              wants none of this.
            */}
            {mode === '3d' && (
              <EffectComposer multisampling={0} enableNormalPass>
                <N8AO halfRes aoRadius={1.4} distanceFalloff={0.9} intensity={2.6} color="#1b1408" />
                <Bloom intensity={0.16} luminanceThreshold={0.82} luminanceSmoothing={0.35} mipmapBlur />
                <HueSaturation saturation={0.06} />
                <Vignette offset={0.32} darkness={0.42} />
                <SMAA />
              </EffectComposer>
            )}
          </Suspense>
        </Canvas>
      </div>
      )}

      {shot && (
        <div className="rounded-2xl border border-[#2A2A2A] bg-[#111] p-3">
          <div className="flex items-center justify-between gap-3 mb-2">
            <h3 className="text-sm font-bold text-white">Presentation render</h3>
            <button onClick={() => setShot(null)} aria-label="Close render"
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5">
              <X className="w-4 h-4" />
            </button>
          </div>
          <img src={shot.url} alt="Photorealistic render of the deck"
            className="w-full rounded-xl border border-[#2A2A2A]" />
          <div className="flex items-center justify-between gap-3 mt-2">
            <p className="text-[11px] text-gray-500">{shot.disclaimer}</p>
            <a href={shot.url} download="deck-presentation-render.png" target="_blank" rel="noreferrer"
              className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-white"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
              <Download className="w-4 h-4" /> Save
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
