import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Trash2,
  AlertTriangle,
  Lock,
  RefreshCw,
  Search,
  Eye,
  Download,
} from 'lucide-react';
import { api } from '../services/api.ts';
import { FileItem, ActivityLog } from '../types.ts';
import { formatBytes, formatDate } from '../utils/format.ts';

interface AdminSecurityViewProps {
  onPlayVideo: (file: FileItem) => void;
  onPreviewDocument: (file: FileItem) => void;
}

export const AdminSecurityView: React.FC<AdminSecurityViewProps> = ({
  onPlayVideo,
  onPreviewDocument,
}) => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [allFiles, setAllFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fileSearch, setFileSearch] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [logsRes, filesRes] = await Promise.all([
        api.admin.getActivityLogs(),
        api.admin.getAllFiles(),
      ]);
      setLogs(logsRes.logs);
      setAllFiles(filesRes.files);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDeleteInappropriate = async (file: FileItem) => {
    if (
      confirm(
        `ADMIN SECURITY OVERRIDE: Permanently delete file "${file.file_name}" uploaded by ${file.owner_name || 'Teacher'}? This action is logged.`
      )
    ) {
      try {
        await api.files.delete(file.id);
        setAllFiles((prev) => prev.filter((f) => f.id !== file.id));
        loadData(); // reload audit log
      } catch {
        alert('Failed to delete file.');
      }
    }
  };

  const filteredFiles = allFiles.filter(
    (f) =>
      f.file_name.toLowerCase().includes(fileSearch.toLowerCase()) ||
      (f.owner_name && f.owner_name.toLowerCase().includes(fileSearch.toLowerCase()))
  );

  return (
    <div id="admin-security-view" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center">
            <ShieldAlert className="w-5 h-5 text-indigo-600 mr-2" />
            Security Audit & Content Moderation
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit teacher logins, inspect system activity logs, and remove inappropriate files.
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

      {/* Security Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center space-x-3">
          <ShieldCheck className="w-8 h-8 text-emerald-600 flex-shrink-0" />
          <div>
            <div className="text-xs font-bold text-emerald-900">Passwords Encrypted</div>
            <div className="text-2xs text-emerald-700">BCrypt 10 rounds hash algorithm active</div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center space-x-3">
          <Lock className="w-8 h-8 text-blue-600 flex-shrink-0" />
          <div>
            <div className="text-xs font-bold text-blue-900">Stateless JWT Auth</div>
            <div className="text-2xs text-blue-700">Session tokens secured with HMAC-SHA256</div>
          </div>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 flex items-center space-x-3">
          <ShieldAlert className="w-8 h-8 text-purple-600 flex-shrink-0" />
          <div>
            <div className="text-xs font-bold text-purple-900">Server Path Isolation</div>
            <div className="text-2xs text-purple-700">Prevent directory traversal on uploads</div>
          </div>
        </div>
      </div>

      {/* Content Moderation Section (Requirement #12: Delete inappropriate files) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-sm text-slate-900 flex items-center">
              <AlertTriangle className="w-4 h-4 text-amber-500 mr-1.5" />
              Global Resource Moderation ({filteredFiles.length} files)
            </h3>
            <p className="text-xs text-slate-500">
              Inspect any teacher&apos;s upload and remove inappropriate content if required.
            </p>
          </div>

          <div className="relative max-w-xs w-full">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Filter by file or teacher name..."
              value={fileSearch}
              onChange={(e) => setFileSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-2xs uppercase">
              <tr>
                <th className="py-2.5 px-3">File</th>
                <th className="py-2.5 px-3">Owner</th>
                <th className="py-2.5 px-3">Device</th>
                <th className="py-2.5 px-3">Uploaded</th>
                <th className="py-2.5 px-3 text-right">Moderation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredFiles.slice(0, 15).map((f) => (
                <tr key={f.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3">
                    <div className="font-semibold text-slate-800 truncate max-w-xs">{f.file_name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      {f.file_type.toUpperCase()} • {formatBytes(f.file_size)}
                    </div>
                  </td>
                  <td className="py-2.5 px-3 font-medium text-slate-700">{f.owner_name || 'Teacher'}</td>
                  <td className="py-2.5 px-3 text-slate-500">{f.device}</td>
                  <td className="py-2.5 px-3 text-slate-400">{formatDate(f.uploaded_at)}</td>
                  <td className="py-2.5 px-3 text-right">
                    <div className="inline-flex items-center space-x-1">
                      <button
                        type="button"
                        onClick={() => {
                          if (['mp4', 'webm'].includes(f.file_type.toLowerCase())) onPlayVideo(f);
                          else onPreviewDocument(f);
                        }}
                        className="p-1 text-slate-500 hover:text-indigo-600 rounded"
                        title="Review file"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteInappropriate(f)}
                        className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                        title="Delete Inappropriate Resource"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Activity Logs Table */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3">
        <h3 className="font-bold text-sm text-slate-900">Security & Authentication Audit Trail</h3>

        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-2xs uppercase">
              <tr>
                <th className="py-2.5 px-3">Action</th>
                <th className="py-2.5 px-3">User</th>
                <th className="py-2.5 px-3">Details</th>
                <th className="py-2.5 px-3">Device / IP</th>
                <th className="py-2.5 px-3">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-2xs">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold uppercase">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-sans font-semibold text-slate-800">{log.user_name}</td>
                  <td className="py-2.5 px-3 font-sans text-slate-600 truncate max-w-xs">{log.details}</td>
                  <td className="py-2.5 px-3 text-slate-500">{log.device} • {log.ip}</td>
                  <td className="py-2.5 px-3 text-slate-400 font-sans">{formatDate(log.timestamp)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
