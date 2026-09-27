/**
 * pipelineMerge — reconciling the two things that both describe a job.
 *
 * THE TWO SOURCES
 *
 * A job reaches the board twice. Once as a WORK REQUEST, which is what the
 * customer submitted and carries their files, their description and the date
 * they raised it — and whose `status` the board turns into a starting stage.
 * Once as a PIPELINE ITEM, which is what staff have since done to it: the
 * quote, the contract, and the stage somebody deliberately moved it to.
 *
 * WHO OWNS THE STAGE
 *
 * The pipeline item does, whenever one exists. A stage derived from a work
 * request's status is a guess made for a job nobody has touched yet; a stage on
 * the pipeline item is a decision somebody made on purpose, and a decision beats
 * a guess. The work request only ever seeds the stage, and only when there is
 * nothing stored to seed it from.
 *
 * WHAT THE OLD MERGE DID INSTEAD
 *
 *     serverItems.forEach(i => allById.set(i.id, i));
 *     kvItems.forEach(i => allById.set(i.id, i));   // KV wins
 *
 * The stored record REPLACED the work-request record whole. It got the stage
 * right by accident and lost everything the stored copy happened not to carry —
 * the customer's photographs, videos and blueprints among them, because
 * `submission` is built from the work request and a thin stored record simply
 * does not have it. Opening a saved job could therefore show fewer of the
 * customer's own files than opening an unsaved one, with nothing to say why.
 *
 * So this is a field-wise merge with one explicit exception, rather than a
 * replacement with an implicit one.
 */

/** A value the stored record actually carries, as opposed to a gap in it. */
const carried = (value: unknown): boolean =>
  value !== undefined && value !== null && value !== '' &&
  !(Array.isArray(value) && value.length === 0);

/**
 * One job, from the work request that raised it and the pipeline record staff
 * have since written.
 *
 * `seed` is the work-request-derived item; `stored` is the pipeline item.
 * Either may be missing.
 */
export function mergeItem<T extends Record<string, any>>(
  seed: T | undefined,
  stored: T | undefined,
): T {
  if (!stored) return seed as T;
  if (!seed) return stored;

  const out: Record<string, any> = { ...seed };

  for (const [key, value] of Object.entries(stored)) {
    if (carried(value)) out[key] = value;
  }

  /**
   * The stage is the stored record's even when it looks empty.
   *
   * Not folded into the loop above, because "" and undefined are meaningful
   * here in a way they are not for a phone number: a stored item whose stage
   * failed to write should not quietly inherit a stage derived from a status,
   * which is how the two sources drift apart in the first place. Falling back
   * to the seed is correct, but it has to be a decision rather than a side
   * effect of a truthiness test.
   */
  out.stage = carried(stored.stage) ? stored.stage : seed.stage;

  return out as T;
}

/**
 * Every job on the board, each reconciled once.
 *
 * Work requests seed; stored pipeline items decide. A stored item with no work
 * request behind it still appears — a job can be created straight into the
 * pipeline — and a work request with nothing stored appears as it always did.
 */
export function mergePipeline<T extends Record<string, any>>(
  fromWorkRequests: T[],
  fromPipelineStore: T[],
): T[] {
  const byId = new Map<string, T>();

  for (const item of fromWorkRequests || []) {
    const id = String(item?.id || '');
    if (id) byId.set(id, item);
  }

  for (const stored of fromPipelineStore || []) {
    const id = String(stored?.id || '');
    if (!id) continue;
    byId.set(id, mergeItem(byId.get(id), stored));
  }

  return [...byId.values()];
}
