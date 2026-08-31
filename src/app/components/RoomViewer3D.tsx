/**
 * The kitchen or bathroom, drawn from the same runs the schedule is built from.
 *
 * ONE SOURCE, TWO OUTPUTS
 *
 * Every box in this view comes out of the same `CabinetRun[]` that produces the
 * cabinet schedule. There is no second list of cabinets for the picture. That
 * matters because the picture is what the customer approves and the schedule is
 * what gets ordered, and if those two are drawn from different data they will
 * eventually disagree — the customer signs off a kitchen with a pantry in it and
 * the order arrives without one.
 *
 * So a cabinet that moves in the schedule moves here, and a filler that appears
 * here appears there. They cannot drift apart because there is nothing to drift.
 *
 * THE RULE THIS FILE KEEPS, COPIED FROM DeckViewer3D
 *
 * Nothing is fetched at runtime. No webfonts, no HDRI environment maps, no
 * external textures. Two bugs in this project came from breaking that rule, and
 * a 3D view that silently loses its labels or its lighting when a CDN is slow is
 * worse than one that never had them. Every material here is either a plain
 * colour or drawn on a canvas in this file.
 *
 * WHERE THE RUNS GO
 *
 * A run does not yet record which wall it is against — the schedule does not
 * need to know and nothing has asked for it. So runs are placed around the room
 * in order: the first along the back wall, the next along the left, then the
 * right. It is stated on screen rather than presented as a survey, because a
 * layout the software chose is not a layout the builder chose.
 */
import { Suspense, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, ContactShadows, SoftShadows } from '@react-three/drei';
import * as THREE from 'three';
import { Box, Layers } from 'lucide-react';
import {
  type CabinetRun, CABINETS,
  BASE_HEIGHT_IN, COUNTER_THICKNESS_IN, COUNTER_DEPTH_IN, WALL_DEPTH_IN,
  BACKSPLASH_HEIGHT_IN, TOE_KICK_HEIGHT_IN,
} from '../lib/cabinetModel';
import type { PlacedFixture } from '../lib/roomFixtures';

export type RoomViewMode = '3d' | 'plan';

const IN = 1 / 12; // inches to feet, because the scene is in feet

/* ── materials, all drawn here ─────────────────────────────────────────── */

