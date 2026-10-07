import { PendingSyncItem, FileItem } from '../types.ts';
import { localFallbackDb } from './fallbackDb.ts';
import { firestoreSaveFile } from './firebaseDb.ts';
import { recordSuccessfulCloudSync } from './cloudSyncTracker.ts';
import { detectDevice } from './api.ts';

const QUEUE_STORAGE_KEY = 'trh_pending_sync_queue_v1';

// Seed demo item if queue is empty on first visit to demonstrate capability
const createDemoItem = (): PendingSyncItem => ({
  id: `sync_demo_${Date.now()}`,
  file_name: 'Science_Lab_Safety_Protocol_2026.pdf',
  file_size: 428000,
  file_type: 'pdf',
  folder_id: 'fld_103',
  folder_name: 'Science & Lab Manuals',
  sharing_type: 'all_teachers',
  queued_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  device: detectDevice(),
  status: 'pending',
  retry_count: 0,
});

class PendingSyncManager {
  private queue: PendingSyncItem[] = [];
  private listeners = new Set<(queue: PendingSyncItem[]) => void>();
  private isSyncingAll = false;

  constructor() {
    this.loadQueue();
    // Listen for online status to automatically sync or notify
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        console.log('[PendingSync] Device came back online. Auto-triggering pending sync check...');
        this.notify();
      });
    }
  }

  private loadQueue() {
    try {
      const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.queue = parsed;
          return;
        }
      }
    } catch (e) {
      console.warn('[PendingSync] Failed to load queue from storage:', e);
    }
    // If no queue exists, initialize empty
    this.queue = [];
  }

  private saveQueue() {
    try {
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(this.queue));
    } catch (e) {
      console.warn('[PendingSync] Failed to save queue to localStorage (quota or private mode):', e);
      // If localStorage is full because of large dataUrls, strip dataUrls from localStorage
      // while keeping them in memory
      try {
        const stripped = this.queue.map((item) => ({
          ...item,
          dataUrl: item.dataUrl && item.dataUrl.length > 500000 ? undefined : item.dataUrl,
        }));
        localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(stripped));
      } catch {}
    }
    this.notify();
  }

  private notify() {
    const copy = [...this.queue];
    this.listeners.forEach((listener) => {
      try {
        listener(copy);
      } catch (err) {
        console.error('[PendingSync] Listener error:', err);
      }
    });
  }

  public subscribe(callback: (queue: PendingSyncItem[]) => void): () => void {
    this.listeners.add(callback);
    callback([...this.queue]);
    return () => {
      this.listeners.delete(callback);
    };
  }

  public getQueue(): PendingSyncItem[] {
    return [...this.queue];
  }

  public getPendingCount(): number {
    return this.queue.filter((item) => item.status !== 'synced').length;
  }

  public addToQueue(
    itemData: Omit<PendingSyncItem, 'id' | 'queued_at' | 'status' | 'retry_count'>
  ): PendingSyncItem {
    const newItem: PendingSyncItem = {
      ...itemData,
      id: `sync_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      queued_at: new Date().toISOString(),
      status: 'pending',
      retry_count: 0,
    };
    this.queue.unshift(newItem);
    this.saveQueue();
    return newItem;
  }

  public addDemoItem(): PendingSyncItem {
    const item = createDemoItem();
    this.queue.unshift(item);
    this.saveQueue();
    return item;
  }

  public removeFromQueue(id: string): void {
    this.queue = this.queue.filter((item) => item.id !== id);
    this.saveQueue();
  }

  public clearQueue(): void {
    this.queue = [];
    this.saveQueue();
  }

  /**
   * Queue multiple files uploaded while disconnected
   */
  public async queueFilesForOfflineUpload(
    files: File[],
    folderId: string | null,
    sharingType: string,
    folderName?: string
  ): Promise<PendingSyncItem[]> {
    const clientDevice = detectDevice();
    const queuedItems: PendingSyncItem[] = [];

    for (const file of files) {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'unknown';

      // Read file to dataUrl for persistence if reasonable size
      let dataUrl: string | undefined;
      try {
        if (file.size < 25 * 1024 * 1024) {
          dataUrl = await new Promise<string>((res, rej) => {
            const reader = new FileReader();
            reader.onload = () => res(reader.result as string);
            reader.onerror = rej;
            reader.readAsDataURL(file);
          });
        }
      } catch (err) {
        console.warn('[PendingSync] Could not read file to dataUrl:', err);
      }

      // Save locally in fallback DB so teacher can immediately access and see it in app
      let localFile: FileItem | null = null;
      try {
        const currentUser = localFallbackDb.getCurrentUserFromToken('') || localFallbackDb.getAdminUsers()[0];
        localFile = localFallbackDb.uploadFile(
          file.name,
          file.size,
          ext,
          folderId,
          sharingType as 'all_teachers' | 'private' | 'selected' | 'admin_only',
          currentUser.id,
          currentUser.username,
          currentUser.email,
          clientDevice,
          dataUrl
        );
        // Mark file as pending sync
        localFallbackDb.updateFile(localFile.id, { pending_sync: true, queued_offline: true });
      } catch (err) {
        console.warn('[PendingSync] Notice creating local file:', err);
      }

      const item = this.addToQueue({
        file_name: file.name,
        file_size: file.size,
        file_type: ext,
        folder_id: folderId,
        folder_name: folderName,
        sharing_type: sharingType,
        device: clientDevice,
        dataUrl,
        local_file_id: localFile ? localFile.id : undefined,
      });

      queuedItems.push(item);
    }

    // Refresh UI
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('trh-files-updated'));
    }

    return queuedItems;
  }

  /**
   * Retry syncing a single queued item
   */
  public async retrySingleItem(id: string): Promise<{ success: boolean; message: string }> {
    const item = this.queue.find((q) => q.id === id);
    if (!item) return { success: false, message: 'Item not found in sync queue.' };

    if (!navigator.onLine) {
      item.status = 'failed';
      item.error = 'Cannot sync while offline. Please reconnect to internet.';
      item.retry_count += 1;
      this.saveQueue();
      return { success: false, message: 'Device is offline.' };
    }

    item.status = 'syncing';
    item.error = undefined;
    this.notify();

    try {
      // 1. Sync to Firestore Cloud Database
      let targetFile: FileItem | null = null;
      if (item.local_file_id) {
        targetFile = localFallbackDb.getFileById(item.local_file_id);
      }

      if (!targetFile) {
        const currentUser = localFallbackDb.getAdminUsers()[0];
        targetFile = {
          id: item.local_file_id || `file_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          user_id: currentUser.id,
          owner_name: currentUser.username,
          owner_email: currentUser.email,
          folder_id: item.folder_id,
          file_name: item.file_name,
          file_type: item.file_type,
          file_size: item.file_size,
          mime_type: 'application/octet-stream',
          storage_path: `uploads/${item.file_name}`,
          device: item.device,
          sharing_type: (item.sharing_type as any) || 'all_teachers',
          shared_with: [],
          is_favorite: false,
          is_trash: false,
          uploaded_at: item.queued_at,
          updated_at: new Date().toISOString(),
        };
      }

      await firestoreSaveFile(targetFile, item.dataUrl);

      // 2. Mark local file as synced
      if (item.local_file_id) {
        try {
          localFallbackDb.updateFile(item.local_file_id, { pending_sync: false, queued_offline: false });
        } catch {}
      }

      item.status = 'synced';
      item.error = undefined;
      recordSuccessfulCloudSync();
      this.saveQueue();

      // Remove after 2 seconds or immediately
      setTimeout(() => {
        this.removeFromQueue(id);
      }, 2000);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('trh-files-updated'));
      }

      return { success: true, message: `Successfully synced "${item.file_name}" to cloud!` };
    } catch (err: any) {
      item.status = 'failed';
      item.error = err.message || 'Sync failed. Will retry later.';
      item.retry_count += 1;
      this.saveQueue();
      return { success: false, message: err.message || 'Upload sync failed.' };
    }
  }

  /**
   * Retry sync for all queued items
   */
  public async retrySyncQueue(): Promise<{
    total: number;
    succeeded: number;
    failed: number;
    isOffline?: boolean;
    message: string;
  }> {
    if (this.isSyncingAll) {
      return { total: this.queue.length, succeeded: 0, failed: 0, message: 'Sync already in progress.' };
    }

    const pendingItems = this.queue.filter((i) => i.status !== 'synced');
    if (pendingItems.length === 0) {
      return { total: 0, succeeded: 0, failed: 0, message: 'No items currently queued for upload.' };
    }

    if (!navigator.onLine) {
      pendingItems.forEach((i) => {
        i.status = 'failed';
        i.error = 'Disconnected from internet. Connect to WiFi or mobile data to sync.';
      });
      this.saveQueue();
      return {
        total: pendingItems.length,
        succeeded: 0,
        failed: pendingItems.length,
        isOffline: true,
        message: 'Device is offline. Connect to internet to sync queued uploads.',
      };
    }

    this.isSyncingAll = true;
    let succeeded = 0;
    let failed = 0;

    for (const item of pendingItems) {
      const result = await this.retrySingleItem(item.id);
      if (result.success) {
        succeeded++;
      } else {
        failed++;
      }
    }

    this.isSyncingAll = false;
    this.notify();

    if (succeeded > 0) {
      recordSuccessfulCloudSync();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('trh-files-updated'));
      }
    }

    return {
      total: pendingItems.length,
      succeeded,
      failed,
      message:
        failed === 0
          ? `All ${succeeded} item(s) successfully synced to cloud!`
          : `Synced ${succeeded} item(s). ${failed} item(s) could not sync.`,
    };
  }
}

export const pendingSyncManager = new PendingSyncManager();
