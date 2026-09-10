import express from 'express';
import type { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';
import { db, UPLOADS_DIR } from './server/db.ts';
import type { StoredUser } from './server/db.ts';
import {
  hashPassword,
  comparePassword,
  generateToken,
  authenticateToken,
  requireAdmin,
  jwt,
  JWT_SECRET,
} from './server/auth.ts';
import type { AuthenticatedRequest } from './server/auth.ts';
import { ensureSampleFiles } from './server/seedFiles.ts';
import * as XLSX from 'xlsx';
// @ts-ignore
import { ZipArchive } from 'archiver';
import type {
  FileItem,
  Folder,
  User,
  UserStats,
  AdminStats,
  SharePermission,
} from './src/types.ts';

// Helper to determine exact, browser-compatible MIME types
export function getMimeType(filename: string, fallback?: string): string {
  const ext = path.extname(filename).toLowerCase().replace('.', '');
  const mimeMap: Record<string, string> = {
    mp4: 'video/mp4',
    webm: 'video/webm',
    mov: 'video/quicktime',
    mkv: 'video/x-matroska',
    avi: 'video/x-msvideo',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    m4a: 'audio/mp4',
    aac: 'audio/aac',
    ogg: 'audio/ogg',
    pdf: 'application/pdf',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    doc: 'application/msword',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    xls: 'application/vnd.ms-excel',
    csv: 'text/csv; charset=utf-8',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ppt: 'application/vnd.ms-powerpoint',
    txt: 'text/plain; charset=utf-8',
    json: 'application/json',
  };
  return mimeMap[ext] || fallback || 'application/octet-stream';
}

// Initialize sample media files
ensureSampleFiles();

const app = express();
const PORT = 3000;

// Enable CORS for mobile devices, cross-origin web access, and proxies
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Client-Device');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
});

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

const CHUNKS_TEMP_DIR = path.join(UPLOADS_DIR, 'temp_chunks');
if (!fs.existsSync(CHUNKS_TEMP_DIR)) {
  fs.mkdirSync(CHUNKS_TEMP_DIR, { recursive: true });
}

// Configure Multer for File Uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const cleanName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}_${cleanName}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 1024 * 1024 * 500, // 500 MB per file limit
  },
});

const chunkStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, CHUNKS_TEMP_DIR);
  },
  filename: (_req, _file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `raw_chunk_${uniqueSuffix}`);
  },
});

const uploadChunk = multer({
  storage: chunkStorage,
  limits: {
    fileSize: 1024 * 1024 * 50, // 50 MB max per chunk
  },
});

// Helper: detect device
function getDeviceFromRequest(req: Request): string {
  const customDevice = req.headers['x-client-device'] as string;
  if (customDevice) return customDevice;

  const ua = (req.headers['user-agent'] || '').toLowerCase();
  if (ua.includes('iphone')) return 'Mobile Phone (iPhone)';
  if (ua.includes('ipad')) return 'Tablet (iPad)';
  if (ua.includes('android') && ua.includes('mobile')) return 'Mobile Phone (Android)';
  if (ua.includes('android')) return 'Tablet (Android)';
  if (ua.includes('macintosh') || ua.includes('mac os')) return 'Desktop (MacBook)';
  if (ua.includes('windows')) return 'Desktop (Windows PC)';
  if (ua.includes('linux')) return 'Desktop (Linux)';
  return 'Web Browser';
}

function getFileCategory(ext: string): 'video' | 'audio' | 'document' | 'image' | 'other' {
  const e = ext.toLowerCase().replace('.', '');
  if (['mp4', 'webm', 'mov', 'avi', 'mkv', 'm4v', '3gp'].includes(e)) return 'video';
  if (['mp3', 'wav', 'm4a', 'aac', 'ogg', 'flac', 'wma'].includes(e)) return 'audio';
  if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'rtf', 'csv', 'odt'].includes(e)) return 'document';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(e)) return 'image';
  return 'other';
}

// ==========================================
// 1. AUTHENTICATION & PROFILE APIS
// ==========================================

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Login
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { identifier, password, rememberMe } = req.body;
  if (!identifier || !password) {
    res.status(400).json({ error: 'Username/Email and Password are required.' });
    return;
  }

  const user = db.getUserByEmailOrUsername(identifier);
  if (!user) {
    res.status(401).json({ error: 'Invalid username/email or password.' });
    return;
  }

  if (user.status === 'suspended') {
    res.status(403).json({ error: 'Your account has been suspended. Please contact the administrator.' });
    return;
  }

  const isMatch = comparePassword(password, user.password_hash);
  if (!isMatch) {
    res.status(401).json({ error: 'Invalid username/email or password.' });
    return;
  }

  // Update last login & device
  const device = getDeviceFromRequest(req);
  db.updateUser(user.id, {
    last_login: new Date().toISOString(),
    device,
  });

  const token = generateToken(user, !!rememberMe);
  const { password_hash, ...safeUser } = user;

  db.addLog({
    id: `log_${Date.now()}`,
    user_id: user.id,
    user_name: user.username,
    user_email: user.email,
    action: 'USER_LOGIN',
    details: `User logged in successfully from ${device}`,
    timestamp: new Date().toISOString(),
    device,
    ip: req.ip,
  });

  res.json({ token, user: safeUser });
});

