/** Internal notes attached to a canonical project/work-request record. */
import { useState, useEffect } from 'react';
import { X, MessageSquare, Plus, Clock, User, Edit2, Trash2, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { supabase } from '../lib/supabase';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-57095a78`;

interface Note { id: string; content: string; author: string; authorId?: string; createdAt: string; updatedAt?: string; }
interface EmployeeNotesProps { project: any; onClose: () => void; onSave?: (notes: Note[]) => void; }

export function EmployeeNotes({ project, onClose, onSave }: EmployeeNotesProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const headers = async (json = false) => {
    const { data: { session } } = await supabase.auth.getSession();
    return { Authorization: `Bearer ${session?.access_token || publicAnonKey}`, ...(json ? { 'Content-Type': 'application/json' } : {}) };
  };
  const commit = (next: Note[]) => { setNotes(next); onSave?.(next); };

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${SERVER}/work-requests/${encodeURIComponent(project.id)}/notes`, { headers: await headers() });
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.error || 'Unable to load project notes.');
        if (active) commit(Array.isArray(data.notes) ? data.notes : []);
      } catch (error: any) {
        if (active) toast.error(error.message || 'Unable to load project notes.');
      } finally { if (active) setLoading(false); }
    };
    load(); return () => { active = false; };
  }, [project.id]);

  const handleAddNote = async () => {
    const content = newNoteContent.trim();
    if (!content) return toast.error('Note content cannot be empty');
    setSaving(true);
    try {
      const response = await fetch(`${SERVER}/work-requests/${encodeURIComponent(project.id)}/notes`, { method: 'POST', headers: await headers(true), body: JSON.stringify({ content }) });
      const data = await response.json(); if (!response.ok || !data.success) throw new Error(data.error || 'Unable to add note.');
      commit([data.note, ...notes]); setNewNoteContent(''); toast.success('Project note saved');
    } catch (error: any) { toast.error(error.message || 'Unable to add note.'); } finally { setSaving(false); }
  };
  const handleEditNote = (note: Note) => { setEditingId(note.id); setEditContent(note.content); };
  const handleSaveEdit = async (noteId: string) => {
    const content = editContent.trim(); if (!content) return toast.error('Note content cannot be empty'); setSaving(true);
    try {
      const response = await fetch(`${SERVER}/work-requests/${encodeURIComponent(project.id)}/notes/${encodeURIComponent(noteId)}`, { method: 'PUT', headers: await headers(true), body: JSON.stringify({ content }) });
      const data = await response.json(); if (!response.ok || !data.success) throw new Error(data.error || 'Unable to update note.');
      commit(notes.map(note => note.id === noteId ? data.note : note)); setEditingId(null); setEditContent(''); toast.success('Project note updated');
    } catch (error: any) { toast.error(error.message || 'Unable to update note.'); } finally { setSaving(false); }
  };
  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Delete this project note?')) return; setSaving(true);
    try {
      const response = await fetch(`${SERVER}/work-requests/${encodeURIComponent(project.id)}/notes/${encodeURIComponent(noteId)}`, { method: 'DELETE', headers: await headers() });
      const data = await response.json(); if (!response.ok || !data.success) throw new Error(data.error || 'Unable to delete note.');
      commit(notes.filter(note => note.id !== noteId)); toast.success('Project note deleted');
    } catch (error: any) { toast.error(error.message || 'Unable to delete note.'); } finally { setSaving(false); }
  };

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
    <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-xl border border-gray-700 bg-gradient-to-br from-gray-900 to-black shadow-2xl">
      <div className="flex items-center justify-between bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-4">
        <div className="flex items-center gap-3"><MessageSquare className="h-6 w-6 text-white" /><div><h2 className="text-xl font-bold text-white">Employee Notes</h2><p className="text-sm text-white/80">{project.itemNumber} - {project.title}</p></div></div>
        <button onClick={onClose} className="rounded-lg p-2 transition-colors hover:bg-white/20" aria-label="Close notes"><X className="h-5 w-5 text-white" /></button>
      </div>
      <div className="max-h-[calc(90vh-80px)] overflow-y-auto p-6">
        <div className="mb-6 rounded-lg border border-gray-700 bg-black/50 p-4"><h3 className="mb-3 flex items-center gap-2 text-lg font-bold text-white"><Plus className="h-5 w-5 text-[#ea580c]" />Add New Note</h3>
          <textarea value={newNoteContent} onChange={(e) => setNewNoteContent(e.target.value)} placeholder="Enter an internal project note..." disabled={loading || saving} className="mb-3 min-h-[100px] w-full rounded-lg border border-gray-600 bg-black/50 px-4 py-3 text-white placeholder-gray-500 focus:border-[#ea580c] focus:outline-none disabled:opacity-50" />
          <button onClick={handleAddNote} disabled={loading || saving} className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#ea580c] to-[#fb923c] px-4 py-2 font-bold text-white transition-all hover:from-[#fb923c] hover:to-[#ea580c] disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}{saving ? 'Saving…' : 'Add Note'}</button>
        </div>
        <div className="space-y-4">{loading ? <div className="flex justify-center p-8 text-gray-400"><Loader2 className="h-6 w-6 animate-spin" /></div> : notes.length === 0 ? <div className="rounded-lg border border-gray-700 bg-black/30 p-8 text-center"><MessageSquare className="mx-auto mb-3 h-12 w-12 text-gray-600" /><p className="text-gray-400">No notes yet. Add your first note above.</p></div> : notes.map((note) => <div key={note.id} className="rounded-lg border border-gray-700 bg-black/50 p-4 transition-colors hover:border-gray-600">{editingId === note.id ? <div><textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} disabled={saving} className="mb-3 min-h-[100px] w-full rounded-lg border border-gray-600 bg-black/50 px-4 py-3 text-white focus:border-[#ea580c] focus:outline-none" /><div className="flex gap-2"><button onClick={() => handleSaveEdit(note.id)} disabled={saving} className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700 disabled:opacity-50"><Save className="h-4 w-4" />Save</button><button onClick={() => { setEditingId(null); setEditContent(''); }} disabled={saving} className="flex items-center gap-2 rounded-lg bg-gray-700 px-4 py-2 font-semibold text-white hover:bg-gray-600">Cancel</button></div></div> : <><div className="mb-3 flex items-start justify-between"><div className="flex items-center gap-2 text-sm text-gray-400"><User className="h-4 w-4" /><span className="font-semibold">{note.author}</span><span>•</span><Clock className="h-3 w-3" /><span>{new Date(note.createdAt).toLocaleString()}</span>{note.updatedAt && <><span>•</span><span className="text-yellow-400">(edited)</span></>}</div><div className="flex gap-2"><button onClick={() => handleEditNote(note)} disabled={saving} className="rounded-lg p-2 hover:bg-gray-700" title="Edit note"><Edit2 className="h-4 w-4 text-blue-400" /></button><button onClick={() => handleDeleteNote(note.id)} disabled={saving} className="rounded-lg p-2 hover:bg-gray-700" title="Delete note"><Trash2 className="h-4 w-4 text-red-400" /></button></div></div><div className="whitespace-pre-wrap text-white">{note.content}</div></>}</div>)}</div>
      </div>
    </div>
  </div>;
}
