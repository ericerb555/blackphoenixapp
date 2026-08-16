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
import { Box, Layers, Ruler, Hammer } from 'lucide-react';
import {
  buildMembers, MEMBER_COLOR, STRUCTURAL_KINDS,
  type DeckModel, type Member,
} from '../lib/deckModel';
import { buildAnnotations } from '../lib/deckAnnotations';

export type ViewMode = '3d' | 'framing' | 'plan' | 'framing-detail';

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


/**
 * The annotated framing plan.
 *
 * Dimension strings with extension ticks, and callouts on leader lines pointing
 * at the member they describe. Everything comes from buildAnnotations, which
 * reads the model and the build spec — so a fastener size on the drawing is the
 * same one printed in the schedule.
 *
 * Rotated flat and drawn in black on white, because this sheet is read on paper
 * by someone standing in a building department.
 */
function FramingAnnotations({ model }: { model: DeckModel }) {
  const a = useMemo(() => buildAnnotations(model), [model]);
  const INK = '#111827';
  return (
    <group>
      {a.dimensions.map((d, i) => {
        const mid: [number, number, number] = [
          (d.from[0] + d.to[0]) / 2, d.from[1], (d.from[2] + d.to[2]) / 2,
        ];
        // Ticks perpendicular to the run, so a dimension reads as a dimension
        // rather than a stray line across the drawing.
        const t = 0.45;
        const p1: [number, number, number] = d.axis === 'x'
          ? [d.from[0], d.from[1], d.from[2] - t] : [d.from[0] - t, d.from[1], d.from[2]];
        const p2: [number, number, number] = d.axis === 'x'
          ? [d.from[0], d.from[1], d.from[2] + t] : [d.from[0] + t, d.from[1], d.from[2]];
        const p3: [number, number, number] = d.axis === 'x'
          ? [d.to[0], d.to[1], d.to[2] - t] : [d.to[0] - t, d.to[1], d.to[2]];
        const p4: [number, number, number] = d.axis === 'x'
          ? [d.to[0], d.to[1], d.to[2] + t] : [d.to[0] + t, d.to[1], d.to[2]];
        return (
          <group key={'d' + i}>
            <Line points={[d.from, d.to]} color={INK} lineWidth={1.2} />
            <Line points={[p1, p2]} color={INK} lineWidth={1.2} />
            <Line points={[p3, p4]} color={INK} lineWidth={1.2} />
            <Text position={[mid[0], mid[1], mid[2] - 0.55]} fontSize={0.62} color={INK}
              anchorX="center" anchorY="middle" rotation={[-Math.PI / 2, 0, 0]}>
              {d.label}
            </Text>
          </group>
        );
      })}

      {a.callouts.map((c, i) => (
        <group key={'c' + i}>
          <Line points={[c.target, c.at]} color={INK} lineWidth={1} />
          <mesh position={c.target} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.16, 12]} />
            <meshBasicMaterial color={INK} />
          </mesh>
          {c.lines.map((line, j) => (
            <Text key={j} position={[c.at[0], c.at[1], c.at[2] + j * 0.72]} fontSize={0.55}
              color={INK} anchorX={c.at[0] < 0 ? 'right' : 'left'} anchorY="middle"
              rotation={[-Math.PI / 2, 0, 0]}>
              {line}
            </Text>
          ))}
        </group>
      ))}

      {a.notes.map((n, i) => (
        <Text key={'n' + i} position={[-model.widthFt / 2 - 5, model.heightFt, model.depthFt + 7 + i * 0.8]}
          fontSize={0.5} color={INK} anchorX="left" anchorY="middle" rotation={[-Math.PI / 2, 0, 0]}>
          {(i === 0 ? 'NOTES:  ' : '        ') + n}
        </Text>
      ))}
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

  // Both measured drawings: flat light, overhead, no shadows.
  const isPlan = mode === 'plan' || mode === 'framing-detail';
  const isDetail = mode === 'framing-detail';
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

      {isDetail && <FramingAnnotations model={model} />}

      {isPlan && !isDetail && (
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
    if (mode === 'plan' || mode === 'framing-detail') {
      // Pull back further for the detail view: the callouts sit well outside
      // the deck itself and must be in frame.
      camera.position.set(0, reach * (mode === 'framing-detail' ? 3.1 : 1.8), model.depthFt / 2 + 0.001);
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

  const TABS: { id: ViewMode; label: string; icon: any; hint: string }[] = [
    { id: '3d', label: '3D', icon: Box, hint: 'How it will look' },
    { id: 'framing', label: 'Framing', icon: Layers, hint: 'Structure only — decking hidden' },
    { id: 'plan', label: 'Plan', icon: Ruler, hint: 'Dimensioned, from above' },
    { id: 'framing-detail', label: 'Framing detail', icon: Hammer, hint: 'Framing plan with sizes, hangers and fasteners called out' },
  ];

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
      </div>
      )}

      <div className="rounded-2xl overflow-hidden border border-[#2A2A2A]"
        style={{ height, background: mode === 'plan' || mode === 'framing-detail' ? '#ffffff' : '#0d1117' }}>
        <Canvas
          shadows={mode !== 'plan' && mode !== 'framing-detail'}
          camera={{ fov: mode === 'plan' || mode === 'framing-detail' ? 26 : 42, near: 0.1, far: 500 }}
          gl={{ antialias: true, preserveDrawingBuffer: true }}
          onCreated={({ gl }) => {
            // Force a draw before reading, so the first capture is not blank.
            onCaptureReady?.(() => {
              try { return gl.domElement.toDataURL('image/png'); } catch { return null; }
            });
          }}
        >
          <Suspense fallback={null}>
            <Scene model={model} mode={mode} />
            <CameraRig model={model} mode={mode} />
            <OrbitControls
              makeDefault
              enablePan
              target={[0, mode === 'plan' || mode === 'framing-detail' ? 0 : model.heightFt / 2, model.depthFt / 2]}
              // Plan view stays overhead: letting it tilt turns a measured
              // drawing into a bad perspective view.
              minPolarAngle={mode === 'plan' || mode === 'framing-detail' ? 0 : 0.05}
              maxPolarAngle={mode === 'plan' || mode === 'framing-detail' ? 0.001 : Math.PI / 2.05}
            />
          </Suspense>
        </Canvas>
      </div>
    </div>
  );
}
