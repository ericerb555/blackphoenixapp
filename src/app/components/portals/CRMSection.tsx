/**
 * CRM Section — shared across Property Manager, Condo Manager, and Landlord portals.
 * Lets them upload contacts, create tenant/owner records, log interactions, and manage relationships.
 */
import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { projectId } from '../../utils/supabase/info';
import { toast } from 'sonner@2.0.3';
import {
  Users, Plus, Search, Upload, Phone, Mail, MapPin,
  Edit2, Trash2, MessageSquare, Calendar, FileText,
  ChevronDown, ChevronUp, CheckCircle, Clock, Star,
  Download, Filter,
} from 'lucide-react';

interface Contact {
  id: string;
  name: string;
  type: 'tenant' | 'owner' | 'vendor' | 'prospect';
  email: string;
  phone: string;
  unit?: string;
  property?: string;
  status: 'active' | 'inactive' | 'prospect';
  notes: string;
  lastContact: string;
  tags: string[];
  createdAt: string;
}

interface Interaction {
  id: string;
  contactId: string;
  type: 'call' | 'email' | 'meeting' | 'note';
  subject: string;
  notes: string;
  date: string;
}

const TYPE_COLORS: Record<string, string> = {
  tenant: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  owner: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  vendor: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  prospect: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
};

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-500/20 text-green-400',
  inactive: 'bg-gray-500/20 text-gray-400',
  prospect: 'bg-yellow-500/20 text-yellow-400',
};

interface Props {
  portalType: string;
}

