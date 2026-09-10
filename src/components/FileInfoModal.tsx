import React from 'react';
import {
  X,
  Info,
  File,
  HardDrive,
  Calendar,
  Smartphone,
  Laptop,
  User,
  Shield,
  Download,
  Folder as FolderIcon,
} from 'lucide-react';
import { FileItem, Folder } from '../types.ts';
import { formatBytes, formatDate } from '../utils/format.ts';

interface FileInfoModalProps {
  file: FileItem | null;
  folder?: Folder | null;
  onClose: () => void;
  onDownload: (file: FileItem) => void;
}

export const FileInfoModal: React.FC<FileInfoModalProps> = ({ file, folder, onClose, onDownload }) => {
  if (!file) return null;

  return (
    <div id="file-info-modal" className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 relative">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Info className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">File Information</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-4 space-y-3 text-xs">
          {/* Main Name & Icon */}
          <div className="flex items-start space-x-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0">
              <File className="w-5 h-5" />
            </div>
            <div className="truncate flex-1">
              <div className="font-semibold text-slate-900 text-sm truncate">{file.file_name}</div>
              <div className="text-slate-500 uppercase text-2xs font-mono">{file.file_type} File • {file.mime_type}</div>
            </div>
          </div>

          {/* Details Table */}
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
            <div className="p-2.5 flex justify-between">
              <span className="text-slate-500">File Size</span>
              <span className="font-semibold text-slate-800 font-mono">{formatBytes(file.file_size)}</span>
            </div>

            <div className="p-2.5 flex justify-between">
              <span className="text-slate-500">Uploaded On</span>
              <span className="font-medium text-slate-800">{formatDate(file.uploaded_at)}</span>
            </div>

            <div className="p-2.5 flex justify-between items-center">
              <span className="text-slate-500">Source Device</span>
              <span className="font-medium text-slate-800 flex items-center text-indigo-600">
                {/mobile|iphone|android/i.test(file.device) ? (
                  <Smartphone className="w-3.5 h-3.5 mr-1" />
                ) : (
                  <Laptop className="w-3.5 h-3.5 mr-1" />
                )}
                {file.device}
              </span>
            </div>

            <div className="p-2.5 flex justify-between">
              <span className="text-slate-500">Owner</span>
              <span className="font-medium text-slate-800">{file.owner_name || 'Teacher'} ({file.owner_email})</span>
            </div>

            <div className="p-2.5 flex justify-between items-center">
              <span className="text-slate-500">Folder</span>
              <span className="font-medium text-slate-800 flex items-center">
                <FolderIcon className="w-3.5 h-3.5 mr-1 text-amber-500" />
                {folder ? folder.folder_name : 'Root / All Resources'}
              </span>
            </div>

            <div className="p-2.5 flex justify-between">
              <span className="text-slate-500">Sharing Policy</span>
              <span className="font-medium text-indigo-700 capitalize">
                {file.sharing_type ? file.sharing_type.replace('_', ' ') : 'Private'}
              </span>
            </div>

            <div className="p-2.5 flex justify-between">
              <span className="text-slate-500">Cloud Storage Path</span>
              <span className="font-mono text-2xs text-slate-600 truncate max-w-[180px]">
                uploads/{file.storage_path}
              </span>
            </div>
          </div>

          {file.description && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-2xs font-semibold text-slate-500 uppercase block mb-1">Description</span>
              <p className="text-slate-700 text-xs leading-relaxed">{file.description}</p>
            </div>
          )}
        </div>

        <div className="flex justify-between items-center pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={() => onDownload(file)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 inline-flex items-center"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Download Resource
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
