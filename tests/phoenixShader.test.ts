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

/* ── the ambient field, same rules ───────────────────────────────────── */

const AMBIENT = readFileSync('src/app/components/phoenix/AmbientField.tsx', 'utf8');

function ambientShader(name: 'VERT' | 'FRAG'): string {
  const start = AMBIENT.indexOf(`const ${name} = /* glsl */\``);
  assert.ok(start >= 0, `AmbientField ${name} not found`);
  const from = AMBIENT.indexOf('`', start) + 1;
  const to = AMBIENT.indexOf('`;', from);
  return AMBIENT.slice(from, to).replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/.*/g, ' ');
}

for (const which of ['VERT', 'FRAG'] as const) {
  test(`AmbientField ${which}: every local is declared before it is used`, () => {
    // The same check that would have caught the "outward" bug in one
    // second. A second shader is a second chance to make that mistake.
    const body = mainBody(ambientShader(which));
    for (const type of GLSL_TYPES) {
      // Double-escaped: inside a template literal a single \b is a
      // backspace character, not a word boundary, and the pattern then
      // matches nothing — a test that passes because it asks nothing.
      const decl = new RegExp(`\\b${type}\\s+([A-Za-z_]\\w*)\\s*=`, 'g');
      let m: RegExpExecArray | null;
      while ((m = decl.exec(body))) {
        const first = body.search(new RegExp(`\\b${m[1]}\\b`));
        assert.ok(first >= m.index,
          `AmbientField ${which}: "${m[1]}" used at ${first}, declared at ${m.index}`);
      }
    }
  });

  test(`AmbientField ${which}: uniforms and varyings are declared`, () => {
    const src = ambientShader(which);
    const uni = new Set([...src.matchAll(/\buniform\s+\w+\s+(\w+)\s*;/g)].map((m) => m[1]));
    const vary = new Set([...src.matchAll(/\bvarying\s+\w+\s+(\w+)\s*;/g)].map((m) => m[1]));
    const body = mainBody(src);
    for (const m of body.matchAll(/\bu[A-Z]\w*/g)) {
      assert.ok(uni.has(m[0]), `AmbientField ${which}: ${m[0]} undeclared uniform`);
    }
    for (const m of body.matchAll(/\bv[A-Z]\w*/g)) {
      assert.ok(vary.has(m[0]), `AmbientField ${which}: ${m[0]} undeclared varying`);
    }
  });
}

test('AmbientField: every uniform is given a value in JS', () => {
  const declared = new Set<string>();
  for (const which of ['VERT', 'FRAG'] as const) {
    for (const m of ambientShader(which).matchAll(/\buniform\s+\w+\s+(\w+)\s*;/g)) declared.add(m[1]);
  }
  const block = AMBIENT.slice(AMBIENT.indexOf('const uniforms = useMemo'));
  const supplied = new Set(
    [...block.slice(0, block.indexOf('}), [')).matchAll(/\b(u[A-Z]\w*)\s*:/g)].map((m) => m[1]),
  );
  for (const n of declared) {
    assert.ok(supplied.has(n), `${n} declared in GLSL but never given a value`);
  }
});

test('AmbientField: every attribute is set on the geometry', () => {
  for (const m of ambientShader('VERT').matchAll(/\battribute\s+\w+\s+(\w+)\s*;/g)) {
    assert.match(AMBIENT, new RegExp(`setAttribute\\(\\s*'${m[1]}'`),
      `${m[1]} declared in GLSL but never set on the geometry`);
  }
});

test('the dust is never pure black', () => {
  // A black mote on a black screen is nothing at all, and the ripple then
  // appears to travel through a void and arrive from nowhere.
  const frag = ambientShader('FRAG');
  const dim = frag.match(/vec3 dim\s*=\s*vec3\(([\d.]+)/);
  assert.ok(dim, 'the resting colour should be named "dim"');
  assert.ok(Number(dim![1]) > 0.05, `resting colour ${dim![1]} is too close to black to see`);
});
