/**
 * The shader, checked without a GPU.
 *
 * WHY THIS FILE EXISTS
 *
 * The particle Phoenix vanished for three rounds of debugging. The cause
 * was one line out of order:
 *
 *     disp += outward * wave * 0.085;          // used here
 *     vec3 outward = normalize(home + ...);    // declared here
 *
 * GLSL rejects use-before-declaration. The program fails to link, a
 * material with no program draws nothing, and three.js reports it to the
 * console and nowhere else. The canvas ran at sixty frames a second with
 * an empty scene — indistinguishable from a layout bug, which is what I
 * went looking for, twice.
 *
 * TypeScript cannot see inside a template literal, and nothing else in the
 * pipeline compiles GLSL. These are the cheap structural checks that would
 * have caught it in one second instead of three conversations.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const SRC = readFileSync('src/app/components/phoenix/PhoenixParticleBrain.tsx', 'utf8');

/** One shader's source, comments stripped so they cannot fake a match. */
function shader(name: 'VERT' | 'FRAG'): string {
  const start = SRC.indexOf(`const ${name} = /* glsl */\``);
  assert.ok(start >= 0, `${name} not found — has it been renamed?`);
  const from = SRC.indexOf('`', start) + 1;
  const to = SRC.indexOf('`;', from);
  assert.ok(to > from, `${name} is not terminated`);
  return SRC.slice(from, to)
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\/\/.*/g, ' ');
}

/** The body of main(), which is where locals live. */
function mainBody(src: string): string {
  const i = src.indexOf('void main()');
  assert.ok(i >= 0, 'no main()');
  return src.slice(src.indexOf('{', i) + 1);
}

const GLSL_TYPES = ['float', 'vec2', 'vec3', 'vec4', 'mat2', 'mat3', 'mat4', 'int', 'bool'];

/* ── the bug that cost three rounds ──────────────────────────────────── */

for (const which of ['VERT', 'FRAG'] as const) {
  test(`${which}: every local is declared before it is used`, () => {
    const body = mainBody(shader(which));

    for (const type of GLSL_TYPES) {
      // Declarations of this type inside main(), with their offsets.
      const decl = new RegExp(`\\b${type}\\s+([A-Za-z_]\\w*)\\s*=`, 'g');
      let m: RegExpExecArray | null;
      while ((m = decl.exec(body))) {
        const name = m[1];
        const declAt = m.index;

        // First mention of the name anywhere in the body, as a whole word.
        const use = new RegExp(`\\b${name}\\b`);
        const firstAt = body.search(use);

        assert.ok(
          firstAt >= declAt,
          `${which}: "${name}" is used at ${firstAt} but declared at ${declAt}. `
          + 'GLSL rejects this and the program silently refuses to link.',
        );
      }
    }
  });

  test(`${which}: every varying it writes or reads is declared`, () => {
    const src = shader(which);
    const declared = new Set(
      [...src.matchAll(/\bvarying\s+\w+\s+(\w+)\s*;/g)].map((m) => m[1]),
    );
    // Anything named vSomething is a varying by this file's convention.
    const used = new Set([...mainBody(src).matchAll(/\bv[A-Z]\w*/g)].map((m) => m[0]));
    for (const name of used) {
      assert.ok(declared.has(name), `${which}: ${name} is used but never declared`);
    }
  });

  test(`${which}: every uniform it uses is declared`, () => {
    const src = shader(which);
    const declared = new Set(
      [...src.matchAll(/\buniform\s+\w+\s+(\w+)\s*;/g)].map((m) => m[1]),
    );
    const used = new Set([...mainBody(src).matchAll(/\bu[A-Z]\w*/g)].map((m) => m[0]));
    for (const name of used) {
      assert.ok(declared.has(name), `${which}: ${name} is used but never declared`);
    }
  });
}

test('VERT: every attribute it uses is declared', () => {
  const src = shader('VERT');
  const declared = new Set(
    [...src.matchAll(/\battribute\s+\w+\s+(\w+)\s*;/g)].map((m) => m[1]),
  );
  // three.js supplies `position` itself; everything else must be ours.
  declared.add('position');
  const used = new Set([...mainBody(src).matchAll(/\ba[A-Z]\w*/g)].map((m) => m[0]));
  for (const name of used) {
    assert.ok(declared.has(name), `VERT: ${name} is used but never declared`);
  }
});

/* ── the uniforms the shader needs must actually be supplied ─────────── */

test('every uniform the shaders declare is given a value in JS', () => {
  // A missing uniform is not a link error — it reads as zero, which for
  // uSize means every particle is zero pixels across. Invisible, and
  // indistinguishable from the bug above.
  const declared = new Set<string>();
  for (const which of ['VERT', 'FRAG'] as const) {
    for (const m of shader(which).matchAll(/\buniform\s+\w+\s+(\w+)\s*;/g)) {
      declared.add(m[1]);
    }
  }

  const block = SRC.slice(SRC.indexOf('const uniforms = useMemo'));
  const supplied = new Set(
    [...block.slice(0, block.indexOf('}), [')).matchAll(/\b(u[A-Z]\w*)\s*:/g)].map((m) => m[1]),
  );

  for (const name of declared) {
    assert.ok(supplied.has(name), `${name} is declared in GLSL but never given a value`);
  }
});

/* ── and the attributes ──────────────────────────────────────────────── */

test('every attribute the vertex shader declares is set on the geometry', () => {
  // Same failure shape: an unset attribute reads as zero. aThick at zero
  // would quietly shrink every particle rather than erroring.
  const declared = [...shader('VERT').matchAll(/\battribute\s+\w+\s+(\w+)\s*;/g)]
    .map((m) => m[1]);

  for (const name of declared) {
    assert.match(
      SRC,
      new RegExp(`setAttribute\\(\\s*'${name}'`),
      `${name} is declared in GLSL but never set on the BufferGeometry`,
    );
  }
});

/* ── a property worth keeping ────────────────────────────────────────── */

test('point size is projection-derived, never a magic constant', () => {
  // The original used a hardcoded 300, which made every particle 200px
  // across and turned 28,000 of them into one white blob.
  const body = mainBody(shader('VERT'));
  assert.match(body, /gl_PointSize\s*=\s*clamp\(/, 'point size must be clamped');
  assert.match(body, /uProj/, 'point size must come from the projection');
  assert.doesNotMatch(body, /gl_PointSize\s*=\s*[\w.]*\s*\*\s*\(\s*\d{3}/,
    'a three-digit constant in the point size is how the blob happened');
});
