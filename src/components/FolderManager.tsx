import React, { useState } from 'react';
import {
  FolderTree,
  Folder as FolderIcon,
  Plus,
  Edit2,
  Trash2,
  UploadCloud,
  ChevronRight,
  ChevronDown,
  FolderPlus,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  X,
} from 'lucide-react';
import { Folder } from '../types.ts';
import { api } from '../services/api.ts';

interface FolderManagerProps {
  folders: Folder[];
  onFoldersChanged: () => void;
  onOpenFolder: (folderId: string) => void;
  onUploadToFolder: (folderId: string) => void;
}

export const FolderManager: React.FC<FolderManagerProps> = ({
  folders,
  onFoldersChanged,
  onOpenFolder,
  onUploadToFolder,
}) => {
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [parentFolderId, setParentFolderId] = useState<string | null>(null);
  const [folderColor, setFolderColor] = useState('#3b82f6');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);

  // Dedicated in-app Delete Confirmation state (replaces window.confirm)
  const [folderToDelete, setFolderToDelete] = useState<Folder | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Feedback toast
  const [feedbackToast, setFeedbackToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setFeedbackToast({ type, text });
    setTimeout(() => {
      setFeedbackToast((prev) => (prev?.text === text ? null : prev));
    }, 3500);
  };

  const [expandedFolderIds, setExpandedFolderIds] = useState<string[]>([
    'fld_class_11',
    'fld_class_12',
    'fld_class_12_cs',
  ]);

  const toggleExpand = (id: string) => {
    setExpandedFolderIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    setIsCreating(true);
    setCreateError(null);
    try {
      await api.folders.create(newFolderName.trim(), parentFolderId, folderColor);
      setNewFolderName('');
      setParentFolderId(null);
      setShowCreateModal(false);
      onFoldersChanged();
      showToast('success', 'Folder created successfully.');
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create folder.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleRenameFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFolder || !renameValue.trim()) return;

    setIsRenaming(true);
    setRenameError(null);
    try {
      await api.folders.update(editingFolder.id, { folder_name: renameValue.trim() });
      const renamedName = renameValue.trim();
      setEditingFolder(null);
      onFoldersChanged();
      showToast('success', `Folder renamed to "${renamedName}".`);
    } catch (err: unknown) {
      setRenameError(err instanceof Error ? err.message : 'Failed to rename folder.');
    } finally {
      setIsRenaming(false);
    }
  };

  const confirmDeleteFolder = async () => {
    if (!folderToDelete) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await api.folders.delete(folderToDelete.id);
      const name = folderToDelete.folder_name;
      setFolderToDelete(null);
      onFoldersChanged();
      showToast('success', `Folder "${name}" deleted successfully.`);
    } catch (err: unknown) {
      console.error('Delete folder error:', err);
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete folder.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Build recursive tree
  const renderTree = (parentId: string | null = null, depth = 0) => {
    const children = folders.filter((f) => f.parent_folder_id === parentId);
    if (children.length === 0) return null;

    return (
      <div className={`space-y-1 ${depth > 0 ? 'ml-6 pl-2 border-l border-slate-200' : ''}`}>
        {children.map((folder) => {
          const subChildren = folders.filter((f) => f.parent_folder_id === folder.id);
          const isExpanded = expandedFolderIds.includes(folder.id);
          const hasChildren = subChildren.length > 0;

          return (
            <div key={folder.id} className="group">
              <div className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-100 transition-colors bg-white border border-slate-200/80 shadow-2xs">
                <div
                  className="flex items-center space-x-2 truncate flex-1 cursor-pointer"
                  onClick={() => onOpenFolder(folder.id)}
                  title={`Open folder "${folder.folder_name}"`}
                >
                  {hasChildren ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpand(folder.id);
                      }}
                      className="p-1 text-slate-400 hover:text-slate-600 rounded"
                      aria-label={isExpanded ? 'Collapse folder' : 'Expand folder'}
                    >
                      {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    </button>
                  ) : (
                    <span className="w-5" />
                  )}

                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${folder.color || '#3b82f6'}15`, color: folder.color || '#3b82f6' }}
                  >
                    <FolderIcon className="w-4 h-4 fill-current" />
                  </div>

                  <span className="font-semibold text-xs text-slate-800 truncate hover:text-indigo-600">
                    {folder.folder_name}
                  </span>
                  {hasChildren && (
                    <span className="text-2xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">
                      {subChildren.length}
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-1 opacity-90 group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setParentFolderId(folder.id);
                      setCreateError(null);
                      setShowCreateModal(true);
                    }}
                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                    title="Add Subfolder"
                    aria-label={`Add subfolder to ${folder.folder_name}`}
                  >
                    <FolderPlus className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onUploadToFolder(folder.id);
                    }}
                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                    title="Upload Directly Here"
                    aria-label={`Upload to ${folder.folder_name}`}
                  >
                    <UploadCloud className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingFolder(folder);
                      setRenameValue(folder.folder_name);
                      setRenameError(null);
                    }}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded transition-colors"
                    title="Rename Folder"
                    aria-label={`Rename ${folder.folder_name}`}
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    id={`delete-folder-btn-${folder.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setFolderToDelete(folder);
                      setDeleteError(null);
                    }}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                    title={`Delete folder "${folder.folder_name}"`}
                    aria-label={`Delete folder ${folder.folder_name}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {hasChildren && isExpanded && renderTree(folder.id, depth + 1)}
            </div>
          );
        })}
      </div>
    );
  };

  const folderColors = [
    '#3b82f6',
    '#6366f1',
    '#8b5cf6',
    '#ec4899',
    '#ef4444',
    '#f59e0b',
    '#10b981',
    '#06b6d4',
  ];

  return (
    <div id="folder-manager-view" className="space-y-6 relative">
      {/* Toast Notification */}
      {feedbackToast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center space-x-2.5 px-4 py-2.5 rounded-xl shadow-lg border text-xs font-semibold animate-in slide-in-from-top-2 duration-200 ${
            feedbackToast.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-red-50 text-red-800 border-red-200'
          }`}
        >
          {feedbackToast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
          )}
          <span>{feedbackToast.text}</span>
          <button
            type="button"
            onClick={() => setFeedbackToast(null)}
            className="p-0.5 text-slate-400 hover:text-slate-600 rounded"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header & New Folder Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center">
            <FolderTree className="w-5 h-5 text-indigo-600 mr-2" />
            Folder Organization
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Organize teaching resources into subjects, grades, and units (e.g. Class 11, Class 12, Worksheets).
          </p>
        </div>

        <button
          type="button"
          id="create-new-folder-btn"
          onClick={() => {
            setParentFolderId(null);
            setCreateError(null);
            setShowCreateModal(true);
          }}
          className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          New Root Folder
        </button>
      </div>

      {/* Hierarchical Folder Directory */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4 shadow-2xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Teaching Directory Structure</span>
          <span className="text-2xs text-slate-400 font-semibold">{folders.length} total folders</span>
        </div>

        {folders.length === 0 ? (
          <div className="text-center py-10">
            <FolderIcon className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-700">No folders yet</p>
            <p className="text-2xs text-slate-400 mt-1">Create your first folder to start organizing teaching materials.</p>
          </div>
        ) : (
          renderTree(null)
        )}
      </div>

      {/* Delete Folder Confirmation Modal (Custom In-App Modal) */}
      {folderToDelete && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-start space-x-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Delete Folder</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Are you sure you want to delete <span className="font-semibold text-slate-800">&ldquo;{folderToDelete.folder_name}&rdquo;</span>?
                </p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-600 mb-4 space-y-1">
              <p className="flex items-center text-slate-700 font-medium">
                <Trash2 className="w-3.5 h-3.5 mr-1.5 text-red-500 flex-shrink-0" />
                This will delete the folder and its nested subfolders.
              </p>
              <p className="text-slate-500 text-[11px]">
                Any files inside will be preserved and safely moved to Trash where they can be restored.
              </p>
            </div>

            {deleteError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="flex justify-end space-x-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => {
                  setFolderToDelete(null);
                  setDeleteError(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                id="confirm-delete-folder-btn"
                disabled={isDeleting}
                onClick={confirmDeleteFolder}
                className="inline-flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                    Delete Folder
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Folder Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <h3 className="font-bold text-slate-900 text-base mb-1">Create New Folder</h3>
            <p className="text-xs text-slate-500 mb-4">
              Add a folder or nested subfolder for lessons, question papers, or media.
            </p>

            {createError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateFolder} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Folder Name</label>
                <input
                  type="text"
                  required
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="e.g. Class 12 Computer Science"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-600 outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Parent Folder</label>
                <select
                  value={parentFolderId || 'root'}
                  onChange={(e) => setParentFolderId(e.target.value === 'root' ? null : e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-indigo-600 outline-none"
                >
                  <option value="root">📁 Root (Top Level)</option>
                  {folders.map((f) => (
                    <option key={f.id} value={f.id}>
                      📂 {f.folder_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Folder Accent Color</label>
                <div className="flex items-center space-x-2">
                  {folderColors.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setFolderColor(c)}
                      className={`w-6 h-6 rounded-full border-2 transition-transform ${
                        folderColor === c ? 'scale-110 border-slate-800 shadow-xs' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  disabled={isCreating}
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Folder'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rename Folder Modal */}
      {editingFolder && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <h3 className="font-bold text-slate-900 text-base mb-1">Rename Folder</h3>
            <p className="text-xs text-slate-500 mb-4">Rename &ldquo;{editingFolder.folder_name}&rdquo;</p>

            {renameError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
                {renameError}
              </div>
            )}

            <form onSubmit={handleRenameFolder} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">New Folder Name</label>
                <input
                  type="text"
                  required
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-600 outline-none"
                  autoFocus
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  disabled={isRenaming}
                  onClick={() => setEditingFolder(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRenaming}
                  className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isRenaming ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
