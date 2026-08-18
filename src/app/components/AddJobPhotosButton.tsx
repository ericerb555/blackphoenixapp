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
import { useRef, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { projectId } from '../utils/supabase/info';
import { supabase } from '../lib/supabase';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

export default function AddJobPhotosButton({
  label = 'Add job photos',
  category = 'Recent Projects',
  className = '',
  compact = false,
  onDone,
}: {
  label?: string;
  /** Where these land in the library. Job sites default to recent work. */
  category?: string;
  className?: string;
  compact?: boolean;
  onDone?: (added: number) => void;
}) {
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

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
      );
    }
    if (failures.length) {
      toast.error(`${failures.length} could not be added: ${failures[0]}`);
    }
    onDone?.(ok);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={busy}
        title="Photograph the job — stays private until an admin publishes it"
        className={
          className ||
          `flex items-center justify-center gap-2 rounded-xl font-semibold text-white disabled:opacity-40 ${
            compact ? 'px-3 py-2 text-xs' : 'px-4 py-3 text-sm'
          }`
        }
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
