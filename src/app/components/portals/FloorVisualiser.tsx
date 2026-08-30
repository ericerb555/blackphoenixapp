/**
 * See a different floor in your own room.
 *
 * WHO THIS IS FOR
 *
 * A customer, in their own portal, on a phone, standing in the room. That
 * decides everything about it: one photograph, a few floors to choose from, and
 * no vocabulary they would have to look up. Nothing here asks for a square
 * footage or a material family — those are our words, not theirs.
 *
 * WHAT IT IS HONEST ABOUT
 *
 * It is a visualisation of their room, not a photograph of the finished floor,
 * and it says so under every image. Colour and grain vary between batches, so
 * the picture is for choosing a direction and a sample is for choosing a floor.
 * Selling from an image without saying that is how somebody ends up
 * disappointed on the day it goes down.
 *
 * The renders cost real money per press, which is why the allowance is shown
 * before the button rather than discovered by hitting a wall.
 */

import { useCallback, useRef, useState } from 'react';
import { Camera, Loader2, Check, Image as ImageIcon, Info } from 'lucide-react';
import { toast } from 'sonner';
import { FLOOR_FINISHES, floorRenderPrompt, type FloorFinish } from '../../lib/floorFinishes';
import { fileToDataUrl, framesFromVideo, dataUrlBytes } from '../../lib/imageCapture';
import { isVideoFile } from '../../lib/localFolder';
import { supabase } from '../../lib/supabase';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;
/** Comfortably inside the edge request limit. */
const MAX_PAYLOAD_BYTES = 4_000_000;
/** Three at a time: enough to compare, and it keeps the spend obvious. */
const AT_A_TIME = 3;