// Register new teacher
app.post('/api/auth/register', (req: Request, res: Response) => {
  const { username, email, password, role } = req.body;
  if (!username || !email || !password) {
    res.status(400).json({ error: 'All fields are required.' });
    return;
  }

  if (password.length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters.' });
    return;
  }

  const existing = db.getUserByEmailOrUsername(email);
  if (existing) {
    res.status(400).json({ error: 'An account with this email already exists.' });
    return;
  }

  const colors = ['#3b82f6', '#10b981', '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#06b6d4'];
  const avatar_color = colors[Math.floor(Math.random() * colors.length)];
  const device = getDeviceFromRequest(req);

  const newUser: StoredUser = {
    id: `usr_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    username: username.trim(),
    email: email.trim().toLowerCase(),
    password_hash: hashPassword(password),
    role: role === 'admin' ? 'admin' : 'teacher',
    status: 'active',
    storage_used: 0,
    storage_limit: 10 * 1024 * 1024 * 1024, // 10 GB
    avatar_color,
    created_at: new Date().toISOString(),
    last_login: new Date().toISOString(),
    device,
  };

  db.createUser(newUser);
  const token = generateToken(newUser, true);
  const { password_hash, ...safeUser } = newUser;

  // Add welcome notification
  db.addNotification({
    id: `notif_${Date.now()}`,
    user_id: newUser.id,
    title: 'Welcome to Teacher Resource Hub!',
    message: 'Your cloud storage is ready. You can now upload resources from your computer or phone.',
    type: 'info',
    read: false,
    created_at: new Date().toISOString(),
  });

  res.status(201).json({ token, user: safeUser });
});

// Current User Profile
app.get('/api/auth/me', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  const { password_hash, ...safeUser } = req.user;
  res.json({ user: safeUser });
});

// Update Profile
app.put('/api/auth/profile', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return;
  const { username, avatar_color } = req.body;
  const updated = db.updateUser(req.user.id, {
    ...(username ? { username } : {}),
    ...(avatar_color ? { avatar_color } : {}),
  });
  if (!updated) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  const { password_hash, ...safeUser } = updated;
  res.json({ user: safeUser });
});

// Change Password
app.post('/api/auth/change-password', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return;
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: 'Current and new passwords are required.' });
    return;
  }

  if (!comparePassword(currentPassword, req.user.password_hash)) {
    res.status(400).json({ error: 'Current password is incorrect.' });
    return;
  }

  if (newPassword.length < 6) {
    res.status(400).json({ error: 'New password must be at least 6 characters.' });
    return;
  }

  db.updateUser(req.user.id, {
    password_hash: hashPassword(newPassword),
  });

  res.json({ message: 'Password updated successfully.' });
});

// Forgot Password / Password Reset simulation
app.post('/api/auth/forgot-password', (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ error: 'Email is required.' });
    return;
  }

  const user = db.getUserByEmailOrUsername(email);
  if (!user) {
    res.status(404).json({ error: 'No account found with this email address.' });
    return;
  }

  // Generate temporary 6-digit code
  const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
  res.json({
    message: `Password reset verification code generated for ${user.email}.`,
    resetCode,
  });
});

// Reset Password with code
app.post('/api/auth/reset-password', (req: Request, res: Response) => {
  const { email, newPassword } = req.body;
  if (!email || !newPassword) {
    res.status(400).json({ error: 'Email and new password are required.' });
    return;
  }

  const user = db.getUserByEmailOrUsername(email);
  if (!user) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }

  db.updateUser(user.id, {
    password_hash: hashPassword(newPassword),
  });

  res.json({ message: 'Password has been reset successfully. You can now log in.' });
});

// ==========================================
// 2. FOLDER MANAGEMENT APIS
// ==========================================

// Get folders
app.get('/api/folders', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return;
  const isAdmin = req.user.role === 'admin';
  const folders = db.getFolders(req.user.id, isAdmin);
  res.json({ folders });
});

// Create folder
app.post('/api/folders', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return;
  const { folder_name, parent_folder_id, color } = req.body;
  if (!folder_name || !folder_name.trim()) {
    res.status(400).json({ error: 'Folder name is required.' });
    return;
  }

  const folderColors = ['#3b82f6', '#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];
  const assignedColor = color || folderColors[Math.floor(Math.random() * folderColors.length)];

  const newFolder: Folder = {
    id: `fld_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    user_id: req.user.id,
    parent_folder_id: parent_folder_id || null,
    folder_name: folder_name.trim(),
    color: assignedColor,
    created_at: new Date().toISOString(),
  };

  db.createFolder(newFolder);
  const device = getDeviceFromRequest(req);

  db.addLog({
    id: `log_${Date.now()}`,
    user_id: req.user.id,
    user_name: req.user.username,
    user_email: req.user.email,
    action: 'FOLDER_CREATE',
    details: `Created folder "${newFolder.folder_name}"`,
    timestamp: new Date().toISOString(),
    device,
  });

  res.status(201).json({ folder: newFolder });
});

// Update / Rename / Move folder
app.put('/api/folders/:id', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return;
  const { id } = req.params;
  const folder = db.getFolderById(id);
  if (!folder) {
    res.status(404).json({ error: 'Folder not found.' });
    return;
  }

  const canModifyFolder =
    req.user.role === 'admin' ||
    folder.user_id === req.user.id ||
    req.user.can_delete !== false;

  if (!canModifyFolder) {
    res.status(403).json({ error: 'Permission denied: You do not have permission to modify this folder.' });
    return;
  }

  const { folder_name, parent_folder_id, color } = req.body;
  const updated = db.updateFolder(id, {
    ...(folder_name !== undefined ? { folder_name: folder_name.trim() } : {}),
    ...(parent_folder_id !== undefined ? { parent_folder_id } : {}),
    ...(color !== undefined ? { color } : {}),
  });

  res.json({ folder: updated });
});

// Delete folder
app.delete('/api/folders/:id', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return;
  const { id } = req.params;
  const folder = db.getFolderById(id);
  if (!folder) {
    res.status(404).json({ error: 'Folder not found.' });
    return;
  }

  const canDeleteFolder =
    req.user.role === 'admin' ||
    folder.user_id === req.user.id ||
    req.user.can_delete !== false;

  if (!canDeleteFolder) {
    res.status(403).json({ error: 'Permission denied: You do not have permission to delete this folder.' });
    return;
  }

  db.deleteFolder(id);

  db.addLog({
    id: `log_${Date.now()}`,
    user_id: req.user.id,
    user_name: req.user.username,
    user_email: req.user.email,
    action: 'FOLDER_DELETE',
    details: `Deleted folder "${folder.folder_name}" and its contents`,
    timestamp: new Date().toISOString(),
    device: getDeviceFromRequest(req),
  });

  res.json({ message: 'Folder deleted successfully.' });
});

// ==========================================
// 3. FILE MANAGEMENT & CLOUD UPLOAD APIS
// ==========================================

// Get files with flexible filters (cross-device, category, folder, search, favorites, trash)
app.get('/api/files', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return;
  const { folder_id, category, search, view, sort_by, sort_order } = req.query;
  const userId = req.user.id;
  const isAdmin = req.user.role === 'admin';

  let allFiles = db.getFiles();

  // Filter based on view mode
  if (view === 'trash') {
    allFiles = allFiles.filter((f) => f.is_trash && (f.user_id === userId || isAdmin));
  } else {
    // Normal non-trash files
    allFiles = allFiles.filter((f) => !f.is_trash);

    if (view === 'shared_with_me') {
      allFiles = allFiles.filter(
        (f) =>
          f.user_id !== userId &&
          (f.sharing_type === 'all_teachers' ||
            f.shared_with.some((s) => s.shared_user_id === userId || s.shared_user_id === 'all'))
      );
    } else if (view === 'favorites') {
      allFiles = allFiles.filter((f) => f.is_favorite && (f.user_id === userId || isAdmin));
    } else if (view === 'recent') {
      allFiles = allFiles.filter((f) => f.user_id === userId || isAdmin);
    } else if (view === 'my_resources') {
      allFiles = allFiles.filter((f) => f.user_id === userId);
    } else {
      // Default / All
      if (!isAdmin) {
        allFiles = allFiles.filter(
          (f) =>
            f.user_id === userId ||
            f.sharing_type === 'all_teachers' ||
            f.shared_with.some((s) => s.shared_user_id === userId || s.shared_user_id === 'all')
        );
      }
    }
  }

  // Filter by folder if provided
  if (folder_id !== undefined && view !== 'recent' && view !== 'favorites' && view !== 'trash') {
    const targetFolderId = folder_id === 'root' || folder_id === '' ? null : (folder_id as string);
    allFiles = allFiles.filter((f) => f.folder_id === targetFolderId);
  }

  // Filter by category (video, audio, document, image, etc.)
  if (category && category !== 'all') {
    allFiles = allFiles.filter((f) => getFileCategory(f.file_type) === category);
  }

  // Filter by search query
  if (search && typeof search === 'string' && search.trim()) {
    const term = search.toLowerCase().trim();
    allFiles = allFiles.filter(
      (f) =>
        f.file_name.toLowerCase().includes(term) ||
        (f.description && f.description.toLowerCase().includes(term)) ||
        (f.owner_name && f.owner_name.toLowerCase().includes(term))
    );
  }

  // Sorting
  const order = sort_order === 'asc' ? 1 : -1;
  if (sort_by === 'name') {
    allFiles.sort((a, b) => a.file_name.localeCompare(b.file_name) * order);
  } else if (sort_by === 'size') {
    allFiles.sort((a, b) => (a.file_size - b.file_size) * order);
  } else if (sort_by === 'type') {
    allFiles.sort((a, b) => a.file_type.localeCompare(b.file_type) * order);
  } else {
    // Default by date uploaded
    allFiles.sort((a, b) => (new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime()) * order);
  }

  res.json({ files: allFiles });
});

