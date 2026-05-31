/**
 * Announcement Manager Component
 * Allows admins to create, edit, and manage system-wide announcements
 */

import { useState, useEffect } from 'react';
import { Bell, Plus, Edit, Trash2, Eye, EyeOff, Calendar } from 'lucide-react';
import { StandardButton } from './ui/button';
import { TextInput, TextArea, Select, ToggleSwitch } from './ui/input';
import { Modal, ModalHeader, ModalBody, ModalFooter } from './ui/modal';
import { DataTable } from './ui/table';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import * as kv from '../supabase/functions/server/kv_store';

interface Announcement {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'alert' | 'maintenance' | 'announcement';
  priority: 'low' | 'medium' | 'high';
  active: boolean;
  dismissible: boolean;
  target_audience: 'all' | 'admins' | 'employees' | 'customers' | 'vendors';
  start_date?: string;
  end_date?: string;
  created_at: string;
  created_by: string;
}

export default function AnnouncementManager() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    type: 'info' as Announcement['type'],
    priority: 'medium' as Announcement['priority'],
    active: true,
    dismissible: true,
    target_audience: 'all' as Announcement['target_audience'],
    start_date: '',
    end_date: '',
  });

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const loadAnnouncements = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-57095a78/announcements`,
        {
          headers: { 'Authorization': `Bearer ${publicAnonKey}` }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setAnnouncements(data.announcements || []);
      }
    } catch (error) {
      console.error('Error loading announcements:', error);
      toast.error('Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.message) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const method = editingAnnouncement ? 'PUT' : 'POST';
      const url = editingAnnouncement
        ? `https://${projectId}.supabase.co/functions/v1/make-server-57095a78/announcements/${editingAnnouncement.id}`
        : `https://${projectId}.supabase.co/functions/v1/make-server-57095a78/announcements`;

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        toast.success(editingAnnouncement ? 'Announcement updated' : 'Announcement created');
        setShowModal(false);
        resetForm();
        loadAnnouncements();
      } else {
        throw new Error('Failed to save announcement');
      }
    } catch (error) {
      console.error('Error saving announcement:', error);
      toast.error('Failed to save announcement');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-57095a78/announcements/${id}`,
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${publicAnonKey}` }
        }
      );

      if (response.ok) {
        toast.success('Announcement deleted');
        loadAnnouncements();
      }
    } catch (error) {
      console.error('Error deleting announcement:', error);
      toast.error('Failed to delete announcement');
    }
  };

  const handleToggleActive = async (announcement: Announcement) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-57095a78/announcements/${announcement.id}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ ...announcement, active: !announcement.active })
        }
      );

      if (response.ok) {
        toast.success(`Announcement ${!announcement.active ? 'activated' : 'deactivated'}`);
        loadAnnouncements();
      }
    } catch (error) {
      console.error('Error toggling announcement:', error);
      toast.error('Failed to update announcement');
    }
  };

  const openEditModal = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setFormData({
      title: announcement.title,
      message: announcement.message,
      type: announcement.type,
      priority: announcement.priority,
      active: announcement.active,
      dismissible: announcement.dismissible,
      target_audience: announcement.target_audience,
      start_date: announcement.start_date || '',
      end_date: announcement.end_date || '',
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setEditingAnnouncement(null);
    setFormData({
      title: '',
      message: '',
      type: 'info',
      priority: 'medium',
      active: true,
      dismissible: true,
      target_audience: 'all',
      start_date: '',
      end_date: '',
    });
  };

  const columns = [
    { 
      key: 'title', 
      label: 'Title',
      render: (row: Announcement) => (
        <div>
          <div className="font-medium text-white">{row.title}</div>
          <div className="text-sm text-gray-400 line-clamp-1">{row.message}</div>
        </div>
      )
    },
    { 
      key: 'type', 
      label: 'Type',
      render: (row: Announcement) => (
        <span className={`px-2 py-1 rounded text-xs font-medium ${
          row.type === 'alert' ? 'bg-red-500/20 text-red-300' :
          row.type === 'maintenance' ? 'bg-orange-500/20 text-orange-300' :
          row.type === 'announcement' ? 'bg-purple-500/20 text-purple-300' :
          'bg-blue-500/20 text-blue-300'
        }`}>
          {row.type}
        </span>
      )
    },
    { 
      key: 'priority', 
      label: 'Priority',
      render: (row: Announcement) => (
        <span className={`px-2 py-1 rounded text-xs font-medium ${
          row.priority === 'high' ? 'bg-red-500/20 text-red-300' :
          row.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-300' :
          'bg-green-500/20 text-green-300'
        }`}>
          {row.priority}
        </span>
      )
    },
    { 
      key: 'target_audience', 
      label: 'Audience',
      render: (row: Announcement) => (
        <span className="capitalize text-gray-300">{row.target_audience}</span>
      )
    },
    { 
      key: 'active', 
      label: 'Status',
      render: (row: Announcement) => (
        <button
          onClick={() => handleToggleActive(row)}
          className={`flex items-center gap-2 px-2 py-1 rounded text-xs font-medium ${
            row.active ? 'bg-green-500/20 text-green-300' : 'bg-gray-500/20 text-gray-400'
          }`}
        >
          {row.active ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
          {row.active ? 'Active' : 'Inactive'}
        </button>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row: Announcement) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => openEditModal(row)}
            className="p-2 hover:bg-[#ea580c]/20 rounded transition-colors"
          >
            <Edit className="w-4 h-4 text-[#ea580c]" />
          </button>
          <button
            onClick={() => handleDelete(row.id)}
            className="p-2 hover:bg-red-500/20 rounded transition-colors"
          >
            <Trash2 className="w-4 h-4 text-red-400" />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Bell className="w-8 h-8 text-[#ea580c]" />
            Announcement Manager
          </h1>
          <p className="text-gray-400 mt-1">Create and manage system-wide announcements</p>
        </div>
        <StandardButton
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          icon={Plus}
        >
          New Announcement
        </StandardButton>
      </div>

      {/* Announcements Table */}
      <div className="bg-[#0F0F0F] border border-[#1a1a1a] rounded-lg overflow-hidden">
        <DataTable
          columns={columns}
          data={announcements}
          loading={loading}
          emptyMessage="No announcements found"
        />
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <Modal onClose={() => {
          setShowModal(false);
          resetForm();
        }}>
          <ModalHeader onClose={() => {
            setShowModal(false);
            resetForm();
          }}>
            {editingAnnouncement ? 'Edit Announcement' : 'Create Announcement'}
          </ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <TextInput
                label="Title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter announcement title"
                required
              />

              <TextArea
                label="Message"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Enter announcement message"
                rows={4}
                required
              />

              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="Type"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as Announcement['type'] })}
                  options={[
                    { value: 'info', label: 'Info' },
                    { value: 'alert', label: 'Alert' },
                    { value: 'maintenance', label: 'Maintenance' },
                    { value: 'announcement', label: 'Announcement' }
                  ]}
                />

                <Select
                  label="Priority"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as Announcement['priority'] })}
                  options={[
                    { value: 'low', label: 'Low' },
                    { value: 'medium', label: 'Medium' },
                    { value: 'high', label: 'High' }
                  ]}
                />
              </div>

              <Select
                label="Target Audience"
                value={formData.target_audience}
                onChange={(e) => setFormData({ ...formData, target_audience: e.target.value as Announcement['target_audience'] })}
                options={[
                  { value: 'all', label: 'All Users' },
                  { value: 'admins', label: 'Admins Only' },
                  { value: 'employees', label: 'Employees' },
                  { value: 'customers', label: 'Customers' },
                  { value: 'vendors', label: 'Vendors' }
                ]}
              />

              <div className="grid grid-cols-2 gap-4">
                <TextInput
                  label="Start Date (Optional)"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />

                <TextInput
                  label="End Date (Optional)"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                />
              </div>

              <div className="flex items-center gap-6 pt-2">
                <ToggleSwitch
                  label="Active"
                  checked={formData.active}
                  onChange={(checked) => setFormData({ ...formData, active: checked })}
                />

                <ToggleSwitch
                  label="Dismissible"
                  checked={formData.dismissible}
                  onChange={(checked) => setFormData({ ...formData, dismissible: checked })}
                />
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <div className="flex gap-3">
              <StandardButton
                variant="secondary"
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
              >
                Cancel
              </StandardButton>
              <StandardButton onClick={handleSubmit}>
                {editingAnnouncement ? 'Update' : 'Create'} Announcement
              </StandardButton>
            </div>
          </ModalFooter>
        </Modal>
      )}
    </div>
  );
}