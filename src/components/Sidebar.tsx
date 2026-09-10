import React from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import {
  LayoutDashboard,
  FolderOpen,
  Film,
  Music,
  FileText,
  Image as ImageIcon,
  FolderTree,
  UploadCloud,
  Share2,
  Star,
  Clock,
  Trash2,
  Settings,
  Info,
  Users,
  HardDrive,
  BarChart3,
  ShieldAlert,
  X,
} from 'lucide-react';
import { UserStats, ViewTab } from '../types.ts';
import { formatBytes } from '../utils/format.ts';

interface SidebarProps {
  currentTab: ViewTab;
  onSelectTab: (tab: ViewTab) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  onOpenUpload: () => void;
  stats?: UserStats | null;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isOpenMobile,
  onCloseMobile,
  onOpenUpload,
  stats,
}) => {
  const { isAdmin } = useAuth();

  const primaryNavItems: Array<{ id: ViewTab; label: string; icon: React.ReactNode; isAction?: boolean }> = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'my_resources', label: 'My Resources', icon: <FolderOpen className="w-4 h-4" /> },
    { id: 'folders', label: 'Folders', icon: <FolderTree className="w-4 h-4" /> },
  ];

  const libraryNavItems: Array<{ id: ViewTab; label: string; icon: React.ReactNode; isAction?: boolean }> = [
    { id: 'videos', label: 'Videos', icon: <Film className="w-4 h-4" /> },
    { id: 'audio', label: 'Audio', icon: <Music className="w-4 h-4" /> },
    { id: 'documents', label: 'Documents', icon: <FileText className="w-4 h-4" /> },
    { id: 'images', label: 'Images', icon: <ImageIcon className="w-4 h-4" /> },
    { id: 'shared_with_me', label: 'Shared With Me', icon: <Share2 className="w-4 h-4" /> },
    { id: 'favorites', label: 'Favorites', icon: <Star className="w-4 h-4" /> },
    { id: 'recent', label: 'Recent', icon: <Clock className="w-4 h-4" /> },
    { id: 'trash', label: 'Trash', icon: <Trash2 className="w-4 h-4" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
    { id: 'about', label: 'About', icon: <Info className="w-4 h-4" /> },
  ];

  const adminNavItems: Array<{ id: ViewTab; label: string; icon: React.ReactNode }> = [
    { id: 'admin_users', label: 'User Management', icon: <Users className="w-4 h-4" /> },
    { id: 'admin_storage', label: 'Storage Management', icon: <HardDrive className="w-4 h-4" /> },
    { id: 'admin_reports', label: 'System Reports', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'admin_security', label: 'Security & Logs', icon: <ShieldAlert className="w-4 h-4" /> },
  ];

  const handleItemClick = (item: { id: ViewTab; isAction?: boolean }) => {
    if (item.isAction && item.id === 'upload') {
      onOpenUpload();
    } else {
      onSelectTab(item.id);
    }
    onCloseMobile();
  };

  const storageUsed = stats?.storage_used || 0;
  const storageLimit = stats?.storage_limit || 10 * 1024 * 1024 * 1024;
  const storagePercentage = Math.min(100, Math.round((storageUsed / storageLimit) * 100));

  const navContent = (
    <div className="flex flex-col h-full bg-white">
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-100 flex-shrink-0">
        <div className="flex items-center gap-2.5 mb-1 cursor-pointer" onClick={() => onSelectTab('dashboard')}>
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-sm shadow-indigo-200">
            T
          </div>
          <h1 className="font-bold text-lg text-slate-800 tracking-tight">Resource Hub</h1>
        </div>
        <p className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold pl-0.5">
          Education Central
        </p>
      </div>

      {/* Upload Call to Action */}
      <div className="px-4 pt-4 pb-2">
        <button
          id="sidebar-primary-upload-btn"
          type="button"
          onClick={() => {
            onOpenUpload();
            onCloseMobile();
          }}
          className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-sm shadow-indigo-200 transition-all hover:scale-[1.01]"
        >
          <UploadCloud className="w-4 h-4" />
          <span>Upload New Resource</span>
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto px-4 py-2 space-y-1">
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-2">
          Navigation
        </div>
        {primaryNavItems.map((item) => {
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              id={`nav-${item.id}-btn`}
              type="button"
              onClick={() => handleItemClick(item)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md font-medium text-xs transition-colors ${
                isActive
                  ? 'bg-indigo-50 text-indigo-700 font-semibold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <span className={isActive ? 'text-indigo-600' : 'text-slate-400'}>
                {item.icon}
              </span>
              <span>{item.label}</span>
            </button>
          );
        })}

        <div className="pt-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-2">
          Libraries
        </div>
        {libraryNavItems.map((item) => {
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              id={`nav-${item.id}-btn`}
              type="button"
              onClick={() => handleItemClick(item)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md font-medium text-xs transition-colors ${
                isActive
                  ? 'bg-indigo-50 text-indigo-700 font-semibold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <span className={isActive ? 'text-indigo-600' : 'text-slate-400'}>
                {item.icon}
              </span>
              <span>{item.label}</span>
            </button>
          );
        })}

        {/* Admin Navigation Section */}
        {isAdmin && (
          <div className="pt-4 mt-2 border-t border-slate-100 space-y-1">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-2">
              Administration
            </div>
            {adminNavItems.map((item) => {
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-${item.id}-btn`}
                  type="button"
                  onClick={() => {
                    onSelectTab(item.id);
                    onCloseMobile();
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-md font-medium text-xs transition-colors ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 font-semibold'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <span className={isActive ? 'text-indigo-600' : 'text-slate-400'}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </nav>

      {/* Storage & Live Sync Footer (Professional Polish layout) */}
      <div className="p-4 border-t border-slate-200 bg-slate-50 flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-500">Storage</span>
          <span className="text-xs font-bold text-slate-700">{storagePercentage}%</span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-1.5 mb-2 overflow-hidden">
          <div
            className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${Math.max(2, storagePercentage)}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[10px] text-slate-400">
          <span>{formatBytes(storageUsed)} of {formatBytes(storageLimit)} used</span>
          <span className="inline-flex items-center text-emerald-600 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse" />
            Live Sync
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (Permanent) */}
      <aside
        id="desktop-sidebar"
        className="hidden lg:flex flex-col w-64 bg-white border-r border-slate-200 h-[calc(100vh-4rem)] sticky top-16 flex-shrink-0 z-20"
      >
        {navContent}
      </aside>

      {/* Mobile Drawer (Overlay) */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />

          {/* Drawer content */}
          <div className="fixed inset-y-0 left-0 w-72 max-w-full bg-white shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <span className="font-bold text-slate-900 text-sm">Navigation</span>
              <button
                type="button"
                onClick={onCloseMobile}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">{navContent}</div>
          </div>
        </div>
      )}
    </>
  );
};