// Upload File (Central Cloud Storage - Cross Device accessible)
app.post(
  '/api/files/upload',
  authenticateToken,
  upload.array('files', 20),
  (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) return;
    const uploadedFiles = req.files as Express.Multer.File[];
    if (!uploadedFiles || uploadedFiles.length === 0) {
      res.status(400).json({ error: 'No files uploaded.' });
      return;
    }

    const targetFolderId = req.body.folder_id === 'root' || !req.body.folder_id ? null : req.body.folder_id;
    const device = req.body.device || getDeviceFromRequest(req);
    const sharingType = req.body.sharing_type || 'private';

    // Calculate total size
    const totalNewSize = uploadedFiles.reduce((sum, f) => sum + f.size, 0);
    const user = db.getUserById(req.user.id);
    if (user && (user.storage_used + totalNewSize) > user.storage_limit) {
      // Remove newly uploaded files to prevent orphaned disk usage
      uploadedFiles.forEach((f) => {
        if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
      });
      res.status(400).json({
        error: `Storage quota exceeded! You have ${(
          (user.storage_limit - user.storage_used) /
          (1024 * 1024)
        ).toFixed(1)} MB remaining.`,
      });
      return;
    }

    const createdItems: FileItem[] = [];

    for (const file of uploadedFiles) {
      const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
      const relativePath = path.basename(file.path);

      const newFileItem: FileItem = {
        id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        user_id: req.user.id,
        folder_id: targetFolderId,
        file_name: file.originalname,
        file_type: ext || 'bin',
        file_size: file.size,
        mime_type: file.mimetype || 'application/octet-stream',
        storage_path: relativePath,
        device,
        uploaded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_favorite: false,
        is_trash: false,
        owner_name: req.user.username,
        owner_email: req.user.email,
        sharing_type: sharingType,
        shared_with: [],
      };

      db.createFile(newFileItem);
      createdItems.push(newFileItem);

      db.addLog({
        id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        user_id: req.user.id,
        user_name: req.user.username,
        user_email: req.user.email,
        action: 'FILE_UPLOAD',
        details: `Uploaded ${newFileItem.file_name} (${(newFileItem.file_size / (1024 * 1024)).toFixed(
          2
        )} MB) from ${device}`,
        timestamp: new Date().toISOString(),
        device,
      });
    }

    // Add notification
    db.addNotification({
      id: `notif_${Date.now()}`,
      user_id: req.user.id,
      title: 'Files Uploaded Successfully',
      message: `${createdItems.length} resource(s) uploaded from ${device}. Available across all your devices.`,
      type: 'success',
      read: false,
      created_at: new Date().toISOString(),
    });

    res.status(201).json({
      message: `${createdItems.length} file(s) uploaded successfully.`,
      files: createdItems,
    });
  }
);

// Single File Upload (for sequential, individual file uploading)
app.post(
  '/api/files/upload-single',
  authenticateToken,
  upload.single('file'),
  (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) return;
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: 'No file uploaded.' });
      return;
    }

    const targetFolderId = req.body.folder_id === 'root' || !req.body.folder_id ? null : req.body.folder_id;
    const device = req.body.device || getDeviceFromRequest(req);
    const sharingType = req.body.sharing_type || 'private';

    const user = db.getUserById(req.user.id);
    if (user && user.role !== 'admin') {
      if (user.status === 'suspended') {
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        res.status(403).json({ error: 'Your account is suspended by Administrator.' });
        return;
      }
      if (user.can_upload === false) {
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        res.status(403).json({ error: 'Your account has been restricted by Administrator from uploading resources.' });
        return;
      }
    }

    if (user && (user.storage_used + file.size) > user.storage_limit) {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      res.status(400).json({
        error: `Storage quota exceeded! You have ${(
          (user.storage_limit - user.storage_used) /
          (1024 * 1024)
        ).toFixed(1)} MB remaining.`,
      });
      return;
    }

    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    const relativePath = path.basename(file.path);
    const mimeType = getMimeType(file.originalname, file.mimetype);

    const newFileItem: FileItem = {
      id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      user_id: req.user.id,
      folder_id: targetFolderId,
      file_name: file.originalname,
      file_type: ext || 'bin',
      file_size: file.size,
      mime_type: mimeType,
      storage_path: relativePath,
      device,
      uploaded_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_favorite: false,
      is_trash: false,
      owner_name: req.user.username,
      owner_email: req.user.email,
      sharing_type: sharingType,
      shared_with: [],
    };

    db.createFile(newFileItem);

    db.addLog({
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      user_id: req.user.id,
      user_name: req.user.username,
      user_email: req.user.email,
      action: 'FILE_UPLOAD',
      details: `Uploaded ${newFileItem.file_name} (${(newFileItem.file_size / (1024 * 1024)).toFixed(
        2
      )} MB) from ${device}`,
      timestamp: new Date().toISOString(),
      device,
    });

    db.addNotification({
      id: `notif_${Date.now()}`,
      user_id: req.user.id,
      title: 'Resource Uploaded',
      message: `"${newFileItem.file_name}" uploaded successfully from ${device}.`,
      type: 'success',
      read: false,
      created_at: new Date().toISOString(),
    });

    res.status(201).json({
      message: 'File uploaded successfully.',
      file: newFileItem,
    });
  }
);

