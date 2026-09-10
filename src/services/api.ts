import {
  User,
  Folder,
  FileItem,
  UserStats,
  AdminStats,
  NotificationItem,
  ActivityLog,
} from '../types.ts';
import { localFallbackDb } from './fallbackDb.ts';

const TOKEN_KEY = 'trh_auth_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem('trh_token', token);
  sessionStorage.setItem('trh_token', token);
}

export function removeStoredToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem('trh_token');
  sessionStorage.removeItem('trh_token');
}

// Cross-device detector
export function detectDevice(): string {
  const ua = navigator.userAgent.toLowerCase();
  const width = window.innerWidth;
  if (/iphone/i.test(ua)) return 'iPhone';
  if (/ipad/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1)) return 'iPad';
  if (/android/i.test(ua)) {
    return width < 768 ? 'Android Phone' : 'Android Tablet';
  }
  if (/macintosh|mac os x/i.test(ua)) return 'MacBook';
  if (/windows/i.test(ua)) return 'Windows PC';
  if (/linux/i.test(ua)) return 'Linux Workstation';
  return width < 768 ? 'Mobile Browser' : 'Desktop Browser';
}

async function handleLocalFallback<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken() || '';
  const currentUser = localFallbackDb.getCurrentUserFromToken(token) || localFallbackDb.getAdminUsers()[0];
  const method = (options.method || 'GET').toUpperCase();
  const [path, queryString] = endpoint.split('?');
  const searchParams = new URLSearchParams(queryString || '');

  // 1. Auth endpoints
  if (path === '/api/auth/login' && method === 'POST') {
    const body = JSON.parse((options.body as string) || '{}');
    return localFallbackDb.login(body.identifier, body.password) as unknown as T;
  }
  if (path === '/api/auth/register' && method === 'POST') {
    const body = JSON.parse((options.body as string) || '{}');
    return localFallbackDb.register(body.username, body.email, body.password, body.role) as unknown as T;
  }
  if (path === '/api/auth/me' && method === 'GET') {
    return { user: currentUser } as unknown as T;
  }
  if (path === '/api/auth/profile' && method === 'PUT') {
    const body = JSON.parse((options.body as string) || '{}');
    return { user: { ...currentUser, ...body } } as unknown as T;
  }
  if (path === '/api/auth/change-password' && method === 'POST') {
    return { message: 'Password successfully updated.' } as unknown as T;
  }
  if (path === '/api/auth/forgot-password' && method === 'POST') {
    return { message: 'Password reset link sent to your registered email.' } as unknown as T;
  }
  if (path === '/api/auth/reset-password' && method === 'POST') {
    return { message: 'Password reset successful.' } as unknown as T;
  }

  // 2. Folders
  if (path === '/api/folders') {
    if (method === 'GET') {
      return { folders: localFallbackDb.getFolders(currentUser.id) } as unknown as T;
    }
    if (method === 'POST') {
      const body = JSON.parse((options.body as string) || '{}');
      return {
        folder: localFallbackDb.createFolder(body.folder_name, body.parent_folder_id || null, body.color, currentUser.id),
      } as unknown as T;
    }
  }
  if (path.startsWith('/api/folders/')) {
    const folderId = path.split('/api/folders/')[1];
    if (method === 'PUT') {
      const body = JSON.parse((options.body as string) || '{}');
      return { folder: localFallbackDb.updateFolder(folderId, body) } as unknown as T;
    }
    if (method === 'DELETE') {
      localFallbackDb.deleteFolder(folderId);
      return { message: 'Folder deleted.' } as unknown as T;
    }
  }

  // 3. Files
  if (path === '/api/files' && method === 'GET') {
    const params = {
      folder_id: searchParams.get('folder_id'),
      category: searchParams.get('category') || undefined,
      search: searchParams.get('search') || undefined,
      view: searchParams.get('view') || undefined,
    };
    return { files: localFallbackDb.getFiles(params, currentUser.id) } as unknown as T;
  }
  if (path.startsWith('/api/files/') && path.endsWith('/favorite') && method === 'POST') {
    const fileId = path.replace('/api/files/', '').replace('/favorite', '');
    const file = localFallbackDb.getFileById(fileId);
    if (!file) throw new Error('File not found.');
    return { file: localFallbackDb.updateFile(fileId, { is_favorite: !file.is_favorite }) } as unknown as T;
  }
  if (path.startsWith('/api/files/') && path.endsWith('/restore') && method === 'POST') {
    const fileId = path.replace('/api/files/', '').replace('/restore', '');
    return { file: localFallbackDb.updateFile(fileId, { is_trash: false }) } as unknown as T;
  }
  if (path.startsWith('/api/files/') && path.endsWith('/copy') && method === 'POST') {
    const fileId = path.replace('/api/files/', '').replace('/copy', '');
    const file = localFallbackDb.getFileById(fileId);
    if (!file) throw new Error('File not found.');
    const copy = localFallbackDb.uploadFile(
      `Copy of ${file.file_name}`,
      file.file_size,
      file.file_type,
      file.folder_id,
      file.sharing_type,
      currentUser.id,
      currentUser.username,
      currentUser.email,
      'Mobile Browser',
      file.dataUrl
    );
    return { file: copy } as unknown as T;
  }
  if (path.startsWith('/api/files/') && path.endsWith('/share') && method === 'POST') {
    const fileId = path.replace('/api/files/', '').replace('/share', '');
    const body = JSON.parse((options.body as string) || '{}');
    return { file: localFallbackDb.updateFile(fileId, { sharing_type: body.sharing_type || 'public' }) } as unknown as T;
  }
  if (path.startsWith('/api/files/') && method === 'PUT') {
    const fileId = path.replace('/api/files/', '');
    const body = JSON.parse((options.body as string) || '{}');
    return { file: localFallbackDb.updateFile(fileId, body) } as unknown as T;
  }
  if (path.startsWith('/api/files/') && method === 'DELETE') {
    const fileId = path.replace('/api/files/', '');
    const permanent = searchParams.get('permanent') === 'true';
    localFallbackDb.deleteFile(fileId, permanent);
    return { message: 'File deleted.' } as unknown as T;
  }
  if (path === '/api/files/bulk/delete' && method === 'POST') {
    const body = JSON.parse((options.body as string) || '{}');
    (body.fileIds || []).forEach((id: string) => localFallbackDb.deleteFile(id, body.permanent));
    return { message: 'Files deleted.', deletedCount: (body.fileIds || []).length } as unknown as T;
  }
  if (path === '/api/files/bulk/move' && method === 'POST') {
    const body = JSON.parse((options.body as string) || '{}');
    (body.fileIds || []).forEach((id: string) => localFallbackDb.updateFile(id, { folder_id: body.targetFolderId }));
    return { message: 'Files moved.', movedCount: (body.fileIds || []).length } as unknown as T;
  }

  // 4. Stats & Notifications
  if (path === '/api/stats') {
    return { stats: localFallbackDb.getUserStats(currentUser.id) } as unknown as T;
  }
  if (path === '/api/notifications') {
    return { notifications: localFallbackDb.getNotifications(currentUser.id) } as unknown as T;
  }
  if (path.startsWith('/api/notifications/') && path.endsWith('/read')) {
    return { message: 'Notification marked as read.' } as unknown as T;
  }
  if (path === '/api/notifications/read-all') {
    return { message: 'All notifications marked as read.' } as unknown as T;
  }

  // 5. Admin
  if (path === '/api/admin/stats') {
    return { stats: localFallbackDb.getAdminStats() } as unknown as T;
  }
  if (path === '/api/admin/users') {
    if (method === 'GET') {
      return { users: localFallbackDb.getAdminUsers() } as unknown as T;
    }
    if (method === 'POST') {
      const body = JSON.parse((options.body as string) || '{}');
      return localFallbackDb.register(body.username, body.email, body.password, body.role || 'teacher') as unknown as T;
    }
  }
  if (path.startsWith('/api/admin/users/') && method === 'PUT') {
    const userId = path.replace('/api/admin/users/', '');
    const user = localFallbackDb.getUserById(userId);
    return { user } as unknown as T;
  }
  if (path.startsWith('/api/admin/users/') && method === 'DELETE') {
    return { message: 'User deleted.' } as unknown as T;
  }
  if (path === '/api/admin/logs') {
    return { logs: localFallbackDb.getAdminLogs() } as unknown as T;
  }
  if (path.startsWith('/api/admin/files/') && method === 'DELETE') {
    const fileId = path.replace('/api/admin/files/', '');
    localFallbackDb.deleteFile(fileId, true);
    return { message: 'File deleted.' } as unknown as T;
  }

  return {} as T;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  headers.set('X-Client-Device', detectDevice());

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  try {
    const res = await fetch(endpoint, {
      ...options,
      headers,
    });

    if (res.ok) {
      return await res.json();
    }

    let errorMsg = `Server error (${res.status})`;
    try {
      const data = await res.json();
      if (data && data.error) errorMsg = data.error;
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  } catch (err: any) {
    // Only use local fallback if offline or completely disconnected from network
    if (
      typeof navigator !== 'undefined' &&
      !navigator.onLine &&
      (err.message?.includes('Failed to fetch') ||
        err.message?.includes('NetworkError') ||
        err.message?.includes('Load failed'))
    ) {
      console.warn(`[TRH Hub] Offline detected. Activating offline view fallback for ${endpoint}.`);
      return await handleLocalFallback<T>(endpoint, options);
    }

    throw err;
  }
}

