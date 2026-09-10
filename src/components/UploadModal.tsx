import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  X,
  File,
  CheckCircle2,
  AlertCircle,
  Folder as FolderIcon,
  Smartphone,
  Laptop,
  StopCircle,
  RotateCw,
} from 'lucide-react';
import { Folder } from '../types.ts';
import { api, detectDevice } from '../services/api.ts';
import { formatBytes } from '../utils/format.ts';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  folders: Folder[];
  currentFolderId: string | null;
  onUploadSuccess: () => void;
}

interface UploadingState {
  filename: string;
  percentage: number;
  loadedBytes: number;
  totalBytes: number;
  speedBytesPerSec: number;
  remainingSeconds: number;
  isUploading: boolean;
  currentFileName?: string;
  currentFileIndex?: number;
  totalFilesCount?: number;
  error?: string;
  success?: boolean;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  folders,
  currentFolderId,
  onUploadSuccess,
}) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [targetFolderId, setTargetFolderId] = useState<string | null>(currentFolderId);
  const [sharingType, setSharingType] = useState<'private' | 'all_teachers'>('all_teachers');
  const [isDragging, setIsDragging] = useState(false);

  // Upload progress state per Requirement #9
  const [uploadState, setUploadState] = useState<UploadingState | null>(null);
  const abortUploadRef = useRef<(() => void) | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFilesSelected = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const array = Array.from(files);
    setSelectedFiles((prev) => [...prev, ...array]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesSelected(e.dataTransfer.files);
    }
  };

  const startUpload = () => {
    if (selectedFiles.length === 0) return;

    const totalBytes = selectedFiles.reduce((acc, f) => acc + f.size, 0);
    const mainFileName =
      selectedFiles.length === 1
        ? selectedFiles[0].name
        : `${selectedFiles[0].name} + ${selectedFiles.length - 1} other(s)`;

    setUploadState({
      filename: mainFileName,
      percentage: 0,
      loadedBytes: 0,
      totalBytes,
      speedBytesPerSec: 0,
      remainingSeconds: 0,
      isUploading: true,
    });

    const { promise, abort } = api.files.uploadWithProgress(
      selectedFiles,
      targetFolderId,
      sharingType,
      (progress) => {
        setUploadState((prev) =>
          prev
            ? {
                ...prev,
                percentage: progress.percentage,
                loadedBytes: progress.loadedBytes,
                totalBytes: progress.totalBytes,
                speedBytesPerSec: progress.speedBytesPerSec,
                remainingSeconds: progress.remainingSeconds,
                currentFileName: progress.currentFileName,
                currentFileIndex: progress.currentFileIndex,
                totalFilesCount: progress.totalFilesCount,
              }
            : null
        );
      }
    );

    abortUploadRef.current = abort;

    promise
      .then(() => {
        setUploadState((prev) => (prev ? { ...prev, isUploading: false, success: true, percentage: 100 } : null));
        setTimeout(() => {
          onUploadSuccess();
          handleClose();
        }, 1200);
      })
      .catch((err: Error) => {
        setUploadState((prev) => (prev ? { ...prev, isUploading: false, error: err.message } : null));
      });
  };

  const handleCancel = () => {
    if (abortUploadRef.current) {
      abortUploadRef.current();
    }
  };

  const handleRetry = () => {
    startUpload();
  };

  const handleClose = () => {
    if (uploadState?.isUploading) {
      if (!confirm('Upload is currently in progress. Do you want to cancel and exit?')) return;
      if (abortUploadRef.current) abortUploadRef.current();
    }
    setSelectedFiles([]);
    setUploadState(null);
    onClose();
  };

  const detectedDev = detectDevice();

  return (
    <div id="upload-modal-container" className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 relative">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center">
              <UploadCloud className="w-5 h-5 text-indigo-600 mr-2" />
              Upload Educational Resources
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Select files from any folder, drive, or mobile camera. Saved centrally in cloud storage.
            </p>
          </div>
          <button
            id="close-upload-modal-btn"
            type="button"
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Upload Progress Display (Requirement #9) */}
        {uploadState && (
          <div id="upload-progress-box" className="my-5 p-4 rounded-xl bg-slate-900 text-white shadow-lg space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300">
                {uploadState.isUploading ? 'Uploading...' : uploadState.success ? 'Upload Complete!' : 'Upload Paused / Failed'}
              </span>
              <span className="font-mono text-indigo-400 font-bold">{uploadState.percentage}%</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="font-medium text-sm text-white truncate mr-2">
                {uploadState.totalFilesCount && uploadState.totalFilesCount > 1 && uploadState.currentFileName
                  ? `[${uploadState.currentFileIndex}/${uploadState.totalFilesCount}] ${uploadState.currentFileName}`
                  : uploadState.filename}
              </div>
              {uploadState.isUploading && (
                <button
                  type="button"
                  onClick={handleCancel}
                  className="text-xs text-rose-400 hover:text-rose-300 font-medium px-2 py-0.5 rounded border border-rose-500/40 hover:bg-rose-500/10 flex-shrink-0"
                >
                  Cancel
                </button>
              )}
            </div>

            {/* Visual ASCII / Modern Progress Bar */}
            <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden border border-slate-700">
              <div
                className={`h-full transition-all duration-200 ${
                  uploadState.error ? 'bg-red-500' : uploadState.success ? 'bg-emerald-500' : 'bg-indigo-500'
                }`}
                style={{ width: `${uploadState.percentage}%` }}
              />
            </div>

            {/* Stats Row */}
            <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
              <div>
                {formatBytes(uploadState.loadedBytes)} / {formatBytes(uploadState.totalBytes)} ({uploadState.percentage}%)
              </div>
              {uploadState.isUploading && (
                <div className="space-x-3">
                  <span>{formatBytes(uploadState.speedBytesPerSec)}/s</span>
                  <span>{uploadState.remainingSeconds > 0 ? `~${uploadState.remainingSeconds}s remaining` : 'finishing...'}</span>
                </div>
              )}
            </div>

            {/* Error banner & Retry */}
            {uploadState.error && (
              <div className="p-2.5 bg-red-950/80 border border-red-800 rounded-lg text-red-200 text-xs flex items-center justify-between">
                <div className="flex items-center space-x-1.5 truncate mr-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
                  <span className="truncate">{uploadState.error}</span>
                </div>
                <button
                  type="button"
                  onClick={handleRetry}
                  className="px-2 py-1 bg-red-800 hover:bg-red-700 text-white rounded font-medium text-2xs flex items-center flex-shrink-0"
                >
                  <RotateCw className="w-3 h-3 mr-1" />
                  Retry
                </button>
              </div>
            )}

            {/* Success indicator */}
            {uploadState.success && (
              <div className="p-2 bg-emerald-950/80 border border-emerald-800 rounded-lg text-emerald-200 text-xs flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>Uploaded and synced across all devices!</span>
              </div>
            )}

            {/* Cancel Button during active upload */}
            {uploadState.isUploading && (
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="inline-flex items-center text-xs text-red-400 hover:text-red-300 font-medium"
                >
                  <StopCircle className="w-3.5 h-3.5 mr-1" />
                  Cancel Upload
                </button>
              </div>
            )}
          </div>
        )}

        {!uploadState?.isUploading && (
          <div className="space-y-4 pt-4">
            {/* Target Folder Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Target Destination Folder
                </label>
                <div className="relative">
                  <select
                    id="upload-target-folder-select"
                    value={targetFolderId || 'root'}
                    onChange={(e) => setTargetFolderId(e.target.value === 'root' ? null : e.target.value)}
                    className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 bg-white focus:ring-2 focus:ring-indigo-600 outline-none"
                  >
                    <option value="root">📁 Root / All Resources</option>
                    {folders.map((f) => (
                      <option key={f.id} value={f.id}>
                        📂 {f.folder_name}
                      </option>
                    ))}
                  </select>
                  <FolderIcon className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Cross-Device Access & Visibility
                </label>
                <select
                  id="upload-visibility-select"
                  value={sharingType}
                  onChange={(e) => setSharingType(e.target.value as 'private' | 'all_teachers')}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 bg-white focus:ring-2 focus:ring-indigo-600 outline-none"
                >
                  <option value="all_teachers">🌐 School-Wide (Accessible on Mobile & Desktop)</option>
                  <option value="private">🔒 Private (Only this user account)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center text-2xs text-slate-500 bg-indigo-50/70 border border-indigo-100 rounded-lg px-3 py-1.5 space-x-2">
              <span className="font-semibold text-indigo-700">Cloud Sync:</span>
              <span>Files uploaded here sync instantly to the cloud and can be downloaded from any mobile phone or desktop browser.</span>
            </div>

            {/* Drag & Drop File Box */}
            <div
              id="file-dropzone"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-indigo-600 bg-indigo-50/50 scale-[1.01]'
                  : 'border-slate-300 hover:border-indigo-400 bg-slate-50/60'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={(e) => handleFilesSelected(e.target.files)}
                className="hidden"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.mp4,.webm,.mov,.avi,.mkv,.mp3,.wav,.m4a,.aac,.ogg,.jpg,.jpeg,.png,.gif,.webp,.svg"
              />

              <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-3">
                <UploadCloud className="w-6 h-6" />
              </div>

              <div className="text-sm font-semibold text-slate-800">
                Click to browse or drag & drop files here
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Select from Desktop, Documents, Downloads, External Drives, or Phone Camera.
              </p>

              <div className="mt-3 flex flex-wrap justify-center gap-1 text-[11px] text-slate-500">
                <span className="px-2 py-0.5 bg-white rounded border border-slate-200">PDF</span>
                <span className="px-2 py-0.5 bg-white rounded border border-slate-200">DOCX</span>
                <span className="px-2 py-0.5 bg-white rounded border border-slate-200">PPTX</span>
                <span className="px-2 py-0.5 bg-white rounded border border-slate-200">MP4</span>
                <span className="px-2 py-0.5 bg-white rounded border border-slate-200">MP3</span>
                <span className="px-2 py-0.5 bg-white rounded border border-slate-200">PNG/JPG</span>
              </div>
            </div>

            {/* Selected Files Queue */}
            {selectedFiles.length > 0 && (
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                <div className="text-xs font-semibold text-slate-700 flex justify-between">
                  <span>Selected files ({selectedFiles.length})</span>
                  <span>{formatBytes(selectedFiles.reduce((sum, f) => sum + f.size, 0))}</span>
                </div>
                {selectedFiles.map((file, idx) => (
                  <div
                    key={`${file.name}-${idx}`}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-100 text-xs"
                  >
                    <div className="flex items-center space-x-2 truncate mr-2">
                      <File className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                      <span className="font-medium text-slate-800 truncate">{file.name}</span>
                      <span className="text-slate-400 text-2xs">({formatBytes(file.size)})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(idx)}
                      className="text-slate-400 hover:text-red-600 p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Device Info Tag */}
            <div className="flex items-center justify-between text-2xs text-slate-500 pt-1">
              <span className="flex items-center">
                {/iphone|android/i.test(detectedDev) ? (
                  <Smartphone className="w-3 h-3 text-blue-600 mr-1" />
                ) : (
                  <Laptop className="w-3 h-3 text-indigo-600 mr-1" />
                )}
                Uploading from: <strong className="ml-1 text-slate-700">{detectedDev}</strong>
              </span>
              <span>Max file size: 500 MB</span>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                id="submit-upload-btn"
                type="button"
                onClick={startUpload}
                disabled={selectedFiles.length === 0}
                className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Start Upload ({selectedFiles.length})
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
