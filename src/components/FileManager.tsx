import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Grid,
  List,
  Film,
  Music,
  FileText,
  Image as ImageIcon,
  File as FileIcon,
  Download,
  Share2,
  Trash2,
  RotateCcw,
  Copy,
  Move,
  Info,
  Star,
  Play,
  Eye,
  Smartphone,
  Laptop,
  Folder as FolderIcon,
  ChevronRight,
  MoreVertical,
  UploadCloud,
  Calendar,
  CheckSquare,
  Square,
  MinusSquare,
  X,
  Loader2,
  Check,
  RefreshCw,
  Archive,
  AlertTriangle,
} from 'lucide-react';
import { FileItem, Folder, ViewTab } from '../types.ts';
import { formatBytes, formatDate } from '../utils/format.ts';
import { api } from '../services/api.ts';
import { BulkMoveModal } from './BulkMoveModal.tsx';
import { BulkDeleteModal } from './BulkDeleteModal.tsx';

export type DateFilterType =
  | 'all'
  | 'today'
  | '7days'
  | '30days'
  | '90days'
  | 'year'
  | 'custom';

interface FileManagerProps {
  files: FileItem[];
  folders: Folder[];
  currentFolderId: string | null;
  onNavigateFolder: (folderId: string | null) => void;
  onPlayVideo: (file: FileItem) => void;
  onPlayAudio: (file: FileItem) => void;
  onPreviewDocument: (file: FileItem) => void;
  onDownload: (file: FileItem) => void;
  onRename: (file: FileItem) => void;
  onMove: (file: FileItem) => void;
  onCopy: (file: FileItem) => void;
  onShare: (file: FileItem) => void;
  onDelete: (file: FileItem) => void;
  onRestore?: (file: FileItem) => void;
  onToggleFavorite: (file: FileItem) => void;
  onShowInfo: (file: FileItem) => void;
  onOpenUpload: () => void;
  currentViewTab: ViewTab;
  isTrashView?: boolean;
  onRefresh?: () => void;
  showToast?: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

export const FileManager: React.FC<FileManagerProps> = ({
  files,
  folders,
  currentFolderId,
  onNavigateFolder,
  onPlayVideo,
  onPlayAudio,
  onPreviewDocument,
  onDownload,
  onRename,
  onMove,
  onCopy,
  onShare,
  onDelete,
  onRestore,
  onToggleFavorite,
  onShowInfo,
  onOpenUpload,
  currentViewTab,
  isTrashView = false,
  onRefresh,
  showToast,
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Date Range Filtering
  const [dateRangeFilter, setDateRangeFilter] = useState<DateFilterType>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [isDateFilterOpen, setIsDateFilterOpen] = useState(false);
  const dateDropdownRef = useRef<HTMLDivElement>(null);

  // Bulk Selection State
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());
  const [isBulkMoveOpen, setIsBulkMoveOpen] = useState(false);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [isBulkDownloading, setIsBulkDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<{ current: number; total: number } | null>(
    null
  );

  // Folder Deletion State
  const [folderToDelete, setFolderToDelete] = useState<Folder | null>(null);
  const [isDeletingFolder, setIsDeletingFolder] = useState(false);
  const [deleteFolderError, setDeleteFolderError] = useState<string | null>(null);

  const confirmDeleteFolder = async () => {
    if (!folderToDelete) return;
    setIsDeletingFolder(true);
    setDeleteFolderError(null);
    try {
      await api.folders.delete(folderToDelete.id);
      const name = folderToDelete.folder_name;
      if (currentFolderId === folderToDelete.id) {
        onNavigateFolder(null);
      }
      setFolderToDelete(null);
      if (onRefresh) onRefresh();
      if (showToast) {
        showToast(`Folder "${name}" deleted successfully.`, 'success');
      }
    } catch (err: unknown) {
      console.error('Delete folder error:', err);
      setDeleteFolderError(err instanceof Error ? err.message : 'Failed to delete folder.');
    } finally {
      setIsDeletingFolder(false);
    }
  };

  // Close date dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dateDropdownRef.current && !dateDropdownRef.current.contains(e.target as Node)) {
        setIsDateFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter files by upload date
  const filteredFiles = useMemo(() => {
    if (dateRangeFilter === 'all') return files;
    const now = new Date();

    return files.filter((f) => {
      if (!f.uploaded_at) return false;
      const uploaded = new Date(f.uploaded_at);
      if (isNaN(uploaded.getTime())) return false;

      if (dateRangeFilter === 'today') {
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        return uploaded >= startOfToday;
      }
      if (dateRangeFilter === '7days') {
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return uploaded >= sevenDaysAgo;
      }
      if (dateRangeFilter === '30days') {
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return uploaded >= thirtyDaysAgo;
      }
      if (dateRangeFilter === '90days') {
        const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        return uploaded >= ninetyDaysAgo;
      }
      if (dateRangeFilter === 'year') {
        const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        return uploaded >= yearAgo;
      }
      if (dateRangeFilter === 'custom') {
        if (customStartDate) {
          const start = new Date(`${customStartDate}T00:00:00`);
          if (uploaded < start) return false;
        }
        if (customEndDate) {
          const end = new Date(`${customEndDate}T23:59:59`);
          if (uploaded > end) return false;
        }
        return true;
      }
      return true;
    });
  }, [files, dateRangeFilter, customStartDate, customEndDate]);

  // Selected files object array
  const selectedFileList = useMemo(() => {
    return filteredFiles.filter((f) => selectedFileIds.has(f.id));
  }, [filteredFiles, selectedFileIds]);

  const totalSelectedBytes = useMemo(() => {
    return selectedFileList.reduce((sum, f) => sum + (f.file_size || 0), 0);
  }, [selectedFileList]);

  // Bulk Selection Helpers
  const isAllSelected =
    filteredFiles.length > 0 && selectedFileList.length === filteredFiles.length;
  const isPartialSelected =
    selectedFileList.length > 0 && selectedFileList.length < filteredFiles.length;

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedFileIds(new Set());
    } else {
      setSelectedFileIds(new Set(filteredFiles.map((f) => f.id)));
    }
  };

