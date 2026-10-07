import React, { useState, useEffect } from 'react';
import {
  CloudUpload,
  RefreshCw,
  WifiOff,
  Wifi,
  ChevronDown,
  ChevronUp,
  FileText,
  Film,
  Music,
  Image as ImageIcon,
  File,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Folder,
  Plus,
  X,
} from 'lucide-react';
import { pendingSyncManager } from '../services/pendingSyncManager.ts';
import { PendingSyncItem } from '../types.ts';
import { useOnlineStatus } from '../hooks/useOnlineStatus.ts';
import { formatBytes } from '../utils/format.ts';

export const PendingSyncStatusBar: React.FC = () => {
  const { isOnline } = useOnlineStatus();
  const [queue, setQueue] = useState<PendingSyncItem[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<'info' | 'success' | 'error'>('info');

  useEffect(() => {
    const unsubscribe = pendingSyncManager.subscribe((updatedQueue) => {
      setQueue(updatedQueue);
      // If queue has items and we are disconnected or newly queued, expand automatically once
      if (updatedQueue.length > 0 && !isOnline) {
        setIsExpanded(true);
      }
    });
    return () => unsubscribe();
  }, [isOnline]);

  const pendingCount = queue.filter((i) => i.status !== 'synced').length;

  // If there are no items queued and the user is online, no bar needed
  if (queue.length === 0) {
    return null;
  }

  const handleRetrySync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setStatusMessage('Initiating sync for queued offline items...');
    setMessageType('info');

    try {
      const result = await pendingSyncManager.retrySyncQueue();
      if (result.isOffline) {
        setStatusMessage('Still disconnected. Items remain securely stored in offline cache until connection is restored.');
        setMessageType('error');
      } else if (result.failed > 0) {
        setStatusMessage(result.message);
        setMessageType('error');
      } else {
        setStatusMessage(`Successfully synced ${result.succeeded} queued item(s) to cloud!`);
        setMessageType('success');
      }
    } catch (err: any) {
      setStatusMessage(err.message || 'Sync retry encountered an issue.');
      setMessageType('error');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setStatusMessage(null), 5000);
    }
  };

  const handleRetrySingle = async (id: string, fileName: string) => {
    setStatusMessage(`Syncing "${fileName}"...`);
    setMessageType('info');
    const res = await pendingSyncManager.retrySingleItem(id);
    if (res.success) {
      setStatusMessage(res.message);
      setMessageType('success');
    } else {
      setStatusMessage(res.message);
      setMessageType('error');
    }
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const handleRemove = (id: string) => {
    pendingSyncManager.removeFromQueue(id);
  };

  const handleAddDemo = () => {
    const item = pendingSyncManager.addDemoItem();
    setIsExpanded(true);
    setStatusMessage(`Queued demo file "${item.file_name}" for upload.`);
    setMessageType('info');
    setTimeout(() => setStatusMessage(null), 3500);
  };

  const handleClearAll = () => {
    if (confirm('Clear all queued items from offline sync?')) {
      pendingSyncManager.clearQueue();
      setIsExpanded(false);
    }
  };

  const getFileIcon = (fileType: string) => {
    const ext = fileType.toLowerCase();
    if (['mp4', 'webm', 'mov', 'avi'].includes(ext)) {
      return <Film className="w-4 h-4 text-purple-600" />;
    }
    if (['mp3', 'wav', 'aac', 'ogg'].includes(ext)) {
      return <Music className="w-4 h-4 text-emerald-600" />;
    }
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) {
      return <ImageIcon className="w-4 h-4 text-sky-600" />;
    }
    if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt'].includes(ext)) {
      return <FileText className="w-4 h-4 text-indigo-600" />;
    }
    return <File className="w-4 h-4 text-slate-500" />;
  };

  const formatRelativeTime = (isoString: string) => {
    const ms = Date.now() - new Date(isoString).getTime();
    const mins = Math.floor(ms / 60000);
    if (mins < 1) return 'Just now';
    if (mins === 1) return '1 min ago';
    if (mins < 60) return `${mins} mins ago`;
    const hours = Math.floor(mins / 60);
    return `${hours} hr${hours > 1 ? 's' : ''} ago`;
  };

  return (
    <div
      id="pending-sync-status-bar"
      role="region"
      aria-label="Pending Sync Status"
      className="bg-amber-500/15 border-b border-amber-300/80 text-slate-900 transition-all select-none relative z-40 backdrop-blur-xs"
    >
      {/* Top Banner Row */}
      <div className="px-4 py-2.5 sm:px-6 flex flex-wrap items-center justify-between gap-2.5">
        {/* Left: Indicator & Status Text */}
        <div className="flex items-center space-x-3 min-w-0">
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 shadow-xs ${
              !isOnline ? 'bg-amber-600 text-white' : 'bg-indigo-600 text-white'
            }`}
          >
            {!isOnline ? (
              <WifiOff className="w-4 h-4" />
            ) : isSyncing ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <CloudUpload className="w-4 h-4" />
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center space-x-2 flex-wrap">
              <span className="font-bold text-xs sm:text-sm text-slate-900 tracking-tight">
                Pending Sync
              </span>

              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-3xs font-extrabold uppercase tracking-wider bg-amber-200 text-amber-900 border border-amber-300">
                {pendingCount} {pendingCount === 1 ? 'item' : 'items'} queued
              </span>

              {!isOnline ? (
                <span className="inline-flex items-center text-3xs font-semibold text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded-md border border-amber-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-600 mr-1.5 animate-pulse" />
                  Disconnected (Cached locally)
                </span>
              ) : (
                <span className="inline-flex items-center text-3xs font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mr-1.5" />
                  Connection Active
                </span>
              )}
            </div>

            <p className="text-3xs sm:text-2xs text-slate-600 truncate mt-0.5">
              {!isOnline
                ? 'Files uploaded while disconnected are queued safely in offline storage. Reconnect or click Retry Sync to upload.'
                : 'Items are ready to be synchronized with your centralized Firestore cloud database.'}
            </p>
          </div>
        </div>

        {/* Right: Actions & Retry Sync Button */}
        <div className="flex items-center space-x-2 flex-shrink-0">
          {/* Quick Add Demo File button for testing offline capabilities */}
          <button
            id="pending-sync-add-demo-btn"
            type="button"
            onClick={handleAddDemo}
            className="hidden md:inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-2xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 shadow-2xs transition-colors"
            title="Add a sample resource to test offline queueing and sync"
          >
            <Plus className="w-3 h-3 text-indigo-600" />
            <span>Queue Demo File</span>
          </button>

          {/* Toggle Expand Queue Details */}
          <button
            id="pending-sync-toggle-btn"
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-2xs font-bold text-slate-800 bg-white/90 hover:bg-white border border-amber-300 shadow-2xs transition-colors"
            title="Toggle queued item list"
          >
            <span>{isExpanded ? 'Hide Queue' : `View Queue (${pendingCount})`}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {/* Primary 'Retry Sync' Button */}
          <button
            id="pending-sync-retry-btn"
            type="button"
            onClick={handleRetrySync}
            disabled={isSyncing}
            className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 shadow-xs shadow-indigo-200 transition-all hover:scale-[1.02] cursor-pointer"
            title="Retry syncing all queued resources to cloud"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Retry Sync'}</span>
          </button>
        </div>
      </div>

      {/* Transient Status Toast / Message */}
      {statusMessage && (
        <div
          className={`px-4 py-1.5 text-2xs font-semibold border-t flex items-center justify-between transition-colors ${
            messageType === 'success'
              ? 'bg-emerald-100 text-emerald-900 border-emerald-200'
              : messageType === 'error'
              ? 'bg-rose-100 text-rose-900 border-rose-200'
              : 'bg-indigo-100 text-indigo-900 border-indigo-200'
          }`}
        >
          <div className="flex items-center space-x-2">
            {messageType === 'success' ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            ) : messageType === 'error' ? (
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5 text-indigo-600 animate-spin" />
            )}
            <span>{statusMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="text-slate-400 hover:text-slate-700 p-0.5"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Expandable Queued Items Drawer / Tray */}
      {isExpanded && (
        <div
          id="pending-sync-items-drawer"
          className="bg-white/95 border-t border-amber-200 px-4 py-3 sm:px-6 shadow-inner space-y-2.5 animate-in slide-in-from-top-1 duration-150"
        >
          <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-slate-800">
                Queued Resources ({queue.length})
              </span>
              <span className="text-3xs text-slate-500 font-medium">
                Stored in client cache &amp; pending cloud push
              </span>
            </div>

            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={handleClearAll}
                className="text-3xs font-semibold text-rose-600 hover:text-rose-800 transition-colors"
                title="Discard all queued uploads"
              >
                Clear Queue
              </button>
            </div>
          </div>

          {/* List of Queued Files */}
          <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
            {queue.map((item) => {
              const isItemSyncing = item.status === 'syncing';
              const isItemFailed = item.status === 'failed';
              const isItemSynced = item.status === 'synced';

              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2 rounded-xl bg-slate-50 hover:bg-slate-100/90 border border-slate-200 transition-colors text-xs"
                >
                  {/* File Info */}
                  <div className="flex items-center space-x-3 min-w-0 flex-1 mr-3">
                    <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center flex-shrink-0 shadow-2xs">
                      {getFileIcon(item.file_type)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-slate-900 truncate max-w-[220px] sm:max-w-md block">
                          {item.file_name}
                        </span>
                        <span className="text-3xs font-mono text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                          {formatBytes(item.file_size)}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2 text-3xs text-slate-500 mt-0.5 flex-wrap">
                        <span>{formatRelativeTime(item.queued_at)}</span>
                        {item.folder_name && (
                          <span className="flex items-center text-slate-600">
                            <Folder className="w-2.5 h-2.5 mr-0.5 text-amber-500" />
                            {item.folder_name}
                          </span>
                        )}
                        <span className="text-slate-400">• {item.device}</span>
                        {item.error && (
                          <span className="text-rose-600 font-medium truncate max-w-[180px]" title={item.error}>
                            • {item.error}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status & Actions */}
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    {isItemSyncing ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-3xs font-bold text-indigo-700 bg-indigo-100 border border-indigo-200">
                        <RefreshCw className="w-2.5 h-2.5 mr-1 animate-spin" />
                        Syncing
                      </span>
                    ) : isItemSynced ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-3xs font-bold text-emerald-700 bg-emerald-100 border border-emerald-200">
                        <CheckCircle2 className="w-2.5 h-2.5 mr-1" />
                        Synced
                      </span>
                    ) : isItemFailed ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-3xs font-bold text-rose-700 bg-rose-100 border border-rose-200">
                        <AlertTriangle className="w-2.5 h-2.5 mr-1" />
                        Offline / Failed
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-3xs font-bold text-amber-800 bg-amber-100 border border-amber-200">
                        Queued
                      </span>
                    )}

                    {/* Single Retry Button */}
                    <button
                      type="button"
                      onClick={() => handleRetrySingle(item.id, item.file_name)}
                      disabled={isItemSyncing}
                      className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-colors"
                      title="Retry syncing this file now"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isItemSyncing ? 'animate-spin' : ''}`} />
                    </button>

                    {/* Remove from queue */}
                    <button
                      type="button"
                      onClick={() => handleRemove(item.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-colors"
                      title="Remove from sync queue"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
