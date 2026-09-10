import React from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import {
  FolderTree,
  FileText,
  Music,
  Film,
  Image as ImageIcon,
  Files,
  HardDrive,
  UploadCloud,
  Clock,
  Smartphone,
  Laptop,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { UserStats, FileItem, ViewTab } from '../types.ts';
import { formatBytes, formatDate } from '../utils/format.ts';
import { StorageVisualizer } from './StorageVisualizer.tsx';

interface DashboardViewProps {
  stats: UserStats | null;
  recentFiles: FileItem[];
  onSelectTab: (tab: ViewTab) => void;
  onOpenUpload: () => void;
  onPlayVideo: (file: FileItem) => void;
  onPlayAudio: (file: FileItem) => void;
  onPreviewDocument: (file: FileItem) => void;
  onShowInfo: (file: FileItem) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  recentFiles,
  onSelectTab,
  onOpenUpload,
  onPlayVideo,
  onPlayAudio,
  onPreviewDocument,
  onShowInfo,
}) => {
  const { user, currentDevice, isAdmin } = useAuth();

  const storageUsed = stats?.storage_used || 0;
  const storageLimit = stats?.storage_limit || 10 * 1024 * 1024 * 1024;
  const storagePercentage = Math.min(100, Math.round((storageUsed / storageLimit) * 100));

  const statCards = [
    {
      title: 'Folders',
      count: stats?.total_folders || 0,
      icon: <FolderTree className="w-5 h-5 text-blue-600" />,
      bg: 'bg-blue-50',
      subtext: 'Organized subjects',
      actionTab: 'folders' as ViewTab,
    },
    {
      title: 'Documents',
      count: stats?.total_documents ?? stats?.documents ?? 0,
      icon: <FileText className="w-5 h-5 text-indigo-600" />,
      bg: 'bg-indigo-50',
      subtext: 'PDFs, DOCs, Sheets',
      actionTab: 'documents' as ViewTab,
    },
    {
      title: 'Audio Lessons',
      count: stats?.total_audio ?? stats?.audio ?? 0,
      icon: <Music className="w-5 h-5 text-pink-600" />,
      bg: 'bg-pink-50',
      subtext: 'Voice notes & lectures',
      actionTab: 'audio' as ViewTab,
    },
    {
      title: 'Video Lectures',
      count: stats?.total_videos ?? stats?.videos ?? 0,
      icon: <Film className="w-5 h-5 text-red-600" />,
      bg: 'bg-red-50',
      subtext: 'MP4s & recordings',
      actionTab: 'videos' as ViewTab,
    },
    {
      title: 'Images & Media',
      count: stats?.total_images ?? stats?.images ?? 0,
      icon: <ImageIcon className="w-5 h-5 text-emerald-600" />,
      bg: 'bg-emerald-50',
      subtext: 'Diagrams & slides',
      actionTab: 'images' as ViewTab,
    },
    {
      title: 'Other Files',
      count: stats?.total_others ?? stats?.other_files ?? 0,
      icon: <Files className="w-5 h-5 text-amber-600" />,
      bg: 'bg-amber-50',
      subtext: 'Archives & data',
      actionTab: 'my_resources' as ViewTab,
    },
  ];

  return (
    <div id="dashboard-view-container" className="space-y-6">
      {/* Welcome Banner (Professional Polish Design) */}
      <section>
        <div className="bg-indigo-600 rounded-2xl p-6 sm:p-8 text-white flex flex-col md:flex-row items-start md:items-center justify-between shadow-lg shadow-indigo-200 gap-6 relative overflow-hidden">
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-indigo-100 text-xs font-semibold mb-3 backdrop-blur-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Central Cloud Sync Active</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2 text-white">
              Welcome back, {user?.username || 'Teacher'}!
            </h2>
            <p className="text-indigo-100 opacity-95 text-xs sm:text-sm leading-relaxed max-w-xl">
              Access your teaching resources anywhere. Upload from mobile, teach on desktop. All lesson plans, audio recordings, and slides are securely stored in your central repository.
            </p>
          </div>

          <div className="relative z-10 flex flex-wrap sm:flex-nowrap gap-3 flex-shrink-0">
            <button
              id="dashboard-upload-hero-btn"
              type="button"
              onClick={onOpenUpload}
              className="bg-white text-indigo-600 px-6 py-2.5 rounded-xl font-bold text-sm shadow-sm hover:bg-indigo-50 flex items-center gap-2 transition-all hover:scale-[1.01]"
            >
              <UploadCloud className="w-4 h-4" />
              Upload New Resource
            </button>
            <button
              type="button"
              onClick={() => onSelectTab('my_resources')}
              className="bg-indigo-700/80 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-medium text-sm transition-colors border border-indigo-500/40"
            >
              Browse All
            </button>
          </div>
        </div>
      </section>

      {/* Storage Visualizer Component */}
      <StorageVisualizer
        stats={stats}
        onOpenUpload={onOpenUpload}
        onSelectTab={onSelectTab}
        isAdmin={isAdmin}
      />

      {/* Statistics Cards (Professional Polish layout) */}
      <section>
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Resource Statistics
          </div>
          <span className="text-[10px] text-slate-400">Live synced across devices</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {statCards.map((card) => (
            <div
              key={card.title}
              onClick={() => onSelectTab(card.actionTab)}
              className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-indigo-300 transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={`p-2 ${card.bg} rounded-lg flex items-center justify-center`}>
                  {card.icon}
                </div>
              </div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-tight">
                {card.title}
              </div>
              <div className="text-2xl font-bold text-slate-800 group-hover:text-indigo-600 transition-colors mt-1">
                {card.count}
              </div>
              <p className="text-[10px] text-slate-400 mt-1 truncate">
                {card.subtext}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Cross-Device Sync Status Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg flex-shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-800">Cross-Device Synchronization Active</h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Connected on <strong className="text-slate-700">{currentDevice}</strong>. Files uploaded here are accessible on both computer and mobile phone instantly.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-xs font-semibold">
            <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-slate-50 text-slate-700 border border-slate-200 text-xs">
              <Laptop className="w-3.5 h-3.5 mr-1.5 text-indigo-600" />
              Computer Ready
            </span>
            <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-slate-50 text-slate-700 border border-slate-200 text-xs">
              <Smartphone className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
              Mobile Ready
            </span>
          </div>
        </div>
      </div>

      {/* Recent Resources (Professional Polish Table) */}
      <section className="bg-white border border-slate-200 rounded-2xl flex flex-col shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-slate-400" />
            <h3 className="font-bold text-slate-800 text-sm">Recent Resources</h3>
          </div>
          <button
            type="button"
            onClick={() => onSelectTab('recent')}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-bold hover:underline"
          >
            View All Recent &rarr;
          </button>
        </div>

        {recentFiles.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-xs">
            No resources uploaded yet. Click &ldquo;Upload New Resource&rdquo; above to get started!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Size</th>
                  <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Device</th>
                  <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Uploaded</th>
                  <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentFiles.slice(0, 6).map((file) => {
                  const isVideo = ['mp4', 'webm', 'mov'].includes(file.file_type.toLowerCase());
                  const isAudio = ['mp3', 'wav', 'm4a'].includes(file.file_type.toLowerCase());

                  return (
                    <tr
                      key={file.id}
                      className="hover:bg-slate-50 transition-colors cursor-pointer"
                      onClick={() => {
                        if (isVideo) onPlayVideo(file);
                        else if (isAudio) onPlayAudio(file);
                        else onPreviewDocument(file);
                      }}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-slate-50 rounded-lg text-slate-500 border border-slate-200 flex-shrink-0">
                            {isVideo ? (
                              <Film className="w-4 h-4 text-red-500" />
                            ) : isAudio ? (
                              <Music className="w-4 h-4 text-pink-500" />
                            ) : (
                              <FileText className="w-4 h-4 text-blue-500" />
                            )}
                          </div>
                          <span className="font-semibold text-xs text-slate-800 truncate max-w-xs hover:text-indigo-600">
                            {file.file_name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-slate-600 uppercase">
                        {file.file_type}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-400 font-mono">
                        {formatBytes(file.file_size)}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        <span className="inline-flex items-center">
                          {/mobile|iphone|android/i.test(file.device) ? (
                            <Smartphone className="w-3.5 h-3.5 mr-1 text-blue-500" />
                          ) : (
                            <Laptop className="w-3.5 h-3.5 mr-1 text-indigo-500" />
                          )}
                          {file.device}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-400">
                        {formatDate(file.uploaded_at)}
                      </td>
                      <td
                        className="px-6 py-4 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="inline-flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              if (isVideo) onPlayVideo(file);
                              else if (isAudio) onPlayAudio(file);
                              else onPreviewDocument(file);
                            }}
                            className="text-indigo-600 font-bold text-xs hover:underline"
                          >
                            {isVideo || isAudio ? 'Play' : 'Open'}
                          </button>
                          <button
                            type="button"
                            onClick={() => onShowInfo(file)}
                            className="text-slate-400 hover:text-slate-600 text-xs"
                          >
                            Details
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
