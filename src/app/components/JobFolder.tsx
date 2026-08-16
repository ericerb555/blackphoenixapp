/**
 * JobFolder — open the job's folder once, and let the designer take it from there.
 *
 * Before this there were two folder pickers on the screen, each pointing at its
 * own remembered folder: one inside the house capture that wanted photos, one
 * inside the sketch reader that wanted drawings. A real job folder holds both,
 * so it had to be opened twice, and each picker showed the files the other
 * wanted alongside the ones it could use with nothing to tell them apart.
 *
 * So: one folder, sorted here, handed on to whichever reader wants each half.
 * The sort is a guess made from the path and the filename — see jobFolderSort —
 * and it is shown rather than applied silently, with the reason next to each
 * file and one click to move it. A folder is opened perhaps twice per job; the
 * few seconds of looking over what it decided are cheaper than a sketch reader
 * spending a model call on a photo of a back wall.
 */
import { useCallback, useMemo, useState } from 'react';
import { FolderOpen, Image as ImageIcon, PencilRuler, Send, Film } from 'lucide-react';
import { toast } from 'sonner';
import LocalFolderPicker from './LocalFolderPicker';
import { sortJobFiles, type SortedJobFile, type JobFileKind } from '../lib/jobFolderSort';

/** Matches what the two readers downstream will accept in one go. */
const MAX_FILES = 16;

interface Props {
  /** Handed the two piles once the operator is happy with the split. */
  onSend: (photos: File[], drawings: File[]) => void;
  busy?: boolean;
}

export default function JobFolder({ onSend, busy = false }: Props) {
  const [sorted, setSorted] = useState<SortedJobFile[]>([]);

  const take = useCallback(async (files: File[], paths: string[]) => {
    const next = sortJobFiles(files, paths);
    setSorted(next);
    const drawings = next.filter(f => f.kind === 'drawing').length;
    toast.success(
      `${next.length} file${next.length === 1 ? '' : 's'} — ${next.length - drawings} photo, ${drawings} drawing. Check the split before sending.`,
    );
  }, []);

  const flip = useCallback((path: string) => {
    setSorted(s => s.map(f => f.path === path
      ? { ...f, kind: (f.kind === 'photo' ? 'drawing' : 'photo') as JobFileKind, reason: 'moved by hand' }
      : f));
  }, []);

  const photos = useMemo(() => sorted.filter(f => f.kind === 'photo'), [sorted]);
  const drawings = useMemo(() => sorted.filter(f => f.kind === 'drawing'), [sorted]);

  const send = useCallback(() => {
    if (!sorted.length) return;
    onSend(photos.map(f => f.file), drawings.map(f => f.file));
    setSorted([]);
  }, [sorted, photos, drawings, onSend]);

  const btn = 'flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-40';

  return (
    <div className="rounded-2xl border border-[#2A2A2A] bg-[#111] p-4">
      <h2 className="text-sm font-bold text-white flex items-center gap-2 mb-1">
        <FolderOpen className="w-4 h-4 text-[#ea580c]" /> The job folder
      </h2>
      <p className="text-xs text-gray-500 mb-3">
        Open the folder for this job once — photos, clips and drawings together. Photos go to the
        house read, drawings go to the sketch read. Anything sorted wrongly can be moved before it
        is sent.
      </p>

      <LocalFolderPicker slot="job-folder" allowVideo limit={MAX_FILES} onPick={take} />

      {sorted.length > 0 && (
        <div className="mt-3 space-y-3">
          <Pile title="Site photos and clips" icon="photo" files={photos} onFlip={flip}
            empty="Nothing here — the house read needs at least one photo." />
          <Pile title="Drawings" icon="drawing" files={drawings} onFlip={flip}
            empty="No drawings found. The deck will be worked out from the photos instead." />

          <button onClick={send} disabled={busy || !sorted.length}
            className={`${btn} w-full`} style={{ background: '#ea580c', color: '#fff' }}>
            <Send className="w-4 h-4" />
            Send {photos.length} photo{photos.length === 1 ? '' : 's'} and {drawings.length} drawing
            {drawings.length === 1 ? '' : 's'}
          </button>
        </div>
      )}
    </div>
  );
}

function Pile({ title, icon, files, onFlip, empty }: {
  title: string;
  icon: 'photo' | 'drawing';
  files: SortedJobFile[];
  onFlip: (path: string) => void;
  empty: string;
}) {
  const Icon = icon === 'photo' ? ImageIcon : PencilRuler;
  return (
    <div className="rounded-xl border border-[#2A2A2A] bg-[#0A0A0A] p-3">
      <h3 className="text-xs font-bold text-white flex items-center gap-2 mb-2">
        <Icon className="w-3.5 h-3.5 text-[#ea580c]" /> {title}
        <span className="text-gray-500 font-normal">{files.length}</span>
      </h3>
      {files.length === 0 ? (
        <p className="text-[11px] text-gray-600">{empty}</p>
      ) : (
        <ul className="space-y-1">
          {files.map(f => (
            <li key={f.path} className="flex items-center gap-2 text-[11px]">
              {f.file.type.startsWith('video/') && <Film className="w-3 h-3 text-gray-500 shrink-0" />}
              <span className="text-gray-300 truncate flex-1" title={f.path}>{f.path}</span>
              <span className="text-gray-600 shrink-0 hidden sm:inline">{f.reason}</span>
              <button onClick={() => onFlip(f.path)}
                className="text-[#ea580c] hover:underline shrink-0"
                title={`Treat this as a ${icon === 'photo' ? 'drawing' : 'photo'} instead`}>
                {icon === 'photo' ? 'a drawing' : 'a photo'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