export default function CRMSection({ portalType }: Props) {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [loading, setLoading] = useState(true);
  const api = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/portal-crm/${portalType}`;

  async function request(path = '', options: RequestInit = {}) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('Sign in is required to manage CRM records.');
    const response = await fetch(`${api}${path}`, { ...options, headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json', ...(options.headers || {}) } });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.success) throw new Error(payload.error || 'CRM request failed.');
    return payload;
  }

  useEffect(() => {
    let active = true;
    if (!user?.id) { setContacts([]); setInteractions([]); setLoading(false); return; }
    setLoading(true);
    void request().then((payload) => { if (active) { setContacts(payload.contacts || []); setInteractions(payload.interactions || []); } })
      .catch((error) => { if (active) toast.error(error.message || 'Could not load CRM records.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user?.id, portalType]);

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showInteractionModal, setShowInteractionModal] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [expandedContact, setExpandedContact] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState('');

  const [form, setForm] = useState<Partial<Contact>>({
    name: '', type: 'tenant', email: '', phone: '', unit: '', property: '', status: 'active', notes: '', tags: [],
  });
  const [tagInput, setTagInput] = useState('');
  const [interForm, setInterForm] = useState({ type: 'note' as any, subject: '', notes: '' });

  const filtered = contacts.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      (c.unit || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.property || '').toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === 'all' || c.type === filterType;
    return matchSearch && matchType;
  });

  async function saveContact() {
    if (!form.name?.trim()) { toast.error('Name is required.'); return; }
    try {
      const payload = await request('/contacts', { method: 'POST', body: JSON.stringify(form) });
      setContacts((current) => [payload.contact, ...current]);
      toast.success('Contact added to your shared CRM.'); setShowAddModal(false);
      setForm({ name: '', type: 'tenant', email: '', phone: '', unit: '', property: '', status: 'active', notes: '', tags: [] }); setTagInput('');
    } catch (error: any) { toast.error(error.message || 'Could not add contact.'); }
  }

  async function deleteContact(id: string) {
    if (!confirm('Delete this contact and its interaction history?')) return;
    try { await request(`/contacts/${encodeURIComponent(id)}`, { method: 'DELETE' }); setContacts((current) => current.filter((contact) => contact.id !== id)); setInteractions((current) => current.filter((interaction) => interaction.contactId !== id)); toast.success('Contact removed.'); }
    catch (error: any) { toast.error(error.message || 'Could not remove contact.'); }
  }

  async function logInteraction() {
    if (!selectedContact || !interForm.subject) { toast.error('Subject is required.'); return; }
    try {
      const payload = await request(`/contacts/${encodeURIComponent(selectedContact.id)}/interactions`, { method: 'POST', body: JSON.stringify(interForm) });
      setInteractions((current) => [payload.interaction, ...current]); setContacts((current) => current.map((contact) => contact.id === selectedContact.id ? payload.contact : contact));
      toast.success('Interaction logged to the shared CRM.'); setShowInteractionModal(false); setInterForm({ type: 'note', subject: '', notes: '' });
    } catch (error: any) { toast.error(error.message || 'Could not log interaction.'); }
  }

  async function handleImport() {
    const lines = importText.split('\n').filter((line) => line.trim());
    if (!lines.length) { toast.error('Add at least one CSV line to import.'); return; }
    try {
      const imported = await Promise.all(lines.map(async (line) => {
        const [name, email, phone, type, unit, property] = line.split(',').map((value) => value.trim());
        const payload = await request('/contacts', { method: 'POST', body: JSON.stringify({ name: name || 'Unknown', email, phone, type: ['tenant', 'owner', 'vendor', 'prospect'].includes(type) ? type : 'tenant', unit, property, status: 'active', notes: 'Imported contact', tags: ['Imported'] }) });
        return payload.contact as Contact;
      }));
      setContacts((current) => [...imported, ...current]); toast.success(`Imported ${imported.length} contacts to your shared CRM.`); setShowImport(false); setImportText('');
    } catch (error: any) { toast.error(error.message || 'Import stopped. Please check the CSV rows and try again.'); }
  }

  const contactInteractions = (id: string) => interactions.filter(i => i.contactId === id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-orange-400" /> CRM — Contacts & Relationships
          </h2>
          <p className="text-gray-400 text-sm mt-0.5">Manage tenants, owners, vendors, and prospects in one place</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowImport(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#1A1A1A] border border-[#2A2A2A] hover:border-orange-500/40 text-gray-300 hover:text-white rounded-lg text-sm transition">
            <Upload className="w-4 h-4" /> Import CSV
          </button>
          <button onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-lg text-sm font-bold transition hover:opacity-90 shadow-lg shadow-orange-500/20">
            <Plus className="w-4 h-4" /> Add Contact
          </button>
        </div>
      </div>

      {loading && <p className="text-sm text-gray-400">Loading your shared CRM…</p>}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Tenants', count: contacts.filter(c => c.type === 'tenant').length, color: 'text-blue-400' },
          { label: 'Owners', count: contacts.filter(c => c.type === 'owner').length, color: 'text-purple-400' },
          { label: 'Vendors', count: contacts.filter(c => c.type === 'vendor').length, color: 'text-orange-400' },
          { label: 'Prospects', count: contacts.filter(c => c.type === 'prospect').length, color: 'text-yellow-400' },
        ].map(s => (
          <div key={s.label} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4 text-center">
            <p className={`text-2xl font-black mb-1 ${s.color}`}>{s.count}</p>
            <p className="text-gray-500 text-sm">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Search + Filter */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search contacts…"
            className="w-full pl-9 pr-4 py-2.5 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white text-sm outline-none focus:border-orange-500 placeholder-gray-600" />
        </div>
        <div className="flex gap-2">
          {['all', 'tenant', 'owner', 'vendor', 'prospect'].map(t => (
            <button key={t} onClick={() => setFilterType(t)}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition capitalize ${filterType === t ? 'bg-orange-600 text-white' : 'bg-[#1A1A1A] border border-[#2A2A2A] text-gray-400 hover:text-white'}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Contact list */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-12 text-center">
            <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 font-medium mb-1">No contacts found</p>
            <p className="text-gray-600 text-sm">Add your first contact or import from CSV</p>
          </div>
        ) : filtered.map(contact => (
          <div key={contact.id} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl overflow-hidden hover:border-orange-500/30 transition">
            <div className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-600 to-orange-700 flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">
                  {contact.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-0.5">
                    <p className="font-semibold text-white">{contact.name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${TYPE_COLORS[contact.type]}`}>{contact.type}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_COLORS[contact.status]}`}>{contact.status}</span>
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                    {contact.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{contact.email}</span>}
                    {contact.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{contact.phone}</span>}
                    {contact.unit && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />Unit {contact.unit}</span>}
                    {contact.property && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{contact.property}</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => { setSelectedContact(contact); setShowInteractionModal(true); }}
                  className="p-1.5 bg-[#2A2A2A] hover:bg-orange-500/20 hover:text-orange-400 text-gray-400 rounded-lg transition" title="Log interaction">
                  <MessageSquare className="w-4 h-4" />
                </button>
                <button onClick={() => setExpandedContact(expandedContact === contact.id ? null : contact.id)}
                  className="p-1.5 bg-[#2A2A2A] hover:bg-[#353535] text-gray-400 hover:text-white rounded-lg transition">
                  {expandedContact === contact.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                <button onClick={() => void deleteContact(contact.id)}
                  className="p-1.5 bg-[#2A2A2A] hover:bg-red-500/20 hover:text-red-400 text-gray-400 rounded-lg transition">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Expanded details */}
            {expandedContact === contact.id && (
              <div className="border-t border-[#2A2A2A] p-4 space-y-4 bg-[#0A0A0A]">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500 text-xs font-semibold mb-1">NOTES</p>
                    <p className="text-gray-300">{contact.notes || 'No notes yet'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs font-semibold mb-1">TAGS</p>
                    <div className="flex flex-wrap gap-1.5">
                      {contact.tags.map(tag => (
                        <span key={tag} className="text-xs px-2 py-0.5 bg-[#2A2A2A] text-gray-400 rounded-full">{tag}</span>
                      ))}
                      {contact.tags.length === 0 && <span className="text-gray-600 text-xs">No tags</span>}
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-gray-500 text-xs font-semibold mb-2">INTERACTION HISTORY ({contactInteractions(contact.id).length})</p>
                  {contactInteractions(contact.id).length === 0 ? (
                    <p className="text-gray-600 text-xs">No interactions logged yet</p>
                  ) : (
                    <div className="space-y-2">
                      {contactInteractions(contact.id).slice(0, 5).map(inter => (
                        <div key={inter.id} className="flex items-start gap-3 bg-[#1A1A1A] rounded-lg p-3">
                          <div className="w-6 h-6 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                            {inter.type === 'call' ? <Phone className="w-3 h-3 text-orange-400" /> :
                             inter.type === 'email' ? <Mail className="w-3 h-3 text-orange-400" /> :
                             inter.type === 'meeting' ? <Calendar className="w-3 h-3 text-orange-400" /> :
                             <FileText className="w-3 h-3 text-orange-400" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-medium">{inter.subject}</p>
                            {inter.notes && <p className="text-gray-500 text-xs mt-0.5">{inter.notes}</p>}
                            <p className="text-gray-600 text-xs mt-1">{inter.date}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-gray-600 text-xs">Last contacted: {contact.lastContact} · Added: {contact.createdAt}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ADD CONTACT MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111] border border-[#2A2A2A] rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-5 border-b border-[#2A2A2A] flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Add Contact</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-white text-xl">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">Full Name <span className="text-orange-500">*</span></label>
                  <input value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Jane Smith"
                    className="w-full bg-[#0A0A0A] border border-[#2A2A2A] focus:border-orange-500 rounded-lg px-3 py-2.5 text-white text-sm outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">Type</label>
                  <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as any }))}
                    className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-3 py-2.5 text-white text-sm outline-none">
                    <option value="tenant">Tenant</option>
                    <option value="owner">Owner</option>
                    <option value="vendor">Vendor</option>
                    <option value="prospect">Prospect</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">Status</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as any }))}
                    className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-3 py-2.5 text-white text-sm outline-none">
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="prospect">Prospect</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">Email</label>
                  <input value={form.email || ''} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="jane@example.com"
                    className="w-full bg-[#0A0A0A] border border-[#2A2A2A] focus:border-orange-500 rounded-lg px-3 py-2.5 text-white text-sm outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">Phone</label>
                  <input value={form.phone || ''} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="(214) 555-0000"
                    className="w-full bg-[#0A0A0A] border border-[#2A2A2A] focus:border-orange-500 rounded-lg px-3 py-2.5 text-white text-sm outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">Unit</label>
                  <input value={form.unit || ''} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} placeholder="4B"
                    className="w-full bg-[#0A0A0A] border border-[#2A2A2A] focus:border-orange-500 rounded-lg px-3 py-2.5 text-white text-sm outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">Property</label>
                  <input value={form.property || ''} onChange={e => setForm(f => ({ ...f, property: e.target.value }))} placeholder="Harborview Condos"
                    className="w-full bg-[#0A0A0A] border border-[#2A2A2A] focus:border-orange-500 rounded-lg px-3 py-2.5 text-white text-sm outline-none" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">Notes</label>
                  <textarea value={form.notes || ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Any relevant notes…"
                    className="w-full bg-[#0A0A0A] border border-[#2A2A2A] focus:border-orange-500 rounded-lg px-3 py-2.5 text-white text-sm outline-none resize-none" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">Tags (press Enter to add)</label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {(form.tags || []).map(tag => (
                      <span key={tag} className="text-xs px-2 py-0.5 bg-orange-500/20 text-orange-400 rounded-full flex items-center gap-1">
                        {tag}
                        <button onClick={() => setForm(f => ({ ...f, tags: (f.tags || []).filter(t => t !== tag) }))} className="ml-1 text-orange-300 hover:text-white">×</button>
                      </span>
                    ))}
                  </div>
                  <input value={tagInput} onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && tagInput.trim()) { setForm(f => ({ ...f, tags: [...(f.tags || []), tagInput.trim()] })); setTagInput(''); e.preventDefault(); } }}
                    placeholder="VIP, Long-term, New…"
                    className="w-full bg-[#0A0A0A] border border-[#2A2A2A] focus:border-orange-500 rounded-lg px-3 py-2.5 text-white text-sm outline-none" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowAddModal(false)} className="flex-1 py-3 bg-[#2A2A2A] hover:bg-[#353535] rounded-lg text-sm font-semibold transition">Cancel</button>
                <button onClick={() => void saveContact()} className="flex-1 py-3 bg-gradient-to-r from-orange-600 to-orange-700 rounded-lg text-sm font-bold transition flex items-center justify-center gap-2">
                  <Plus className="w-4 h-4" /> Save Contact
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LOG INTERACTION MODAL */}
      {showInteractionModal && selectedContact && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111] border border-[#2A2A2A] rounded-2xl max-w-md w-full shadow-2xl">
            <div className="p-5 border-b border-[#2A2A2A] flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Log Interaction</h3>
                <p className="text-gray-400 text-sm">{selectedContact.name}</p>
              </div>
              <button onClick={() => setShowInteractionModal(false)} className="text-gray-400 hover:text-white text-xl">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Type</label>
                <div className="grid grid-cols-4 gap-2">
                  {[{ v: 'call', label: 'Call', icon: Phone }, { v: 'email', label: 'Email', icon: Mail }, { v: 'meeting', label: 'Meeting', icon: Calendar }, { v: 'note', label: 'Note', icon: FileText }].map(({ v, label, icon: Icon }) => (
                    <button key={v} onClick={() => setInterForm(f => ({ ...f, type: v as any }))}
                      className={`flex flex-col items-center gap-1 py-2 rounded-lg text-xs font-medium transition ${interForm.type === v ? 'bg-orange-600 text-white' : 'bg-[#0A0A0A] border border-[#2A2A2A] text-gray-400 hover:text-white'}`}>
                      <Icon className="w-4 h-4" /> {label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Subject <span className="text-orange-500">*</span></label>
                <input value={interForm.subject} onChange={e => setInterForm(f => ({ ...f, subject: e.target.value }))} placeholder="What was discussed?"
                  className="w-full bg-[#0A0A0A] border border-[#2A2A2A] focus:border-orange-500 rounded-lg px-3 py-2.5 text-white text-sm outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Notes</label>
                <textarea value={interForm.notes} onChange={e => setInterForm(f => ({ ...f, notes: e.target.value }))} rows={3} placeholder="Additional details…"
                  className="w-full bg-[#0A0A0A] border border-[#2A2A2A] focus:border-orange-500 rounded-lg px-3 py-2.5 text-white text-sm outline-none resize-none" />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowInteractionModal(false)} className="flex-1 py-3 bg-[#2A2A2A] hover:bg-[#353535] rounded-lg text-sm font-semibold transition">Cancel</button>
                <button onClick={() => void logInteraction()} className="flex-1 py-3 bg-gradient-to-r from-orange-600 to-orange-700 rounded-lg text-sm font-bold transition flex items-center justify-center gap-2">
                  <CheckCircle className="w-4 h-4" /> Log It
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CSV IMPORT MODAL */}
      {showImport && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111] border border-[#2A2A2A] rounded-2xl max-w-lg w-full shadow-2xl">
            <div className="p-5 border-b border-[#2A2A2A] flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Import Contacts from CSV</h3>
              <button onClick={() => setShowImport(false)} className="text-gray-400 hover:text-white text-xl">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-3 text-xs text-gray-400">
                <p className="font-bold text-gray-300 mb-1">CSV Format (one contact per line):</p>
                <code className="text-orange-400">Name, Email, Phone, Type (tenant/owner/vendor/prospect), Unit, Property</code>
                <p className="mt-2 text-gray-600">Example: Jane Smith, jane@email.com, (214) 555-0101, tenant, 4B, Harborview Condos</p>
              </div>
              <textarea value={importText} onChange={e => setImportText(e.target.value)} rows={8}
                placeholder="Paste your CSV data here…"
                className="w-full bg-[#0A0A0A] border border-[#2A2A2A] focus:border-orange-500 rounded-lg px-3 py-2.5 text-white text-sm outline-none resize-none font-mono" />
              <div className="flex gap-3">
                <button onClick={() => setShowImport(false)} className="flex-1 py-3 bg-[#2A2A2A] hover:bg-[#353535] rounded-lg text-sm font-semibold transition">Cancel</button>
                <button onClick={() => void handleImport()} disabled={!importText.trim()}
                  className="flex-1 py-3 bg-gradient-to-r from-orange-600 to-orange-700 rounded-lg text-sm font-bold transition disabled:opacity-50 flex items-center justify-center gap-2">
                  <Upload className="w-4 h-4" /> Import
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
