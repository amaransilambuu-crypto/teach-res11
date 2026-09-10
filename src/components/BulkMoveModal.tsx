import React, { useState } from 'react';
import { X, Folder as FolderIcon, Move, Check, Loader2 } from 'lucide-react';
import { Folder, FileItem } from '../types.ts';

interface BulkMoveModalProps {
  isOpen: boolean;
  selectedFiles: FileItem[];
  folders: Folder[];
  currentFolderId: string | null;
  onClose: () => void;
  onConfirm: (targetFolderId: string | null) => Promise<void>;
}

export const BulkMoveModal: React.FC<BulkMoveModalProps> = ({
  isOpen,
  selectedFiles,
  folders,
  currentFolderId,
  onClose,
  onConfirm,
}) => {
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(
    currentFolderId !== null ? null : (folders[0]?.id ?? null)
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || selectedFiles.length === 0) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onConfirm(selectedFolderId);
      onClose();
    } catch {
      // handled by caller
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="bulk-move-modal-container"
      className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
    >
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 relative space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Move className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Move {selectedFiles.length} Selected Resource{selectedFiles.length !== 1 ? 's' : ''}
              </h3>
              <p className="text-2xs text-slate-400">
                Select a target destination folder
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

        {/* Selected files preview summary */}
        <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100 max-h-24 overflow-y-auto text-xs text-slate-600 space-y-1">
          {selectedFiles.map((f) => (
            <div key={f.id} className="truncate flex items-center space-x-1.5 text-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 flex-shrink-0" />
              <span className="truncate">{f.file_name}</span>
            </div>
          ))}
        </div>

        {/* Destination Folder Selector */}
        <div>
          <label className="text-xs font-semibold text-slate-700 block mb-2">
            Target Destination Folder:
          </label>

          <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl">
            {/* Root / Main Resources */}
            <div
              onClick={() => setSelectedFolderId(null)}
              className={`p-3 flex items-center justify-between text-xs cursor-pointer hover:bg-slate-50 transition-colors ${
                selectedFolderId === null
                  ? 'bg-indigo-50/70 font-semibold text-indigo-900'
                  : 'text-slate-700'
              }`}
            >
              <div className="flex items-center space-x-2">
                <FolderIcon className="w-4 h-4 text-slate-400" />
                <span>📁 Root / All Resources</span>
              </div>
              {selectedFolderId === null && <Check className="w-4 h-4 text-indigo-600" />}
            </div>

            {/* Subfolders */}
            {folders.map((f) => {
              const isSelected = selectedFolderId === f.id;
              return (
                <div
                  key={f.id}
                  onClick={() => setSelectedFolderId(f.id)}
                  className={`p-3 flex items-center justify-between text-xs cursor-pointer hover:bg-slate-50 transition-colors ${
                    isSelected
                      ? 'bg-indigo-50/70 font-semibold text-indigo-900'
                      : 'text-slate-700'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <FolderIcon
                      className="w-4 h-4"
                      style={{ color: f.color || '#f59e0b' }}
                    />
                    <span>📂 {f.folder_name}</span>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-indigo-600" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
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
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 shadow-xs inline-flex items-center disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                Moving...
              </>
            ) : (
              `Move ${selectedFiles.length} Resource${selectedFiles.length !== 1 ? 's' : ''}`
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