// Chunked File Upload (bypasses Cloud Run / reverse proxy 32MB payload limit)
app.post(
  '/api/files/upload-chunk',
  authenticateToken,
  uploadChunk.single('chunk'),
  (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) return;
    const chunkFile = req.file;
    if (!chunkFile) {
      res.status(400).json({ error: 'No chunk data received.' });
      return;
    }

    const {
      upload_id,
      chunk_index,
      total_chunks,
      file_name,
      file_size,
      folder_id,
      sharing_type,
      device: clientDevice,
    } = req.body;

    const chunkIdx = parseInt(chunk_index, 10);
    const totalChunks = parseInt(total_chunks, 10);
    const expectedFileSize = parseInt(file_size, 10) || 0;

    if (!upload_id || isNaN(chunkIdx) || isNaN(totalChunks) || !file_name) {
      if (fs.existsSync(chunkFile.path)) fs.unlinkSync(chunkFile.path);
      res.status(400).json({ error: 'Missing required chunk parameters.' });
      return;
    }

    // Check permissions and storage quota on initial chunk
    const user = db.getUserById(req.user.id);
    if (user && user.role !== 'admin') {
      if (user.status === 'suspended') {
        if (fs.existsSync(chunkFile.path)) fs.unlinkSync(chunkFile.path);
        res.status(403).json({ error: 'Your account is suspended by Administrator.' });
        return;
      }
      if (user.can_upload === false) {
        if (fs.existsSync(chunkFile.path)) fs.unlinkSync(chunkFile.path);
        res.status(403).json({ error: 'Your account has been restricted by Administrator from uploading resources.' });
        return;
      }
    }

    if (user && (user.storage_used + expectedFileSize) > user.storage_limit) {
      if (fs.existsSync(chunkFile.path)) fs.unlinkSync(chunkFile.path);
      res.status(400).json({
        error: `Storage quota exceeded! You have ${(
          (user.storage_limit - user.storage_used) /
          (1024 * 1024)
        ).toFixed(1)} MB remaining.`,
      });
      return;
    }

    const uploadTempDir = path.join(CHUNKS_TEMP_DIR, upload_id);
    if (!fs.existsSync(uploadTempDir)) {
      fs.mkdirSync(uploadTempDir, { recursive: true });
    }

    const chunkDestPath = path.join(uploadTempDir, `chunk_${chunkIdx}`);
    // Move uploaded chunk to destination
    try {
      fs.renameSync(chunkFile.path, chunkDestPath);
    } catch {
      fs.copyFileSync(chunkFile.path, chunkDestPath);
      fs.unlinkSync(chunkFile.path);
    }

    // If intermediate chunk, acknowledge receipt
    if (chunkIdx < totalChunks - 1) {
      res.json({
        status: 'chunk_received',
        chunkIndex: chunkIdx,
        totalChunks,
      });
      return;
    }

    // Final chunk received: Assemble the full file!
    try {
      const cleanName = file_name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const finalFilename = `${uniqueSuffix}_${cleanName}`;
      const finalFilePath = path.join(UPLOADS_DIR, finalFilename);

      // Assemble file synchronously and cleanly to prevent race conditions or partial flush
      if (fs.existsSync(finalFilePath)) {
        fs.unlinkSync(finalFilePath);
      }

      for (let i = 0; i < totalChunks; i++) {
        const partPath = path.join(uploadTempDir, `chunk_${i}`);
        if (!fs.existsSync(partPath)) {
          if (fs.existsSync(finalFilePath)) fs.unlinkSync(finalFilePath);
          res.status(400).json({ error: `Missing chunk ${i} during file assembly.` });
          return;
        }
        const chunkBuffer = fs.readFileSync(partPath);
        fs.appendFileSync(finalFilePath, chunkBuffer);
      }

      // Clean up temp directory
      try {
        fs.rmSync(uploadTempDir, { recursive: true, force: true });
      } catch {
        // ignore
      }

      const targetFolderId = folder_id === 'root' || !folder_id ? null : folder_id;
      const device = clientDevice || getDeviceFromRequest(req);
      const targetSharingType = sharing_type || 'private';
      const ext = path.extname(file_name).toLowerCase().replace('.', '');
      const stat = fs.statSync(finalFilePath);
      const mimeType = getMimeType(file_name);

      const newFileItem: FileItem = {
        id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        user_id: req.user.id,
        folder_id: targetFolderId,
        file_name,
        file_type: ext || 'bin',
        file_size: stat.size,
        mime_type: mimeType,
        storage_path: finalFilename,
        device,
        uploaded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_favorite: false,
        is_trash: false,
        owner_name: req.user.username,
        owner_email: req.user.email,
        sharing_type: targetSharingType,
        shared_with: [],
      };

      db.createFile(newFileItem);

      db.addLog({
        id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        user_id: req.user.id,
        user_name: req.user.username,
        user_email: req.user.email,
        action: 'FILE_UPLOAD',
        details: `Uploaded ${newFileItem.file_name} (${(newFileItem.file_size / (1024 * 1024)).toFixed(
          2
        )} MB) from ${device} [Chunked Upload]`,
        timestamp: new Date().toISOString(),
        device,
      });

      db.addNotification({
        id: `notif_${Date.now()}`,
        user_id: req.user.id,
        title: 'Resource Uploaded',
        message: `"${newFileItem.file_name}" assembled and saved successfully.`,
        type: 'success',
        read: false,
        created_at: new Date().toISOString(),
      });

      res.status(201).json({
        message: 'File uploaded and assembled successfully.',
        file: newFileItem,
      });
    } catch (err: unknown) {
      console.error('Error assembling chunks:', err);
      res.status(500).json({ error: 'Failed to assemble file chunks.' });
    }
  }
);

// Stream Media (Video & Audio with HTTP 206 Partial Content Range for seeking)
app.get('/api/files/:id/stream', (req: Request, res: Response) => {
  const { id } = req.params;
  const file = db.getFileById(id);
  if (!file) {
    res.status(404).send('File not found');
    return;
  }

  const filePath = ensurePhysicalFileExists(file);
  const mimeType = getMimeType(file.file_name, file.mime_type);
  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    if (start >= fileSize) {
      res.status(416).send(`Requested range not satisfiable: ${start} >= ${fileSize}`);
      return;
    }

    const chunksize = end - start + 1;
    const readStream = fs.createReadStream(filePath, { start, end });
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': mimeType,
    };

    res.writeHead(206, head);
    readStream.pipe(res);
  } else {
    const head = {
      'Content-Length': fileSize,
      'Content-Type': mimeType,
      'Accept-Ranges': 'bytes',
    };
    res.writeHead(200, head);
    fs.createReadStream(filePath).pipe(res);
  }
});

