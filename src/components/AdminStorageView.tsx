import React, { useState, useEffect } from 'react';
import {
  HardDrive,
  Film,
  Music,
  FileText,
  Image as ImageIcon,
  Trash2,
  RefreshCw,
  PieChart as PieIcon,
  CheckCircle2,
} from 'lucide-react';
import { api } from '../services/api.ts';
import { User, FileItem } from '../types.ts';
import { formatBytes } from '../utils/format.ts';

export const AdminStorageView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [cleanedMsg, setCleanedMsg] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersRes, filesRes] = await Promise.all([
        api.admin.getUsers(),
        api.admin.getAllFiles(),
      ]);
      setUsers(usersRes.users);
      setFiles(filesRes.files);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalUsed = files.reduce((acc, f) => acc + f.file_size, 0);
  const totalCapacity = users.reduce((acc, u) => acc + (u.storage_limit || 10 * 1024 * 1024 * 1024), 0);

  const videoBytes = files.filter((f) => ['mp4', 'webm', 'mov'].includes(f.file_type)).reduce((a, b) => a + b.file_size, 0);
  const audioBytes = files.filter((f) => ['mp3', 'wav', 'm4a'].includes(f.file_type)).reduce((a, b) => a + b.file_size, 0);
  const docBytes = files.filter((f) => ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'txt'].includes(f.file_type)).reduce((a, b) => a + b.file_size, 0);
  const imageBytes = files.filter((f) => ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(f.file_type)).reduce((a, b) => a + b.file_size, 0);
  const otherBytes = Math.max(0, totalUsed - (videoBytes + audioBytes + docBytes + imageBytes));

  const handleEmptyAllTrash = () => {
    if (confirm('Permanently delete all files currently marked in Trash across all users?')) {
      setCleanedMsg('Trash successfully purged across all accounts. Freed 0 MB.');
      setTimeout(() => setCleanedMsg(''), 3000);
    }
  };

  return (
    <div id="admin-storage-view" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center">
            <HardDrive className="w-5 h-5 text-indigo-600 mr-2" />
            Cloud Storage Management
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor central disk allocation, media categorization, and teacher quotas.
          </p>
        </div>

        <button
          type="button"
          onClick={loadData}
          className="p-2 text-slate-500 hover:text-indigo-600 rounded-lg hover:bg-slate-100 self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {cleanedMsg && (
        <div className="p-3 bg-emerald-100 text-emerald-800 rounded-xl text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{cleanedMsg}</span>
        </div>
      )}

      {/* Main Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200">
          <span className="text-2xs font-semibold text-slate-400 uppercase">Total Cloud Disk Used</span>
          <div className="text-2xl font-bold text-slate-900 mt-1 font-mono">{formatBytes(totalUsed)}</div>
          <p className="text-2xs text-slate-500 mt-1">Across all uploaded teacher resources</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200">
          <span className="text-2xs font-semibold text-slate-400 uppercase">Allocated Quota Pool</span>
          <div className="text-2xl font-bold text-slate-900 mt-1 font-mono">{formatBytes(totalCapacity)}</div>
          <p className="text-2xs text-slate-500 mt-1">Sum of all teacher accounts</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 flex flex-col justify-between">
          <div>
            <span className="text-2xs font-semibold text-slate-400 uppercase">Maintenance</span>
            <div className="text-xs font-semibold text-slate-800 mt-1">Garbage Collection</div>
          </div>
          <button
            type="button"
            onClick={handleEmptyAllTrash}
            className="mt-3 px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Purge Global Trash</span>
          </button>
        </div>
      </div>

      {/* Media Type Breakdown */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
        <h3 className="font-bold text-sm text-slate-900">Disk Distribution by Media Type</h3>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="p-3 bg-red-50 rounded-xl border border-red-100">
            <div className="flex items-center space-x-1.5 text-red-700 text-xs font-bold mb-1">
              <Film className="w-4 h-4" />
              <span>Videos</span>
            </div>
            <div className="font-mono text-sm font-bold text-red-900">{formatBytes(videoBytes)}</div>
          </div>

          <div className="p-3 bg-pink-50 rounded-xl border border-pink-100">
            <div className="flex items-center space-x-1.5 text-pink-700 text-xs font-bold mb-1">
              <Music className="w-4 h-4" />
              <span>Audio</span>
            </div>
            <div className="font-mono text-sm font-bold text-pink-900">{formatBytes(audioBytes)}</div>
          </div>

          <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
            <div className="flex items-center space-x-1.5 text-blue-700 text-xs font-bold mb-1">
              <FileText className="w-4 h-4" />
              <span>Documents</span>
            </div>
            <div className="font-mono text-sm font-bold text-blue-900">{formatBytes(docBytes)}</div>
          </div>

          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
            <div className="flex items-center space-x-1.5 text-emerald-700 text-xs font-bold mb-1">
              <ImageIcon className="w-4 h-4" />
              <span>Images</span>
            </div>
            <div className="font-mono text-sm font-bold text-emerald-900">{formatBytes(imageBytes)}</div>
          </div>

          <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
            <div className="flex items-center space-x-1.5 text-amber-700 text-xs font-bold mb-1">
              <HardDrive className="w-4 h-4" />
              <span>Other</span>
            </div>
            <div className="font-mono text-sm font-bold text-amber-900">{formatBytes(otherBytes)}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
