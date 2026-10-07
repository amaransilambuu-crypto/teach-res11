export interface CloudSyncState {
  lastSyncTime: Date | null;
  status: 'idle' | 'syncing' | 'synced' | 'offline' | 'error';
  error: string | null;
}

const STORAGE_KEY = 'trh_last_firestore_cloud_sync';

// Retrieve initial stored timestamp if available, otherwise set to current time
const getInitialStoredTimestamp = (): Date | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const d = new Date(raw);
      if (!isNaN(d.getTime())) return d;
    }
  } catch {
    // Ignore localStorage errors in private browsing
  }
  // Default to current time since initial connection is established on mount
  return new Date();
};

let currentState: CloudSyncState = {
  lastSyncTime: getInitialStoredTimestamp(),
  status: 'synced',
  error: null,
};

const listeners = new Set<(state: CloudSyncState) => void>();

function notifyListeners() {
  listeners.forEach((listener) => {
    try {
      listener({ ...currentState });
    } catch (e) {
      console.warn('[CloudSyncTracker] Listener notification error:', e);
    }
  });
}

/**
 * Record a successful sync with Firestore cloud database
 */
export function recordSuccessfulCloudSync(timestamp = new Date()): void {
  currentState = {
    lastSyncTime: timestamp,
    status: 'synced',
    error: null,
  };
  try {
    localStorage.setItem(STORAGE_KEY, timestamp.toISOString());
  } catch {
    // ignore
  }
  notifyListeners();
}

/**
 * Update cloud sync status (e.g. syncing, error, offline)
 */
export function setCloudSyncStatus(
  status: 'idle' | 'syncing' | 'synced' | 'offline' | 'error',
  error: string | null = null
): void {
  currentState = {
    ...currentState,
    status,
    error: error || (status === 'error' ? currentState.error : null),
  };
  notifyListeners();
}

/**
 * Get the current sync state
 */
export function getCloudSyncState(): CloudSyncState {
  return { ...currentState };
}

/**
 * Subscribe to cloud sync state changes
 */
export function subscribeCloudSync(listener: (state: CloudSyncState) => void): () => void {
  listeners.add(listener);
  // Emit current state immediately
  listener({ ...currentState });
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Format timestamp into clean, user-friendly string
 */
export function formatSyncTimestamp(date: Date | null): string {
  if (!date) return 'Never';
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * Format relative elapsed time (e.g., 'Just now', '45s ago', '3m ago')
 */
export function formatSyncRelativeTime(date: Date | null): string {
  if (!date) return 'Never';
  const now = Date.now();
  const diffSec = Math.max(0, Math.floor((now - date.getTime()) / 1000));

  if (diffSec < 10) return 'Just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}
