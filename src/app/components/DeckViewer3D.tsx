/**
 * DeckViewer3D — the 3D, framing and plan views, all from one model.
 *
 * Replaces the hand-rolled canvas "3D" that drew fake isometric with gradients.
 * That approach had no geometry behind it, so it could never produce a framing
 * plan or a dimensioned drawing — only a picture that resembled one.
 *
 * Here the members come from buildMembers(), and each view is a different camera
 * and filter over the same geometry:
 *
 *   3D       — everything, perspective, shadows
 *   Framing  — structure only, decking and rails hidden
 *   Plan     — orthographic from above with dimensions
 *
 * Because all three read the same array, a joist that moves moves everywhere. A
 * framing plan that disagrees with the rendering is the thing a plans examiner
 * catches, and drawing the views separately is how that happens.
 */
import { Suspense, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, Environment, Line, Text } from '@react-three/drei';
import * as THREE from 'three';
import { Box, Layers, Ruler, Loader2, Maximize2 } from 'lucide-react';
import {
  buildMembers, MEMBER_COLOR, STRUCTURAL_KINDS,
  type DeckModel, type Member,
} from '../lib/deckModel';

export type ViewMode = '3d' | 'framing' | 'plan';

/**
 * One piece of lumber.
 *
 * Framing view gets a visible edge outline, because in a structural drawing the
 * joint between two members matters more than the surface of either.
 */
function MemberMesh({ member, outlined }: { member: Member; outlined: boolean }) {
  const geo = useMemo(() => new THREE.BoxGeometry(...member.size), [member.size]);
  const edges = useMemo(() => (outlined ? new THREE.EdgesGeometry(geo) : null), [geo, outlined]);
  return (
    <group position={member.pos}>
      <mesh geometry={geo} castShadow receiveShadow>
        <meshStandardMaterial
          color={MEMBER_COLOR[member.kind]}
          roughness={member.kind === 'footing' ? 0.95 : 0.75}
          metalness={0}
        />
      </mesh>
      {edges && (
        <lineSegments geometry={edges}>
          <lineBasicMaterial color="#1a1a1a" />
        </lineSegments>
      )}
    </group>
  );
}

/** The house wall the deck attaches to — context, so the deck is not floating. */
function HouseWall({ width, height }: { width: number; height: number }) {
  return (
    <mesh position={[0, height / 2, -0.5]} receiveShadow>
      <boxGeometry args={[width + 8, height, 1]} />
      <meshStandardMaterial color="#d8d2c8" roughness={0.9} />
    </mesh>
  );
}

/** A dimension line with its measurement, for the plan view. */
function Dimension({ from, to, label, offset = 0 }: {
  from: [number, number, number]; to: [number, number, number]; label: string; offset?: number;
}) {
  const a: [number, number, number] = [from[0], from[1] + offset, from[2]];
  const b: [number, number, number] = [to[0], to[1] + offset, to[2]];
  const mid: [number, number, number] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + 0.4, (a[2] + b[2]) / 2];
  return (
    <group>
      <Line points={[a, b]} color="#ea580c" lineWidth={1.5} />
      <Text position={mid} fontSize={0.7} color="#ea580c" anchorX="center" anchorY="middle"
        rotation={[-Math.PI / 2, 0, 0]}>
        {label}
      </Text>
    </group>
  );
}

function Scene({ model, mode }: { model: DeckModel; mode: ViewMode }) {
  const members = useMemo(() => buildMembers(model), [model]);
  const visible = useMemo(
    () => (mode === 'framing' ? members.filter(m => STRUCTURAL_KINDS.includes(m.kind)) : members),
    [members, mode],
  );

  const isPlan = mode === 'plan';
  const halfW = model.widthFt / 2;

  return (
    <>
      {/* Plan view is a measured drawing, so it gets flat, even light with no
          shadows — a shadow across a dimension line is just noise there. */}
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

      {mode === '3d' && <Suspense fallback={null}><Environment preset="park" /></Suspense>}

      {mode !== 'plan' && <HouseWall width={model.widthFt} height={Math.max(10, model.heightFt + 8)} />}

      {visible.map(m => (
        <MemberMesh key={m.id} member={m} outlined={mode !== '3d'} />
      ))}

      {/* Ground plane, so shadows land on something and height reads correctly. */}
      {!isPlan && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
          <planeGeometry args={[120, 120]} />
          <meshStandardMaterial color="#6f7d58" roughness={1} />
        </mesh>
      )}

      {isPlan && (
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

/** Frames the camera on the deck whatever its size, so it never opens off-screen. */
function CameraRig({ model, mode }: { model: DeckModel; mode: ViewMode }) {
  const done = useRef<string>('');
  useFrame(({ camera }) => {
    const key = `${mode}-${model.widthFt}-${model.depthFt}-${model.heightFt}`;
    if (done.current === key) return;
    done.current = key;
    const reach = Math.max(model.widthFt, model.depthFt);
    if (mode === 'plan') {
      camera.position.set(0, reach * 1.8, model.depthFt / 2 + 0.001);
      camera.lookAt(0, 0, model.depthFt / 2);
    } else {
      camera.position.set(reach * 0.95, reach * 0.72, model.depthFt + reach * 0.95);
      camera.lookAt(0, model.heightFt / 2, model.depthFt / 2);
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
}: {
  model: DeckModel;
  mode?: ViewMode;
  onModeChange?: (m: ViewMode) => void;
  height?: number;
}) {
  const [internal, setInternal] = useState<ViewMode>('3d');
  const mode = controlledMode ?? internal;
  const setMode = onModeChange ?? setInternal;

  const TABS: { id: ViewMode; label: string; icon: any; hint: string }[] = [
    { id: '3d', label: '3D', icon: Box, hint: 'How it will look' },
    { id: 'framing', label: 'Framing', icon: Layers, hint: 'Structure only — decking hidden' },
    { id: 'plan', label: 'Plan', icon: Ruler, hint: 'Dimensioned, from above' },
  ];

  return (
    <div className="space-y-3">
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
      </div>

      <div className="rounded-2xl overflow-hidden border border-[#2A2A2A]"
        style={{ height, background: mode === 'plan' ? '#f8f8f7' : '#0d1117' }}>
        <Canvas
          shadows={mode !== 'plan'}
          camera={{ fov: mode === 'plan' ? 30 : 42, near: 0.1, far: 500 }}
          gl={{ antialias: true, preserveDrawingBuffer: true }}
        >
          <Suspense fallback={null}>
            <Scene model={model} mode={mode} />
            <CameraRig model={model} mode={mode} />
            <OrbitControls
              makeDefault
              enablePan
              target={[0, mode === 'plan' ? 0 : model.heightFt / 2, model.depthFt / 2]}
              // Plan view stays overhead: letting it tilt turns a measured
              // drawing into a bad perspective view.
              minPolarAngle={mode === 'plan' ? 0 : 0.05}
              maxPolarAngle={mode === 'plan' ? 0.001 : Math.PI / 2.05}
            />
          </Suspense>
        </Canvas>
      </div>
    </div>
  );
}
