/**
 * The current job, as React state.
 *
 * Split from currentJob.ts so the store stays importable by anything that is
 * not a component — a plain module cannot import a hook without dragging React
 * in behind it.
 */
import { useEffect, useState } from 'react';
import { readCurrentJob, onCurrentJobChange, type CurrentJob } from './currentJob';

export function useCurrentJob(): CurrentJob | null {
  const [job, setJob] = useState<CurrentJob | null>(() => readCurrentJob());

  useEffect(() => {
    // Re-read once on mount as well as on change: a screen can mount after the
    // job was set by another screen, and would otherwise show the value it read
    // during its very first render.
    setJob(readCurrentJob());
    return onCurrentJobChange(() => setJob(readCurrentJob()));
  }, []);

  return job;
}