async function headers() {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session?.access_token || publicAnonKey}`,
  };
}

const card = 'rounded-2xl border border-[#2A2A2A] bg-[#111] p-4';

export default function FloorVisualiser({ accent = 'orange' }: { accent?: string }) {
  const [photo, setPhoto] = useState<string | null>(null);
  const [chosen, setChosen] = useState<string[]>(['oak-natural', 'oak-grey', 'tile-porcelain-grey']);
  const [results, setResults] = useState<any[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [liked, setLiked] = useState<string | null>(null);
  const [disclaimer, setDisclaimer] = useState<string>('');
  const input = useRef<HTMLInputElement>(null);

  const toggle = (id: string) =>
    setChosen(c => c.includes(id)
      ? c.filter(x => x !== id)
      // Capped rather than queued: three is what fits side by side on a phone,
      // and it keeps what each press costs predictable.
      : c.length >= AT_A_TIME ? c : [...c, id]);

  const takePhoto = async (files: FileList | null) => {
    const f = files?.[0];
    if (!f) return;
    setBusy('Reading your photo');
    try {
      // A video is welcome — people film a room more naturally than they
      // photograph one — and the clearest frame is as good as a photo.
      const shot = isVideoFile(f) ? (await framesFromVideo(f, 1))[0] : await fileToDataUrl(f);
      if (!shot) throw new Error('That file could not be read.');
      if (dataUrlBytes(shot) > MAX_PAYLOAD_BYTES) throw new Error('That photo is too large. Try one taken on your phone.');
      setPhoto(shot);
      setResults(null);
      setLiked(null);
    } catch (err: any) {
      toast.error(err?.message || 'That photo could not be read.');
    } finally {
      setBusy(null);
    }
  };

  const render = useCallback(async () => {
    if (!photo || !chosen.length) return;
    setBusy(`Putting ${chosen.length} floors in your room`);
    setResults(null);
    try {
      const looks = chosen
        .map(id => FLOOR_FINISHES.find(f => f.id === id))
        .filter(Boolean)
        .map((f: FloorFinish | undefined) => ({
          id: f!.id, name: f!.label, pitch: f!.pitch, material: f!.material,
          prompt: floorRenderPrompt(f!),
        }));

      const res = await fetch(`${SERVER}/house-capture/floor-looks`, {
        method: 'POST', headers: await headers(),
        body: JSON.stringify({ photo, looks }),
      });
      const json = await res.json();
      // 429 is the allowance, and its message already explains itself.
      if (!res.ok) throw new Error(json?.error || `Could not render those floors (${res.status}).`);
      setResults(json.looks || []);
      setDisclaimer(json.disclaimer || '');
      if (json.failed > 0) toast.error(`${json.rendered} of ${json.rendered + json.failed} came out.`);
    } catch (err: any) {
      toast.error(err?.message || 'Could not render those floors.');
    } finally {
      setBusy(null);
    }
  }, [photo, chosen]);

  return (
    <div className="space-y-4">
      <div className={card}>
        <h2 className="flex items-center gap-2 text-sm font-bold text-white">
          <ImageIcon className="h-4 w-4 text-[#ea580c]" /> See a new floor in your room
        </h2>
        <p className="mt-1 text-xs text-gray-400">
          Take a photo of the room — stand in a doorway or a corner so you can see plenty of the
          floor — and pick up to {AT_A_TIME} floors to try.
        </p>

        <button onClick={() => input.current?.click()} disabled={!!busy}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-[#ea580c]/40 bg-[#ea580c]/10 px-4 py-3 text-sm font-bold text-[#ea580c] transition hover:bg-[#ea580c]/20 disabled:opacity-40">
          {busy === 'Reading your photo' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
          {photo ? 'Use a different photo' : 'Take or choose a photo'}
        </button>
        <input ref={input} type="file" accept="image/*,video/*" capture="environment" className="hidden"
          onChange={e => { takePhoto(e.target.files); e.currentTarget.value = ''; }} />

        {photo && (
          <img src={photo} alt="Your room" className="mt-3 w-full rounded-xl border border-[#2A2A2A]" />
        )}
      </div>

      {photo && (
        <div className={card}>
          <h3 className="mb-2 text-sm font-bold text-white">Which floors shall we try?</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {FLOOR_FINISHES.map(f => {
              const on = chosen.includes(f.id);
              const full = !on && chosen.length >= AT_A_TIME;
              return (
                <button key={f.id} onClick={() => toggle(f.id)} disabled={full}
                  className={`rounded-xl border p-3 text-left transition ${
                    on ? 'border-[#ea580c] bg-[#ea580c]/10' : 'border-[#2A2A2A] hover:border-white/20'
                  } ${full ? 'opacity-40' : ''}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-white">{f.label}</span>
                    {on && <Check className="h-4 w-4 shrink-0 text-[#ea580c]" />}
                  </div>
                  <p className="mt-0.5 text-[11px] text-gray-500">{f.pitch}</p>
                </button>
              );
            })}
          </div>

          <button onClick={render} disabled={!!busy || !chosen.length}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#ea580c] px-4 py-3 font-bold text-white transition hover:bg-orange-500 disabled:opacity-50">
            {busy && busy !== 'Reading your photo' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {busy && busy !== 'Reading your photo' ? busy : `Show me ${chosen.length} floor${chosen.length === 1 ? '' : 's'}`}
          </button>
          <p className="mt-2 text-[11px] text-gray-600">
            Takes about a minute. You can do this a few times — if you run out, just ask us.
          </p>
        </div>
      )}

      {results && results.length > 0 && (
        <div className={card}>
          <h3 className="mb-3 text-sm font-bold text-white">Your room</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((r: any) => (
              <div key={r.id} className={`overflow-hidden rounded-xl border transition ${
                liked === r.id ? 'border-[#ea580c]' : 'border-[#2A2A2A]'
              }`}>
                {r.url ? (
                  <img src={r.url} alt={r.name} className="aspect-[4/3] w-full object-cover" />
                ) : (
                  <div className="flex aspect-[4/3] w-full items-center justify-center px-3 text-center">
                    <span className="text-[11px] text-red-400">{r.error || 'This one did not come out.'}</span>
                  </div>
                )}
                <div className="p-3">
                  <p className="text-xs font-bold text-white">{r.name}</p>
                  <p className="mt-0.5 text-[11px] text-gray-500">{r.pitch}</p>
                  {r.url && (
                    <button onClick={() => { setLiked(r.id); toast.success(`We'll note that you like ${r.name}.`); }}
                      className={`mt-2 w-full rounded-lg px-2 py-1.5 text-[11px] font-bold transition ${
                        liked === r.id ? 'bg-[#ea580c] text-white' : 'border border-white/10 text-gray-300 hover:bg-white/5'
                      }`}>
                      {liked === r.id ? 'This is the one' : 'I like this one'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/*
            Said under the pictures, not in small print elsewhere. Choosing a
            floor from a screen and choosing it from a sample are different
            acts, and the difference shows up on the day it goes down.
          */}
          <p className="mt-3 flex gap-2 text-[11px] text-gray-500">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {disclaimer || 'A visualisation of your room, not a photograph of the finished floor.'}
          </p>

          {liked && (
            <p className="mt-2 text-[11px] text-[#ea580c]">
              Noted. Mention it when we next speak and we will get a sample to you.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
