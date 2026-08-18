/**
 * Sorting one job folder into the two things the designer can read.
 *
 * A job folder is not organised for software. It holds site photos, a walk-round
 * clip, a scan of the plot plan and a phone shot of a framing sketch on graph
 * paper, all in the one place — while the designer has two readers that each
 * want a different half of it. The house capture wants the photos. The sketch
 * reader wants the drawings. Handing either one the other's files wastes a model
 * call and comes back with nothing useful.
 *
 * The sort is done on the path and the filename rather than by showing every
 * image to a model first, and that is deliberate on two counts. It is instant
 * and free, so opening a folder does not cost anything until something is
 * actually used. And when it is wrong it is wrong legibly: the operator can see
 * that `back-wall.jpg` was called a photo because nothing in its name said
 * otherwise, which is a sentence they can act on. A model that silently decided
 * the same thing leaves them staring at a sketch reader reporting no dimensions
 * with no idea why.
 *
 * People already organise these folders — `Drawings/`, `framing-plan.jpg` — so
 * the heuristic is reading an existing convention rather than inventing one. It
 * will still miss, which is why every file it sorts can be moved by hand.
 */

export type JobFileKind = 'photo' | 'drawing';

export interface SortedJobFile {
  file: File;
  /** Path relative to the chosen folder, so subfolders stay legible. */
  path: string;
  kind: JobFileKind;
  /** Why it landed where it did. Shown, so a wrong guess is explainable. */
  reason: string;
}

/** Subfolder names that mean the contents are drawings rather than site photos. */
const DRAWING_DIRS =
  /^(drawings?|drafts?|plans?|sketch(es)?|surveys?|blueprints?|prints?|cad|dwg|permits?|as[-_ ]?builts?)$/i;

/**
 * Filename words that mean a drawing even when it is loose in the folder.
 *
 * This list is only as good as the words people actually type, and the first
 * version missed on real files from the first job it saw: `331 deck frame.jpg`
 * and `rebuild deck draft1.jpg` both went to the photo pile, because the list
 * had "framing" but not "frame", and no notion of a draft at all. Both are how
 * a builder names a drawing, so both are here now.
 *
 * `fram(e|es|ing)` rather than a bare "frame" so framing still matches on its
 * own; the trailing boundary is any non-letter, which is what lets `draft1` and
 * `draft2` match without listing every number.
 */
const DRAWING_WORDS =
  /(^|[^a-z])(plan|fram(e|es|ing)|sketch|draft|survey|drawing|dwg|blueprint|elevation|elev|section|detail|layout|plot|as[-_ ]?built)([^a-z]|$)/i;

export function sortJobFile(file: File, path?: string): SortedJobFile {
  const rel = String(path || (file as any).webkitRelativePath || file.name).replace(/\\/g, '/');
  const parts = rel.split('/').filter(Boolean);
  const base = parts.length ? parts[parts.length - 1] : file.name;
  const dirs = parts.slice(0, -1);

  // Nobody films a drawing, so a clip is always footage of the site.
  if (file.type.startsWith('video/')) {
    return { file, path: rel, kind: 'photo', reason: 'video of the site' };
  }

  const dir = dirs.find(d => DRAWING_DIRS.test(d.trim()));
  if (dir) return { file, path: rel, kind: 'drawing', reason: `filed under ${dir}/` };

  const word = base.replace(/\.[^.]+$/, '').match(DRAWING_WORDS);
  if (word) return { file, path: rel, kind: 'drawing', reason: `named “${word[2]}”` };

  return { file, path: rel, kind: 'photo', reason: 'nothing in the name says drawing' };
}

export function sortJobFiles(files: File[], paths: string[] = []): SortedJobFile[] {
  return files.map((f, i) => sortJobFile(f, paths[i]));
}
