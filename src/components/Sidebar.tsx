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
  Palette,
} from 'lucide-react';
import { UserStats, ViewTab } from '../types.ts';
import { useInstitutionTheme } from '../context/ThemeContext.tsx';
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
  const { theme, isDarkBrand, contrastTextColor, openSettingsModal, schoolName } =
    useInstitutionTheme();

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
    <div
      className="flex flex-col h-full no-scrollbar transition-colors duration-200"
      style={{ backgroundColor: theme.primary_color }}
    >
      {/* Brand Header */}
      <div
        className="px-5 py-4 border-b flex-shrink-0"
        style={{ borderColor: isDarkBrand ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)' }}
      >
        <div className="flex items-center gap-2.5 mb-1 cursor-pointer" onClick={() => onSelectTab('dashboard')}>
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-lg shadow-xs"
            style={{
              backgroundColor: isDarkBrand ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)',
              color: contrastTextColor,
            }}
          >
            T
          </div>
          <h1
            className="font-bold text-lg tracking-tight truncate max-w-[170px]"
            style={{ color: contrastTextColor }}
          >
            {schoolName || 'Resource Hub'}
          </h1>
        </div>
        <p
          className="text-[10px] uppercase tracking-widest font-semibold pl-0.5 opacity-75"
          style={{ color: contrastTextColor }}
        >
          Education Central
        </p>
      </div>

      {/* Upload Call to Action */}
      <div className="px-4 py-2.5">
        <button
          id="sidebar-primary-upload-btn"
          type="button"
          onClick={() => {
            onOpenUpload();
            onCloseMobile();
          }}
          style={{
            backgroundColor: isDarkBrand ? '#ffffff' : '#0f172a',
            color: isDarkBrand ? '#0f172a' : '#ffffff',
          }}
          className="w-full flex items-center justify-center space-x-2 py-2 px-4 rounded-xl font-bold text-xs shadow-sm transition-all hover:opacity-90 hover:scale-[1.01] cursor-pointer"
        >
          <UploadCloud className="w-4 h-4" />
          <span>Upload New Resource</span>
        </button>
      </div>

      {/* Navigation Links */}
      <nav
        id="resource-hub-navigation"
        className="flex-1 overflow-y-auto no-scrollbar navigation-no-scrollbar px-4 py-1.5 space-y-0.5"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <div
          className="text-[10px] font-bold uppercase tracking-wider mb-1.5 px-2 opacity-70"
          style={{ color: contrastTextColor }}
        >
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
              style={
                isActive
                  ? {
                      backgroundColor: isDarkBrand ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.12)',
                      color: contrastTextColor,
                    }
                  : { color: contrastTextColor }
              }
              className={`w-full flex items-center gap-3 px-3 py-1.5 rounded-lg font-medium text-xs transition-colors cursor-pointer ${
                isActive
                  ? 'font-bold shadow-xs'
                  : 'opacity-85 hover:opacity-100 hover:bg-white/10'
              }`}
            >
              <span style={{ color: contrastTextColor }}>
                {item.icon}
              </span>
              <span>{item.label}</span>
            </button>
          );
        })}

        <div
          className="pt-3 text-[10px] font-bold uppercase tracking-wider mb-1.5 px-2 opacity-70"
          style={{ color: contrastTextColor }}
        >
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
              style={
                isActive
                  ? {
                      backgroundColor: isDarkBrand ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.12)',
                      color: contrastTextColor,
                    }
                  : { color: contrastTextColor }
              }
              className={`w-full flex items-center gap-3 px-3 py-1.5 rounded-lg font-medium text-xs transition-colors cursor-pointer ${
                isActive
                  ? 'font-bold shadow-xs'
                  : 'opacity-85 hover:opacity-100 hover:bg-white/10'
              }`}
            >
              <span style={{ color: contrastTextColor }}>
                {item.icon}
              </span>
              <span>{item.label}</span>
            </button>
          );
        })}

        {/* Brand Theme Selector Quick Action in Sidebar */}
        <button
          id="nav-brand-theme-btn"
          type="button"
          onClick={() => {
            openSettingsModal('theme');
            onCloseMobile();
          }}
          style={{ color: contrastTextColor }}
          className="w-full flex items-center gap-3 px-3 py-1.5 rounded-lg font-medium text-xs transition-colors opacity-85 hover:opacity-100 hover:bg-white/10 cursor-pointer"
        >
          <span style={{ color: contrastTextColor }}>
            <Palette className="w-4 h-4" />
          </span>
          <span>School Theme</span>
        </button>

        {/* Admin Navigation Section */}
        {isAdmin && (
          <div
            className="pt-3 mt-1.5 border-t space-y-0.5"
            style={{ borderColor: isDarkBrand ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)' }}
          >
            <div
              className="text-[10px] font-bold uppercase tracking-wider mb-1.5 px-2 opacity-70"
              style={{ color: contrastTextColor }}
            >
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
                  style={
                    isActive
                      ? {
                          backgroundColor: isDarkBrand ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.12)',
                          color: contrastTextColor,
                        }
                      : { color: contrastTextColor }
                  }
                  className={`w-full flex items-center gap-3 px-3 py-1.5 rounded-lg font-medium text-xs transition-colors cursor-pointer ${
                    isActive
                      ? 'font-bold shadow-xs'
                      : 'opacity-85 hover:opacity-100 hover:bg-white/10'
                  }`}
                >
                  <span style={{ color: contrastTextColor }}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </nav>

      {/* Storage & Live Sync Footer */}
      <div
        className="p-4 border-t flex-shrink-0"
        style={{
          backgroundColor: isDarkBrand ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.6)',
          borderColor: isDarkBrand ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)',
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold opacity-75" style={{ color: contrastTextColor }}>
            Storage
          </span>
          <span className="text-xs font-bold" style={{ color: contrastTextColor }}>
            {storagePercentage}%
          </span>
        </div>
        <div
          className={`w-full rounded-full h-1.5 mb-2 overflow-hidden ${
            isDarkBrand ? 'bg-white/20' : 'bg-black/15'
          }`}
        >
          <div
            className={`h-1.5 rounded-full transition-all duration-300 ${
              isDarkBrand ? 'bg-white' : 'bg-indigo-600'
            }`}
            style={{ width: `${Math.max(2, storagePercentage)}%` }}
          />
        </div>
        <div
          className="flex items-center justify-between text-[10px] opacity-75"
          style={{ color: contrastTextColor }}
        >
          <span>{formatBytes(storageUsed)} of {formatBytes(storageLimit)} used</span>
          <span className="inline-flex items-center font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1 animate-pulse" />
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
        className="hidden lg:flex flex-col w-64 border-r h-[calc(100vh-4rem)] sticky top-16 flex-shrink-0 z-20 no-scrollbar overflow-hidden transition-colors duration-200"
        style={{
          backgroundColor: theme.primary_color,
          borderColor: isDarkBrand ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)',
        }}
      >
        {navContent}
      </aside>

      {/* Mobile Drawer (Overlay) */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />

          {/* Drawer content */}
          <div
            className="fixed inset-y-0 left-0 w-72 max-w-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200 no-scrollbar border-r transition-colors"
            style={{
              backgroundColor: theme.primary_color,
              borderColor: isDarkBrand ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)',
            }}
          >
            <div
              className="p-4 border-b flex items-center justify-between flex-shrink-0"
              style={{ borderColor: isDarkBrand ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)' }}
            >
              <span className="font-bold text-sm" style={{ color: contrastTextColor }}>
                Navigation
              </span>
              <button
                type="button"
                onClick={onCloseMobile}
                style={{ color: contrastTextColor }}
                className="p-1.5 rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div
              className="flex-1 overflow-y-auto no-scrollbar navigation-no-scrollbar"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {navContent}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
