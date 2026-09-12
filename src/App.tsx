import React, { useState, useEffect, useMemo } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { LoginView } from './components/LoginView.tsx';
import { Navbar } from './components/Navbar.tsx';
import { Sidebar } from './components/Sidebar.tsx';
import { DashboardView } from './components/DashboardView.tsx';
import { FileManager } from './components/FileManager.tsx';
import { FolderManager } from './components/FolderManager.tsx';
import { UploadModal } from './components/UploadModal.tsx';
import { VideoPlayerModal } from './components/VideoPlayerModal.tsx';
import { AudioPlayerModal } from './components/AudioPlayerModal.tsx';
import { DocumentViewerModal } from './components/DocumentViewerModal.tsx';
import { FileInfoModal } from './components/FileInfoModal.tsx';
import { ShareModal } from './components/ShareModal.tsx';
import { MoveModal } from './components/MoveModal.tsx';
import { AdminUsersView } from './components/AdminUsersView.tsx';
import { AdminStorageView } from './components/AdminStorageView.tsx';
import { AdminReportsView } from './components/AdminReportsView.tsx';
import { AdminSecurityView } from './components/AdminSecurityView.tsx';
import { SettingsView } from './components/SettingsView.tsx';
import { AboutView } from './components/AboutView.tsx';
import { FileItem, Folder, UserStats, ViewTab } from './types.ts';
import { api, syncLocalFilesToServer, initRealtimeCloudSync } from './services/api.ts';
import { Loader2, Trash2, Check, AlertCircle, RotateCcw } from 'lucide-react';

