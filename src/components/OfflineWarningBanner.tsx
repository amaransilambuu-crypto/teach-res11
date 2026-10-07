import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, CloudOff, RefreshCw, X, HardDrive } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus.ts';
import { pwaService } from '../services/pwaService.ts';

export const OfflineWarningBanner: React.FC = () => {
  const { isOnline, wasOffline } = useOnlineStatus();
  const [dismissed, setDismissed] = useState(false);
  const [showReconnected, setShowReconnected] = useState(false);
  const [cachedCount, setCachedCount] = useState<number | null>(null);

  // When going offline, reset dismissed status so the warning is always shown
  useEffect(() => {
    if (!isOnline) {
      setDismissed(false);
      pwaService.getCachedItemCount().then((count) => setCachedCount(count));
    } else if (wasOffline) {
      setShowReconnected(true);
      const timer = setTimeout(() => setShowReconnected(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  // If back online and briefly showing reconnection toast
  if (isOnline && showReconnected) {
    return (
      <div
        id="pwa-reconnected-toast"
        className="fixed top-16 sm:top-4 right-4 z-50 flex items-center space-x-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-2xl border border-emerald-400/40 text-xs font-semibold animate-in slide-in-from-top duration-300"
      >
        <Wifi className="w-4 h-4 text-emerald-200" />
        <span>Internet connection restored. You are back online!</span>
      </div>
    );
  }

  // If online or user dismissed the banner, don't display
  if (isOnline || dismissed) {
    return null;
  }

  return (
    <div
      id="pwa-offline-warning-banner"
      role="alert"
      className="bg-amber-600 text-amber-50 px-4 py-2.5 shadow-md flex items-center justify-between z-40 transition-all border-b border-amber-700 select-none animate-in fade-in"
    >
      <div className="flex items-center space-x-3 flex-1 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-amber-700/60 border border-amber-400/40 flex items-center justify-center flex-shrink-0 text-amber-200">
          <WifiOff className="w-4 h-4" />
        </div>
        <div className="truncate">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-xs sm:text-sm text-white flex items-center">
              You are offline
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-3xs font-bold uppercase tracking-wider bg-amber-900/80 text-amber-200 border border-amber-500/40">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping mr-1.5" />
              Cache API Active
            </span>
          </div>
          <p className="text-3xs sm:text-2xs text-amber-100 font-medium truncate mt-0.5">
            Internet connection lost. You can continue reading and previewing cached teaching resources.
            {cachedCount !== null && cachedCount > 0 ? ` (${cachedCount} cached assets ready)` : ''}
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-2 ml-3 flex-shrink-0">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="px-2.5 py-1 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-2xs font-semibold inline-flex items-center space-x-1 border border-amber-500/30 transition-colors shadow-2xs"
          title="Retry connection"
        >
          <RefreshCw className="w-3 h-3" />
          <span className="hidden sm:inline">Retry</span>
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="p-1 text-amber-200 hover:text-white hover:bg-amber-700 rounded-lg transition-colors"
          title="Dismiss warning"
          aria-label="Dismiss offline warning"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