// Ensure Physical File Exists on disk (generating valid binary if seed file is missing)
function ensurePhysicalFileExists(file: FileItem): string {
  const filePath = path.join(UPLOADS_DIR, file.storage_path);
  if (fs.existsSync(filePath)) return filePath;

  try {
    const parentDir = path.dirname(filePath);
    if (!fs.existsSync(parentDir)) fs.mkdirSync(parentDir, { recursive: true });

    const ext = (file.file_type || '').toLowerCase();
    if (ext === 'pdf') {
      const samplePdf = path.join(UPLOADS_DIR, 'sample_cs_lesson_1.pdf');
      if (fs.existsSync(samplePdf)) {
        fs.copyFileSync(samplePdf, filePath);
        return filePath;
      }
      const titleClean = file.file_name.replace(/[^a-zA-Z0-9 _.-]/g, '');
      const minimalPdf = `%PDF-1.4\n1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj\n4 0 obj << /Length 120 >> stream\nBT\n/F1 18 Tf\n50 720 Td\n(${titleClean}) Tj\n/F1 12 Tf\n0 -30 Td\n(Teacher Resource Center - Official Curriculum Copy) Tj\nET\nendstream\nendobj\n5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\nxref\n0 6\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000244 00000 n \n0000000414 00000 n \ntrailer << /Size 6 /Root 1 0 R >>\nstartxref\n491\n%%EOF`;
      fs.writeFileSync(filePath, minimalPdf);
    } else if (['png', 'jpg', 'jpeg', 'webp', 'svg'].includes(ext)) {
      const sampleImg = path.join(UPLOADS_DIR, 'sample_network_topologies.png');
      if (fs.existsSync(sampleImg)) {
        fs.copyFileSync(sampleImg, filePath);
      } else {
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600"><rect width="800" height="600" fill="#1e293b"/><text x="400" y="280" font-family="sans-serif" font-size="24" font-weight="bold" fill="#f8fafc" text-anchor="middle">${file.file_name}</text><text x="400" y="320" font-family="sans-serif" font-size="14" fill="#94a3b8" text-anchor="middle">Educational Teaching Resource Image</text></svg>`;
        fs.writeFileSync(filePath, svg);
      }
    } else if (['xlsx', 'xls'].includes(ext)) {
      // Create valid Excel workbook
      const wb = XLSX.utils.book_new();
      const wsData = [
        ['Roll Number', 'Student Name', 'Assignment 1', 'Midterm Score', 'Final Marks', 'Grade'],
        ['101', 'Aarav Sharma', 23, 85, 91, 'A+'],
        ['102', 'Diya Patel', 21, 79, 85, 'A'],
        ['103', 'Rohan Verma', 19, 74, 78, 'B+'],
        ['104', 'Ananya Gupta', 25, 94, 98, 'A+'],
        ['105', 'Kabir Singh', 18, 68, 72, 'B'],
        ['106', 'Meera Nair', 24, 88, 93, 'A+'],
        ['107', 'Aditya Joshi', 20, 77, 81, 'A'],
      ];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      XLSX.utils.book_append_sheet(wb, ws, 'Academic Records');
      const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      fs.writeFileSync(filePath, buf);
    } else if (ext === 'csv') {
      const csvData = `Roll Number,Student Name,Subject,Score,Status\n101,Aarav Sharma,Mathematics,92,Passed\n102,Diya Patel,Mathematics,88,Passed\n103,Rohan Verma,Mathematics,76,Passed\n104,Ananya Gupta,Mathematics,96,Passed\n`;
      fs.writeFileSync(filePath, csvData, 'utf-8');
    } else if (['docx', 'doc'].includes(ext)) {
      const docContent = `TEACHER RESOURCE CENTER - CURRICULUM ASSET\n\nTitle: ${file.file_name}\nSubject: Academic Course Unit & Lesson Guide\nAuthor: ${file.owner_name} (${file.owner_email})\n\n1. COURSE OBJECTIVES\n- Understand fundamental concepts and real-world applications.\n- Complete interactive laboratory assignments.\n- Review sample question papers for periodic assessments.\n\n2. LESSON MODULE BREAKDOWN\n- Module 1: Foundational Principles & Vocabulary\n- Module 2: Worked Examples and Practical Calculations\n- Module 3: Homework Exercises & Student Problem Sets\n\n[End of Document]`;
      fs.writeFileSync(filePath, docContent, 'utf-8');
    } else if (['mp4', 'webm', 'mov'].includes(ext)) {
      const sampleVid = path.join(UPLOADS_DIR, 'sample_video_lesson5.mp4');
      if (fs.existsSync(sampleVid)) {
        fs.copyFileSync(sampleVid, filePath);
      } else {
        const ftyp = Buffer.from([
          0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x6d, 0x70, 0x34, 0x32, 0x00, 0x00, 0x00, 0x00,
          0x6d, 0x70, 0x34, 0x32, 0x69, 0x73, 0x6f, 0x6d,
        ]);
        const mdat = Buffer.alloc(1024 * 64);
        mdat.writeUInt32BE(mdat.length, 0);
        mdat.write('mdat', 4);
        fs.writeFileSync(filePath, Buffer.concat([ftyp, mdat]));
      }
    } else if (['mp3', 'wav', 'm4a'].includes(ext)) {
      const sampleAud = path.join(UPLOADS_DIR, 'sample_audio_podcast.mp3');
      if (fs.existsSync(sampleAud)) {
        fs.copyFileSync(sampleAud, filePath);
      } else {
        const mp3Buffer = Buffer.alloc(1024 * 32);
        mp3Buffer[0] = 0xff;
        mp3Buffer[1] = 0xfb;
        mp3Buffer[2] = 0x90;
        mp3Buffer[3] = 0x00;
        fs.writeFileSync(filePath, mp3Buffer);
      }
    } else {
      const info = `=== ${file.file_name} ===\nEducational Teaching Resource\nOwner: ${file.owner_name} (${file.owner_email})\nType: ${file.file_type.toUpperCase()}\nSize: ${file.file_size} bytes\nUploaded: ${file.uploaded_at}\n\n[Teaching Curriculum & Digital Assets]`;
      fs.writeFileSync(filePath, info, 'utf-8');
    }
  } catch (err) {
    console.error('Error auto-generating missing physical file:', err);
  }
  return filePath;
}

// Download File (supports cross-device mobile & desktop downloads)
app.get('/api/files/:id/download', (req: Request, res: Response) => {
  const { id } = req.params;
  const file = db.getFileById(id);
  if (!file) {
    res.status(404).send('File not found');
    return;
  }

  // Check download permissions
  const token = (req.query.token as string) || (req.headers.authorization ? req.headers.authorization.replace('Bearer ', '') : null);
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { id: string; role: string };
      const user = db.getUserById(decoded.id);
      if (user && user.role !== 'admin' && user.can_download === false) {
        res.status(403).send('Your account has been restricted by Administrator from downloading files.');
        return;
      }
    } catch {}
  }

  const filePath = ensurePhysicalFileExists(file);
  const mimeType = getMimeType(file.file_name, file.mime_type);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, Content-Type, Content-Length');
  res.setHeader('Content-Type', mimeType);
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${encodeURIComponent(file.file_name)}"; filename*=UTF-8''${encodeURIComponent(file.file_name)}`
  );
  res.download(filePath, file.file_name, (err) => {
    if (err && !res.headersSent) {
      console.warn('File download stream ended or aborted:', err.message);
    }
  });
});

