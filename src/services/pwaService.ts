import { registerSW } from 'virtual:pwa-register';

export const CACHE_NAMES = {
  APP_SHELL: 'trh-app-shell-v1',
  RESOURCES: 'trh-cached-resources-v1',
};

class PWAService {
  private updateSW: ((reloadPage?: boolean) => Promise<void>) | null = null;
  private isSWRegistered: boolean = false;

  public init() {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    try {
      this.updateSW = registerSW({
        onNeedRefresh: () => {
          console.log('[PWA] New content is available; refreshing cache...');
        },
        onOfflineReady: () => {
          console.log('[PWA] Teacher Resource Hub is ready for offline operation via Cache API.');
        },
        onRegistered: (r) => {
          this.isSWRegistered = true;
          console.log('[PWA] Service Worker registered with scope:', r?.scope);
        },
        onRegisterError: (error) => {
          console.warn('[PWA] Service Worker registration failed:', error);
        },
      });
    } catch (err) {
      console.warn('[PWA] Could not initialize registerSW:', err);
    }
  }

  /**
   * Directly cache a file or response using the browser Cache API
   */
  public async cacheResourceUrl(url: string, responseClone?: Response): Promise<boolean> {
    if (typeof window === 'undefined' || !('caches' in window)) {
      return false;
    }
    try {
      const cache = await caches.open(CACHE_NAMES.RESOURCES);
      if (responseClone) {
        await cache.put(url, responseClone);
        return true;
      }
      const response = await fetch(url);
      if (response.ok) {
        await cache.put(url, response);
        return true;
      }
      return false;
    } catch (err) {
      console.warn('[PWA Cache API] Failed to cache URL:', url, err);
      return false;
    }
  }

  /**
   * Retrieves a cached response by URL from Cache API
   */
  public async getCachedResponse(url: string): Promise<Response | null> {
    if (typeof window === 'undefined' || !('caches' in window)) {
      return null;
    }
    try {
      const response = await caches.match(url);
      return response || null;
    } catch (err) {
      console.warn('[PWA Cache API] Match error:', err);
      return null;
    }
  }

  /**
   * Check how many items are currently cached in the Cache API
   */
  public async getCachedItemCount(): Promise<number> {
    if (typeof window === 'undefined' || !('caches' in window)) {
      return 0;
    }
    try {
      const keys = await caches.keys();
      let total = 0;
      for (const key of keys) {
        const cache = await caches.open(key);
        const reqs = await cache.keys();
        total += reqs.length;
      }
      return total;
    } catch {
      return 0;
    }
  }
}

export const pwaService = new PWAService();
