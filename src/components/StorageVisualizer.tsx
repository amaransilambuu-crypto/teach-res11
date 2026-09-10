import React from 'react';
import {
  HardDrive,
  FileText,
  Film,
  Music,
  Image as ImageIcon,
  Files,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ShieldCheck,
} from 'lucide-react';
import { UserStats, ViewTab } from '../types.ts';
import { formatBytes } from '../utils/format.ts';

interface StorageVisualizerProps {
  stats: UserStats | null;
  onOpenUpload: () => void;
  onSelectTab?: (tab: ViewTab) => void;
  isAdmin?: boolean;
}

export const StorageVisualizer: React.FC<StorageVisualizerProps> = ({
  stats,
  onOpenUpload,
  onSelectTab,
  isAdmin = false,
}) => {
  const storageUsed = stats?.storage_used || 0;
  const storageLimit = stats?.storage_limit || 10 * 1024 * 1024 * 1024;
  const availableBytes = Math.max(0, storageLimit - storageUsed);
  const usedRatio = storageLimit > 0 ? storageUsed / storageLimit : 0;
  const usedPercentage = Math.min(100, Math.round(usedRatio * 1000) / 10); // e.g. 12.5%

  // Category byte counts
  const categoryBytes = stats?.storage_by_category || {
    documents: 0,
    videos: 0,
    audio: 0,
    images: 0,
    other: 0,
  };

  // If storage_by_category is all 0 but storageUsed > 0, estimate proportionally or show total
  const hasCategoryBreakdown =
    categoryBytes.documents > 0 ||
    categoryBytes.videos > 0 ||
    categoryBytes.audio > 0 ||
    categoryBytes.images > 0 ||
    categoryBytes.other > 0;

  // Calculate percentages for segments
  const calcPercent = (bytes: number) => {
    if (storageLimit <= 0 || bytes <= 0) return 0;
    return (bytes / storageLimit) * 100;
  };

  const docPct = calcPercent(categoryBytes.documents);
  const videoPct = calcPercent(categoryBytes.videos);
  const audioPct = calcPercent(categoryBytes.audio);
  const imagePct = calcPercent(categoryBytes.images);
  const otherPct = calcPercent(categoryBytes.other);

  // Status badge styling
  let statusBadge = {
    label: 'Normal',
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />,
  };
  if (usedPercentage >= 90) {
    statusBadge = {
      label: 'Critical Quota',
      color: 'bg-red-50 text-red-700 border-red-200',
      icon: <AlertTriangle className="w-3.5 h-3.5 text-red-600" />,
    };
  } else if (usedPercentage >= 75) {
    statusBadge = {
      label: 'Near Capacity',
      color: 'bg-amber-50 text-amber-700 border-amber-200',
      icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />,
    };
  }

  const categories = [
    {
      id: 'documents',
      name: 'Documents',
      subtext: 'PDFs, DOCX, Spreadsheets',
      bytes: categoryBytes.documents,
      count: stats?.total_documents ?? stats?.documents ?? 0,
      color: 'bg-indigo-600',
      textColor: 'text-indigo-600',
      lightBg: 'bg-indigo-50',
      borderColor: 'border-indigo-100',
      icon: <FileText className="w-4 h-4 text-indigo-600" />,
      tab: 'documents' as ViewTab,
    },
    {
      id: 'videos',
      name: 'Video Lectures',
      subtext: 'Classroom & recorded MP4s',
      bytes: categoryBytes.videos,
      count: stats?.total_videos ?? stats?.videos ?? 0,
      color: 'bg-rose-500',
      textColor: 'text-rose-600',
      lightBg: 'bg-rose-50',
      borderColor: 'border-rose-100',
      icon: <Film className="w-4 h-4 text-rose-600" />,
      tab: 'videos' as ViewTab,
    },
    {
      id: 'audio',
      name: 'Audio Lessons',
      subtext: 'Voice notes & pronunciations',
      bytes: categoryBytes.audio,
      count: stats?.total_audio ?? stats?.audio ?? 0,
      color: 'bg-pink-500',
      textColor: 'text-pink-600',
      lightBg: 'bg-pink-50',
      borderColor: 'border-pink-100',
      icon: <Music className="w-4 h-4 text-pink-600" />,
      tab: 'audio' as ViewTab,
    },
    {
      id: 'images',
      name: 'Images & Slides',
      subtext: 'Diagrams & infographics',
      bytes: categoryBytes.images,
      count: stats?.total_images ?? stats?.images ?? 0,
      color: 'bg-emerald-500',
      textColor: 'text-emerald-600',
      lightBg: 'bg-emerald-50',
      borderColor: 'border-emerald-100',
      icon: <ImageIcon className="w-4 h-4 text-emerald-600" />,
      tab: 'images' as ViewTab,
    },
    {
      id: 'other',
      name: 'Other Assets',
      subtext: 'Archives, code & data files',
      bytes: categoryBytes.other,
      count: stats?.total_others ?? stats?.other_files ?? 0,
      color: 'bg-amber-500',
      textColor: 'text-amber-600',
      lightBg: 'bg-amber-50',
      borderColor: 'border-amber-100',
      icon: <Files className="w-4 h-4 text-amber-600" />,
      tab: 'my_resources' as ViewTab,
    },
  ];

  return (
    <div
      id="storage-visualizer-card"
      className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-5"
    >
      {/* Header with Title & Quota Status Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-bold text-slate-900 text-base">Cloud Storage Quota</h3>
              <div
                className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-2xs font-semibold border ${statusBadge.color}`}
              >
                {statusBadge.icon}
                <span>{statusBadge.label}</span>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Dedicated high-speed storage allocated for your academic files and media
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2.5 self-start sm:self-auto">
          {isAdmin && onSelectTab && (
            <button
              type="button"
              onClick={() => onSelectTab('admin_storage')}
              className="px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200/60 transition-colors inline-flex items-center"
            >
              <span>Manage Quotas</span>
              <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
            </button>
          )}
          <button
            type="button"
            onClick={onOpenUpload}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors inline-flex items-center"
          >
            <UploadCloud className="w-3.5 h-3.5 mr-1.5" />
            <span>Upload File</span>
          </button>
        </div>
      </div>

      {/* Main Quota Indicator Numbers */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
        <div>
          <span className="text-2xs font-bold text-slate-400 uppercase tracking-wider block">
            Used Storage
          </span>
          <div className="text-xl font-extrabold text-slate-900 font-mono mt-0.5">
            {formatBytes(storageUsed)}
          </div>
          <span className="text-2xs text-slate-500 font-medium">
            {usedPercentage}% of total limit
          </span>
        </div>

        <div>
          <span className="text-2xs font-bold text-slate-400 uppercase tracking-wider block">
            Available Free Space
          </span>
          <div className="text-xl font-extrabold text-emerald-600 font-mono mt-0.5">
            {formatBytes(availableBytes)}
          </div>
          <span className="text-2xs text-slate-500 font-medium">
            {(100 - usedPercentage).toFixed(1)}% free capacity
          </span>
        </div>

        <div>
          <span className="text-2xs font-bold text-slate-400 uppercase tracking-wider block">
            Total Account Limit
          </span>
          <div className="text-xl font-extrabold text-slate-700 font-mono mt-0.5">
            {formatBytes(storageLimit)}
          </div>
          <span className="text-2xs text-slate-500 font-medium">
            {stats?.total_files || 0} total saved resources
          </span>
        </div>
      </div>

      {/* Segmented Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
          <span>Capacity Progress</span>
          <span className="font-mono text-indigo-600">{usedPercentage}% used</span>
        </div>

        {/* Progress Bar Container */}
        <div
          id="storage-progress-bar"
          className="w-full h-3.5 bg-slate-100 rounded-full overflow-hidden flex border border-slate-200 shadow-inner"
        >
          {hasCategoryBreakdown ? (
            <>
              {docPct > 0 && (
                <div
                  className="bg-indigo-600 h-full transition-all duration-500 hover:opacity-90"
                  style={{ width: `${Math.max(0.5, docPct)}%` }}
                  title={`Documents: ${formatBytes(categoryBytes.documents)} (${docPct.toFixed(1)}%)`}
                />
              )}
              {videoPct > 0 && (
                <div
                  className="bg-rose-500 h-full transition-all duration-500 hover:opacity-90"
                  style={{ width: `${Math.max(0.5, videoPct)}%` }}
                  title={`Videos: ${formatBytes(categoryBytes.videos)} (${videoPct.toFixed(1)}%)`}
                />
              )}
              {audioPct > 0 && (
                <div
                  className="bg-pink-500 h-full transition-all duration-500 hover:opacity-90"
                  style={{ width: `${Math.max(0.5, audioPct)}%` }}
                  title={`Audio: ${formatBytes(categoryBytes.audio)} (${audioPct.toFixed(1)}%)`}
                />
              )}
              {imagePct > 0 && (
                <div
                  className="bg-emerald-500 h-full transition-all duration-500 hover:opacity-90"
                  style={{ width: `${Math.max(0.5, imagePct)}%` }}
                  title={`Images: ${formatBytes(categoryBytes.images)} (${imagePct.toFixed(1)}%)`}
                />
              )}
              {otherPct > 0 && (
                <div
                  className="bg-amber-500 h-full transition-all duration-500 hover:opacity-90"
                  style={{ width: `${Math.max(0.5, otherPct)}%` }}
                  title={`Other: ${formatBytes(categoryBytes.other)} (${otherPct.toFixed(1)}%)`}
                />
              )}
            </>
          ) : (
            <div
              className={`h-full transition-all duration-500 ${
                usedPercentage >= 90
                  ? 'bg-rose-500'
                  : usedPercentage >= 75
                  ? 'bg-amber-500'
                  : 'bg-indigo-600'
              }`}
              style={{ width: `${Math.max(1, usedPercentage)}%` }}
              title={`Used Storage: ${formatBytes(storageUsed)} (${usedPercentage}%)`}
            />
          )}
        </div>
      </div>

      {/* Category Breakdown Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 pt-1">
        {categories.map((cat) => (
          <div
            key={cat.id}
            onClick={() => onSelectTab && onSelectTab(cat.tab)}
            className={`p-3 rounded-xl border ${cat.borderColor} bg-white hover:${cat.lightBg} transition-all cursor-pointer group shadow-2xs`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className={`p-1.5 rounded-lg ${cat.lightBg}`}>
                {cat.icon}
              </div>
              <span className="text-2xs font-bold text-slate-500 font-mono">
                {cat.count} files
              </span>
            </div>
            <div className="font-semibold text-xs text-slate-800 group-hover:text-indigo-600 transition-colors">
              {cat.name}
            </div>
            <div className="text-xs font-mono font-bold text-slate-600 mt-0.5">
              {cat.bytes > 0 ? formatBytes(cat.bytes) : '—'}
            </div>
            <div className="text-3xs text-slate-400 mt-1 truncate">
              {cat.subtext}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
