/**
 * Employee Notes - Internal notes for project tracking
 */

import { useState, useEffect } from 'react';
import { X, MessageSquare, Plus, Clock, User, Edit2, Trash2, Save } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface Note {
  id: string;
  content: string;
  author: string;
  createdAt: string;
  updatedAt?: string;
}

interface EmployeeNotesProps {
  project: any;
  onClose: () => void;
  onSave?: (notes: Note[]) => void;
}

export function EmployeeNotes({ project, onClose, onSave }: EmployeeNotesProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  // Load notes from localStorage on mount
  useEffect(() => {
    const storedNotes = localStorage.getItem(`project-notes-${project.id}`);
    if (storedNotes) {
      try {
        setNotes(JSON.parse(storedNotes));
      } catch (err) {
        console.error('Failed to parse notes:', err);
      }
    }
  }, [project.id]);

  // Save notes to localStorage
  const saveNotes = (updatedNotes: Note[]) => {
    localStorage.setItem(`project-notes-${project.id}`, JSON.stringify(updatedNotes));
    setNotes(updatedNotes);
    if (onSave) {
      onSave(updatedNotes);
    }
  };

  const handleAddNote = () => {
    if (!newNoteContent.trim()) {
      toast.error('Note content cannot be empty');
      return;
    }

    const newNote: Note = {
      id: `note-${Date.now()}`,
      content: newNoteContent.trim(),
      author: 'Current User', // TODO: Get from auth context
      createdAt: new Date().toISOString(),
    };

    const updatedNotes = [newNote, ...notes];
    saveNotes(updatedNotes);
    setNewNoteContent('');
    toast.success('Note added successfully');
  };

  const handleEditNote = (note: Note) => {
    setEditingId(note.id);
    setEditContent(note.content);
  };

  const handleSaveEdit = (noteId: string) => {
    if (!editContent.trim()) {
      toast.error('Note content cannot be empty');
      return;
    }

    const updatedNotes = notes.map(note =>
      note.id === noteId
        ? { ...note, content: editContent.trim(), updatedAt: new Date().toISOString() }
        : note
    );

    saveNotes(updatedNotes);
    setEditingId(null);
    setEditContent('');
    toast.success('Note updated successfully');
  };

  const handleDeleteNote = (noteId: string) => {
    if (confirm('Are you sure you want to delete this note?')) {
      const updatedNotes = notes.filter(note => note.id !== noteId);
      saveNotes(updatedNotes);
      toast.success('Note deleted successfully');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditContent('');
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-gray-900 to-black border border-gray-700 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MessageSquare className="w-6 h-6 text-white" />
            <div>
              <h2 className="text-xl font-bold text-white">Employee Notes</h2>
              <p className="text-sm text-white/80">{project.itemNumber} - {project.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          {/* Add New Note */}
          <div className="bg-black/50 border border-gray-700 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <Plus className="w-5 h-5 text-[#ea580c]" />
              Add New Note
            </h3>
            <textarea
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value)}
              placeholder="Enter your note here..."
              className="w-full bg-black/50 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#ea580c] min-h-[100px] mb-3"
            />
            <button
              onClick={handleAddNote}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-[#ea580c] to-[#fb923c] hover:from-[#fb923c] hover:to-[#ea580c] text-white rounded-lg font-bold transition-all"
            >
              <Plus className="w-4 h-4" />
              Add Note
            </button>
          </div>

          {/* Notes List */}
          <div className="space-y-4">
            {notes.length === 0 ? (
              <div className="bg-black/30 border border-gray-700 rounded-lg p-8 text-center">
                <MessageSquare className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">No notes yet. Add your first note above.</p>
              </div>
            ) : (
              notes.map((note) => (
                <div
                  key={note.id}
                  className="bg-black/50 border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition-colors"
                >
                  {editingId === note.id ? (
                    // Edit Mode
                    <div>
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full bg-black/50 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#ea580c] min-h-[100px] mb-3"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleSaveEdit(note.id)}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-all"
                        >
                          <Save className="w-4 h-4" />
                          Save
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold transition-all"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    // View Mode
                    <>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <User className="w-4 h-4" />
                          <span className="font-semibold">{note.author}</span>
                          <span>•</span>
                          <Clock className="w-3 h-3" />
                          <span>{new Date(note.createdAt).toLocaleString()}</span>
                          {note.updatedAt && (
                            <>
                              <span>•</span>
                              <span className="text-yellow-400">(edited)</span>
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEditNote(note)}
                            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                            title="Edit note"
                          >
                            <Edit2 className="w-4 h-4 text-blue-400" />
                          </button>
                          <button
                            onClick={() => handleDeleteNote(note.id)}
                            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                            title="Delete note"
                          >
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </button>
                        </div>
                      </div>
                      <div className="text-white whitespace-pre-wrap">{note.content}</div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
