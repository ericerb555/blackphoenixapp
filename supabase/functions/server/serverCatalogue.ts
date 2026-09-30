/**
 * The labour catalogue as the server knows it.
 *
 * WHY THE MERGE RULE LIVES IN ONE PLACE
 *
 * There are three stores, described at the top of `rateLearningRoutes.tsx`:
 * `labor_tasks:catalogue` is the book, published by an administrator;
 * `labor_tasks:global` holds the edits somebody made; `labor_tasks:measured`
 * holds what the learning loop has corrected from finished jobs. Two different
 * paths now need the merged result — the learning loop, and the blueprint
 * quoter — and the rule for combining them decides what a customer is charged.
 * Two implementations of that rule would eventually disagree.
 *
 * THE RULE, AND THE PART THAT IS A SECURITY PROPERTY
 *
 * A task is somebody's OWN if and only if it appears in the editor's store.
 * That is the server's own record of what a person chose, so a caller cannot
 * claim it in either direction — neither marking a rate as theirs to stop the
 * learning loop correcting it, nor marking one as a book figure to have it
 * overwritten. Nothing about which rates are protected is ever read from a
 * request.
 *
 * WHY THIS TAKES THE RECORDS RATHER THAN READING THEM
 *
 * So it can be tested without a store, the same shape as `resolveLaborRates`.
 * Each caller does its own two reads.
 */

/** A catalogue task with everything the labour arithmetic needs. */
export interface ServerTask {
  id: string;
  tradeId: string;
  name: string;
  unit: string;
  hoursPerUnit: number;
  crewSize: number;
  minimumHours: number;
  /** `yours` exactly when the task is in the editor's store. */
  source: 'seed' | 'yours';
  notes?: string;
}

const num = (value: unknown, fallback = 0): number => {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};

function taskFrom(id: string, primary: any, fallback: any, source: 'seed' | 'yours'): ServerTask {
  const pick = (key: string) => (primary?.[key] ?? fallback?.[key]);
  return {
    id,
    tradeId: String(pick('tradeId') ?? ''),
    name: String(pick('name') ?? id),
    unit: String(pick('unit') ?? 'each'),
    hoursPerUnit: num(pick('hoursPerUnit')),
    // One, not zero. A crew size of zero would divide by nothing when working
    // out how many days a task occupies.
    crewSize: Math.max(1, num(pick('crewSize'), 1)),
    minimumHours: num(pick('minimumHours')),
    source,
    notes: pick('notes') ? String(pick('notes')) : undefined,
  };
}

/**
 * The published catalogue with anybody's edits laid over it.
 *
 * An edited task WINS and is never overwritten by a later publish — that is the
 * whole point of recording the source. A task somebody added that was never in
 * the published book still appears, so the catalogue can grow from either end.
 */
export function mergeServerCatalogue(published: any, edited: any): ServerTask[] {
  const editedById = new Map<string, any>();
  for (const task of (edited?.tasks || [])) {
    if (task?.id) editedById.set(String(task.id), task);
  }

  const out: ServerTask[] = [];
  const seen = new Set<string>();

  for (const task of (published?.tasks || [])) {
    const id = String(task?.id || '');
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const mine = editedById.get(id);
    // The edit wins field by field, falling back to the published figure, so a
    // partial edit does not blank the rest of the task.
    out.push(taskFrom(id, mine, task, mine ? 'yours' : 'seed'));
  }

  for (const [id, task] of editedById) {
    if (seen.has(id)) continue;
    out.push(taskFrom(id, task, null, 'yours'));
  }

  return out;
}

/** One task by id, or null — never a guess at a near match. */
export function findTask(tasks: ServerTask[], taskId: string): ServerTask | null {
  return (tasks || []).find((t) => t.id === taskId) || null;
}