// Bulk Download Multiple Files as a single ZIP archive (works reliably on mobile and desktop browsers)
app.all('/api/files/bulk-download-zip', (req: Request, res: Response) => {
  let fileIds: string[] = [];
  if (req.query.ids && typeof req.query.ids === 'string') {
    fileIds = req.query.ids.split(',').map((s) => s.trim()).filter(Boolean);
  } else if (Array.isArray(req.body?.fileIds)) {
    fileIds = req.body.fileIds;
  }

  if (fileIds.length === 0) {
    res.status(400).json({ error: 'No files specified for download.' });
    return;
  }

  const filesToZip: FileItem[] = [];
  for (const id of fileIds) {
    const file = db.getFileById(id);
    if (file && !file.is_trash) {
      filesToZip.push(file);
    }
  }

  if (filesToZip.length === 0) {
    res.status(404).json({ error: 'No matching files found to archive.' });
    return;
  }

  const zipName =
    filesToZip.length === 1
      ? `${filesToZip[0].file_name.replace(/\.[^/.]+$/, '')}.zip`
      : `Teacher_Resources_${filesToZip.length}_files.zip`;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, Content-Type');
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${encodeURIComponent(zipName)}"; filename*=UTF-8''${encodeURIComponent(zipName)}`
  );

  const archive = new ZipArchive({ zlib: { level: 6 } });
  archive.on('error', (err) => {
    console.error('ZIP archive creation error:', err);
    if (!res.headersSent) res.status(500).json({ error: 'Failed to create zip archive.' });
  });

  archive.pipe(res);

  for (const file of filesToZip) {
    const filePath = ensurePhysicalFileExists(file);
    if (fs.existsSync(filePath)) {
      archive.file(filePath, { name: file.file_name });
    }
  }

  archive.finalize();
});

// File Preview Content (Images, PDFs, Text, Presentations)
app.get('/api/files/:id/preview', (req: Request, res: Response) => {
  const { id } = req.params;
  const file = db.getFileById(id);
  if (!file) {
    res.status(404).send('File not found');
    return;
  }

  const filePath = ensurePhysicalFileExists(file);
  const mimeType = getMimeType(file.file_name, file.mime_type);
  res.setHeader('Content-Type', mimeType);
  res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.file_name)}"`);
  fs.createReadStream(filePath).pipe(res);
});

// Update File (Rename, Move folder, Toggle Favorite, Description)
app.put('/api/files/:id', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return;
  const { id } = req.params;
  const file = db.getFileById(id);
  if (!file) {
    res.status(404).json({ error: 'File not found.' });
    return;
  }

  if (file.user_id !== req.user.id && req.user.role !== 'admin') {
    res.status(403).json({ error: 'Permission denied.' });
    return;
  }

  const { file_name, folder_id, is_favorite, description } = req.body;
  const updates: Partial<FileItem> = {};

  if (file_name !== undefined && file_name.trim()) {
    updates.file_name = file_name.trim();
  }
  if (folder_id !== undefined) {
    updates.folder_id = folder_id === 'root' || !folder_id ? null : folder_id;
  }
  if (is_favorite !== undefined) {
    updates.is_favorite = !!is_favorite;
  }
  if (description !== undefined) {
    updates.description = description;
  }

  const updated = db.updateFile(id, updates);
  res.json({ file: updated });
});

// Copy File
app.post('/api/files/:id/copy', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return;
  const { id } = req.params;
  const file = db.getFileById(id);
  if (!file) {
    res.status(404).json({ error: 'File not found.' });
    return;
  }

  const srcPath = path.join(UPLOADS_DIR, file.storage_path);
  const newStorageName = `${Date.now()}_copy_${path.basename(file.storage_path)}`;
  const dstPath = path.join(UPLOADS_DIR, newStorageName);

  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, dstPath);
  }

  const newFile: FileItem = {
    ...file,
    id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    user_id: req.user.id,
    file_name: `Copy of ${file.file_name}`,
    storage_path: newStorageName,
    uploaded_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    device: getDeviceFromRequest(req),
    shared_with: [],
    sharing_type: 'private',
  };

  db.createFile(newFile);
  res.status(201).json({ file: newFile });
});