export const api = {
  auth: {
    login: (identifier: string, password: string, rememberMe = true) =>
      request<{ token: string; user: User }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ identifier, password, rememberMe }),
      }),

    register: (username: string, email: string, password: string, role = 'teacher') =>
      request<{ token: string; user: User }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ username, email, password, role }),
      }),

    getMe: () => request<{ user: User }>('/api/auth/me'),

    updateProfile: (data: { username?: string; avatar_color?: string; password?: string }) =>
      request<{ user: User }>('/api/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    changePassword: (currentPassword: string, newPassword: string) =>
      request<{ message: string }>('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      }),

    forgotPassword: (email: string) =>
      request<{ message: string; resetCode?: string }>('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      }),

    resetPassword: (email: string, newPassword: string) =>
      request<{ message: string }>('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email, newPassword }),
      }),
  },

  user: {
    getStats: () => request<{ stats: UserStats }>('/api/stats'),
  },

  folders: {
    getAll: () => request<{ folders: Folder[] }>('/api/folders'),

    create: (folder_name: string, parent_folder_id: string | null = null, color?: string) =>
      request<{ folder: Folder }>('/api/folders', {
        method: 'POST',
        body: JSON.stringify({ folder_name, parent_folder_id, color }),
      }),

    update: (id: string, data: { folder_name?: string; parent_folder_id?: string | null; color?: string }) =>
      request<{ folder: Folder }>(`/api/folders/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    delete: (id: string) =>
      request<{ message: string }>(`/api/folders/${id}`, {
        method: 'DELETE',
      }),
  },

  files: {
    getAll: (params: {
      folder_id?: string | null;
      category?: string;
      search?: string;
      view?: string;
      sort_by?: string;
      sort_order?: string;
    } | string | null = {}) => {
      const searchParams = new URLSearchParams();
      if (typeof params === 'string') {
        searchParams.set('folder_id', params);
      } else if (params && typeof params === 'object') {
        if (params.folder_id !== undefined) {
          searchParams.set('folder_id', params.folder_id || 'root');
        }
        if (params.category) searchParams.set('category', params.category);
        if (params.search) searchParams.set('search', params.search);
        if (params.view) searchParams.set('view', params.view);
        if (params.sort_by) searchParams.set('sort_by', params.sort_by);
        if (params.sort_order) searchParams.set('sort_order', params.sort_order);
      }

      const qs = searchParams.toString();
      return request<{ files: FileItem[] }>(`/api/files${qs ? `?${qs}` : ''}`);
    },

    uploadWithProgress: (
      files: File[],
      folderId: string | null = null,
      sharingType = 'private',
      onProgress?: (progress: {
        percentage: number;
        loadedBytes: number;
        totalBytes: number;
        speedBytesPerSec: number;
        remainingSeconds: number;
        currentFileName?: string;
        currentFileIndex?: number;
        totalFilesCount?: number;
      }) => void
    ): { promise: Promise<{ message: string; files: FileItem[] }>; abort: () => void } => {
      let isAborted = false;
      let currentXhr: XMLHttpRequest | null = null;

      const saveUploadedFileLocally = async (
        file: File,
        targetFolderId: string | null,
        shareType: string,
        dev: string
      ): Promise<FileItem> => {
        const ext = file.name.split('.').pop()?.toLowerCase() || '';
        let cat: 'video' | 'audio' | 'document' | 'image' | 'other' = 'other';
        if (['mp4', 'webm', 'mov', 'avi'].includes(ext)) cat = 'video';
        else if (['mp3', 'wav', 'aac', 'ogg'].includes(ext)) cat = 'audio';
        else if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext)) cat = 'image';
        else if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt'].includes(ext)) cat = 'document';

        let dataUrl: string | undefined;
        if (file.size < 12 * 1024 * 1024) {
          try {
            dataUrl = await new Promise<string>((res, rej) => {
              const reader = new FileReader();
              reader.onload = () => res(reader.result as string);
              reader.onerror = rej;
              reader.readAsDataURL(file);
            });
          } catch {
            // ignore
          }
        }

        const token = getStoredToken() || '';
        const currentUser = localFallbackDb.getCurrentUserFromToken(token) || localFallbackDb.getAdminUsers()[0];
        const validShareType =
          shareType === 'all_teachers' || shareType === 'selected' || shareType === 'admin_only'
            ? shareType
            : 'private';
        return localFallbackDb.uploadFile(
          file.name,
          file.size,
          ext,
          targetFolderId,
          validShareType,
          currentUser.id,
          currentUser.username,
          currentUser.email,
          dev,
          dataUrl
        );
      };

      const abort = () => {
        isAborted = true;
        if (currentXhr) {
          try {
            currentXhr.abort();
          } catch {
            // ignore
          }
        }
      };

      const promise = new Promise<{ message: string; files: FileItem[] }>(async (resolve, reject) => {
        const totalBytes = files.reduce((acc, f) => acc + f.size, 0);
        let completedBytes = 0;
        const createdFiles: FileItem[] = [];
        const startTime = Date.now();
        let lastLoadedForSpeed = 0;
        let lastTimeForSpeed = startTime;

        const updateAggregateProgress = (
          currentPieceLoaded: number,
          fileName: string,
          fileIdx: number
        ) => {
          if (!onProgress) return;
          const currentTotalLoaded = Math.min(totalBytes, completedBytes + currentPieceLoaded);
          const now = Date.now();
          const timeDiff = (now - lastTimeForSpeed) / 1000;
          const bytesDiff = currentTotalLoaded - lastLoadedForSpeed;

          let speed = 0;
          if (timeDiff > 0.3) {
            speed = bytesDiff / timeDiff;
            lastLoadedForSpeed = currentTotalLoaded;
            lastTimeForSpeed = now;
          } else if (now - startTime > 0) {
            speed = currentTotalLoaded / ((now - startTime) / 1000);
          }

          const remainingBytes = Math.max(0, totalBytes - currentTotalLoaded);
          const remainingSeconds = speed > 0 ? Math.ceil(remainingBytes / speed) : 0;
          const percentage =
            totalBytes > 0 ? Math.min(100, Math.round((currentTotalLoaded / totalBytes) * 100)) : 100;

          onProgress({
            percentage,
            loadedBytes: currentTotalLoaded,
            totalBytes,
            speedBytesPerSec: speed,
            remainingSeconds,
            currentFileName: fileName,
            currentFileIndex: fileIdx + 1,
            totalFilesCount: files.length,
          });
        };

        const token = getStoredToken();
        const clientDevice = detectDevice();

        try {
          for (let fileIdx = 0; fileIdx < files.length; fileIdx++) {
            if (isAborted) throw new Error('Upload cancelled by user.');
            const file = files[fileIdx];
            const DIRECT_UPLOAD_MAX = 25 * 1024 * 1024; // 25 MB direct upload for fast, reliable video/media transfers
            const CHUNK_SIZE = 10 * 1024 * 1024; // 10 MB chunks safe for proxy limits on very large files

            if (file.size <= DIRECT_UPLOAD_MAX) {
              // Upload single file directly
              const result = await new Promise<FileItem>((res, rej) => {
                const xhr = new XMLHttpRequest();
                currentXhr = xhr;

                const formData = new FormData();
                formData.append('file', file);
                if (folderId) formData.append('folder_id', folderId);
                formData.append('device', clientDevice);
                formData.append('sharing_type', sharingType);

                xhr.open('POST', '/api/files/upload-single', true);
                if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
                xhr.setRequestHeader('X-Client-Device', clientDevice);

                xhr.upload.onprogress = (event) => {
                  if (event.lengthComputable) {
                    updateAggregateProgress(event.loaded, file.name, fileIdx);
                  }
                };

                xhr.onload = async () => {
                  if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                      const data = JSON.parse(xhr.responseText);
                      res(data.file);
                    } catch {
                      rej(new Error('Invalid response from server.'));
                    }
                  } else {
                    let msg = `Upload failed (${xhr.status})`;
                    try {
                      const err = JSON.parse(xhr.responseText);
                      if (err && err.error) msg = err.error;
                    } catch {}
                    rej(new Error(msg));
                  }
                };

                xhr.onerror = () => {
                  rej(new Error('Network connection error during upload. Please check your connection and retry.'));
                };
                xhr.onabort = () => rej(new Error('Upload cancelled by user.'));

                xhr.send(formData);
              });

              createdFiles.push(result);
              completedBytes += file.size;
              updateAggregateProgress(0, file.name, fileIdx);
            } else {
              // Chunked upload for files > 25MB
              const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
              const uploadId = `up_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
              let fileChunksBytesUploaded = 0;
              let assembledFileItem: FileItem | null = null;

              for (let chunkIdx = 0; chunkIdx < totalChunks; chunkIdx++) {
                if (isAborted) throw new Error('Upload cancelled by user.');
                const start = chunkIdx * CHUNK_SIZE;
                const end = Math.min(file.size, start + CHUNK_SIZE);
                const chunkBlob = file.slice(start, end);
                const chunkLength = end - start;

                const chunkResult = await new Promise<{ status?: string; file?: FileItem }>((res, rej) => {
                  const xhr = new XMLHttpRequest();
                  currentXhr = xhr;

                  const formData = new FormData();
                  formData.append('chunk', chunkBlob, `${file.name}.part${chunkIdx}`);
                  formData.append('upload_id', uploadId);
                  formData.append('chunk_index', String(chunkIdx));
                  formData.append('total_chunks', String(totalChunks));
                  formData.append('file_name', file.name);
                  formData.append('file_size', String(file.size));
                  if (folderId) formData.append('folder_id', folderId);
                  formData.append('sharing_type', sharingType);
                  formData.append('device', clientDevice);

                  xhr.open('POST', '/api/files/upload-chunk', true);
                  if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
                  xhr.setRequestHeader('X-Client-Device', clientDevice);

                  xhr.upload.onprogress = (event) => {
                    if (event.lengthComputable) {
                      const currentFileLoaded = fileChunksBytesUploaded + event.loaded;
                      updateAggregateProgress(currentFileLoaded, file.name, fileIdx);
                    }
                  };

                  xhr.onload = async () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                      try {
                        const data = JSON.parse(xhr.responseText);
                        res(data);
                      } catch {
                        rej(new Error('Invalid response from server.'));
                      }
                    } else {
                      let msg = `Upload failed (${xhr.status})`;
                      try {
                        const err = JSON.parse(xhr.responseText);
                        if (err && err.error) msg = err.error;
                      } catch {}
                      rej(new Error(msg));
                    }
                  };

                  xhr.onerror = () => {
                    rej(new Error('Network connection error during chunked upload. Please retry.'));
                  };
                  xhr.onabort = () => rej(new Error('Upload cancelled by user.'));

                  xhr.send(formData);
                });

                fileChunksBytesUploaded += chunkLength;
                if (chunkResult.file) {
                  assembledFileItem = chunkResult.file;
                }
              }

              if (assembledFileItem) {
                createdFiles.push(assembledFileItem);
              }
              completedBytes += file.size;
              updateAggregateProgress(0, file.name, fileIdx);
            }
          }

          resolve({
            message: `${createdFiles.length} file(s) uploaded successfully.`,
            files: createdFiles,
          });
        } catch (err: unknown) {
          reject(err instanceof Error ? err : new Error('Upload error occurred.'));
        }
      });

      return {
        promise,
        abort,
      };
    },

    update: (
      id: string,
      data: { file_name?: string; folder_id?: string | null; is_favorite?: boolean; description?: string }
    ) =>
      request<{ file: FileItem }>(`/api/files/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    rename: (id: string, newName: string) =>
      request<{ file: FileItem }>(`/api/files/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ file_name: newName }),
      }),

    move: (id: string, targetFolderId: string | null) =>
      request<{ file: FileItem }>(`/api/files/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ folder_id: targetFolderId }),
      }),

    toggleFavorite: (id: string) =>
      request<{ file: FileItem }>(`/api/files/${id}/favorite`, {
        method: 'POST',
      }),

    moveToTrash: (id: string) =>
      request<{ message: string }>(`/api/files/${id}?permanent=false`, {
        method: 'DELETE',
      }),

    restoreFromTrash: (id: string) =>
      request<{ file: FileItem }>(`/api/files/${id}/restore`, {
        method: 'POST',
      }),

    copy: (id: string) =>
      request<{ file: FileItem }>(`/api/files/${id}/copy`, {
        method: 'POST',
      }),

    share: (id: string, data: { sharing_type: string; target_user_ids?: string[]; permission?: 'view' | 'edit' }) =>
      request<{ file: FileItem }>(`/api/files/${id}/share`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    delete: (id: string, permanent = true) =>
      request<{ message: string }>(`/api/files/${id}?permanent=${permanent}`, {
        method: 'DELETE',
      }),

    bulkDelete: (fileIds: string[], permanent = false) =>
      request<{ message: string; deletedCount: number }>('/api/files/bulk/delete', {
        method: 'POST',
        body: JSON.stringify({ fileIds, permanent }),
      }),

    bulkMove: (fileIds: string[], targetFolderId: string | null) =>
      request<{ message: string; movedCount: number }>('/api/files/bulk/move', {
        method: 'POST',
        body: JSON.stringify({ fileIds, targetFolderId }),
      }),

    restore: (id: string) =>
      request<{ file: FileItem }>(`/api/files/${id}/restore`, {
        method: 'POST',
      }),

    download: async (id: string, fileName: string) => {
      const token = getStoredToken();
      const downloadUrl = `/api/files/${id}/download${token ? `?token=${encodeURIComponent(token)}` : ''}`;

      try {
        // Fetch as Blob first: 100% reliable across modern iOS Safari, Android Chrome, and Desktop
        const response = await fetch(downloadUrl, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (response.ok) {
          const blob = await response.blob();
          const blobUrl = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.style.display = 'none';
          a.href = blobUrl;
          a.download = fileName;
          document.body.appendChild(a);
          a.click();
          setTimeout(() => {
            if (a.parentNode) a.parentNode.removeChild(a);
            window.URL.revokeObjectURL(blobUrl);
          }, 60000);
          return;
        }
      } catch (err) {
        console.warn('[TRH Hub] Direct blob download fetch error, falling back to direct link:', err);
      }

      // Fallback: direct anchor with target="_blank"
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = downloadUrl;
      a.setAttribute('download', fileName);
      a.setAttribute('target', '_blank');
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        if (a.parentNode) a.parentNode.removeChild(a);
      }, 10000);
    },

    downloadZip: async (fileIds: string[], zipName = 'Teacher_Resources.zip') => {
      if (!fileIds || fileIds.length === 0) return;
      const token = getStoredToken();
      const qs = new URLSearchParams();
      qs.set('ids', fileIds.join(','));
      if (token) qs.set('token', token);

      const url = `/api/files/bulk-download-zip?${qs.toString()}`;

      try {
        const response = await fetch(url, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (response.ok) {
          const blob = await response.blob();
          const blobUrl = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.style.display = 'none';
          a.href = blobUrl;
          a.download = zipName;
          document.body.appendChild(a);
          a.click();
          setTimeout(() => {
            if (a.parentNode) a.parentNode.removeChild(a);
            window.URL.revokeObjectURL(blobUrl);
          }, 60000);
          return;
        }
      } catch (err) {
        console.warn('[TRH Hub] Zip archive fetch error, falling back to direct link:', err);
      }

      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.setAttribute('download', zipName);
      a.setAttribute('target', '_blank');
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        if (a.parentNode) a.parentNode.removeChild(a);
      }, 10000);
    },

    getDownloadUrl: (id: string) => {
      const fallback = localFallbackDb.getFileById(id);
      if (fallback?.dataUrl) return fallback.dataUrl;
      const token = getStoredToken();
      return `/api/files/${id}/download${token ? `?token=${encodeURIComponent(token)}` : ''}`;
    },
    getStreamUrl: (id: string) => {
      const fallback = localFallbackDb.getFileById(id);
      if (fallback?.dataUrl) return fallback.dataUrl;
      const token = getStoredToken();
      return `/api/files/${id}/stream${token ? `?token=${encodeURIComponent(token)}` : ''}`;
    },
    getPreviewUrl: (id: string) => {
      const fallback = localFallbackDb.getFileById(id);
      if (fallback?.dataUrl) return fallback.dataUrl;
      const token = getStoredToken();
      return `/api/files/${id}/preview${token ? `?token=${encodeURIComponent(token)}` : ''}`;
    },
  },

  stats: {
    get: () => request<{ stats: UserStats }>('/api/stats'),
  },

  notifications: {
    getAll: () => request<{ notifications: NotificationItem[] }>('/api/notifications'),
    markRead: (id: string) => request<{ message: string }>(`/api/notifications/${id}/read`, { method: 'PUT' }),
    markAllRead: () => request<{ message: string }>('/api/notifications/read-all', { method: 'POST' }),
  },

  admin: {
    getUsers: () => request<{ users: User[] }>('/api/admin/users'),

    createUser: (data: { username: string; email: string; password: string; role?: string; storage_limit_gb?: number }) =>
      request<{ user: User }>('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    updateUser: (
      id: string,
      data: {
        role?: string;
        status?: string;
        new_password?: string;
        password?: string;
        storage_limit_gb?: number;
        storage_limit?: number;
        can_upload?: boolean;
        can_download?: boolean;
        can_delete?: boolean;
        can_share?: boolean;
      }
    ) => {
      // Normalize payload
      const payload: {
        role?: string;
        status?: string;
        new_password?: string;
        storage_limit_gb?: number;
        can_upload?: boolean;
        can_download?: boolean;
        can_delete?: boolean;
        can_share?: boolean;
      } = {
        role: data.role,
        status: data.status,
        new_password: data.new_password || data.password,
        can_upload: data.can_upload,
        can_download: data.can_download,
        can_delete: data.can_delete,
        can_share: data.can_share,
        storage_limit_gb:
          data.storage_limit_gb !== undefined
            ? data.storage_limit_gb
            : data.storage_limit !== undefined
            ? Math.round(data.storage_limit / (1024 * 1024 * 1024))
            : undefined,
      };
      return request<{ user: User }>(`/api/admin/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    },

    deleteUser: (id: string) =>
      request<{ message: string }>(`/api/admin/users/${id}`, {
        method: 'DELETE',
      }),

    getAllFiles: () => request<{ files: FileItem[] }>('/api/files?view=all'),

    getActivityLogs: () => request<{ logs: ActivityLog[] }>('/api/admin/logs'),

    getStats: () => request<{ stats: AdminStats }>('/api/admin/stats'),

    getLogs: () => request<{ logs: ActivityLog[] }>('/api/admin/logs'),

    deleteFile: (id: string) =>
      request<{ message: string }>(`/api/admin/files/${id}`, {
        method: 'DELETE',
      }),
  },
};