  const handleToggleSelectOne = (fileId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedFileIds((prev) => {
      const next = new Set(prev);
      if (next.has(fileId)) {
        next.delete(fileId);
      } else {
        next.add(fileId);
      }
      return next;
    });
  };

  const handleClearSelection = () => {
    setSelectedFileIds(new Set());
  };

  // Bulk Actions
  const handleExecuteBulkDownload = async (asZip = true) => {
    if (selectedFileList.length === 0) return;
    setIsBulkDownloading(true);
    setDownloadProgress({ current: 0, total: selectedFileList.length });

    try {
      if (selectedFileList.length === 1) {
        // Single file: direct download
        if (showToast) {
          showToast(`Downloading "${selectedFileList[0].file_name}"...`, 'info');
        }
        await api.files.download(selectedFileList[0].id, selectedFileList[0].file_name);
        if (showToast) {
          showToast(`Downloaded "${selectedFileList[0].file_name}".`, 'success');
        }
      } else if (asZip) {
        // 2 or more files: stream ZIP archive (100% reliable on iOS Safari, Android Chrome, and Desktop)
        if (showToast) {
          showToast(
            `Packaging and downloading ${selectedFileList.length} files as ZIP archive...`,
            'info'
          );
        }
        const fileIds = selectedFileList.map((f) => f.id);
        const zipName = `Teacher_Resources_${selectedFileList.length}_files.zip`;
        await api.files.downloadZip(fileIds, zipName);
        if (showToast) {
          showToast(
            `Downloaded ${selectedFileList.length} files as "${zipName}".`,
            'success'
          );
        }
      } else {
        // Sequential individual download
        if (showToast) {
          showToast(
            `Starting download of ${selectedFileList.length} resources individually...`,
            'info'
          );
        }
        for (let i = 0; i < selectedFileList.length; i++) {
          const file = selectedFileList[i];
          setDownloadProgress({ current: i + 1, total: selectedFileList.length });
          await api.files.download(file.id, file.file_name);
          if (i < selectedFileList.length - 1) {
            await new Promise((res) => setTimeout(res, 400));
          }
        }
        if (showToast) {
          showToast(`Downloaded ${selectedFileList.length} resources.`, 'success');
        }
      }
    } catch (err: any) {
      if (showToast) {
        showToast(err.message || 'Error occurred during download.', 'error');
      }
    } finally {
      setIsBulkDownloading(false);
      setDownloadProgress(null);
    }
  };

  const handleExecuteBulkMove = async (targetFolderId: string | null) => {
    const ids: string[] = [...selectedFileIds];
    if (ids.length === 0) return;

    try {
      const res = await api.files.bulkMove(ids, targetFolderId);
      if (showToast) {
        showToast(res.message || `Moved ${ids.length} resources.`, 'success');
      }
      setSelectedFileIds(new Set());
      if (onRefresh) onRefresh();
    } catch (err: any) {
      if (showToast) {
        showToast(err?.message || 'Failed to move resources.', 'error');
      }
    }
  };