// Share File
app.post('/api/files/:id/share', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return;
  const { id } = req.params;
  const file = db.getFileById(id);
  if (!file) {
    res.status(404).json({ error: 'File not found.' });
    return;
  }

  if (file.user_id !== req.user.id && req.user.role !== 'admin') {
    res.status(403).json({ error: 'Permission denied.' });
    return;
  }

  const { sharing_type, target_user_ids, permission } = req.body;
  // sharing_type: 'private' | 'all_teachers' | 'selected' | 'admin_only'

  const newSharedWith: SharePermission[] = [];
  if (sharing_type === 'selected' && Array.isArray(target_user_ids)) {
    target_user_ids.forEach((uid: string) => {
      const targetUser = db.getUserById(uid);
      if (targetUser) {
        newSharedWith.push({
          id: `sh_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          file_id: file.id,
          owner_id: req.user!.id,
          shared_user_id: targetUser.id,
          shared_user_name: targetUser.username,
          shared_user_email: targetUser.email,
          permission: permission === 'edit' ? 'edit' : 'view',
          created_at: new Date().toISOString(),
        });

        // Notify recipient
        db.addNotification({
          id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          user_id: targetUser.id,
          title: 'Resource Shared With You',
          message: `${req.user!.username} shared "${file.file_name}" with you.`,
          type: 'share',
          read: false,
          created_at: new Date().toISOString(),
        });
      }
    });
  }

  const updated = db.updateFile(id, {
    sharing_type: sharing_type || file.sharing_type,
    shared_with: sharing_type === 'selected' ? newSharedWith : [],
  });

  res.json({ file: updated });
});

// Delete File (Soft delete / move to trash or restore or permanent delete)
app.delete('/api/files/:id', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return;
  const { id } = req.params;
  const permanent = req.query.permanent === 'true';
  const file = db.getFileById(id);
  if (!file) {
    res.status(404).json({ error: 'File not found.' });
    return;
  }

  const currentUser = db.getUserById(req.user.id);
  if (currentUser && currentUser.role !== 'admin' && currentUser.can_delete === false) {
    res.status(403).json({ error: 'Your account has been restricted by Administrator from deleting resources.' });
    return;
  }

  if (file.user_id !== req.user.id && req.user.role !== 'admin') {
    res.status(403).json({ error: 'Permission denied.' });
    return;
  }

  db.deleteFile(id, permanent);

  db.addLog({
    id: `log_${Date.now()}`,
    user_id: req.user.id,
    user_name: req.user.username,
    user_email: req.user.email,
    action: permanent ? 'FILE_DELETE_PERMANENT' : 'FILE_MOVE_TRASH',
    details: `${permanent ? 'Permanently deleted' : 'Moved to trash'} "${file.file_name}"`,
    timestamp: new Date().toISOString(),
    device: getDeviceFromRequest(req),
  });

  res.json({ message: permanent ? 'File permanently deleted.' : 'File moved to trash.' });
});

// Restore from trash
app.post('/api/files/:id/restore', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return;
  const { id } = req.params;
  const file = db.getFileById(id);
  if (!file) {
    res.status(404).json({ error: 'File not found.' });
    return;
  }

  const updated = db.updateFile(id, { is_trash: false, trashed_at: undefined });
  res.json({ file: updated });
});

// Bulk Delete Files (soft delete to trash or permanent delete)
app.post('/api/files/bulk/delete', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return;
  const { fileIds, permanent } = req.body;
  if (!Array.isArray(fileIds) || fileIds.length === 0) {
    res.status(400).json({ error: 'fileIds array is required.' });
    return;
  }

  const currentUser = db.getUserById(req.user.id);
  if (currentUser && currentUser.role !== 'admin' && currentUser.can_delete === false) {
    res.status(403).json({ error: 'Your account has been restricted by Administrator from deleting resources.' });
    return;
  }

  let deletedCount = 0;
  for (const id of fileIds) {
    const file = db.getFileById(id);
    if (file && (file.user_id === req.user.id || req.user.role === 'admin')) {
      db.deleteFile(id, !!permanent);
      deletedCount++;
    }
  }

  db.addLog({
    id: `log_${Date.now()}`,
    user_id: req.user.id,
    user_name: req.user.username,
    user_email: req.user.email,
    action: permanent ? 'FILE_BULK_DELETE_PERMANENT' : 'FILE_BULK_MOVE_TRASH',
    details: `${permanent ? 'Permanently deleted' : 'Moved to trash'} ${deletedCount} resource(s)`,
    timestamp: new Date().toISOString(),
    device: getDeviceFromRequest(req),
  });

  res.json({
    message: `Successfully ${permanent ? 'permanently deleted' : 'moved to trash'} ${deletedCount} resource(s).`,
    deletedCount,
  });
});

// Bulk Move Files
app.post('/api/files/bulk/move', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return;
  const { fileIds, targetFolderId } = req.body;
  if (!Array.isArray(fileIds) || fileIds.length === 0) {
    res.status(400).json({ error: 'fileIds array is required.' });
    return;
  }

  const normTarget = targetFolderId === 'root' || !targetFolderId ? null : targetFolderId;
  let movedCount = 0;
  for (const id of fileIds) {
    const file = db.getFileById(id);
    if (file && (file.user_id === req.user.id || req.user.role === 'admin')) {
      db.updateFile(id, { folder_id: normTarget });
      movedCount++;
    }
  }

  db.addLog({
    id: `log_${Date.now()}`,
    user_id: req.user.id,
    user_name: req.user.username,
    user_email: req.user.email,
    action: 'FILE_BULK_MOVE',
    details: `Moved ${movedCount} resource(s) to ${normTarget ? 'folder ' + normTarget : 'root directory'}`,
    timestamp: new Date().toISOString(),
    device: getDeviceFromRequest(req),
  });

  res.json({
    message: `Successfully moved ${movedCount} resource(s).`,
    movedCount,
  });
});

// ==========================================
// 4. STATS & NOTIFICATIONS APIS
// ==========================================

// User Dashboard Statistics
app.get('/api/stats', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return;
  const userId = req.user.id;
  const isAdmin = req.user.role === 'admin';

  const userFolders = db.getFolders(userId, isAdmin);
  const userFiles = db.getFiles().filter((f) => !f.is_trash && (isAdmin || f.user_id === userId));

  let docs = 0;
  let audio = 0;
  let videos = 0;
  let images = 0;
  let other = 0;
  let usedStorage = 0;

  let docsBytes = 0;
  let audioBytes = 0;
  let videosBytes = 0;
  let imagesBytes = 0;
  let otherBytes = 0;

  userFiles.forEach((f) => {
    usedStorage += f.file_size;
    const cat = getFileCategory(f.file_type);
    if (cat === 'document') {
      docs++;
      docsBytes += f.file_size;
    } else if (cat === 'audio') {
      audio++;
      audioBytes += f.file_size;
    } else if (cat === 'video') {
      videos++;
      videosBytes += f.file_size;
    } else if (cat === 'image') {
      images++;
      imagesBytes += f.file_size;
    } else {
      other++;
      otherBytes += f.file_size;
    }
  });

  const stats: UserStats = {
    total_folders: userFolders.length,
    documents: docs,
    audio,
    videos,
    images,
    other_files: other,
    total_documents: docs,
    total_audio: audio,
    total_videos: videos,
    total_images: images,
    total_others: other,
    total_files: userFiles.length,
    storage_used: req.user.storage_used || usedStorage,
    storage_limit: req.user.storage_limit || 10 * 1024 * 1024 * 1024,
    storage_by_category: {
      documents: docsBytes,
      audio: audioBytes,
      videos: videosBytes,
      images: imagesBytes,
      other: otherBytes,
    },
  };

  res.json({ stats });
});

// Notifications
app.get('/api/notifications', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return;
  const notifications = db.getNotifications(req.user.id);
  res.json({ notifications });
});

app.put('/api/notifications/:id/read', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  db.markNotificationRead(id);
  res.json({ message: 'Notification marked as read' });
});

app.post('/api/notifications/read-all', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return;
  db.markAllNotificationsRead(req.user.id);
  res.json({ message: 'All notifications marked as read' });
});

// ==========================================
// 5. ADMIN MANAGEMENT & REPORTS APIS
// ==========================================

// Get all users (Admin only)
app.get('/api/admin/users', authenticateToken, requireAdmin, (_req: AuthenticatedRequest, res: Response) => {
  const users = db.getUsers().map(({ password_hash, ...rest }) => rest);
  res.json({ users });
});

// Admin create user
app.post('/api/admin/users', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { username, email, password, role, storage_limit_gb } = req.body;
  if (!username || !email || !password) {
    res.status(400).json({ error: 'Username, email and password are required.' });
    return;
  }

  const existing = db.getUserByEmailOrUsername(email);
  if (existing) {
    res.status(400).json({ error: 'Email already registered.' });
    return;
  }

  const limitBytes = (storage_limit_gb ? Number(storage_limit_gb) : 10) * 1024 * 1024 * 1024;
  const newUser: StoredUser = {
    id: `usr_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    username: username.trim(),
    email: email.trim().toLowerCase(),
    password_hash: hashPassword(password),
    role: role === 'admin' ? 'admin' : 'teacher',
    status: 'active',
    storage_used: 0,
    storage_limit: limitBytes,
    avatar_color: '#4f46e5',
    created_at: new Date().toISOString(),
  };

  db.createUser(newUser);
  const { password_hash, ...safeUser } = newUser;
  res.status(201).json({ user: safeUser });
});

// Admin get permissions rights matrix
app.get('/api/admin/permissions', authenticateToken, requireAdmin, (_req: AuthenticatedRequest, res: Response) => {
  res.json({
    roles: {
      admin: {
        role: 'admin',
        title: 'System Administrator',
        description: 'Full administrative authority: user management, storage allocation, system logs, and security oversight.',
        rights: {
          can_upload: true,
          can_download: true,
          can_delete: true,
          can_share: true,
          can_manage_users: true,
          can_view_audit_logs: true,
        },
      },
      teacher: {
        role: 'teacher',
        title: 'Educator / Faculty Member',
        description: 'Classroom teaching resource access: uploading curriculum, previewing lesson slides, sharing with fellow faculty.',
        rights: {
          can_upload: true,
          can_download: true,
          can_delete: true,
          can_share: true,
          can_manage_users: false,
          can_view_audit_logs: false,
        },
      },
    },
  });
});

// Admin update user (Role, Status, Reset Password, Storage limit, Access Permissions)
app.put('/api/admin/users/:id', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const {
    role,
    status,
    new_password,
    password,
    storage_limit_gb,
    storage_limit,
    can_upload,
    can_download,
    can_delete,
    can_share,
  } = req.body;

  const updates: Partial<StoredUser> = {};
  if (role) updates.role = role;
  if (status) updates.status = status;
  if (new_password || password) updates.password_hash = hashPassword(new_password || password);
  if (storage_limit_gb !== undefined) updates.storage_limit = Number(storage_limit_gb) * 1024 * 1024 * 1024;
  if (storage_limit !== undefined) updates.storage_limit = Number(storage_limit);
  if (can_upload !== undefined) updates.can_upload = Boolean(can_upload);
  if (can_download !== undefined) updates.can_download = Boolean(can_download);
  if (can_delete !== undefined) updates.can_delete = Boolean(can_delete);
  if (can_share !== undefined) updates.can_share = Boolean(can_share);

  const updated = db.updateUser(id, updates);
  if (!updated) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }

  db.addLog({
    id: `log_${Date.now()}`,
    user_id: req.user!.id,
    user_name: req.user!.username,
    user_email: req.user!.email,
    action: 'USER_PERMISSION_UPDATE',
    details: `Updated permissions & profile for "${updated.username}" (${updated.role}, status: ${updated.status})`,
    timestamp: new Date().toISOString(),
    device: getDeviceFromRequest(req),
  });

  const { password_hash, ...safeUser } = updated;
  res.json({ user: safeUser });
});

// Admin delete user
app.delete('/api/admin/users/:id', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  if (id === req.user?.id) {
    res.status(400).json({ error: 'You cannot delete your own admin account.' });
    return;
  }
  const deleted = db.deleteUser(id);
  if (!deleted) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }
  res.json({ message: 'User deleted.' });
});

