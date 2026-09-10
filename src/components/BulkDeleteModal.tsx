import React, { useState } from 'react';
import { X, Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { FileItem } from '../types.ts';
import { formatBytes } from '../utils/format.ts';

interface BulkDeleteModalProps {
  isOpen: boolean;
  selectedFiles: FileItem[];
  isPermanent: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export const BulkDeleteModal: React.FC<BulkDeleteModalProps> = ({
  isOpen,
  selectedFiles,
  isPermanent,
  onClose,
  onConfirm,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || selectedFiles.length === 0) return null;

  const totalBytes = selectedFiles.reduce((acc, f) => acc + (f.file_size || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onConfirm();
      onClose();
    } catch {
      // handled by caller
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="bulk-delete-modal-container"
      className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
    >
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 relative space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2.5">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                isPermanent ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
              }`}
            >
              {isPermanent ? <Trash2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                {isPermanent ? 'Permanently Delete' : 'Move to Trash'}{' '}
                {selectedFiles.length} Resource{selectedFiles.length !== 1 ? 's' : ''}
              </h3>
              <p className="text-2xs text-slate-400">
                {formatBytes(totalBytes)} total storage space
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Warning text */}
        <div
          className={`p-3 rounded-xl text-xs border ${
            isPermanent
              ? 'bg-red-50/70 border-red-200 text-red-800'
              : 'bg-amber-50/70 border-amber-200 text-amber-800'
          }`}
        >
          {isPermanent ? (
            <p>
              <strong>Warning:</strong> You are about to permanently remove{' '}
              <strong>{selectedFiles.length}</strong> file(s). This will erase them from the server
              disk and reclaim your quota. This action cannot be reversed.
            </p>
          ) : (
            <p>
              The selected <strong>{selectedFiles.length}</strong> file(s) will be moved to the Trash.
              You can restore them or empty the trash at any time.
            </p>
          )}
        </div>

        {/* Selected files preview list */}
        <div className="max-h-36 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl bg-slate-50/50">
          {selectedFiles.map((f) => (
            <div key={f.id} className="p-2.5 flex items-center justify-between text-xs">
              <span className="truncate max-w-[260px] font-medium text-slate-700">
                {f.file_name}
              </span>
              <span className="text-2xs text-slate-400 font-mono ml-2">
                {formatBytes(f.file_size)}
              </span>
            </div>
          ))}
        </div>

        {/* Footer actions */}
        <div className="flex justify-end space-x-2.5 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 rounded-lg"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className={`px-4 py-2 text-white rounded-lg text-xs font-semibold shadow-xs inline-flex items-center disabled:opacity-50 ${
              isPermanent ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-600 hover:bg-amber-700'
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                {isPermanent ? 'Deleting...' : 'Moving to Trash...'}
              </>
            ) : isPermanent ? (
              `Permanently Delete (${selectedFiles.length})`
            ) : (
              `Move to Trash (${selectedFiles.length})`
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
