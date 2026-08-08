/**
 * Video Studio — faceless social video creator (Syllaby-style, Path A).
 *
 * Pipeline (all real, backed by OpenAI + Supabase via /video-studio/*):
 *   topic → GPT script (hook + scenes) → per-scene DALL·E still + OpenAI TTS
 *   voiceover → browser assembles a vertical video (Ken-Burns stills + captions
 *   timed to the narration) → preview + export to WebM.
 *
 * Assembly + export run in the browser (canvas.captureStream + MediaRecorder)
 * because this environment has no server-side ffmpeg. Signed asset URLs are
 * fetched with crossOrigin="anonymous" so the canvas/audio stream isn't tainted.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent,
} from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import {
  Clapperboard, Wand2, Image as ImageIcon, Mic, Play, Square, Download,
  Loader2, Save, Trash2, Sparkles, RefreshCw, AudioLines, FileVideo,
} from 'lucide-react';
import { toast } from 'sonner';
import { publicAnonKey, projectId } from '../utils/supabase/info';
import { supabase } from '../lib/supabase';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

const VOICES = ['nova', 'alloy', 'echo', 'fable', 'onyx', 'shimmer'];
const ASPECTS: { id: string; label: string; w: number; h: number }[] = [
  { id: 'vertical', label: '9:16 Reels/Shorts', w: 1080, h: 1920 },
  { id: 'square', label: '1:1 Feed', w: 1080, h: 1080 },
  { id: 'landscape', label: '16:9 YouTube', w: 1920, h: 1080 },
];

type Scene = {
  id: string;
  narration: string;
  visualPrompt: string;
  onScreenText: string;
  seconds: number;
  imagePath: string | null;
  imageUrl: string;
  audioPath: string | null;
  audioUrl: string;
};

type Script = {
  title: string;
  hook: string;
  caption: string;
  hashtags: string[];
  scenes: Scene[];
};

type Project = Script & { id: string; topic: string; voice: string; aspect: string; updatedAt: string };

async function authToken(): Promise<string> {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || publicAnonKey;
  } catch {
    return publicAnonKey;
  }
}

async function api<T = any>(path: string, method = 'GET', body?: any): Promise<T> {
  const token = await authToken();
  const res = await fetch(`${SERVER}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, apikey: publicAnonKey },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({ success: false, error: `Bad response (${res.status})` }));
  if (!res.ok || json.success === false) {
    throw new Error(json.error || `Request to ${path} failed (${res.status})`);
  }
  return json as T;
}

// Load an <img> with CORS so it can be drawn to a capturable canvas.
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('image load failed'));
    img.src = url;
  });
}

export default function VideoStudio() {
  // Form
  const [topic, setTopic] = useState('');
  const [tone, setTone] = useState('energetic, punchy, social-first');
  const [sceneCount, setSceneCount] = useState(5);
  const [voice, setVoice] = useState('nova');
  const [aspect, setAspect] = useState('vertical');

  // Data
  const [script, setScript] = useState<Script | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId_, setProjectId_] = useState<string | null>(null);

  // Busy flags
  const [scripting, setScripting] = useState(false);
  const [buildingAll, setBuildingAll] = useState(false);
  const [sceneBusy, setSceneBusy] = useState<Record<string, string>>({});
  const [playing, setPlaying] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Playback / export refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const stopRef = useRef(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const destRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const sourcesRef = useRef<Record<string, MediaElementAudioSourceNode>>({});

  const dims = ASPECTS.find((a) => a.id === aspect) || ASPECTS[0];

  const loadProjects = useCallback(async () => {
    try {
      const { projects } = await api<{ projects: Project[] }>('/video-studio/projects');
      setProjects(projects || []);
    } catch (e) {
      console.error('Video Studio: loadProjects failed:', e);
    }
  }, []);

  useEffect(() => { loadProjects(); }, [loadProjects]);

  // --- Generation -----------------------------------------------------------
  const generateScript = async () => {
    if (!topic.trim()) { toast.error('Enter a topic or product first.'); return; }
    setScripting(true);
    try {
      const { script } = await api<{ script: Script }>('/video-studio/script', 'POST', {
        topic, tone, sceneCount, platform: dims.label,
      });
      setScript(script);
      setProjectId_(null);
      toast.success(`Script ready — ${script.scenes.length} scenes.`);
    } catch (e: any) {
      toast.error(e.message || 'Script generation failed.');
    } finally {
      setScripting(false);
    }
  };

  const setBusy = (id: string, label: string) =>
    setSceneBusy((m) => { const n = { ...m }; if (label) n[id] = label; else delete n[id]; return n; });

  const genImage = async (scene: Scene) => {
    setBusy(scene.id, 'image');
    try {
      const { path, url } = await api<{ path: string; url: string }>('/video-studio/scene-image', 'POST', {
        visualPrompt: scene.visualPrompt, aspect,
      });
      setScript((s) => s && ({ ...s, scenes: s.scenes.map((x) => x.id === scene.id ? { ...x, imagePath: path, imageUrl: url } : x) }));
    } catch (e: any) {
      toast.error(`Scene image failed: ${e.message}`);
    } finally { setBusy(scene.id, ''); }
  };

  const genVoice = async (scene: Scene) => {
    setBusy(scene.id, 'voice');
    try {
      const { path, url, estSeconds } = await api<{ path: string; url: string; estSeconds: number }>(
        '/video-studio/voiceover', 'POST', { text: scene.narration, voice },
      );
      setScript((s) => s && ({ ...s, scenes: s.scenes.map((x) => x.id === scene.id ? { ...x, audioPath: path, audioUrl: url, seconds: estSeconds || x.seconds } : x) }));
    } catch (e: any) {
      toast.error(`Voiceover failed: ${e.message}`);
    } finally { setBusy(scene.id, ''); }
  };

  const buildAllAssets = async () => {
    if (!script) return;
    setBuildingAll(true);
    try {
      for (const scene of script.scenes) {
        // Read latest state each pass so we don't regenerate what exists.
        const current = (await new Promise<Scene | undefined>((r) =>
          setScript((s) => { r(s?.scenes.find((x) => x.id === scene.id)); return s; })));
        if (!current?.imagePath) await genImage(scene);
        if (!current?.audioPath) await genVoice(scene);
      }
      toast.success('All scene assets generated.');
    } finally {
      setBuildingAll(false);
    }
  };

  // --- Canvas drawing -------------------------------------------------------
  const drawFrame = (
    ctx: CanvasRenderingContext2D, img: HTMLImageElement | null, caption: string, progress: number,
  ) => {
    const { width: W, height: H } = ctx.canvas;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    if (img) {
      // Ken-Burns: slow zoom from 1.0 → 1.08 across the scene, cover-fit.
      const zoom = 1 + 0.08 * progress;
      const scale = Math.max(W / img.width, H / img.height) * zoom;
      const dw = img.width * scale, dh = img.height * scale;
      ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
    }
    // Bottom gradient scrim for caption legibility.
    const grad = ctx.createLinearGradient(0, H * 0.55, 0, H);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.75)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, H * 0.55, W, H * 0.45);
    if (caption) {
      const fontSize = Math.round(W * 0.058);
      ctx.font = `800 ${fontSize}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      // Word-wrap.
      const words = caption.toUpperCase().split(' ');
      const lines: string[] = [];
      let line = '';
      for (const w of words) {
        const test = line ? `${line} ${w}` : w;
        if (ctx.measureText(test).width > W * 0.86 && line) { lines.push(line); line = w; }
        else line = test;
      }
      if (line) lines.push(line);
      const lh = fontSize * 1.15;
      let y = H * 0.82 - ((lines.length - 1) * lh) / 2;
      for (const l of lines) {
        ctx.lineWidth = fontSize * 0.18;
        ctx.strokeStyle = 'rgba(0,0,0,0.85)';
        ctx.strokeText(l, W / 2, y);
        ctx.fillStyle = '#fff';
        ctx.fillText(l, W / 2, y);
        y += lh;
      }
    }
  };

  // Ensure a MediaElementSource exists once per audio element (Web Audio rule).
  const wireAudio = (scene: Scene, el: HTMLAudioElement) => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
      destRef.current = audioCtxRef.current.createMediaStreamDestination();
    }
    if (!sourcesRef.current[scene.id]) {
      const src = audioCtxRef.current.createMediaElementSource(el);
      src.connect(audioCtxRef.current.destination); // audible
      src.connect(destRef.current!); // captured for export
      sourcesRef.current[scene.id] = src;
    }
  };

  // Core sequential playthrough. If `record` is set, captures to WebM.
  const runPlayback = async (record: boolean) => {
    const canvas = canvasRef.current;
    if (!canvas || !script) return;
    const scenes = script.scenes.filter((s) => s.imageUrl);
    if (!scenes.length) { toast.error('Generate scene images first.'); return; }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    stopRef.current = false;
    setPlaying(true);
    if (record) setExporting(true);

    // Preload images.
    const imgs: Record<string, HTMLImageElement> = {};
    for (const s of scenes) {
      try { imgs[s.id] = await loadImage(s.imageUrl); } catch { /* skip */ }
    }

    // Recorder setup (video from canvas + mixed audio).
    let recorder: MediaRecorder | null = null;
    const chunks: BlobPart[] = [];
    if (record) {
      const vStream = canvas.captureStream(30);
      // Touch AudioContext so the destination stream is live.
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContext();
        destRef.current = audioCtxRef.current.createMediaStreamDestination();
      }
      await audioCtxRef.current.resume().catch(() => {});
      const tracks = [...vStream.getVideoTracks(), ...(destRef.current?.stream.getAudioTracks() || [])];
      const mixed = new MediaStream(tracks);
      const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus' : 'video/webm';
      recorder = new MediaRecorder(mixed, { mimeType: mime });
      recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
      recorder.start();
    }

    const done = () => new Promise<void>((resolve) => {
      if (recorder && recorder.state !== 'inactive') {
        recorder.onstop = () => resolve();
        recorder.stop();
      } else resolve();
    });

    for (const scene of scenes) {
      if (stopRef.current) break;
      const audio = scene.audioUrl ? new Audio() : null;
      let durationMs = scene.seconds * 1000;
      if (audio) {
        audio.crossOrigin = 'anonymous';
        audio.src = scene.audioUrl;
        try {
          await new Promise<void>((res, rej) => {
            audio.onloadedmetadata = () => res();
            audio.onerror = () => rej(new Error('audio load'));
          });
          if (isFinite(audio.duration) && audio.duration > 0) durationMs = audio.duration * 1000 + 250;
          if (record) wireAudio(scene, audio);
          await audioCtxRef.current?.resume().catch(() => {});
          await audio.play().catch(() => {});
        } catch { /* silent scene */ }
      }
      const start = performance.now();
      await new Promise<void>((resolve) => {
        const tick = () => {
          if (stopRef.current) { resolve(); return; }
          const p = Math.min(1, (performance.now() - start) / durationMs);
          drawFrame(ctx, imgs[scene.id] || null, scene.onScreenText, p);
          if (p >= 1) { resolve(); return; }
          rafRef.current = requestAnimationFrame(tick);
        };
        tick();
      });
      if (audio) { audio.pause(); }
    }

    await done();
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setPlaying(false);

    if (record) {
      setExporting(false);
      if (!stopRef.current && chunks.length) {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${(script.title || 'video').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.webm`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
        toast.success('Video exported (WebM).');
      }
    }
  };

  const stopPlayback = () => {
    stopRef.current = true;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setPlaying(false);
  };

  useEffect(() => () => { stopRef.current = true; if (rafRef.current) cancelAnimationFrame(rafRef.current); }, []);

  // --- Persistence ----------------------------------------------------------
  const saveProject = async () => {
    if (!script) return;
    try {
      const { project } = await api<{ project: Project }>('/video-studio/projects', 'POST', {
        id: projectId_ || undefined, topic, voice, aspect,
        title: script.title, caption: script.caption, hashtags: script.hashtags, scenes: script.scenes,
      });
      setProjectId_(project.id);
      toast.success('Project saved.');
      loadProjects();
    } catch (e: any) {
      toast.error(e.message || 'Save failed.');
    }
  };

  const openProject = (p: Project) => {
    setScript({ title: p.title, hook: '', caption: p.caption, hashtags: p.hashtags, scenes: p.scenes });
    setTopic(p.topic); setVoice(p.voice); setAspect(p.aspect); setProjectId_(p.id);
  };

  const deleteProject = async (id: string) => {
    try {
      await api(`/video-studio/projects/${id}`, 'DELETE');
      if (projectId_ === id) { setScript(null); setProjectId_(null); }
      loadProjects();
    } catch (e: any) { toast.error(e.message || 'Delete failed.'); }
  };

  const copyCaption = () => {
    if (!script) return;
    const text = `${script.caption}\n\n${script.hashtags.map((h) => `#${h}`).join(' ')}`;
    navigator.clipboard.writeText(text).then(() => toast.success('Caption + hashtags copied.'));
  };

  const readyScenes = script?.scenes.filter((s) => s.imageUrl).length || 0;

  // --- UI -------------------------------------------------------------------
  return (
    <div className="mx-auto max-w-6xl p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-gradient-to-br from-fuchsia-500 to-indigo-600 p-2.5 text-white">
          <Clapperboard className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Video Studio</h1>
          <p className="text-sm text-muted-foreground">
            Faceless social videos — AI script, voiceover, visuals & captions. Export to WebM or drop into a campaign.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* LEFT: builder */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Wand2 className="h-5 w-5" /> 1. Script</CardTitle>
              <CardDescription>Describe the product or topic. AI writes a hook and scene-by-scene script.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Topic or product</Label>
                <Textarea
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Our new solar-powered camping lantern — waterproof, 72-hour battery, USB-C charging"
                  rows={2}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label>Tone</Label>
                  <Input value={tone} onChange={(e) => setTone(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Scenes</Label>
                  <select
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={sceneCount}
                    onChange={(e) => setSceneCount(Number(e.target.value))}
                  >
                    {[3, 4, 5, 6, 7, 8].map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Format</Label>
                  <select
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={aspect}
                    onChange={(e) => setAspect(e.target.value)}
                  >
                    {ASPECTS.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="space-y-1.5 flex-1">
                  <Label>Voice</Label>
                  <select
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={voice}
                    onChange={(e) => setVoice(e.target.value)}
                  >
                    {VOICES.map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <Button onClick={generateScript} disabled={scripting} className="mt-6">
                  {scripting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  Generate script
                </Button>
              </div>
            </CardContent>
          </Card>

          {script && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <CardTitle className="flex items-center gap-2"><FileVideo className="h-5 w-5" /> 2. Scenes</CardTitle>
                    <CardDescription>{script.title} · {readyScenes}/{script.scenes.length} scenes have visuals</CardDescription>
                  </div>
                  <Button onClick={buildAllAssets} disabled={buildingAll} variant="secondary">
                    {buildingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    Generate all assets
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {script.scenes.map((scene, i) => (
                  <div key={scene.id} className="flex gap-3 rounded-lg border p-3">
                    <div className="relative h-28 w-16 shrink-0 overflow-hidden rounded-md bg-muted">
                      {scene.imageUrl
                        ? <img src={scene.imageUrl} alt={scene.onScreenText} className="h-full w-full object-cover" crossOrigin="anonymous" />
                        : <div className="flex h-full items-center justify-center text-muted-foreground"><ImageIcon className="h-5 w-5" /></div>}
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="text-xs font-semibold text-muted-foreground">SCENE {i + 1} · {Math.round(scene.seconds)}s</div>
                      <Textarea
                        value={scene.narration}
                        onChange={(e) => setScript((s) => s && ({ ...s, scenes: s.scenes.map((x) => x.id === scene.id ? { ...x, narration: e.target.value } : x) }))}
                        rows={2}
                        className="text-sm"
                      />
                      <Input
                        value={scene.onScreenText}
                        onChange={(e) => setScript((s) => s && ({ ...s, scenes: s.scenes.map((x) => x.id === scene.id ? { ...x, onScreenText: e.target.value } : x) }))}
                        placeholder="On-screen caption"
                        className="text-sm"
                      />
                      <div className="flex flex-wrap items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => genImage(scene)} disabled={!!sceneBusy[scene.id]}>
                          {sceneBusy[scene.id] === 'image' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : scene.imageUrl ? <RefreshCw className="h-3.5 w-3.5" /> : <ImageIcon className="h-3.5 w-3.5" />}
                          {scene.imageUrl ? 'Redo image' : 'Image'}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => genVoice(scene)} disabled={!!sceneBusy[scene.id]}>
                          {sceneBusy[scene.id] === 'voice' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : scene.audioUrl ? <AudioLines className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                          {scene.audioUrl ? 'Redo voice' : 'Voice'}
                        </Button>
                        {scene.audioUrl && <audio src={scene.audioUrl} controls className="h-8" />}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* RIGHT: preview + projects */}
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Play className="h-5 w-5" /> 3. Preview & export</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="mx-auto overflow-hidden rounded-lg bg-black" style={{ width: '100%', maxWidth: dims.w >= dims.h ? 320 : 200 }}>
                <canvas
                  ref={canvasRef}
                  width={dims.w}
                  height={dims.h}
                  className="block h-auto w-full"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                {playing
                  ? <Button variant="destructive" onClick={stopPlayback} className="col-span-2"><Square className="h-4 w-4" /> Stop</Button>
                  : <>
                      <Button onClick={() => runPlayback(false)} disabled={!script || readyScenes === 0}><Play className="h-4 w-4" /> Preview</Button>
                      <Button variant="secondary" onClick={() => runPlayback(true)} disabled={!script || readyScenes === 0 || exporting}>
                        {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Export
                      </Button>
                    </>}
              </div>
              {script && (
                <div className="space-y-2 pt-2">
                  <Button variant="outline" className="w-full" onClick={copyCaption}>Copy caption + hashtags</Button>
                  <Button variant="outline" className="w-full" onClick={saveProject}><Save className="h-4 w-4" /> Save project</Button>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Export records a live playthrough to WebM. Keep this tab focused while it records.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Saved projects</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {projects.length === 0 && <p className="text-sm text-muted-foreground">No saved projects yet.</p>}
              {projects.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-2 rounded-md border p-2">
                  <button className="min-w-0 flex-1 text-left" onClick={() => openProject(p)}>
                    <div className="truncate text-sm font-medium">{p.title}</div>
                    <div className="truncate text-xs text-muted-foreground">{p.scenes.length} scenes · {p.aspect}</div>
                  </button>
                  <Button size="sm" variant="ghost" onClick={() => deleteProject(p.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