/** A painted door face with a faint brushed grain, so it is not flat plastic. */
function paintedTexture(hex: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = hex;
  g.fillRect(0, 0, 128, 128);
  g.globalAlpha = 0.012;
  for (let i = 0; i < 90; i++) {
    g.strokeStyle = i % 2 ? '#000' : '#fff';
    const y = Math.random() * 128;
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(128, y + (Math.random() - 0.5) * 2);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** Stone with mottling and a few veins. Quartz and granite read very differently. */
function stoneTexture(base: string, vein: string, veins: number): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
  g.fillStyle = base;
  g.fillRect(0, 0, 256, 256);

  // Speckle first — it is what makes stone look like stone rather than paper.
  for (let i = 0; i < 4000; i++) {
    g.fillStyle = Math.random() > 0.5 ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.07)';
    g.fillRect(Math.random() * 256, Math.random() * 256, 1.5, 1.5);
  }
  g.strokeStyle = vein;
  g.globalAlpha = 0.35;
  for (let v = 0; v < veins; v++) {
    g.lineWidth = 0.6 + Math.random() * 2;
    g.beginPath();
    let x = Math.random() * 256, y = 0;
    g.moveTo(x, y);
    while (y < 256) { x += (Math.random() - 0.5) * 34; y += 12; g.lineTo(x, y); }
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function floorTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
  g.fillStyle = '#8a6a4a';
  g.fillRect(0, 0, 256, 256);
  for (let row = 0; row < 8; row++) {
    const off = (row % 2) * 32;
    for (let p = -1; p < 6; p++) {
      const x = p * 64 + off, y = row * 32;
      const sat = 26 + Math.random() * 5;
      const light = 34 + Math.random() * 5;
      g.fillStyle = `hsl(28, ${sat}%, ${light}%)`;
      g.fillRect(x + 1, y + 1, 62, 30);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

const COUNTER_LOOK: Record<string, { base: string; vein: string; veins: number; rough: number }> = {
  'quartz':        { base: '#efeae4', vein: '#b9b2a8', veins: 5, rough: 0.22 },
  'granite':       { base: '#4a4642', vein: '#8e867c', veins: 9, rough: 0.18 },
  'laminate':      { base: '#d9d3ca', vein: '#bdb6ac', veins: 2, rough: 0.5 },
  'butcher-block': { base: '#a9762f', vein: '#8a5c22', veins: 14, rough: 0.55 },
  'solid-surface': { base: '#e8e6e2', vein: '#cfcbc5', veins: 1, rough: 0.35 },
  'tile':          { base: '#dcd7d0', vein: '#a8a29a', veins: 0, rough: 0.4 },
};

/* ── one cabinet ───────────────────────────────────────────────────────── */

/**
 * A shaker box: carcass, a face frame with a recessed panel, and a handle.
 *
 * Drawn as real geometry rather than a textured slab because the reveal between
 * doors and the shadow in the panel are most of what stops a run of cabinets
 * reading as one long brown wall.
 */
function CabinetBox({ widthFt, heightFt, depthFt, x, y, z, doorMap, doorColour, doors, drawers, toeKick }: {
  widthFt: number; heightFt: number; depthFt: number;
  x: number; y: number; z: number;
  doorMap: THREE.Texture; doorColour: string;
  doors: number; drawers: number; toeKick: boolean;
}) {
  const kick = toeKick ? TOE_KICK_HEIGHT_IN * IN : 0;
  const bodyH = heightFt - kick;
  const reveal = 0.09 / 12 * 12 * 0.006; // a hair, so faces do not z-fight
  const faceZ = z + depthFt / 2 + 0.004;

  // A drawer bank reads as horizontal bands; doors as vertical leaves.
  const leaves = drawers > 0 && doors === 0
    ? Array.from({ length: drawers }, (_, i) => ({
        w: widthFt - 0.04,
        h: (bodyH - 0.04) / drawers - 0.02,
        cx: 0,
        cy: kick + (bodyH / drawers) * (i + 0.5) - bodyH / 2 + bodyH / 2 - bodyH / 2 + (bodyH / drawers) * 0,
      }))
    : Array.from({ length: Math.max(1, doors) }, (_, i) => ({
        w: (widthFt - 0.04) / Math.max(1, doors) - 0.02,
        h: bodyH - 0.04,
        cx: -widthFt / 2 + (widthFt / Math.max(1, doors)) * (i + 0.5),
        cy: kick + bodyH / 2,
      }));

  return (
    <group position={[x, y, z]}>
      {/* Carcass */}
      <mesh position={[0, kick + bodyH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[widthFt, bodyH, depthFt]} />
        <meshStandardMaterial color="#cfcac1" roughness={0.72} metalness={0.02} />
      </mesh>

      {/* Toe kick, set back so the shadow under a run reads properly */}
      {toeKick && (
        <mesh position={[0, kick / 2, -0.09]} receiveShadow>
          <boxGeometry args={[widthFt, kick, depthFt - 0.18]} />
          <meshStandardMaterial color="#2b2b2b" roughness={0.9} />
        </mesh>
      )}

      {/* Faces */}
      {leaves.map((l, i) => {
        const cy = drawers > 0 && doors === 0
          ? kick + (bodyH / drawers) * (i + 0.5)
          : l.cy;
        return (
          <group key={i} position={[l.cx, cy, faceZ - z - depthFt / 2 + depthFt / 2]}>
            <mesh position={[0, 0, 0]} castShadow>
              <boxGeometry args={[l.w, l.h, 0.05]} />
              <meshStandardMaterial map={doorMap} color={doorColour} roughness={0.55} metalness={0.03} />
            </mesh>
            {/* Shaker frame: four rails proud of the face, so the centre
                reads as recessed without modelling a rebate. */}
            {(() => {
              const rail = 0.19;
              const fw = Math.max(0.08, l.w);
              const fh = Math.max(0.08, l.h);
              const zf = 0.032;
              const bars: Array<[number, number, number, number]> = [
                [0, fh / 2 - rail / 2, fw, rail],
                [0, -fh / 2 + rail / 2, fw, rail],
                [-fw / 2 + rail / 2, 0, rail, Math.max(0.02, fh - rail * 2)],
                [fw / 2 - rail / 2, 0, rail, Math.max(0.02, fh - rail * 2)],
              ];
              return bars.map(([bx, by, bw, bh], bi) => (
                <mesh key={bi} position={[bx, by, zf]} castShadow>
                  <boxGeometry args={[bw, bh, 0.016]} />
                  <meshStandardMaterial color={doorColour} roughness={0.5} metalness={0.02} />
                </mesh>
              ));
            })()}
            {/* Handle */}
            <mesh position={[
              drawers > 0 && doors === 0 ? 0 : (l.w / 2 - 0.12) * (i % 2 === 0 ? 1 : -1),
              drawers > 0 && doors === 0 ? 0 : -l.h / 2 + 0.35,
              0.05,
            ]} rotation={drawers > 0 && doors === 0 ? [0, 0, Math.PI / 2] : [0, 0, 0]}>
              <capsuleGeometry args={[0.018, Math.min(0.42, l.h * 0.35), 4, 8]} />
              <meshStandardMaterial color="#c9ccd1" roughness={0.28} metalness={0.85} />
            </mesh>
          </group>
        );
      })}
      <mesh visible={false}><boxGeometry args={[reveal, reveal, reveal]} /></mesh>
    </group>
  );
}

/* ── a run of cabinets, and the worktop over it ────────────────────────── */

interface Placed {
  run: CabinetRun;
  /** Rotation about Y and the origin of the run's left end. */
  rotY: number;
  originX: number;
  originZ: number;
}

function RunGroup({ placed, doorMap, doorColour, counterKey, showCounter }: {
  placed: Placed; doorMap: THREE.Texture; doorColour: string;
  counterKey: string; showCounter: boolean;
}) {
  const { run, rotY, originX, originZ } = placed;
  const look = COUNTER_LOOK[counterKey] || COUNTER_LOOK.quartz;
  const stone = useMemo(() => {
    const t = stoneTexture(look.base, look.vein, look.veins).clone();
    t.needsUpdate = true;
    t.repeat.set(Math.max(1, run.lengthIn * IN / 4), 1);
    return t;
  }, [look, run.lengthIn]);

  const isBase = run.family === 'base' || run.family === 'vanity';
  const isWall = run.family === 'wall';
  const depthFt = (isWall ? WALL_DEPTH_IN : CABINETS[run.family === 'vanity' ? 'vanity' : 'base'].defaultDepthIn) * IN;
  const runLenFt = run.lengthIn * IN;

  // Wall cabinets hang above the worktop and its splash.
  const wallBottomFt = (BASE_HEIGHT_IN + COUNTER_THICKNESS_IN + BACKSPLASH_HEIGHT_IN) * IN;
  const counterTopFt = (BASE_HEIGHT_IN + COUNTER_THICKNESS_IN) * IN;
  const usedFt = run.cabinets.reduce((s, c) => s + c.widthIn, 0) * IN;

  return (
    <group position={[originX, 0, originZ]} rotation={[0, rotY, 0]}>
      {run.cabinets.map(cab => {
        const wFt = cab.widthIn * IN;
        const hFt = cab.heightIn * IN;
        const spec = CABINETS[cab.type];
        const yBase = isWall ? wallBottomFt : 0;
        return (
          <CabinetBox
            key={cab.id}
            widthFt={wFt - 0.01}
            heightFt={hFt}
            depthFt={depthFt}
            x={cab.offsetIn * IN + wFt / 2 - runLenFt / 2}
            y={yBase}
            z={depthFt / 2}
            doorMap={doorMap}
            doorColour={doorColour}
            doors={spec.doors}
            drawers={spec.drawers}
            toeKick={!isWall && spec.family !== 'tall'}
          />
        );
      })}

      {/* Worktop — sized off the cabinets under it, never typed separately */}
      {isBase && showCounter && usedFt > 0 && (
        <>
          <mesh position={[usedFt / 2 - runLenFt / 2, counterTopFt - (COUNTER_THICKNESS_IN * IN) / 2, (COUNTER_DEPTH_IN * IN) / 2 - 0.04]}
            castShadow receiveShadow>
            <boxGeometry args={[usedFt + run.fillerIn * IN, COUNTER_THICKNESS_IN * IN, COUNTER_DEPTH_IN * IN]} />
            <meshStandardMaterial map={stone} roughness={look.rough} metalness={0.04} />
          </mesh>
          {/* Splash */}
          <mesh position={[usedFt / 2 - runLenFt / 2, counterTopFt + (BACKSPLASH_HEIGHT_IN * IN) / 2, 0.02]}>
            <boxGeometry args={[usedFt + run.fillerIn * IN, BACKSPLASH_HEIGHT_IN * IN, 0.03]} />
            <meshStandardMaterial map={stone} roughness={look.rough} />
          </mesh>
        </>
      )}
    </group>
  );
}

/* ── appliances ────────────────────────────────────────────────────────── */

const APPLIANCE_LOOK: Record<string, string> = {
  fridge: '#b9bec4', range: '#9aa0a6', cooktop: '#26282b', dishwasher: '#b9bec4',
  'wall-oven': '#9aa0a6', microwave: '#b9bec4', sink: '#c2c6ca',
  toilet: '#f2f2f0', tub: '#f4f4f2', shower: '#cfe0e6', vanity: '#8a6a4a',
  lavatory: '#f2f2f0', bidet: '#f2f2f0',
};

function Fixture({ f, x, z, rotY }: { f: PlacedFixture; x: number; z: number; rotY: number }) {
  const wFt = f.widthIn * IN;
  const dFt = f.depthIn * IN;
  // Sinks and cooktops sit in the worktop; everything else stands on the floor.
  const inCounter = f.specId === 'sink' || f.specId === 'cooktop';
  const hFt = inCounter ? 0.35
    : f.specId === 'fridge' ? 5.8
    : f.specId === 'toilet' ? 2.5
    : f.specId === 'tub' ? 1.7
    : f.specId === 'shower' ? 6.5
    : (BASE_HEIGHT_IN + COUNTER_THICKNESS_IN) * IN;
  const y = inCounter ? (BASE_HEIGHT_IN + COUNTER_THICKNESS_IN) * IN - hFt / 2 + 0.05 : hFt / 2;

  return (
    <group position={[x, 0, z]} rotation={[0, rotY, 0]}>
      <mesh position={[0, y, dFt / 2]} castShadow receiveShadow>
        <boxGeometry args={[wFt, hFt, dFt]} />
        <meshStandardMaterial
          color={APPLIANCE_LOOK[f.specId] || '#9aa0a6'}
          roughness={f.specId === 'shower' ? 0.1 : 0.35}
          metalness={['fridge', 'range', 'dishwasher', 'wall-oven', 'microwave'].includes(f.specId) ? 0.7 : 0.05}
          transparent={f.specId === 'shower'}
          opacity={f.specId === 'shower' ? 0.35 : 1}
        />
      </mesh>
    </group>
  );
}

/* ── the room ──────────────────────────────────────────────────────────── */

function Room({ lengthFt, widthFt, ceilingFt }: { lengthFt: number; widthFt: number; ceilingFt: number }) {
  const floor = useMemo(() => {
    const t = floorTexture().clone();
    t.needsUpdate = true;
    t.repeat.set(Math.max(1, lengthFt / 4), Math.max(1, widthFt / 4));
    return t;
  }, [lengthFt, widthFt]);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[lengthFt, widthFt]} />
        <meshStandardMaterial map={floor} roughness={0.65} />
      </mesh>
      {/* Back wall */}
      <mesh position={[0, ceilingFt / 2, -widthFt / 2]} receiveShadow>
        <planeGeometry args={[lengthFt, ceilingFt]} />
        <meshStandardMaterial color="#cdc9c3" roughness={0.95} side={THREE.DoubleSide} />
      </mesh>
      {/* Left wall */}
      <mesh position={[-lengthFt / 2, ceilingFt / 2, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[widthFt, ceilingFt]} />
        <meshStandardMaterial color="#c4c0ba" roughness={0.95} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function Rig({ lengthFt, widthFt, ceilingFt, mode }: {
  lengthFt: number; widthFt: number; ceilingFt: number; mode: RoomViewMode;
}) {
  const done = useRef(false);
  useFrame(({ camera }) => {
    if (done.current) return;
    done.current = true;
    if (mode === 'plan') {
      camera.position.set(0, Math.max(lengthFt, widthFt) * 1.35, 0.01);
      camera.lookAt(0, 0, 0);
    } else {
      camera.position.set(lengthFt * 0.40, ceilingFt * 0.70, widthFt * 1.95);
      camera.lookAt(0, ceilingFt * 0.52, -widthFt * 0.45);
    }
  });
  return null;
}

export default function RoomViewer3D({
  runs, fixtures, lengthFt, widthFt, ceilingFt, counterMaterial, doorColour = '#e8e4dc', height = 420,
}: {
  runs: CabinetRun[];
  fixtures: PlacedFixture[];
  lengthFt: number;
  widthFt: number;
  ceilingFt: number;
  counterMaterial: string;
  doorColour?: string;
  height?: number;
}) {
  const [mode, setMode] = useState<RoomViewMode>('3d');
  const doorMap = useMemo(() => paintedTexture(doorColour), [doorColour]);

  /**
   * Runs are laid around the room in order because a run does not record which
   * wall it belongs to. Said on screen rather than hidden — a layout the
   * software chose is not one the builder chose.
   */
  const placed: Placed[] = useMemo(() => {
    const walls = [
      { rotY: 0, x: 0, z: -widthFt / 2 },                 // back
      { rotY: Math.PI / 2, x: -lengthFt / 2, z: 0 },      // left
      { rotY: -Math.PI / 2, x: lengthFt / 2, z: 0 },      // right
    ];
    const perFamily: Record<string, number> = {};
    return runs.map(run => {
      const i = (perFamily[run.family] = (perFamily[run.family] ?? -1) + 1);
      const w = walls[i % walls.length];
      return { run, rotY: w.rotY, originX: w.x, originZ: w.z };
    });
  }, [runs, lengthFt, widthFt]);

  const fixturePlacements = useMemo(() => fixtures.map((f, i) => {
    const along = f.offsetIn * IN + (f.widthIn * IN) / 2 - lengthFt / 2;
    return { f, x: along, z: -widthFt / 2, rotY: 0, key: f.id || String(i) };
  }), [fixtures, lengthFt, widthFt]);

  const empty = runs.length === 0 && fixtures.length === 0;

  return (
    <div className="rounded-2xl border border-[#2A2A2A] bg-[#0A0A0A] overflow-hidden">
      <div className="flex items-center gap-1.5 p-2 border-b border-[#2A2A2A]">
        {([['3d', '3D', Box], ['plan', 'Plan', Layers]] as const).map(([id, lbl, Icon]) => (
          <button key={id} onClick={() => setMode(id)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              mode === id ? 'bg-[#ea580c] text-white' : 'text-gray-400 hover:text-white'}`}>
            <Icon className="w-3.5 h-3.5" /> {lbl}
          </button>
        ))}
        <span className="ml-auto text-[10px] text-gray-600 pr-1">
          Drawn from the same runs as the schedule
        </span>
      </div>

      {empty ? (
        <div className="flex flex-col items-center justify-center text-center" style={{ height }}>
          <Box className="w-8 h-8 text-[#2A2A2A] mb-3" />
          <p className="text-sm font-semibold text-gray-300">Nothing to draw yet</p>
          <p className="text-xs text-gray-500 mt-1 max-w-xs">
            Add a cabinet run and it appears here, built from the same boxes the schedule orders.
          </p>
        </div>
      ) : (
        <div style={{ height }}>
          <Canvas
            shadows={mode === '3d'}
            camera={{ fov: mode === 'plan' ? 26 : 32, near: 0.1, far: 400 }}
            gl={{ antialias: true, preserveDrawingBuffer: true }}
            onCreated={({ gl }) => {
              gl.toneMapping = THREE.ACESFilmicToneMapping;
              gl.toneMappingExposure = 1.05;
              gl.shadowMap.type = THREE.PCFSoftShadowMap;
            }}
          >
            <Suspense fallback={null}>
              <color attach="background" args={[mode === 'plan' ? '#0A0A0A' : '#1a1a1c']} />
              <SoftShadows size={12} samples={8} />
              <ambientLight intensity={0.55} />
              <hemisphereLight args={['#fff6ea', '#3a3a40', 0.7]} />
              {/* A window's worth of light from one side, which is what makes a
                  room read as a room rather than an evenly lit box. */}
              <directionalLight position={[lengthFt * 0.8, ceilingFt * 1.6, widthFt]} intensity={1.5} castShadow
                shadow-mapSize={[1024, 1024]} />
              <directionalLight position={[-lengthFt, ceilingFt, widthFt * 0.6]} intensity={0.35} />

              <Room lengthFt={lengthFt} widthFt={widthFt} ceilingFt={ceilingFt} />

              {placed.map(p => (
                <RunGroup key={p.run.id} placed={p} doorMap={doorMap} doorColour={doorColour}
                  counterKey={counterMaterial} showCounter />
              ))}

              {fixturePlacements.map(({ f, x, z, rotY, key }) => (
                <Fixture key={key} f={f} x={x} z={z} rotY={rotY} />
              ))}

              <ContactShadows position={[0, 0.01, 0]} opacity={0.4}
                scale={Math.max(lengthFt, widthFt) * 1.4} blur={2.2} far={4} />

              <Rig lengthFt={lengthFt} widthFt={widthFt} ceilingFt={ceilingFt} mode={mode} />
              <OrbitControls makeDefault enablePan
                minPolarAngle={mode === 'plan' ? 0 : 0.05}
                maxPolarAngle={mode === 'plan' ? 0.001 : Math.PI / 2.05} />
            </Suspense>
          </Canvas>
        </div>
      )}

      {!empty && (
        <p className="text-[10px] text-gray-600 px-3 py-2 border-t border-[#2A2A2A]">
          Runs are placed around the room in order — back wall first, then left, then right.
          A run does not yet record which wall it belongs to, so move them by reordering.
        </p>
      )}
    </div>
  );
}
