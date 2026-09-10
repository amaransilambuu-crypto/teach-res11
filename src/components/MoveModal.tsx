import React, { useState } from 'react';
import { X, Folder as FolderIcon, Move, Check } from 'lucide-react';
import { Folder, FileItem } from '../types.ts';

interface MoveModalProps {
  item: FileItem | Folder | null;
  type: 'file' | 'folder';
  folders: Folder[];
  onClose: () => void;
  onMove: (targetFolderId: string | null) => void;
}

export const MoveModal: React.FC<MoveModalProps> = ({ item, type, folders, onClose, onMove }) => {
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  if (!item) return null;

  // If moving a folder, cannot move into itself or its descendants
  const availableFolders =
    type === 'folder' ? folders.filter((f) => f.id !== item.id && f.parent_folder_id !== item.id) : folders;

  const itemName = 'file_name' in item ? item.file_name : item.folder_name;

  return (
    <div id="move-modal-container" className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 relative">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Move className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Move {type === 'file' ? 'File' : 'Folder'}</h3>
              <p className="text-2xs text-slate-400 truncate max-w-[220px]">{itemName}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-4">
          <label className="text-xs font-semibold text-slate-700 block mb-2">Select Destination Folder:</label>

          <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl">
            {/* Root / Main */}
            <div
              onClick={() => setSelectedFolderId(null)}
              className={`p-3 flex items-center justify-between text-xs cursor-pointer hover:bg-slate-50 transition-colors ${
                selectedFolderId === null ? 'bg-indigo-50/60 font-semibold text-indigo-900' : 'text-slate-700'
              }`}
            >
              <div className="flex items-center space-x-2">
                <FolderIcon className="w-4 h-4 text-slate-400" />
                <span>📁 Root / All Resources</span>
              </div>
              {selectedFolderId === null && <Check className="w-4 h-4 text-indigo-600" />}
            </div>

            {availableFolders.map((f) => {
              const isSelected = selectedFolderId === f.id;
              return (
                <div
                  key={f.id}
                  onClick={() => setSelectedFolderId(f.id)}
                  className={`p-3 flex items-center justify-between text-xs cursor-pointer hover:bg-slate-50 transition-colors ${
                    isSelected ? 'bg-indigo-50/60 font-semibold text-indigo-900' : 'text-slate-700'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <FolderIcon className="w-4 h-4 text-amber-500" />
                    <span>📂 {f.folder_name}</span>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-indigo-600" />}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onMove(selectedFolderId);
              onClose();
            }}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700"
          >
            Move Here
          </button>
        </div>
      </div>
    </div>
  );
};
