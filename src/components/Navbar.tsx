import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import {
  GraduationCap,
  Bell,
  Search,
  LogOut,
  Smartphone,
  Laptop,
  CheckCheck,
  HardDrive,
  Menu,
  Shield,
  Settings,
  Info,
  ChevronDown,
  Cloud,
  Check,
  RefreshCw,
  Database,
  Wifi,
  WifiOff,
  Palette,
} from 'lucide-react';
import { NotificationItem, UserStats, ViewTab } from '../types.ts';
import { useInstitutionTheme } from '../context/ThemeContext.tsx';
import { api } from '../services/api.ts';
import { formatBytes, formatDate } from '../utils/format.ts';
import {
  CloudSyncState,
  getCloudSyncState,
  subscribeCloudSync,
  formatSyncTimestamp,
  formatSyncRelativeTime,
  recordSuccessfulCloudSync,
} from '../services/cloudSyncTracker.ts';
import { testFirestoreConnection } from '../services/firebaseDb.ts';
import { PWAInstallButton } from './PWAInstallButton.tsx';

interface NavbarProps {
  currentTab: ViewTab;
  onSelectTab: (tab: ViewTab) => void;
  onOpenUpload: () => void;
  onSearch: (term: string) => void;
  searchTerm: string;
  onToggleSidebar: () => void;
  stats: UserStats | null;
  onRefreshData?: () => Promise<void> | void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onSelectTab,
  onOpenUpload,
  onSearch,
  searchTerm,
  onToggleSidebar,
  stats,
  onRefreshData,
}) => {
  const { user, logout, currentDevice, isAdmin } = useAuth();
  const { theme, isDarkBrand, contrastTextColor, openSettingsModal, schoolName } =
    useInstitutionTheme();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [cloudSync, setCloudSync] = useState<CloudSyncState>(getCloudSyncState());
  const [showSyncDetails, setShowSyncDetails] = useState(false);
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [ticker, setTicker] = useState(0);

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const syncRef = useRef<HTMLDivElement>(null);

  // Subscribe to Cloud Sync updates
  useEffect(() => {
    const unsub = subscribeCloudSync((state) => {
      setCloudSync(state);
    });
    return unsub;
  }, []);

  // Update relative time display every 5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setTicker((t) => t + 1);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const handleManualSync = async () => {
    if (isManualSyncing) return;
    setIsManualSyncing(true);
    try {
      await testFirestoreConnection();
      if (onRefreshData) {
        await onRefreshData();
      }
      recordSuccessfulCloudSync();
    } catch (err) {
      console.warn('[Navbar] Manual sync error:', err);
    } finally {
      setTimeout(() => setIsManualSyncing(false), 600);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await api.notifications.getAll();
      setNotifications(res.notifications);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000); // sync every 15s
    return () => clearInterval(interval);
  }, []);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
      if (syncRef.current && !syncRef.current.contains(e.target as Node)) {
        setShowSyncDetails(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAllRead = async () => {
    try {
      await api.notifications.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      // ignore
    }
  };

  const handleMarkOneRead = async (id: string) => {
    try {
      await api.notifications.markRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    } catch {
      // ignore
    }
  };

  const storagePercentage = stats && stats.storage_limit > 0
    ? Math.min(100, Math.round((stats.storage_used / stats.storage_limit) * 100))
    : 0;

  const isMobileDevice = /iphone|android|mobile/i.test(currentDevice);

  return (
    <header
      id="main-navbar"
      className="sticky top-0 z-30 h-16 transition-colors duration-200 shadow-xs border-b border-black/10"
      style={{ backgroundColor: theme.primary_color }}
    >
      <div className="px-4 sm:px-6 lg:px-8 h-full">
        <div className="flex items-center justify-between h-full">
          {/* Left: Mobile Toggle & Brand (Brand visible on mobile/tablet if sidebar collapsed) */}
          <div className="flex items-center space-x-3">
            <button
              id="sidebar-toggle-btn"
              type="button"
              onClick={onToggleSidebar}
              style={{ color: contrastTextColor }}
              className="p-2 rounded-lg hover:bg-white/15 active:bg-white/20 lg:hidden focus:outline-none transition-colors"
              aria-label="Toggle navigation"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div
              id="brand-logo-btn"
              onClick={() => onSelectTab('dashboard')}
              className="flex items-center space-x-2.5 cursor-pointer select-none lg:hidden"
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-base shadow-xs"
                style={{
                  backgroundColor: isDarkBrand ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)',
                  color: contrastTextColor,
                }}
              >
                T
              </div>
              <div className="text-left">
                <span
                  className="font-bold tracking-tight text-sm block leading-tight truncate max-w-[150px]"
                  style={{ color: contrastTextColor }}
                >
                  {schoolName || 'Resource Hub'}
                </span>
                <span
                  className="text-[10px] font-semibold uppercase tracking-wider block opacity-75"
                  style={{ color: contrastTextColor }}
                >
                  Education Central
                </span>
              </div>
            </div>
          </div>

          {/* Center: Search input */}
          <div className="flex-1 max-w-sm sm:max-w-md mx-3 sm:mx-6">
            <div className="relative w-full">
              <Search
                className="w-4 h-4 absolute left-3.5 top-2.5 pointer-events-none transition-colors"
                style={{ color: isDarkBrand ? 'rgba(255,255,255,0.7)' : '#64748b' }}
              />
              <input
                id="global-search-input"
                type="text"
                value={searchTerm}
                onChange={(e) => onSearch(e.target.value)}
                placeholder="Search resources, lessons, papers..."
                className={`w-full rounded-xl py-2 pl-10 pr-4 text-xs sm:text-sm outline-none transition-all ${
                  isDarkBrand
                    ? 'bg-white/15 text-white placeholder:text-white/65 border border-white/20 focus:bg-white/25 focus:ring-2 focus:ring-white/40 focus:border-white/40'
                    : 'bg-black/5 text-slate-800 placeholder:text-slate-500 border border-black/15 focus:bg-white focus:ring-2 focus:ring-indigo-500'
                }`}
              />
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Firestore Cloud Sync Status Indicator with Timestamp */}
            <div className="relative" ref={syncRef}>
              <button
                id="navbar-cloud-sync-indicator"
                type="button"
                onClick={() => setShowSyncDetails(!showSyncDetails)}
                title={
                  cloudSync.lastSyncTime
                    ? `Firestore Cloud Synced at ${cloudSync.lastSyncTime.toLocaleString()} • Click for sync status & options`
                    : 'Connecting to Firestore cloud database...'
                }
                className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer select-none ${
                  cloudSync.status === 'offline'
                    ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                    : cloudSync.status === 'syncing' || isManualSyncing
                    ? 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100'
                    : 'bg-emerald-50 text-emerald-900 border-emerald-200 hover:bg-emerald-100/90'
                }`}
              >
                <span className="relative flex items-center justify-center">
                  {isManualSyncing || cloudSync.status === 'syncing' ? (
                    <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin" />
                  ) : cloudSync.status === 'offline' ? (
                    <WifiOff className="w-3.5 h-3.5 text-amber-600" />
                  ) : (
                    <Cloud className="w-3.5 h-3.5 text-emerald-600" />
                  )}
                  {cloudSync.status === 'synced' && !isManualSyncing && (
                    <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  )}
                </span>

                <span className="flex items-center space-x-1">
                  <span className="font-semibold hidden sm:inline text-slate-700">Cloud:</span>
                  <span className="text-[11px] font-mono font-medium text-emerald-700">
                    {isManualSyncing
                      ? 'Syncing...'
                      : cloudSync.status === 'offline'
                      ? 'Offline'
                      : cloudSync.lastSyncTime
                      ? formatSyncTimestamp(cloudSync.lastSyncTime)
                      : 'Connecting...'}
                  </span>
                  {cloudSync.lastSyncTime && (
                    <span className="text-[10px] text-slate-400 hidden xl:inline">
                      ({formatSyncRelativeTime(cloudSync.lastSyncTime)})
                    </span>
                  )}
                </span>
              </button>

              {/* Sync Info Dropdown */}
              {showSyncDetails && (
                <div
                  id="cloud-sync-details-dropdown"
                  className="absolute right-0 mt-2 w-72 sm:w-80 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100 p-3.5 space-y-3"
                >
                  <div className="flex items-start justify-between pb-2.5 border-b border-slate-100">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
                        <Database className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">Firestore Cloud Sync</h4>
                        <span className="inline-flex items-center text-[10px] font-semibold text-emerald-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
                          Real-time synchronization active
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-xl p-2.5 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-slate-500">
                      <span className="text-[11px]">Database:</span>
                      <span className="font-mono text-[10px] text-slate-700 font-semibold truncate max-w-[160px]" title="ai-studio-teacherresourceh-2b6aed5e-46aa-4122-a51f-1d1cf8a835b5">
                        ai-studio-teacherres...
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-500">
                      <span className="text-[11px]">Last Sync Timestamp:</span>
                      <span className="font-mono text-[11px] text-emerald-700 font-bold">
                        {cloudSync.lastSyncTime ? formatSyncTimestamp(cloudSync.lastSyncTime) : 'Pending initial ping'}
                      </span>
                    </div>
                    {cloudSync.lastSyncTime && (
                      <div className="flex items-center justify-between text-slate-500">
                        <span className="text-[11px]">Full Date & Time:</span>
                        <span className="text-[10px] text-slate-600">
                          {cloudSync.lastSyncTime.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} {formatSyncTimestamp(cloudSync.lastSyncTime)}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-slate-500">
                      <span className="text-[11px]">Device Status:</span>
                      <span className="text-[11px] text-slate-700 font-medium">
                        {currentDevice}
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Documents, lessons, and resources are kept in live sync across mobile and desktop devices via Firestore cloud listeners.
                  </p>

                  <button
                    type="button"
                    id="manual-sync-trigger-btn"
                    onClick={handleManualSync}
                    disabled={isManualSyncing}
                    className="w-full flex items-center justify-center space-x-1.5 py-1.5 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isManualSyncing ? 'animate-spin' : ''}`} />
                    <span>{isManualSyncing ? 'Synchronizing with Firestore...' : 'Sync Now with Cloud'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Cross-Device Cloud Sync Indicator Badge */}
            <div
              id="device-sync-badge"
              title={`Active on ${currentDevice} • Live synced with Firestore online cloud database across Mobile & Desktop`}
              className={`hidden lg:flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                isDarkBrand
                  ? 'bg-white/15 text-white border-white/20'
                  : 'bg-black/5 text-slate-700 border-black/15'
              }`}
            >
              {isMobileDevice ? (
                <Smartphone className="w-3.5 h-3.5 opacity-80" />
              ) : (
                <Laptop className="w-3.5 h-3.5 opacity-80" />
              )}
              <span className="truncate max-w-[100px]">{currentDevice}</span>
            </div>

            {/* In-App PWA Install Button */}
            <PWAInstallButton />

            {/* Institution Brand Theme Selector Trigger in Navbar */}
            <button
              id="navbar-theme-btn"
              type="button"
              onClick={() => openSettingsModal('theme')}
              title="Customize School Brand Theme (Navbar & Sidebar background colors)"
              className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer shadow-xs ${
                isDarkBrand
                  ? 'bg-white/15 text-white border-white/25 hover:bg-white/25'
                  : 'bg-black/10 text-slate-800 border-black/20 hover:bg-black/15'
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Theme</span>
            </button>

            {/* Quick Upload Button */}
            <button
              id="navbar-upload-btn"
              type="button"
              onClick={onOpenUpload}
              className={`inline-flex items-center justify-center px-3.5 py-2 text-xs font-bold rounded-xl shadow-xs transition-all hover:scale-[1.01] ${
                isDarkBrand
                  ? 'bg-white text-slate-900 hover:bg-white/90 shadow-sm'
                  : 'bg-slate-900 text-white hover:bg-slate-800 shadow-sm'
              }`}
            >
              <span className="hidden sm:inline">Upload Resource</span>
              <span className="sm:hidden">Upload</span>
            </button>

            {/* Notifications Popover */}
            <div className="relative" ref={notifRef}>
              <button
                id="notifications-bell-btn"
                type="button"
                onClick={() => setShowNotifications(!showNotifications)}
                style={{ color: contrastTextColor }}
                className="relative p-2 rounded-lg hover:bg-white/15 focus:outline-none transition-colors"
                aria-label="View notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span
                    id="unread-notifications-count"
                    className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-xs"
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div
                  id="notifications-dropdown-menu"
                  className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100"
                >
                  <div className="p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <div className="font-bold text-slate-800 text-sm flex items-center space-x-1.5">
                      <span>Notifications</span>
                      {unreadCount > 0 && (
                        <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          {unreadCount} new
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={handleMarkAllRead}
                        className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold flex items-center space-x-1"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                        <span>Mark all read</span>
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-slate-400 text-xs">
                        No notifications yet.
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => handleMarkOneRead(n.id)}
                          className={`p-3 text-xs transition-colors cursor-pointer hover:bg-slate-50 ${
                            !n.read ? 'bg-indigo-50/40' : ''
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <span className="font-semibold text-slate-800">{n.title}</span>
                            <span className="text-slate-400 text-[10px] ml-2 flex-shrink-0">
                              {formatDate(n.created_at)}
                            </span>
                          </div>
                          <p className="text-slate-600 mt-1 leading-relaxed">{n.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Menu with Professional Polish layout */}
            <div className="relative" ref={profileRef}>
              <button
                id="user-profile-menu-btn"
                type="button"
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className={`flex items-center gap-2.5 sm:gap-3 pl-2 sm:pl-4 border-l hover:opacity-90 focus:outline-none transition-opacity cursor-pointer ${
                  isDarkBrand ? 'border-white/20' : 'border-black/15'
                }`}
              >
                <div className="text-right hidden sm:block">
                  <p
                    className="text-sm font-bold truncate max-w-[130px] leading-tight"
                    style={{ color: contrastTextColor }}
                  >
                    {user?.username || 'Teacher'}
                  </p>
                  <p
                    className="text-[10px] font-medium capitalize mt-0.5 opacity-75"
                    style={{ color: contrastTextColor }}
                  >
                    {user?.role === 'admin' ? 'Administrator' : 'Educator'}
                  </p>
                </div>
                <div
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-xs flex-shrink-0 border"
                  style={{
                    backgroundColor: isDarkBrand ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.08)',
                    color: contrastTextColor,
                    borderColor: isDarkBrand ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.12)',
                  }}
                >
                  {user?.username ? user.username.slice(0, 2).toUpperCase() : 'TH'}
                </div>
              </button>

              {showProfileMenu && (
                <div
                  id="profile-dropdown-card"
                  className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100"
                >
                  <div className="p-3.5 border-b border-slate-100 bg-slate-50">
                    <p className="text-xs font-bold text-slate-800 truncate">{user?.username}</p>
                    <p className="text-[10px] text-slate-500 truncate">{user?.email}</p>
                    <div className="mt-1.5 flex items-center space-x-1">
                      {isAdmin ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700">
                          <Shield className="w-2.5 h-2.5 mr-1" />
                          Administrator
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700">
                          Teacher Role
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-1.5 space-y-0.5">
                    <button
                      id="menu-theme-btn"
                      type="button"
                      onClick={() => {
                        setShowProfileMenu(false);
                        openSettingsModal('theme');
                      }}
                      className="w-full flex items-center px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors"
                    >
                      <Palette className="w-3.5 h-3.5 mr-2 text-indigo-600" />
                      Institution Brand Theme
                    </button>

                    <button
                      id="menu-settings-btn"
                      type="button"
                      onClick={() => {
                        onSelectTab('settings');
                        setShowProfileMenu(false);
                      }}
                      className="w-full flex items-center px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
                    >
                      <Settings className="w-3.5 h-3.5 mr-2 text-slate-400" />
                      Settings & Devices
                    </button>

                    <button
                      id="menu-about-btn"
                      type="button"
                      onClick={() => {
                        onSelectTab('about');
                        setShowProfileMenu(false);
                      }}
                      className="w-full flex items-center px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
                    >
                      <Info className="w-3.5 h-3.5 mr-2 text-slate-400" />
                      About & Developer
                    </button>

                    <button
                      id="menu-logout-btn"
                      type="button"
                      onClick={() => {
                        setShowProfileMenu(false);
                        logout();
                      }}
                      className="w-full flex items-center px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5 mr-2" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