const MainApp: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();

  // Navigation & View state
  const [currentTab, setCurrentTab] = useState<ViewTab>('dashboard');
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Data state
  const [files, setFiles] = useState<FileItem[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loadingData, setLoadingData] = useState(false);

  // Active Modals
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [activeVideoFile, setActiveVideoFile] = useState<FileItem | null>(null);
  const [activeAudioFile, setActiveAudioFile] = useState<FileItem | null>(null);
  const [activeDocumentFile, setActiveDocumentFile] = useState<FileItem | null>(null);
  const [activeInfoFile, setActiveInfoFile] = useState<FileItem | null>(null);
  const [activeShareFile, setActiveShareFile] = useState<FileItem | null>(null);
  const [movingItem, setMovingItem] = useState<{ item: FileItem | Folder; type: 'file' | 'folder' } | null>(null);
  const [renamingFile, setRenamingFile] = useState<FileItem | null>(null);
  const [newFileNameInput, setNewFileNameInput] = useState('');

  // Delete / Trash Confirmation Modal State
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<{
    file: FileItem;
    isPermanent: boolean;
  } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Feedback Toast Notification State
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const refreshAllData = async (activeTab = currentTab, activeFolder = currentFolderId) => {
    if (!isAuthenticated) return;
    try {
      const [filesRes, foldersRes, statsRes] = await Promise.all([
        api.files.getAll({
          folder_id: activeTab === 'my_resources' || activeTab === 'folders' ? activeFolder : undefined,
          view:
            activeTab === 'trash'
              ? 'trash'
              : activeTab === 'favorites'
              ? 'favorites'
              : activeTab === 'recent'
              ? 'recent'
              : activeTab === 'shared_with_me'
              ? 'shared_with_me'
              : undefined,
        }),
        api.folders.getAll(),
        api.user.getStats(),
      ]);
      setFiles(filesRes.files);
      setFolders(foldersRes.folders);
      if (activeFolder && !foldersRes.folders.some((f) => f.id === activeFolder)) {
        setCurrentFolderId(null);
      }
      setStats(statsRes.stats);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      setLoadingData(true);
      // Auto-sync any files cached in local device storage to the cloud server
      syncLocalFilesToServer()
        .then((synced) => {
          if (synced > 0) {
            showToast(`Synchronized ${synced} file(s) from device to cloud.`, 'success');
          }
        })
        .finally(() => {
          refreshAllData(currentTab, currentFolderId).finally(() => setLoadingData(false));
        });
    }
  }, [isAuthenticated, currentFolderId, currentTab]);

  // Real-time continuous cross-device synchronization with Firestore online cloud database
  useEffect(() => {
    if (!isAuthenticated) return;

    const cleanupRealtimeSync = initRealtimeCloudSync(() => {
      refreshAllData(currentTab, currentFolderId);
    });

    return () => {
      cleanupRealtimeSync();
    };
  }, [isAuthenticated, currentTab, currentFolderId]);

  // Periodic background sync and focus event listener for instant cross-device updates
  useEffect(() => {
    if (!isAuthenticated) return;

    // Refresh immediately when user switches back to this browser tab (from phone to desktop or vice versa)
    const handleFocus = () => {
      refreshAllData(currentTab, currentFolderId);
    };
    window.addEventListener('focus', handleFocus);

    // Background sync check every 6 seconds if tab is active
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        refreshAllData(currentTab, currentFolderId);
      }
    }, 6000);

    return () => {
      window.removeEventListener('focus', handleFocus);
      clearInterval(interval);
    };
  }, [isAuthenticated, currentTab, currentFolderId]);

  // Tab change resets search or folder navigation when switching main views
  const handleSelectTab = (tab: ViewTab) => {
    setCurrentTab(tab);
    if (tab !== 'my_resources' && tab !== 'folders') {
      setCurrentFolderId(null);
    }
  };

  // Filtered files depending on the active tab and global search term
  const displayedFiles = useMemo(() => {
    let result = [...files];

    // Check both is_trash and in_trash for resilience
    const isTrashed = (f: FileItem) => Boolean(f.is_trash || (f as any).in_trash);
    if (currentTab === 'trash') {
      result = result.filter(isTrashed);
    } else {
      result = result.filter((f) => !isTrashed(f));
    }

    // Category filtering
    if (currentTab === 'videos') {
      result = result.filter((f) => ['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(f.file_type.toLowerCase()));
    } else if (currentTab === 'audio') {
      result = result.filter((f) => ['mp3', 'wav', 'm4a', 'aac', 'ogg'].includes(f.file_type.toLowerCase()));
    } else if (currentTab === 'documents') {
      result = result.filter((f) =>
        ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt'].includes(f.file_type.toLowerCase())
      );
    } else if (currentTab === 'images') {
      result = result.filter((f) => ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(f.file_type.toLowerCase()));
    } else if (currentTab === 'favorites') {
      result = result.filter((f) => f.is_favorite);
    } else if (currentTab === 'shared_with_me') {
      result = result.filter((f) => f.user_id !== user?.id);
    } else if (currentTab === 'recent') {
      result = result.sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime());
    }

    // Search query filter
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(
        (f) =>
          f.file_name.toLowerCase().includes(q) ||
          f.file_type.toLowerCase().includes(q) ||
          (f.description && f.description.toLowerCase().includes(q)) ||
          (f.owner_name && f.owner_name.toLowerCase().includes(q))
      );
    }

    return result;
  }, [files, currentTab, searchTerm, user]);

  // Actions
  const handleDownloadFile = async (file: FileItem) => {
    showToast(`Downloading "${file.file_name}"...`, 'info');
    try {
      await api.files.download(file.id, file.file_name);
    } catch {
      showToast('Download failed. Please check network connection.', 'error');
    }
  };

  const handleToggleFavorite = async (file: FileItem) => {
    try {
      await api.files.toggleFavorite(file.id);
      setFiles((prev) =>
        prev.map((f) => (f.id === file.id ? { ...f, is_favorite: !f.is_favorite } : f))
      );
    } catch {
      // ignore
    }
  };

  // Open confirmation modal for Move to Trash or Permanent Delete
  const handleDeleteFile = (file: FileItem) => {
    setDeleteConfirmTarget({
      file,
      isPermanent: currentTab === 'trash',
    });
  };

  // Execute deletion upon confirmation
  const handleExecuteDelete = async () => {
    if (!deleteConfirmTarget) return;
    const { file, isPermanent } = deleteConfirmTarget;
    setDeleteLoading(true);

    try {
      if (isPermanent) {
        await api.files.delete(file.id, true);
        setFiles((prev) => prev.filter((f) => f.id !== file.id));
        showToast(`Permanently deleted "${file.file_name}"`, 'success');
      } else {
        await api.files.moveToTrash(file.id);
        // Immediately remove from current active listing
        setFiles((prev) => prev.filter((f) => f.id !== file.id));
        showToast(`Moved "${file.file_name}" to Trash`, 'success');
      }
      setDeleteConfirmTarget(null);
      refreshAllData(currentTab, currentFolderId);
    } catch (err: any) {
      showToast(err?.message || 'Failed to delete resource.', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleRestoreFile = async (file: FileItem) => {
    try {
      await api.files.restoreFromTrash(file.id);
      setFiles((prev) => prev.filter((f) => f.id !== file.id));
      showToast(`Restored "${file.file_name}" from Trash`, 'success');
      refreshAllData(currentTab, currentFolderId);
    } catch (err: any) {
      showToast(err?.message || 'Failed to restore file.', 'error');
    }
  };

  const handleEmptyTrash = async () => {
    const trashedFiles = files.filter((f) => f.is_trash || (f as any).in_trash);
    if (trashedFiles.length === 0) return;
    try {
      await Promise.all(trashedFiles.map((f) => api.files.delete(f.id, true)));
      setFiles([]);
      showToast('All items in Trash permanently cleared.', 'success');
      refreshAllData(currentTab, currentFolderId);
    } catch {
      showToast('Failed to empty trash.', 'error');
    }
  };

  const handleSaveRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renamingFile || !newFileNameInput.trim()) return;

    try {
      await api.files.rename(renamingFile.id, newFileNameInput.trim());
      setFiles((prev) =>
        prev.map((f) => (f.id === renamingFile.id ? { ...f, file_name: newFileNameInput.trim() } : f))
      );
      setRenamingFile(null);
    } catch {
      alert('Failed to rename file.');
    }
  };

  const handleMoveItem = async (targetFolderId: string | null) => {
    if (!movingItem) return;
    try {
      if (movingItem.type === 'file') {
        await api.files.move(movingItem.item.id, targetFolderId);
      } else {
        await api.folders.update(movingItem.item.id, { parent_folder_id: targetFolderId });
      }
      refreshAllData();
      setMovingItem(null);
    } catch {
      alert('Failed to move item.');
    }
  };

  const handleCopyFile = async (file: FileItem) => {
    try {
      await api.files.copy(file.id);
      refreshAllData();
    } catch {
      alert('Failed to make a copy.');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
        <p className="text-sm font-semibold text-slate-700">Connecting to Teacher Resource Hub...</p>
        <p className="text-2xs text-slate-400 mt-1">Verifying cloud credentials</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginView />;
  }

  return (
    <div id="teacher-resource-hub-app" className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* Top Navigation */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        onOpenUpload={() => setIsUploadOpen(true)}
        onSearch={setSearchTerm}
        searchTerm={searchTerm}
        onToggleSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        stats={stats}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Responsive Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={handleSelectTab}
          isOpenMobile={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
          onOpenUpload={() => setIsUploadOpen(true)}
          stats={stats}
        />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {/* TAB: DASHBOARD */}
            {currentTab === 'dashboard' && (
              <DashboardView
                stats={stats}
                recentFiles={files.filter((f) => !f.in_trash)}
                onSelectTab={handleSelectTab}
                onOpenUpload={() => setIsUploadOpen(true)}
                onPlayVideo={(f) => setActiveVideoFile(f)}
                onPlayAudio={(f) => setActiveAudioFile(f)}
                onPreviewDocument={(f) => setActiveDocumentFile(f)}
                onShowInfo={(f) => setActiveInfoFile(f)}
              />
            )}

            {/* TAB: FOLDERS */}
            {currentTab === 'folders' && (
              <FolderManager
                folders={folders}
                onFoldersChanged={refreshAllData}
                onOpenFolder={(fId) => {
                  setCurrentFolderId(fId);
                  setCurrentTab('my_resources');
                }}
                onUploadToFolder={(fId) => {
                  setCurrentFolderId(fId);
                  setIsUploadOpen(true);
                }}
              />
            )}

            {/* TABS: FILE MANAGER VIEWS (My Resources, Videos, Audio, Documents, Images, Shared, Favorites, Recent, Trash) */}
            {[
              'my_resources',
              'videos',
              'audio',
              'documents',
              'images',
              'shared_with_me',
              'favorites',
              'recent',
              'trash',
            ].includes(currentTab) && (
              <div className="space-y-4">
                {/* View Title */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 capitalize">
                      {currentTab === 'my_resources'
                        ? 'My Teaching Resources'
                        : currentTab === 'shared_with_me'
                        ? 'Shared With Me'
                        : currentTab}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {currentTab === 'videos'
                        ? 'Video lectures and screen recordings with integrated player.'
                        : currentTab === 'audio'
                        ? 'Audio lessons and voice notes with integrated waveform player.'
                        : currentTab === 'documents'
                        ? 'PDFs, Word documents, worksheets, and presentations.'
                        : currentTab === 'trash'
                        ? 'Deleted files. Restore or permanently delete them.'
                        : 'Manage, search, organize, preview, and download educational resources.'}
                    </p>
                  </div>

                  {currentTab === 'trash' ? (
                    displayedFiles.length > 0 && (
                      <button
                        type="button"
                        onClick={handleEmptyTrash}
                        className="px-3.5 py-2 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 rounded-xl text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto flex items-center space-x-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-600" />
                        <span>Empty Trash</span>
                      </button>
                    )
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsUploadOpen(true)}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors self-start sm:self-auto"
                    >
                      Upload Here
                    </button>
                  )}
                </div>

                <FileManager
                  files={displayedFiles}
                  folders={folders}
                  currentFolderId={currentFolderId}
                  onNavigateFolder={setCurrentFolderId}
                  onPlayVideo={(f) => setActiveVideoFile(f)}
                  onPlayAudio={(f) => setActiveAudioFile(f)}
                  onPreviewDocument={(f) => setActiveDocumentFile(f)}
                  onDownload={handleDownloadFile}
                  onRename={(f) => {
                    setRenamingFile(f);
                    setNewFileNameInput(f.file_name);
                  }}
                  onMove={(f) => setMovingItem({ item: f, type: 'file' })}
                  onCopy={handleCopyFile}
                  onShare={(f) => setActiveShareFile(f)}
                  onDelete={handleDeleteFile}
                  onRestore={handleRestoreFile}
                  onToggleFavorite={handleToggleFavorite}
                  onShowInfo={(f) => setActiveInfoFile(f)}
                  onOpenUpload={() => setIsUploadOpen(true)}
                  currentViewTab={currentTab}
                  isTrashView={currentTab === 'trash'}
                  onRefresh={() => refreshAllData(currentTab, currentFolderId)}
                  showToast={showToast}
                />
              </div>
            )}

            {/* TAB: SETTINGS */}
            {currentTab === 'settings' && <SettingsView />}

            {/* TAB: ABOUT */}
            {currentTab === 'about' && <AboutView />}

            {/* ADMIN TABS */}
            {currentTab === 'admin_users' && <AdminUsersView />}
            {currentTab === 'admin_storage' && <AdminStorageView />}
            {currentTab === 'admin_reports' && <AdminReportsView />}
            {currentTab === 'admin_security' && (
              <AdminSecurityView
                onPlayVideo={(f) => setActiveVideoFile(f)}
                onPreviewDocument={(f) => setActiveDocumentFile(f)}
              />
            )}
          </div>
        </main>
      </div>

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        folders={folders}
        currentFolderId={currentFolderId}
        onUploadSuccess={refreshAllData}
      />

      {/* Video Player Modal */}
      <VideoPlayerModal
        file={activeVideoFile}
        onClose={() => setActiveVideoFile(null)}
        onDownload={handleDownloadFile}
      />

      {/* Audio Player Modal */}
      <AudioPlayerModal
        file={activeAudioFile}
        onClose={() => setActiveAudioFile(null)}
        onDownload={handleDownloadFile}
      />

      {/* Document Viewer Modal */}
      <DocumentViewerModal
        file={activeDocumentFile}
        onClose={() => setActiveDocumentFile(null)}
        onDownload={handleDownloadFile}
        onRename={(f, newName) => {
          api.files.rename(f.id, newName).then(() => {
            setActiveDocumentFile((prev) => (prev ? { ...prev, file_name: newName } : null));
            refreshAllData();
          });
        }}
        onDelete={(f) => {
          handleDeleteFile(f);
          setActiveDocumentFile(null);
        }}
        onShare={(f) => setActiveShareFile(f)}
      />

      {/* File Information Modal */}
      <FileInfoModal
        file={activeInfoFile}
        folder={folders.find((fld) => fld.id === activeInfoFile?.folder_id)}
        onClose={() => setActiveInfoFile(null)}
        onDownload={handleDownloadFile}
      />

      {/* Share Modal */}
      <ShareModal
        file={activeShareFile}
        onClose={() => setActiveShareFile(null)}
        onShareUpdated={refreshAllData}
      />

      {/* Move Modal */}
      <MoveModal
        item={movingItem?.item || null}
        type={movingItem?.type || 'file'}
        folders={folders}
        onClose={() => setMovingItem(null)}
        onMove={handleMoveItem}
      />

      {/* Rename File Modal */}
      {renamingFile && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100">
            <h3 className="font-bold text-slate-900 text-base mb-1">Rename File</h3>
            <p className="text-xs text-slate-500 mb-4">Enter a new name for this resource.</p>

            <form onSubmit={handleSaveRename} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Resource Name</label>
                <input
                  type="text"
                  required
                  value={newFileNameInput}
                  onChange={(e) => setNewFileNameInput(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-600 outline-none"
                  autoFocus
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRenamingFile(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700"
                >
                  Save Name
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete / Move to Trash Confirmation Modal */}
      {deleteConfirmTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-xl bg-red-100 text-red-600 flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">
              {deleteConfirmTarget.isPermanent ? 'Permanently Delete Resource?' : 'Move Resource to Trash?'}
            </h3>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              {deleteConfirmTarget.isPermanent
                ? `Are you sure you want to permanently delete "${deleteConfirmTarget.file.file_name}"? This action cannot be undone and will permanently remove the file from cloud storage.`
                : `Do you want to move "${deleteConfirmTarget.file.file_name}" to Trash? You can restore it later from the Trash tab.`}
            </p>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                disabled={deleteLoading}
                onClick={() => setDeleteConfirmTarget(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteLoading}
                onClick={handleExecuteDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 shadow-xs transition-colors flex items-center"
              >
                {deleteLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    Processing...
                  </>
                ) : deleteConfirmTarget.isPermanent ? (
                  'Delete Permanently'
                ) : (
                  'Move to Trash'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold flex items-center space-x-2 animate-in fade-in slide-in-from-bottom-2 ${
            toastMessage.type === 'error'
              ? 'bg-red-50 text-red-700 border-red-200'
              : toastMessage.type === 'info'
              ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
          }`}
        >
          {toastMessage.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          ) : toastMessage.type === 'info' ? (
            <Loader2 className="w-4 h-4 text-indigo-600 animate-spin flex-shrink-0" />
          ) : (
            <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