  const handleExecuteBulkDelete = async () => {
    const ids: string[] = [...selectedFileIds];
    if (ids.length === 0) return;

    try {
      const res = await api.files.bulkDelete(ids, isTrashView);
      if (showToast) {
        showToast(res.message || `Deleted ${ids.length} resources.`, 'success');
      }
      setSelectedFileIds(new Set());
      if (onRefresh) onRefresh();
    } catch (err: any) {
      if (showToast) {
        showToast(err?.message || 'Failed to delete resources.', 'error');
      }
    }
  };

  // Build breadcrumb trail
  const getBreadcrumbs = (): Array<{ id: string | null; name: string }> => {
    const trail: Array<{ id: string | null; name: string }> = [
      { id: null, name: 'Teaching Resources' },
    ];
    if (!currentFolderId) return trail;

    const hierarchy: Array<{ id: string; name: string }> = [];
    let cur: Folder | undefined = folders.find((f) => f.id === currentFolderId);

    while (cur) {
      hierarchy.unshift({ id: cur.id, name: cur.folder_name });
      if (cur.parent_folder_id) {
        cur = folders.find((f) => f.id === cur?.parent_folder_id);
      } else {
        break;
      }
    }

    return [...trail, ...hierarchy];
  };

  const breadcrumbs = getBreadcrumbs();

  // Child folders of the current folder
  const currentSubfolders = folders.filter((f) =>
    currentFolderId ? f.parent_folder_id === currentFolderId : f.parent_folder_id === null
  );

