/**
 * DeckScenery — the yard around the deck.
 *
 * This is not decoration. A structure sitting alone on an infinite green plane
 * reads as a diagram no matter how good its materials are, because nothing in
 * the frame has the irregularity that real things have. Planting beds, shrubs
 * that are all slightly different, and a tree throwing dappled shade give the
 * eye something to compare the deck against — and the moment there is something
 * irregular next to it, the deck starts reading as built rather than drawn.
 *
 * Everything here is procedural and deterministic. Nothing is fetched, and a
 * given deck size always produces the same yard, so the view does not reshuffle
 * its landscaping every time a slider moves.
 *
 * All of it is kept clear of the deck footprint and the stair landing, so it can
 * never grow through the structure.
 */
import { useMemo } from 'react';
import * as THREE from 'three';

/** Deterministic noise so the yard is stable across renders. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/**
 * A shrub. Built from a few overlapping lumpy spheres rather than one, because
 * a single sphere reads as a ball and a real shrub has more than one mass to it.
 */
function Shrub({ position, scale, hue }: {
  position: [number, number, number]; scale: number; hue: number;
}) {
  const parts = useMemo(() => {
    const rand = rng(Math.round(position[0] * 977 + position[2] * 131 + 7));
    return Array.from({ length: 3 }, (_, i) => ({
      pos: [
        (rand() - 0.5) * 0.7 * scale,
        (i === 0 ? 0 : rand() * 0.5) * scale,
        (rand() - 0.5) * 0.7 * scale,
      ] as [number, number, number],
      r: (0.5 + rand() * 0.35) * scale,
      tone: rand(),
    }));
  }, [position, scale]);

  return (
    <group position={position}>
      {parts.map((p, i) => (
        <mesh key={i} position={p.pos} castShadow receiveShadow>
          {/* Low-poly with flat shading: a leafy mass catches light in facets,
              and a perfectly smooth sphere never looks like foliage. */}
          <icosahedronGeometry args={[p.r, 1]} />
          <meshStandardMaterial
            color={new THREE.Color().setHSL(hue + p.tone * 0.02, 0.34, 0.20 + p.tone * 0.07)}
            roughness={0.95} metalness={0} flatShading />
        </mesh>
      ))}
    </group>
  );
}

/** A mature tree, for the middle distance and the shade it throws. */
function Tree({ position, scale }: { position: [number, number, number]; scale: number }) {
  const blobs = useMemo(() => {
    const rand = rng(Math.round(position[0] * 31 + position[2] * 17 + 91));
    return Array.from({ length: 5 }, () => ({
      pos: [
        (rand() - 0.5) * 3.4 * scale,
        (5.5 + rand() * 2.2) * scale,
        (rand() - 0.5) * 3.4 * scale,
      ] as [number, number, number],
      r: (1.8 + rand() * 1.1) * scale,
      tone: rand(),
    }));
  }, [position, scale]);

  return (
    <group position={position}>
      <mesh position={[0, 3 * scale, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.22 * scale, 0.36 * scale, 6 * scale, 8]} />
        <meshStandardMaterial color="#4a3a2c" roughness={1} metalness={0} flatShading />
      </mesh>
      {blobs.map((b, i) => (
        <mesh key={i} position={b.pos} castShadow receiveShadow>
          <icosahedronGeometry args={[b.r, 1]} />
          <meshStandardMaterial
            color={new THREE.Color().setHSL(0.26 + b.tone * 0.02, 0.30, 0.19 + b.tone * 0.06)}
            roughness={0.95} metalness={0} flatShading />
        </mesh>
      ))}
    </group>
  );
}

export default function DeckScenery({ widthFt, depthFt }: { widthFt: number; depthFt: number }) {
  const halfW = widthFt / 2;

  // Planting runs along the house on both sides of the deck. Positions are
  // derived from the deck size so a bed never ends up under the structure.
  const beds = useMemo(() => {
    const rand = rng(4242);
    const out: { pos: [number, number, number]; scale: number; hue: number }[] = [];

    // Foundation planting either side of the deck.
    for (const side of [-1, 1]) {
      const start = side * (halfW + 2.5);
      for (let i = 0; i < 4; i++) {
        out.push({
          pos: [start + side * i * (1.9 + rand() * 0.5), 0.45, 1.1 + rand() * 0.5],
          scale: 0.75 + rand() * 0.55,
          hue: 0.24 + rand() * 0.06,
        });
      }
    }

    // A couple of specimen shrubs out in the lawn, well clear of the stairs.
    out.push({ pos: [-halfW - 6.5, 0.5, depthFt + 5], scale: 1.15, hue: 0.27 });
    out.push({ pos: [-halfW - 8.5, 0.45, depthFt + 8.5], scale: 0.9, hue: 0.25 });

    return out;
  }, [halfW, depthFt]);

  return (
    <group>
      {/* Mulch beds under the foundation planting. Slightly proud of the lawn,
          because a bed edge is a real edge and catches its own shadow. */}
      {[-1, 1].map(side => (
        <mesh key={side} rotation={[-Math.PI / 2, 0, 0]}
          position={[side * (halfW + 5.5), 0.04, 1.3]} receiveShadow>
          <planeGeometry args={[9, 3.4]} />
          <meshStandardMaterial color="#3d2b1f" roughness={1} metalness={0} />
        </mesh>
      ))}

      {beds.map((b, i) => (
        <Shrub key={i} position={b.pos} scale={b.scale} hue={b.hue} />
      ))}

      {/* Two trees, set well back and to the sides so they frame the shot and
          throw shade across the lawn without hiding the deck. */}
      <Tree position={[halfW + 15, 0, depthFt + 4]} scale={1.15} />
      <Tree position={[-halfW - 17, 0, depthFt - 6]} scale={0.95} />
    </group>
  );
}
