import { AlertTriangle, X } from 'lucide-react';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  itemName?: string;
  loading?: boolean;
}

export default function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  itemName,
  loading = false,
}: DeleteConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] w-full max-w-md">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">{title}</h2>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="w-8 h-8 rounded-lg hover:bg-white/20 flex items-center justify-center transition disabled:opacity-50"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Warning Message */}
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
            <p className="text-white font-medium mb-2">{message}</p>
            {itemName && (
              <p className="text-red-400 text-sm">
                <span className="font-semibold">Item:</span> {itemName}
              </p>
            )}
          </div>

          {/* Warning Text */}
          <p className="text-gray-400 text-sm">
            This action cannot be undone. All associated data will be permanently removed.
          </p>

          {/* Actions */}
          <div className="flex justify-end gap-4 pt-4">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-6 py-3 bg-[#0A0A0A] hover:bg-[#2A2A2A] border border-[#2A2A2A] text-gray-300 rounded-xl font-semibold transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className="px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-xl font-semibold transition shadow-lg shadow-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