  const getFileCategory = (ext: string): 'video' | 'audio' | 'document' | 'image' | 'other' => {
    const e = ext.toLowerCase().replace('.', '');
    if (['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(e)) return 'video';
    if (['mp3', 'wav', 'm4a', 'aac', 'ogg'].includes(e)) return 'audio';
    if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt'].includes(e))
      return 'document';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(e)) return 'image';
    return 'other';
  };

  const renderFileIcon = (file: FileItem) => {
    const cat = getFileCategory(file.file_type);
    if (cat === 'video') return <Film className="w-5 h-5 text-red-500" />;
    if (cat === 'audio') return <Music className="w-5 h-5 text-pink-500" />;
    if (cat === 'document') return <FileText className="w-5 h-5 text-blue-500" />;
    if (cat === 'image') return <ImageIcon className="w-5 h-5 text-emerald-500" />;
    return <FileIcon className="w-5 h-5 text-slate-500" />;
  };

  const handleItemPrimaryClick = (file: FileItem) => {
    const cat = getFileCategory(file.file_type);
    if (cat === 'video') onPlayVideo(file);
    else if (cat === 'audio') onPlayAudio(file);
    else if (cat === 'document' || cat === 'image') onPreviewDocument(file);
    else onShowInfo(file);
  };

  // Human readable date filter label
  const getDateFilterLabel = () => {
    switch (dateRangeFilter) {
      case 'today':
        return 'Today';
      case '7days':
        return 'Past 7 Days';
      case '30days':
        return 'Past 30 Days';
      case '90days':
        return 'This Term (90d)';
      case 'year':
        return 'Past Year';
      case 'custom':
        return customStartDate || customEndDate ? 'Custom Range' : 'Custom...';
      default:
        return 'All Time';
    }
  };

  return (
    <div id="file-manager-container" className="space-y-4 relative">
      {/* Top Breadcrumb & Controls Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        {/* Breadcrumbs */}
        <div className="flex items-center space-x-1.5 overflow-x-auto text-xs font-medium text-slate-600 py-0.5">
          {breadcrumbs.map((b, idx) => {
            const isLast = idx === breadcrumbs.length - 1;
            return (
              <React.Fragment key={b.id || 'root'}>
                {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />}
                <button
                  type="button"
                  onClick={() => onNavigateFolder(b.id)}
                  className={`hover:text-indigo-600 transition-colors whitespace-nowrap px-1.5 py-0.5 rounded-lg ${
                    isLast ? 'text-indigo-600 font-bold bg-indigo-50' : 'text-slate-600'
                  }`}
                >
                  {b.name}
                </button>
              </React.Fragment>
            );
          })}

          {currentFolderId && (
            <button
              type="button"
              id="delete-current-folder-btn"
              onClick={() => {
                const cur = folders.find((f) => f.id === currentFolderId);
                if (cur) {
                  setFolderToDelete(cur);
                  setDeleteFolderError(null);
                }
              }}
              className="ml-2 inline-flex items-center text-slate-400 hover:text-red-600 hover:bg-red-50 px-2 py-0.5 rounded-lg text-2xs font-semibold transition-colors flex-shrink-0"
              title="Delete this folder"
              aria-label="Delete this folder"
            >
              <Trash2 className="w-3 h-3 mr-1 text-red-500" />
              Delete Folder
            </button>
          )}
        </div>

        {/* Controls: Date-Range Filter, Resource Count, & View Switcher */}
        <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
          {/* Date-Range Filter Dropdown */}
          <div className="relative" ref={dateDropdownRef}>
            <div className="inline-flex items-center">
              <button
                type="button"
                id="date-filter-dropdown-btn"
                onClick={() => setIsDateFilterOpen(!isDateFilterOpen)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border inline-flex items-center space-x-1.5 transition-colors ${
                  dateRangeFilter !== 'all'
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>Date: {getDateFilterLabel()}</span>
              </button>

              {dateRangeFilter !== 'all' && (
                <button
                  type="button"
                  title="Clear date filter"
                  onClick={() => {
                    setDateRangeFilter('all');
                    setCustomStartDate('');
                    setCustomEndDate('');
                  }}
                  className="ml-1 p-1 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Date Range Dropdown Menu */}
            {isDateFilterOpen && (
              <div className="absolute left-0 sm:right-0 sm:left-auto top-full mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 p-2 z-40 text-xs text-slate-700 animate-in fade-in space-y-1">
                <div className="px-2 py-1 text-2xs font-bold text-slate-400 uppercase tracking-wider">
                  Filter Upload Date
                </div>

                {[
                  { id: 'all', label: 'All Time' },
                  { id: 'today', label: 'Uploaded Today' },
                  { id: '7days', label: 'Past 7 Days' },
                  { id: '30days', label: 'Past 30 Days' },
                  { id: '90days', label: 'This Term (Past 90 Days)' },
                  { id: 'year', label: 'Past Academic Year (365 Days)' },
                  { id: 'custom', label: 'Custom Date Range...' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setDateRangeFilter(opt.id as DateFilterType);
                      if (opt.id !== 'custom') {
                        setIsDateFilterOpen(false);
                      }
                    }}
                    className={`w-full px-2.5 py-1.5 rounded-lg text-left flex items-center justify-between transition-colors ${
                      dateRangeFilter === opt.id
                        ? 'bg-indigo-50 font-semibold text-indigo-900'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {dateRangeFilter === opt.id && (
                      <Check className="w-3.5 h-3.5 text-indigo-600" />
                    )}
                  </button>
                ))}

                {/* Custom Date Inputs */}
                {dateRangeFilter === 'custom' && (
                  <div className="pt-2 mt-2 border-t border-slate-100 space-y-2 px-1">
                    <div>
                      <label className="text-2xs font-semibold text-slate-500 block mb-1">
                        From Date:
                      </label>
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="w-full text-xs p-1.5 rounded-lg border border-slate-200 focus:outline-hidden focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="text-2xs font-semibold text-slate-500 block mb-1">
                        To Date:
                      </label>
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="w-full text-xs p-1.5 rounded-lg border border-slate-200 focus:outline-hidden focus:border-indigo-500"
                      />
                    </div>
                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => setIsDateFilterOpen(false)}
                        className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-2xs font-semibold"
                      >
                        Apply Filter
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Resource Count Badge */}
          <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap">
            {filteredFiles.length} of {files.length} resource{files.length !== 1 ? 's' : ''}
          </span>

          {/* Grid/List Switcher */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              id="view-grid-btn"
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white shadow-xs text-indigo-600 font-bold'
                  : 'text-slate-400 hover:text-slate-700'
              }`}
              title="Grid View"
            >
              <Grid className="w-3.5 h-3.5" />
            </button>
            <button
              id="view-list-btn"
              type="button"
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === 'list'
                  ? 'bg-white shadow-xs text-indigo-600 font-bold'
                  : 'text-slate-400 hover:text-slate-700'
              }`}
              title="List View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Cloud Sync Button */}
          {onRefresh && (
            <button
              id="cloud-sync-btn"
              type="button"
              onClick={() => {
                if (onRefresh) onRefresh();
                if (showToast) {
                  showToast('Synchronized with cloud server.', 'success');
                }
              }}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-indigo-600 transition-colors shadow-2xs flex items-center"
              title="Sync resources across mobile & desktop devices"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Floating / Sticky Bulk Selection Actions Toolbar */}
      {selectedFileIds.size > 0 && (
        <div
          id="bulk-selection-toolbar"
          className="sticky top-2 z-30 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl border border-slate-800 flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2"
        >
          {/* Left: Count & Select All */}
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={handleToggleSelectAll}
              className="flex items-center space-x-2 text-xs font-semibold text-indigo-300 hover:text-white transition-colors"
            >
              {isAllSelected ? (
                <CheckSquare className="w-4 h-4 text-indigo-400 fill-indigo-400" />
              ) : isPartialSelected ? (
                <MinusSquare className="w-4 h-4 text-indigo-400" />
              ) : (
                <Square className="w-4 h-4 text-slate-400" />
              )}
              <span>
                {selectedFileIds.size} Selected ({formatBytes(totalSelectedBytes)})
              </span>
            </button>

            <span className="text-slate-600">|</span>

            <button
              type="button"
              onClick={handleToggleSelectAll}
              className="text-2xs text-slate-300 hover:text-white underline underline-offset-2 font-medium"
            >
              {isAllSelected
                ? 'Deselect All'
                : `Select All (${filteredFiles.length})`}
            </button>
          </div>

          {/* Right: Action Buttons */}
          <div className="flex items-center space-x-2">
            {/* Bulk Download Button */}
            {selectedFileIds.size > 1 ? (
              <div className="flex items-center space-x-1.5">
                <button
                  type="button"
                  id="bulk-download-zip-btn"
                  onClick={() => handleExecuteBulkDownload(true)}
                  disabled={isBulkDownloading}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold inline-flex items-center transition-colors shadow-xs disabled:opacity-50"
                  title="Download all selected files together in a ZIP file (works across all mobile & desktop browsers)"
                >
                  {isBulkDownloading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin text-white" />
                      <span>Creating ZIP...</span>
                    </>
                  ) : (
                    <>
                      <Archive className="w-3.5 h-3.5 mr-1.5 text-indigo-200" />
                      <span>Download All as ZIP ({selectedFileIds.size})</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  id="bulk-download-separate-btn"
                  onClick={() => handleExecuteBulkDownload(false)}
                  disabled={isBulkDownloading}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium inline-flex items-center transition-colors border border-slate-700 disabled:opacity-50"
                  title="Download files individually"
                >
                  <Download className="w-3 h-3 mr-1 text-slate-400" />
                  <span>Separately</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                id="bulk-download-btn"
                onClick={() => handleExecuteBulkDownload(false)}
                disabled={isBulkDownloading}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold inline-flex items-center transition-colors border border-slate-700 disabled:opacity-50"
                title="Download selected resource"
              >
                {isBulkDownloading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin text-indigo-400" />
                    <span>Downloading...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5 mr-1.5 text-indigo-400" />
                    <span>Download</span>
                  </>
                )}
              </button>
            )}

            {/* Bulk Move Button (not in trash view) */}
            {!isTrashView && (
              <button
                type="button"
                id="bulk-move-btn"
                onClick={() => setIsBulkMoveOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold inline-flex items-center transition-colors border border-slate-700"
                title="Move selected resources to folder"
              >
                <Move className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
                <span>Move ({selectedFileIds.size})</span>
              </button>
            )}

            {/* Bulk Delete Button */}
            <button
              type="button"
              id="bulk-delete-btn"
              onClick={() => setIsBulkDeleteOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-red-950/80 hover:bg-red-900 text-red-200 text-xs font-semibold inline-flex items-center transition-colors border border-red-800"
              title={
                isTrashView
                  ? 'Permanently delete selected files'
                  : 'Move selected files to trash'
              }
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5 text-red-400" />
              <span>
                {isTrashView ? 'Delete Permanently' : 'Trash'} ({selectedFileIds.size})
              </span>
            </button>

            {/* Clear Selection Button */}
            <button
              type="button"
              onClick={handleClearSelection}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              title="Clear selection"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Subfolder Chips (if any) */}
      {currentSubfolders.length > 0 && currentViewTab !== 'trash' && (
        <div className="space-y-1.5">
          <span className="text-2xs font-bold text-slate-400 uppercase tracking-wider block">
            Folders ({currentSubfolders.length})
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
            {currentSubfolders.map((f) => (
              <div
                key={f.id}
                className="flex items-center justify-between p-2 bg-white rounded-xl border border-slate-200 hover:border-indigo-400 hover:shadow-xs transition-all group"
              >
                <button
                  type="button"
                  onClick={() => onNavigateFolder(f.id)}
                  className="flex items-center space-x-2 truncate flex-1 text-left min-w-0"
                  title={`Open folder "${f.folder_name}"`}
                >
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{
                      backgroundColor: `${f.color || '#3b82f6'}15`,
                      color: f.color || '#3b82f6',
                    }}
                  >
                    <FolderIcon className="w-4 h-4 fill-current" />
                  </div>
                  <div className="truncate flex-1 min-w-0">
                    <div className="font-semibold text-xs text-slate-800 truncate group-hover:text-indigo-600">
                      {f.folder_name}
                    </div>
                  </div>
                </button>
                <button
                  type="button"
                  id={`delete-subfolder-btn-${f.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setFolderToDelete(f);
                    setDeleteFolderError(null);
                  }}
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors ml-1 flex-shrink-0"
                  title={`Delete folder "${f.folder_name}"`}
                  aria-label={`Delete folder ${f.folder_name}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredFiles.length === 0 && currentSubfolders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center my-6">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center mx-auto mb-3">
            <UploadCloud className="w-8 h-8" />
          </div>
          <h3 className="font-bold text-slate-900 text-base mb-1">
            {isTrashView
              ? 'Trash is Empty'
              : dateRangeFilter !== 'all'
              ? 'No Resources Match Date Filter'
              : 'No Resources in this Folder'}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mb-5">
            {isTrashView
              ? 'Deleted files will appear here.'
              : dateRangeFilter !== 'all'
              ? `No resources were uploaded in the selected timeframe (${getDateFilterLabel()}).`
              : 'Upload teaching files, lecture recordings, lesson plans, or worksheets from your computer or mobile phone.'}
          </p>
          {dateRangeFilter !== 'all' ? (
            <button
              type="button"
              onClick={() => {
                setDateRangeFilter('all');
                setCustomStartDate('');
                setCustomEndDate('');
              }}
              className="inline-flex items-center px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-semibold transition-colors border border-indigo-200"
            >
              Reset Date Filter to All Time
            </button>
          ) : (
            !isTrashView && (
              <button
                type="button"
                onClick={onOpenUpload}
                className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
              >
                <UploadCloud className="w-4 h-4 mr-2" />
                Upload Files Now
              </button>
            )
          )}
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3.5">
          {filteredFiles.map((file) => {
            const cat = getFileCategory(file.file_type);
            const isMenuOpen = activeMenuId === file.id;
            const isSelected = selectedFileIds.has(file.id);

            return (
              <div
                key={file.id}
                className={`bg-white rounded-xl border transition-all flex flex-col justify-between overflow-hidden group relative ${
                  isSelected
                    ? 'border-indigo-500 ring-2 ring-indigo-400/50 shadow-md bg-indigo-50/10'
                    : 'border-slate-200 hover:border-indigo-300 hover:shadow-md'
                }`}
              >
                {/* Card Top: Preview / Thumbnail / Selection Checkbox / Favorite */}
                <div
                  onClick={() => handleItemPrimaryClick(file)}
                  className="p-3.5 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between cursor-pointer group-hover:bg-indigo-50/30 transition-colors"
                >
                  <div className="flex items-center space-x-2.5 truncate">
                    {/* Bulk Selection Checkbox */}
                    <button
                      type="button"
                      onClick={(e) => handleToggleSelectOne(file.id, e)}
                      className={`p-1 rounded-md transition-colors flex-shrink-0 ${
                        isSelected
                          ? 'text-indigo-600'
                          : 'text-slate-300 hover:text-slate-600 group-hover:opacity-100'
                      }`}
                      title={isSelected ? 'Deselect resource' : 'Select resource for bulk action'}
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-indigo-600 fill-indigo-50" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>

                    <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center flex-shrink-0 shadow-2xs">
                      {renderFileIcon(file)}
                    </div>
                    <div className="truncate">
                      <span className="font-semibold text-xs text-slate-800 truncate block group-hover:text-indigo-700">
                        {file.file_name}
                      </span>
                      <span className="text-[10px] text-slate-400 uppercase font-mono">
                        {file.file_type} • {formatBytes(file.file_size)}
                      </span>
                    </div>
                  </div>

                  {/* Favorite button */}
                  {!isTrashView && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(file);
                      }}
                      className="p-1 text-slate-300 hover:text-amber-500 rounded transition-colors flex-shrink-0"
                    >
                      <Star
                        className={`w-4 h-4 ${
                          file.is_favorite ? 'fill-amber-400 text-amber-400' : ''
                        }`}
                      />
                    </button>
                  )}
                </div>

                {/* Card Middle: Metadata (Device, Date, Owner) */}
                <div className="p-3 text-2xs text-slate-500 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center text-slate-600 font-medium">
                      {/mobile|iphone|android/i.test(file.device) ? (
                        <Smartphone className="w-3 h-3 mr-1 text-blue-500" />
                      ) : (
                        <Laptop className="w-3 h-3 mr-1 text-indigo-500" />
                      )}
                      <span className="truncate max-w-[120px]">{file.device}</span>
                    </span>
                    <span className="text-slate-400">{formatDate(file.uploaded_at)}</span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                    <span className="text-slate-400 truncate max-w-[110px]">
                      By: {file.owner_name || 'Me'}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] capitalize">
                      {file.sharing_type ? file.sharing_type.replace('_', ' ') : 'Private'}
                    </span>
                  </div>
                </div>

                {/* Card Bottom: Quick Actions */}
                <div className="p-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center space-x-1">
                    <button
                      type="button"
                      onClick={() => handleItemPrimaryClick(file)}
                      className="px-2 py-1 bg-white border border-slate-200 hover:border-indigo-400 text-indigo-600 rounded text-2xs font-semibold flex items-center shadow-2xs"
                    >
                      {cat === 'video' || cat === 'audio' ? (
                        <>
                          <Play className="w-3 h-3 mr-1 fill-indigo-600" /> Play
                        </>
                      ) : (
                        <>
                          <Eye className="w-3 h-3 mr-1" /> View
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => onDownload(file)}
                      className="p-1 text-slate-500 hover:text-slate-800 rounded"
                      title="Download"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>

                    {!isTrashView ? (
                      <button
                        type="button"
                        onClick={() => onDelete(file)}
                        className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-red-50"
                        title="Move to Trash"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      onRestore && (
                        <button
                          type="button"
                          onClick={() => onRestore(file)}
                          className="p-1 text-indigo-600 hover:text-indigo-800 rounded hover:bg-indigo-50"
                          title="Restore Resource"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )
                    )}
                  </div>

                  {/* Actions Dropdown */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setActiveMenuId(isMenuOpen ? null : file.id)}
                      className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-200"
                    >
                      <MoreVertical className="w-3.5 h-3.5" />
                    </button>

                    {isMenuOpen && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute right-0 bottom-8 w-44 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-30 text-xs text-slate-700 animate-in fade-in"
                      >
                        {!isTrashView ? (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                onShowInfo(file);
                                setActiveMenuId(null);
                              }}
                              className="w-full px-3 py-1.5 text-left hover:bg-slate-100 flex items-center space-x-2"
                            >
                              <Info className="w-3.5 h-3.5 text-slate-400" />
                              <span>File Information</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                onShare(file);
                                setActiveMenuId(null);
                              }}
                              className="w-full px-3 py-1.5 text-left hover:bg-slate-100 flex items-center space-x-2"
                            >
                              <Share2 className="w-3.5 h-3.5 text-slate-400" />
                              <span>Share & Permissions</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                onRename(file);
                                setActiveMenuId(null);
                              }}
                              className="w-full px-3 py-1.5 text-left hover:bg-slate-100 flex items-center space-x-2"
                            >
                              <span>Rename</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                onMove(file);
                                setActiveMenuId(null);
                              }}
                              className="w-full px-3 py-1.5 text-left hover:bg-slate-100 flex items-center space-x-2"
                            >
                              <Move className="w-3.5 h-3.5 text-slate-400" />
                              <span>Move Folder</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                onCopy(file);
                                setActiveMenuId(null);
                              }}
                              className="w-full px-3 py-1.5 text-left hover:bg-slate-100 flex items-center space-x-2"
                            >
                              <Copy className="w-3.5 h-3.5 text-slate-400" />
                              <span>Make a Copy</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                onDelete(file);
                                setActiveMenuId(null);
                              }}
                              className="w-full px-3 py-1.5 text-left text-red-600 hover:bg-red-50 flex items-center space-x-2"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Move to Trash</span>
                            </button>
                          </>
                        ) : (
                          <>
                            {onRestore && (
                              <button
                                type="button"
                                onClick={() => {
                                  onRestore(file);
                                  setActiveMenuId(null);
                                }}
                                className="w-full px-3 py-1.5 text-left text-indigo-600 hover:bg-indigo-50 font-medium"
                              >
                                Restore File
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                onDelete(file);
                                setActiveMenuId(null);
                              }}
                              className="w-full px-3 py-1.5 text-left text-red-600 hover:bg-red-50"
                            >
                              Delete Permanently
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* LIST VIEW */
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="sticky top-0 bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-4 py-3 w-10 text-center">
                    <button
                      type="button"
                      onClick={handleToggleSelectAll}
                      className="text-slate-400 hover:text-indigo-600 flex items-center justify-center"
                      title="Select all"
                    >
                      {isAllSelected ? (
                        <CheckSquare className="w-4 h-4 text-indigo-600 fill-indigo-50" />
                      ) : isPartialSelected ? (
                        <MinusSquare className="w-4 h-4 text-indigo-600" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    File Name
                  </th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Size
                  </th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Device
                  </th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Upload Date
                  </th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Owner
                  </th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredFiles.map((file) => {
                  const cat = getFileCategory(file.file_type);
                  const isSelected = selectedFileIds.has(file.id);

                  return (
                    <tr
                      key={file.id}
                      className={`transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-50/50 hover:bg-indigo-50/70'
                          : 'hover:bg-slate-50'
                      }`}
                      onClick={() => handleItemPrimaryClick(file)}
                    >
                      {/* Checkbox column */}
                      <td
                        className="px-4 py-3 text-center"
                        onClick={(e) => handleToggleSelectOne(file.id, e)}
                      >
                        <button
                          type="button"
                          className="text-slate-400 hover:text-indigo-600 flex items-center justify-center mx-auto"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-indigo-600 fill-indigo-50" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-300" />
                          )}
                        </button>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-3 truncate max-w-sm">
                          <div className="p-1.5 bg-slate-50 rounded-lg text-slate-500 border border-slate-200 flex-shrink-0">
                            {renderFileIcon(file)}
                          </div>
                          <span className="font-semibold text-slate-800 truncate hover:text-indigo-600">
                            {file.file_name}
                          </span>
                          {file.is_favorite && (
                            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 flex-shrink-0" />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs font-medium text-slate-600 uppercase">
                        {file.file_type}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-400">
                        {formatBytes(file.file_size)}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        <span className="inline-flex items-center">
                          {/mobile|iphone|android/i.test(file.device) ? (
                            <Smartphone className="w-3 h-3 mr-1 text-blue-500" />
                          ) : (
                            <Laptop className="w-3 h-3 mr-1 text-indigo-500" />
                          )}
                          {file.device}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">
                        {formatDate(file.uploaded_at)}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 font-medium">
                        {file.owner_name || 'Teacher'}
                      </td>
                      <td
                        className="px-4 py-3 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="inline-flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() => handleItemPrimaryClick(file)}
                            className="text-indigo-600 hover:text-indigo-800 font-bold text-xs hover:underline"
                          >
                            {cat === 'video' || cat === 'audio' ? 'Play' : 'Open'}
                          </button>
                          <button
                            type="button"
                            onClick={() => onDownload(file)}
                            className="p-1 text-slate-400 hover:text-slate-600 rounded"
                            title="Download"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          {!isTrashView ? (
                            <>
                              <button
                                type="button"
                                onClick={() => onShare(file)}
                                className="p-1 text-slate-400 hover:text-slate-600 rounded"
                                title="Share"
                              >
                                <Share2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onDelete(file)}
                                className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-red-50"
                                title="Move to Trash"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <>
                              {onRestore && (
                                <button
                                  type="button"
                                  onClick={() => onRestore(file)}
                                  className="px-2 py-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded flex items-center space-x-1"
                                  title="Restore file"
                                >
                                  <RotateCcw className="w-3 h-3 mr-1" /> Restore
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => onDelete(file)}
                                className="p-1 text-red-500 hover:text-red-700 rounded hover:bg-red-50"
                                title="Delete Permanently"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Bulk Move Modal */}
      <BulkMoveModal
        isOpen={isBulkMoveOpen}
        selectedFiles={selectedFileList}
        folders={folders}
        currentFolderId={currentFolderId}
        onClose={() => setIsBulkMoveOpen(false)}
        onConfirm={handleExecuteBulkMove}
      />

      {/* Bulk Delete Modal */}
      <BulkDeleteModal
        isOpen={isBulkDeleteOpen}
        selectedFiles={selectedFileList}
        isPermanent={isTrashView}
        onClose={() => setIsBulkDeleteOpen(false)}
        onConfirm={handleExecuteBulkDelete}
      />

      {/* Delete Folder Confirmation Modal */}
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

            {deleteFolderError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{deleteFolderError}</span>
              </div>
            )}

            <div className="flex justify-end space-x-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={isDeletingFolder}
                onClick={() => {
                  setFolderToDelete(null);
                  setDeleteFolderError(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                id="confirm-delete-subfolder-btn"
                disabled={isDeletingFolder}
                onClick={confirmDeleteFolder}
                className="inline-flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
              >
                {isDeletingFolder ? (
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
    </div>
  );
};
