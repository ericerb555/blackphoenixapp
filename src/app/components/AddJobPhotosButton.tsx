/**
 * Add job photos — from wherever the person already is.
 *
 * The photos worth having are taken on site, by whoever is standing there, and
 * every step between the camera and the app is a photo that does not get taken.
 * So this uploads in place rather than navigating anywhere: press, pick, done.
 * On a phone the file picker offers the camera directly, which is the whole
 * point of putting it in the employee portal.
 *
 * Nothing uploaded here is public. Photos arrive hidden and only an
 * administrator can publish one to the website, so a crew member photographing
 * a half-finished bathroom cannot accidentally advertise it. The button says so
 * rather than leaving people to wonder, because someone who is unsure whether a
 * photo goes public will not upload it at all.
 */
import { useEffect, useRef, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { API_BASE_URL } from '../lib/apiConfig';

const SERVER = `${API_BASE_URL}/make-server-3eae23a6`;

export default function AddJobPhotosButton({
  label = 'Add job photos',
  category = 'Recent Projects',
  className = '',
  compact = false,
  jobId,
  jobTitle,
  onDone,
}: {
  label?: string;
  /** Where these land in the library. Job sites default to recent work. */
  category?: string;
  className?: string;
  compact?: boolean;
  /**
   * The job these photographs are of.
   *
   * Optional, and absent in the places this button is mounted without a job
   * in hand. It is sent at upload because nothing can work it out afterwards:
   * a stored photo carries a filename and a category reading "Recent
   * Projects", which is why the before-and-after tool could only ever show
   * one undifferentiated pile. A photo with no job still uploads and still
   * appears — it simply cannot be filtered to a job later.
   */
  jobId?: string | null;
  /** The job's name, stored beside the id so a picker needs no second lookup. */
  jobTitle?: string | null;
  onDone?: (added: number) => void;
}) {
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  /**
   * WHICH JOB, WHEN THE SCREEN DOES NOT KNOW.
   *
   * This button lives on three home screens — admin, employee, mobile owner —
   * and none of them has a job in hand when it is pressed. So if the caller
   * cannot say, the uploader is asked, and the answer is REMEMBERED on the
   * device.
   *
   * Remembering is the part that matters. A crew works one site for a day and
   * uploads a dozen photographs; asking every time would be the "three taps
   * to find a home for" problem the mounting note already warns about, and a
   * photo nobody takes is worse than a photo with no job on it. Picked once
   * in the morning, it rides along all day and can be changed in one tap.
   *
   * It stays optional throughout. A crew member who cannot list jobs — the
   * route is staff-only — sees no picker at all and uploads exactly as before.
   */
  const [jobs, setJobs] = useState<Array<{ id: string; label: string }>>([]);
  const [chosen, setChosen] = useState<string>('');

  const REMEMBERED = 'job-photos:last-job';

  useEffect(() => {
    // A job given by the caller wins outright; there is nothing to ask.
    if (jobId) return;
    let cancelled = false;
    void (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const token = data?.session?.access_token;
        if (!token) return;
        const res = await fetch(`${SERVER}/jobs`, { headers: { Authorization: `Bearer ${token}` } });
        // 403 is the ordinary case for a crew member, not an error worth
        // showing: they simply upload without a job, as they do today.
        if (!res.ok) return;
        const body = await res.json().catch(() => null);
        const rows = Array.isArray(body?.jobs) ? body.jobs : [];
        if (cancelled) return;
        setJobs(rows.slice(0, 60).map((j: any) => ({
          id: String(j?.id || ''),
          label: [j?.jobNumber, j?.title || j?.customerName, j?.siteAddress]
            .map((s: unknown) => String(s || '').trim()).filter(Boolean).join(' · ').slice(0, 90)
            || String(j?.id || 'Job'),
        })).filter((j: any) => j.id));

        try {
          const last = localStorage.getItem(REMEMBERED);
          if (last && rows.some((j: any) => String(j?.id) === last)) setChosen(last);
        } catch { /* private browsing; the picker just starts empty */ }
      } catch { /* offline on a job site is normal; upload still works */ }
    })();
    return () => { cancelled = true; };
  }, [jobId]);

  const activeJobId = jobId || chosen || '';
  const activeJobTitle = jobId
    ? (jobTitle || '')
    : (jobs.find((j) => j.id === chosen)?.label || '');

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    let ok = 0;
    const failures: string[] = [];

    // Sequential rather than parallel: these are phone photos over a site
    // connection, and firing ten large uploads at once is how they all fail.
    for (const file of Array.from(files)) {
      try {
        const { data } = await supabase.auth.getSession();
        const token = data?.session?.access_token;
        if (!token) { failures.push('not signed in'); break; }

        const body = new FormData();
        body.append('file', file);
        body.append('title', file.name.replace(/\.[^.]+$/, ''));
        body.append('category', category);
        if (activeJobId) body.append('jobId', String(activeJobId));
        if (activeJobTitle) body.append('jobTitle', String(activeJobTitle));

        // No content-type header: the browser has to set the multipart
        // boundary itself, and adding application/json here corrupts the body.
        const res = await fetch(`${SERVER}/gallery/upload`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body,
        });
        if (res.ok) ok++;
        else {
          const err = await res.json().catch(() => null);
          failures.push(err?.error || `HTTP ${res.status}`);
        }
      } catch (err: any) {
        failures.push(err?.message || 'upload failed');
      }
    }

    setBusy(false);
    if (ok) {
      toast.success(
        `${ok} photo${ok === 1 ? '' : 's'} added. They stay private until an admin publishes them.`,
        // Naming the job back is what makes a wrong pick visible at the moment
        // it is cheap to fix, rather than a fortnight later in the marketing
        // tool with no way to tell which bathroom this was.
        activeJobTitle ? { description: `Filed under ${activeJobTitle}` } : undefined,
      );
    }
    if (failures.length) {
      toast.error(`${failures.length} could not be added: ${failures[0]}`);
    }
    onDone?.(ok);
  };

  return (
    <>
      {/*
        Shown only when there is a list to choose from and the caller has not
        already said which job. On a crew phone that cannot list jobs this
        renders nothing and the button behaves exactly as it did.
      */}
      {!jobId && jobs.length > 0 && (
        <select
          value={chosen}
          onChange={(e) => {
            setChosen(e.target.value);
            try {
              if (e.target.value) localStorage.setItem(REMEMBERED, e.target.value);
              else localStorage.removeItem(REMEMBERED);
            } catch { /* nothing to remember with; the choice still applies now */ }
          }}
          // Full width and a real tap target: this sits above a button pressed
          // outdoors with gloves on, and a cramped select beside it would be
          // the thing nobody manages to hit.
          className="mb-2 min-h-11 w-full rounded-xl border border-white/20 bg-black/30 px-3 text-sm text-white"
          title="Which job are these photos of?"
        >
          <option value="">No particular job</option>
          {jobs.map((j) => <option key={j.id} value={j.id}>{j.label}</option>)}
        </select>
      )}
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={busy}
        title="Photograph the job — stays private until an admin publishes it"
        // min-h-11 sits OUTSIDE the `className ||` fallback deliberately. Every
        // caller that passes its own className was silently opting out of the
        // default styling, and with it the tap-target size — which is how this
        // button ended up 40px tall on a phone. It is pressed outdoors, often
        // with gloves on, and Apple's 44pt minimum exists for exactly that, so
        // it is a floor rather than a default a caller can drop by accident.
        className={`min-h-11 ${
          className ||
          `flex items-center justify-center gap-2 rounded-xl font-semibold text-white disabled:opacity-40 ${
            compact ? 'px-3 py-2 text-xs' : 'px-4 py-3 text-sm'
          }`
        }`}
        style={className ? undefined : { background: 'linear-gradient(135deg,#7c3aed,#ea580c)' }}
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
        {busy ? 'Uploading…' : label}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => { upload(e.target.files); e.target.value = ''; }}
      />
    </>
  );
}
