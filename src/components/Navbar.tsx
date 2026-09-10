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
} from 'lucide-react';
import { NotificationItem, UserStats, ViewTab } from '../types.ts';
import { api } from '../services/api.ts';
import { formatBytes, formatDate } from '../utils/format.ts';

interface NavbarProps {
  currentTab: ViewTab;
  onSelectTab: (tab: ViewTab) => void;
  onOpenUpload: () => void;
  onSearch: (term: string) => void;
  searchTerm: string;
  onToggleSidebar: () => void;
  stats: UserStats | null;
}

export const Navbar: React.FC<NavbarProps> = ({
  onSelectTab,
  onOpenUpload,
  onSearch,
  searchTerm,
  onToggleSidebar,
  stats,
}) => {
  const { user, logout, currentDevice, isAdmin } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

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
    <header id="main-navbar" className="bg-white border-b border-slate-200 sticky top-0 z-30 h-16">
      <div className="px-4 sm:px-6 lg:px-8 h-full">
        <div className="flex items-center justify-between h-full">
          {/* Left: Mobile Toggle & Brand (Brand visible on mobile/tablet if sidebar collapsed) */}
          <div className="flex items-center space-x-3">
            <button
              id="sidebar-toggle-btn"
              type="button"
              onClick={onToggleSidebar}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 lg:hidden focus:outline-none"
              aria-label="Toggle navigation"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div
              id="brand-logo-btn"
              onClick={() => onSelectTab('dashboard')}
              className="flex items-center space-x-2.5 cursor-pointer select-none lg:hidden"
            >
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-base shadow-xs shadow-indigo-200">
                T
              </div>
              <div className="text-left">
                <span className="font-bold text-slate-800 tracking-tight text-sm block leading-tight">
                  Resource Hub
                </span>
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                  Education Central
                </span>
              </div>
            </div>
          </div>

          {/* Center: Search input */}
          <div className="flex-1 max-w-sm sm:max-w-md mx-3 sm:mx-6">
            <div className="relative w-full">
              <Search className="w-4 h-4 absolute left-3.5 top-2.5 text-slate-400 pointer-events-none" />
              <input
                id="global-search-input"
                type="text"
                value={searchTerm}
                onChange={(e) => onSearch(e.target.value)}
                placeholder="Search resources, lessons, papers..."
                className="w-full bg-slate-100 border-none rounded-lg py-2 pl-10 pr-4 text-sm text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Cross-Device Indicator Badge */}
            <div
              id="device-sync-badge"
              title={`Active on ${currentDevice} • Syncing with central cloud storage`}
              className="hidden xl:flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200/80"
            >
              {isMobileDevice ? (
                <Smartphone className="w-3.5 h-3.5 text-blue-600" />
              ) : (
                <Laptop className="w-3.5 h-3.5 text-indigo-600" />
              )}
              <span>{currentDevice}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>

            {/* Quick Upload Button */}
            <button
              id="navbar-upload-btn"
              type="button"
              onClick={onOpenUpload}
              className="inline-flex items-center justify-center px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-all hover:scale-[1.01]"
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
                className="relative text-slate-400 hover:text-slate-600 p-2 rounded-lg hover:bg-slate-100 focus:outline-none transition-colors"
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
                className="flex items-center gap-3 pl-3 sm:pl-6 border-l border-slate-200 hover:opacity-90 focus:outline-none transition-opacity cursor-pointer"
              >
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-bold text-slate-700 truncate max-w-[140px] leading-tight">
                    {user?.username || 'Teacher'}
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium capitalize mt-0.5">
                    {user?.role === 'admin' ? 'Administrator' : 'Educator'}
                  </p>
                </div>
                <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold text-sm shadow-xs flex-shrink-0">
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