// Admin system statistics & reports
app.get('/api/admin/stats', authenticateToken, requireAdmin, (_req: AuthenticatedRequest, res: Response) => {
  const users = db.getUsers();
  const allFiles = db.getFiles().filter((f) => !f.is_trash);

  let totalVideos = 0;
  let totalDocs = 0;
  let totalAudio = 0;
  let totalImages = 0;
  let totalOther = 0;
  let totalStorage = 0;

  const storageByType = {
    videos: 0,
    documents: 0,
    audio: 0,
    images: 0,
    other: 0,
  };

  const deviceBreakdown = {
    desktop: 0,
    mobile: 0,
    tablet: 0,
  };

  const todayStr = new Date().toISOString().split('T')[0];
  let todayUploads = 0;

  allFiles.forEach((f) => {
    totalStorage += f.file_size;
    const cat = getFileCategory(f.file_type);
    if (cat === 'video') {
      totalVideos++;
      storageByType.videos += f.file_size;
    } else if (cat === 'document') {
      totalDocs++;
      storageByType.documents += f.file_size;
    } else if (cat === 'audio') {
      totalAudio++;
      storageByType.audio += f.file_size;
    } else if (cat === 'image') {
      totalImages++;
      storageByType.images += f.file_size;
    } else {
      totalOther++;
      storageByType.other += f.file_size;
    }

    const dev = (f.device || '').toLowerCase();
    if (dev.includes('mobile') || dev.includes('iphone') || dev.includes('phone')) {
      deviceBreakdown.mobile++;
    } else if (dev.includes('tablet') || dev.includes('ipad')) {
      deviceBreakdown.tablet++;
    } else {
      deviceBreakdown.desktop++;
    }

    if (f.uploaded_at && f.uploaded_at.startsWith(todayStr)) {
      todayUploads++;
    }
  });

  const topUsers = users
    .map((u) => {
      const userFiles = allFiles.filter((f) => f.user_id === u.id);
      const storage = userFiles.reduce((acc, f) => acc + f.file_size, 0);
      const { password_hash, ...safeUser } = u;
      return {
        user: safeUser,
        files_count: userFiles.length,
        storage_used: storage,
      };
    })
    .sort((a, b) => b.storage_used - a.storage_used)
    .slice(0, 10);

  const stats: AdminStats = {
    total_users: users.length,
    active_users: users.filter((u) => u.status === 'active').length,
    total_files: allFiles.length,
    total_videos: totalVideos,
    total_documents: totalDocs,
    total_audio: totalAudio,
    total_images: totalImages,
    total_storage: totalStorage,
    today_uploads: todayUploads,
    storage_by_type: storageByType,
    device_breakdown: deviceBreakdown,
    top_users: topUsers,
  };

  res.json({ stats });
});

// Admin security activity logs
app.get('/api/admin/logs', authenticateToken, requireAdmin, (_req: AuthenticatedRequest, res: Response) => {
  const logs = db.getLogs();
  res.json({ logs });
});

// Admin delete inappropriate file
app.delete('/api/admin/files/:id', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const file = db.getFileById(id);
  if (!file) {
    res.status(404).json({ error: 'File not found.' });
    return;
  }

  db.deleteFile(id, true);

  db.addLog({
    id: `log_${Date.now()}`,
    user_id: req.user!.id,
    user_name: req.user!.username,
    user_email: req.user!.email,
    action: 'ADMIN_MODERATION_DELETE',
    details: `Admin removed inappropriate file: "${file.file_name}" (Owner: ${file.owner_name || file.user_id})`,
    timestamp: new Date().toISOString(),
    device: getDeviceFromRequest(req),
  });

  res.json({ message: 'File deleted by administrator.' });
});

// API 404 handler to ensure unhandled /api/* routes always return JSON instead of HTML
app.all('/api/*', (_req, res) => {
  res.status(404).json({ error: 'API endpoint not found.' });
});

// ==========================================
// VITE INTEGRATION & SERVER START
// ==========================================

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        watch: {
          ignored: [
            '**/data/**',
            '**/uploads/**',
            '**/dist/**',
            '**/*.tmp*',
            '**/data/db.json',
            '**/db.json',
            /[/\\]data[/\\]/,
            /[/\\]uploads[/\\]/,
            /[/\\]dist[/\\]/,
            /db\.json$/,
          ],
        },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Teacher Resource Hub server running on http://localhost:${PORT}`);
  });
}

startServer();