/**
 * Automatically sync any files that were uploaded into local fallback storage
 * during network glitches or testing, pushing them to the central cloud server
 * so they become immediately accessible across all mobile & desktop browsers!
 */
export async function syncLocalFilesToServer(): Promise<number> {
  try {
    const raw = localStorage.getItem('trh_local_fallback_db_v3');
    if (!raw) return 0;
    const data = JSON.parse(raw);
    if (!data || !Array.isArray(data.files)) return 0;

    const token = getStoredToken();
    if (!token) return 0;

    let syncedCount = 0;
    const remainingFiles = [];

    for (const f of data.files) {
      // Check if it is a user-uploaded local file with a dataUrl
      if (f.dataUrl && f.dataUrl.startsWith('data:') && !f.id.startsWith('seed_')) {
        try {
          const res = await fetch(f.dataUrl);
          const blob = await res.blob();
          const file = new File([blob], f.file_name, { type: f.mime_type || blob.type });

          const formData = new FormData();
          formData.append('file', file);
          if (f.folder_id) formData.append('folder_id', f.folder_id);
          formData.append('device', f.device || 'Mobile Browser');
          formData.append('sharing_type', f.sharing_type || 'all_teachers');

          const uploadRes = await fetch('/api/files/upload-single', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'X-Client-Device': f.device || 'Mobile Browser',
            },
            body: formData,
          });

          if (uploadRes.ok) {
            syncedCount++;
            continue; // Successfully pushed to cloud
          }
        } catch (e) {
          console.warn('[TRH Sync] Failed to sync local file to server:', f.file_name, e);
        }
      }
      remainingFiles.push(f);
    }

    if (syncedCount > 0) {
      data.files = remainingFiles;
      localStorage.setItem('trh_local_fallback_db_v3', JSON.stringify(data));
      console.log(`[TRH Sync] Successfully synchronized ${syncedCount} file(s) to cloud server.`);
    }

    return syncedCount;
  } catch (err) {
    console.warn('[TRH Sync] Sync error:', err);
    return 0;
  }
}

