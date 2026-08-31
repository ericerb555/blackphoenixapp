/**
 * The stages of the design centre, in one place.
 *
 * This union was written out separately in five files. Adding the scope stage
 * meant four of them silently disagreed with the page passing the value, which
 * the type checker caught immediately — and would not have caught at all a
 * week ago, because it was not running.
 *
 * One declaration, so the next stage added is added once.
 */
export type DesignStage = 'capture' | 'design' | 'scope' | 'price' | 'documents';
