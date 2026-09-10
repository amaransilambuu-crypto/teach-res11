import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import type {
  User,
  Folder,
  FileItem,
  SharePermission,
  NotificationItem,
  ActivityLog,
} from '../src/types.ts';

const DATA_DIR = path.join(process.cwd(), 'data');
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Ensure directories exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

export interface StoredUser extends User {
  password_hash: string;
}

export interface DatabaseSchema {
  users: StoredUser[];
  folders: Folder[];
  files: FileItem[];
  shares: SharePermission[];
  notifications: NotificationItem[];
  logs: ActivityLog[];
}

// Initial Database Seeding
function getInitialData(): DatabaseSchema {
  const salt = bcrypt.genSaltSync(10);
  const defaultPasswordHash = bcrypt.hashSync('teacher123', salt);
  const adminPasswordHash = bcrypt.hashSync('admin123', salt);

  const adminId = 'usr_admin_01';
  const teacher1Id = 'usr_teacher_01';
  const teacher2Id = 'usr_teacher_02';

  const users: StoredUser[] = [
    {
      id: adminId,
      username: 'Admin',
      email: 'admin@school.edu',
      password_hash: adminPasswordHash,
      role: 'admin',
      status: 'active',
      storage_used: 125829120, // ~120 MB
      storage_limit: 20 * 1024 * 1024 * 1024, // 20 GB
      avatar_color: '#4f46e5', // indigo
      created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
      last_login: new Date().toISOString(),
      device: 'MacBook Pro',
      can_upload: true,
      can_download: true,
      can_delete: true,
      can_share: true,
    },
    {
      id: teacher1Id,
      username: 'Teacher',
      email: 'teacher@school.edu',
      password_hash: defaultPasswordHash,
      role: 'teacher',
      status: 'active',
      storage_used: 356515840, // ~340 MB
      storage_limit: 10 * 1024 * 1024 * 1024, // 10 GB
      avatar_color: '#0284c7', // sky
      created_at: new Date(Date.now() - 14 * 86400000).toISOString(),
      last_login: new Date().toISOString(),
      device: 'Desktop Computer',
      can_upload: true,
      can_download: true,
      can_delete: true,
      can_share: true,
    },
    {
      id: teacher2Id,
      username: 'Sarah Jenkins',
      email: 'sarah.math@school.edu',
      password_hash: defaultPasswordHash,
      role: 'teacher',
      status: 'active',
      storage_used: 188743680, // ~180 MB
      storage_limit: 10 * 1024 * 1024 * 1024, // 10 GB
      avatar_color: '#10b981', // emerald
      created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
      last_login: new Date(Date.now() - 3600000).toISOString(),
      device: 'iPad Air',
      can_upload: true,
      can_download: true,
      can_delete: true,
      can_share: true,
    },
  ];

  // Seed folders matching prompt requirement #5:
  // Teaching Resources
  // ├── Class 11
  // │   ├── Computer Science
  // │   └── Question Papers
  // ├── Class 12
  // │   ├── Computer Science
  // │   │   ├── Lesson 1
  // │   │   ├── Lesson 2
  // │   │   └── Lesson 5
  // │   ├── Videos
  // │   └── Audio
  // ├── PPT
  // ├── PDF
  // ├── Worksheets
  // └── Model Question Papers

  const now = new Date().toISOString();

  const fldClass11: Folder = {
    id: 'fld_class_11',
    user_id: teacher1Id,
    parent_folder_id: null,
    folder_name: 'Class 11',
    color: '#3b82f6',
    created_at: now,
  };
  const fldClass11CS: Folder = {
    id: 'fld_class_11_cs',
    user_id: teacher1Id,
    parent_folder_id: 'fld_class_11',
    folder_name: 'Computer Science',
    color: '#6366f1',
    created_at: now,
  };
  const fldClass11QP: Folder = {
    id: 'fld_class_11_qp',
    user_id: teacher1Id,
    parent_folder_id: 'fld_class_11',
    folder_name: 'Question Papers',
    color: '#8b5cf6',
    created_at: now,
  };

  const fldClass12: Folder = {
    id: 'fld_class_12',
    user_id: teacher1Id,
    parent_folder_id: null,
    folder_name: 'Class 12',
    color: '#06b6d4',
    created_at: now,
  };
  const fldClass12CS: Folder = {
    id: 'fld_class_12_cs',
    user_id: teacher1Id,
    parent_folder_id: 'fld_class_12',
    folder_name: 'Computer Science',
    color: '#0ea5e9',
    created_at: now,
  };
  const fldClass12L1: Folder = {
    id: 'fld_class_12_l1',
    user_id: teacher1Id,
    parent_folder_id: 'fld_class_12_cs',
    folder_name: 'Lesson 1',
    color: '#10b981',
    created_at: now,
  };
  const fldClass12L2: Folder = {
    id: 'fld_class_12_l2',
    user_id: teacher1Id,
    parent_folder_id: 'fld_class_12_cs',
    folder_name: 'Lesson 2',
    color: '#14b8a6',
    created_at: now,
  };
  const fldClass12L5: Folder = {
    id: 'fld_class_12_l5',
    user_id: teacher1Id,
    parent_folder_id: 'fld_class_12_cs',
    folder_name: 'Lesson 5',
    color: '#f59e0b',
    created_at: now,
  };

  const fldClass12Videos: Folder = {
    id: 'fld_class_12_vid',
    user_id: teacher1Id,
    parent_folder_id: 'fld_class_12',
    folder_name: 'Videos',
    color: '#ef4444',
    created_at: now,
  };
  const fldClass12Audio: Folder = {
    id: 'fld_class_12_aud',
    user_id: teacher1Id,
    parent_folder_id: 'fld_class_12',
    folder_name: 'Audio',
    color: '#ec4899',
    created_at: now,
  };

  const fldPPT: Folder = {
    id: 'fld_ppt',
    user_id: teacher1Id,
    parent_folder_id: null,
    folder_name: 'PPT',
    color: '#f97316',
    created_at: now,
  };
  const fldPDF: Folder = {
    id: 'fld_pdf',
    user_id: teacher1Id,
    parent_folder_id: null,
    folder_name: 'PDF',
    color: '#dc2626',
    created_at: now,
  };
  const fldWorksheets: Folder = {
    id: 'fld_worksheets',
    user_id: teacher1Id,
    parent_folder_id: null,
    folder_name: 'Worksheets',
    color: '#16a34a',
    created_at: now,
  };
  const fldModelPapers: Folder = {
    id: 'fld_model_papers',
    user_id: teacher1Id,
    parent_folder_id: null,
    folder_name: 'Model Question Papers',
    color: '#7c3aed',
    created_at: now,
  };

  const folders: Folder[] = [
    fldClass11,
    fldClass11CS,
    fldClass11QP,
    fldClass12,
    fldClass12CS,
    fldClass12L1,
    fldClass12L2,
    fldClass12L5,
    fldClass12Videos,
    fldClass12Audio,
    fldPPT,
    fldPDF,
    fldWorksheets,
    fldModelPapers,
  ];

  // Pre-seed sample educational files (including the example Class_12_Lesson_5.mp4 mentioned in prompt!)
  const files: FileItem[] = [
    {
      id: 'file_lesson_5_mp4',
      user_id: teacher1Id,
      folder_id: 'fld_class_12_l5',
      file_name: 'Class_12_Lesson_5.mp4',
      file_type: 'mp4',
      file_size: 156000000, // 156 MB
      mime_type: 'video/mp4',
      storage_path: 'sample_video_lesson5.mp4',
      device: 'Mobile Phone (iPhone 15)',
      uploaded_at: new Date(Date.now() - 3600000 * 2).toISOString(),
      updated_at: new Date(Date.now() - 3600000 * 2).toISOString(),
      is_favorite: true,
      owner_name: 'Teacher',
      owner_email: 'teacher@school.edu',
      duration: 742, // 12m 22s
      description: 'Recorded lecture on Data Structures & Trees for Class 12.',
      sharing_type: 'all_teachers',
      shared_with: [],
    },
    {
      id: 'file_cs_lesson_1_pdf',
      user_id: teacher1Id,
      folder_id: 'fld_class_12_l1',
      file_name: 'Class_12_CS_Lesson_1_Overview.pdf',
      file_type: 'pdf',
      file_size: 4200000, // 4.2 MB
      mime_type: 'application/pdf',
      storage_path: 'sample_cs_lesson_1.pdf',
      device: 'Desktop Computer (Windows 11)',
      uploaded_at: new Date(Date.now() - 86400000 * 3).toISOString(),
      updated_at: new Date(Date.now() - 86400000 * 3).toISOString(),
      is_favorite: true,
      owner_name: 'Teacher',
      owner_email: 'teacher@school.edu',
      description: 'Introduction to Object Oriented Programming concepts and syntax.',
      sharing_type: 'private',
      shared_with: [],
    },
    {
      id: 'file_class_11_audio_lecture',
      user_id: teacher1Id,
      folder_id: 'fld_class_12_aud',
      file_name: 'CS_Audio_Podcast_Algorithms_Basics.mp3',
      file_type: 'mp3',
      file_size: 18500000, // 18.5 MB
      mime_type: 'audio/mpeg',
      storage_path: 'sample_audio_podcast.mp3',
      device: 'Mobile Phone (Android 14)',
      uploaded_at: new Date(Date.now() - 86400000 * 1).toISOString(),
      updated_at: new Date(Date.now() - 86400000 * 1).toISOString(),
      is_favorite: false,
      owner_name: 'Teacher',
      owner_email: 'teacher@school.edu',
      duration: 520, // 8m 40s
      description: 'Audio podcast explaining time and space complexity with real-world examples.',
      sharing_type: 'all_teachers',
      shared_with: [],
    },
    {
      id: 'file_chemistry_lab_guide',
      user_id: teacher1Id,
      folder_id: 'fld_worksheets',
      file_name: 'Chemistry_Lab_Practical_Worksheet_2026.docx',
      file_type: 'docx',
      file_size: 1840000, // 1.84 MB
      mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      storage_path: 'sample_chem_worksheet.docx',
      device: 'Desktop Computer (MacBook)',
      uploaded_at: new Date(Date.now() - 86400000 * 4).toISOString(),
      updated_at: new Date(Date.now() - 86400000 * 4).toISOString(),
      is_favorite: false,
      owner_name: 'Teacher',
      owner_email: 'teacher@school.edu',
      description: 'Complete titration and qualitative salt analysis worksheet.',
      sharing_type: 'selected',
      shared_with: [
        {
          id: 'sh_01',
          file_id: 'file_chemistry_lab_guide',
          owner_id: teacher1Id,
          shared_user_id: teacher2Id,
          shared_user_name: 'Sarah Jenkins',
          shared_user_email: 'sarah.math@school.edu',
          permission: 'edit',
          created_at: new Date(Date.now() - 86400000).toISOString(),
        },
      ],
    },
    {
      id: 'file_class_12_architecture_diagram',
      user_id: teacher1Id,
      folder_id: 'fld_class_12_l2',
      file_name: 'Computer_Network_Topologies_Diagram.png',
      file_type: 'png',
      file_size: 2450000, // 2.45 MB
      mime_type: 'image/png',
      storage_path: 'sample_network_topologies.png',
      device: 'Desktop Computer',
      uploaded_at: new Date(Date.now() - 86400000 * 2).toISOString(),
      updated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
      is_favorite: true,
      owner_name: 'Teacher',
      owner_email: 'teacher@school.edu',
      description: 'Visual reference of Bus, Star, Ring, Mesh network architectures.',
      sharing_type: 'all_teachers',
      shared_with: [],
    },
    {
      id: 'file_sarah_math_model_paper',
      user_id: teacher2Id,
      folder_id: null,
      file_name: 'Calculus_Model_Question_Paper_Term_2.pdf',
      file_type: 'pdf',
      file_size: 3800000,
      mime_type: 'application/pdf',
      storage_path: 'sample_calculus_model_paper.pdf',
      device: 'iPad Pro',
      uploaded_at: new Date(Date.now() - 86400000 * 5).toISOString(),
      updated_at: new Date(Date.now() - 86400000 * 5).toISOString(),
      is_favorite: false,
      owner_name: 'Sarah Jenkins',
      owner_email: 'sarah.math@school.edu',
      description: 'Prepared for all secondary teachers to review and distribute.',
      sharing_type: 'all_teachers',
      shared_with: [],
    },
  ];

  const notifications: NotificationItem[] = [
    {
      id: 'notif_01',
      user_id: teacher1Id,
      title: 'Welcome to Teacher Resource Hub!',
      message: 'Upload resources from desktop or mobile and access them anywhere seamlessly.',
      type: 'info',
      read: false,
      created_at: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: 'notif_02',
      user_id: teacher1Id,
      title: 'Mobile Upload Sync Ready',
      message: 'Your file Class_12_Lesson_5.mp4 was successfully uploaded from iPhone 15.',
      type: 'success',
      read: false,
      created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    },
    {
      id: 'notif_03',
      user_id: teacher2Id,
      title: 'Resource Shared With You',
      message: 'Teacher shared "Chemistry_Lab_Practical_Worksheet_2026.docx" with edit permissions.',
      type: 'share',
      read: false,
      created_at: new Date(Date.now() - 86400000).toISOString(),
    },
  ];

  const logs: ActivityLog[] = [
    {
      id: 'log_01',
      user_id: teacher1Id,
      user_name: 'Teacher',
      user_email: 'teacher@school.edu',
      action: 'FILE_UPLOAD',
      details: 'Uploaded Class_12_Lesson_5.mp4 (156 MB) to Class 12 > Computer Science > Lesson 5',
      timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
      device: 'Mobile Phone (iPhone 15)',
    },
    {
      id: 'log_02',
      user_id: teacher1Id,
      user_name: 'Teacher',
      user_email: 'teacher@school.edu',
      action: 'FOLDER_CREATE',
      details: 'Created folder "Lesson 5" under Class 12 / Computer Science',
      timestamp: new Date(Date.now() - 3600000 * 3).toISOString(),
      device: 'Desktop Computer (Windows 11)',
    },
    {
      id: 'log_03',
      user_id: teacher2Id,
      user_name: 'Sarah Jenkins',
      user_email: 'sarah.math@school.edu',
      action: 'FILE_SHARE',
      details: 'Shared Calculus_Model_Question_Paper_Term_2.pdf with All Teachers',
      timestamp: new Date(Date.now() - 86400000 * 5).toISOString(),
      device: 'iPad Pro',
    },
  ];

  return {
    users,
    folders,
    files,
    shares: [],
    notifications,
    logs,
  };
}

class Database {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.load();
  }

  private load(): DatabaseSchema {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (err) {
      console.error('Error loading DB file, re-initializing:', err);
    }
    const initial = getInitialData();
    this.saveDirect(initial);
    return initial;
  }

  private saveDirect(data: DatabaseSchema) {
    const tempFile = `${DB_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
  }

  public save() {
    this.saveDirect(this.data);
  }

  // Users
  public getUsers(): StoredUser[] {
    return this.data.users;
  }

  public getUserById(id: string): StoredUser | undefined {
    return this.data.users.find((u) => u.id === id);
  }

  public getUserByEmailOrUsername(identifier: string): StoredUser | undefined {
    const lower = identifier.toLowerCase().trim();
    return this.data.users.find(
      (u) => u.email.toLowerCase() === lower || u.username.toLowerCase() === lower
    );
  }

  public createUser(user: StoredUser): StoredUser {
    this.data.users.push(user);
    this.save();
    return user;
  }

  public updateUser(id: string, updates: Partial<StoredUser>): StoredUser | null {
    const idx = this.data.users.findIndex((u) => u.id === id);
    if (idx === -1) return null;
    this.data.users[idx] = { ...this.data.users[idx], ...updates };
    this.save();
    return this.data.users[idx];
  }

  public deleteUser(id: string): boolean {
    const idx = this.data.users.findIndex((u) => u.id === id);
    if (idx === -1) return false;
    this.data.users.splice(idx, 1);
    // clean user's files and folders
    this.data.files = this.data.files.filter((f) => f.user_id !== id);
    this.data.folders = this.data.folders.filter((f) => f.user_id !== id);
    this.save();
    return true;
  }

  // Folders
  public getFolders(userId: string, isAdmin = false): Folder[] {
    if (isAdmin) return this.data.folders;
    return this.data.folders.filter((f) => f.user_id === userId);
  }

  public getFolderById(id: string): Folder | undefined {
    return this.data.folders.find((f) => f.id === id);
  }

  public createFolder(folder: Folder): Folder {
    this.data.folders.push(folder);
    this.save();
    return folder;
  }

  public updateFolder(id: string, updates: Partial<Folder>): Folder | null {
    const idx = this.data.folders.findIndex((f) => f.id === id);
    if (idx === -1) return null;
    this.data.folders[idx] = { ...this.data.folders[idx], ...updates, updated_at: new Date().toISOString() };
    this.save();
    return this.data.folders[idx];
  }

  public deleteFolder(id: string): boolean {
    // recursively delete subfolders and files
    const subfolderIds: string[] = [id];
    let added = true;
    while (added) {
      added = false;
      for (const f of this.data.folders) {
        if (f.parent_folder_id && subfolderIds.includes(f.parent_folder_id) && !subfolderIds.includes(f.id)) {
          subfolderIds.push(f.id);
          added = true;
        }
      }
    }

    this.data.folders = this.data.folders.filter((f) => !subfolderIds.includes(f.id));
    // Soft delete or move files in these folders to root or trash
    this.data.files = this.data.files.filter((file) => !(file.folder_id && subfolderIds.includes(file.folder_id)));
    this.save();
    return true;
  }

  // Files
  public getFiles(): FileItem[] {
    return this.data.files;
  }

  public getFileById(id: string): FileItem | undefined {
    return this.data.files.find((f) => f.id === id);
  }

  public createFile(file: FileItem): FileItem {
    this.data.files.unshift(file);
    // update user storage
    const user = this.getUserById(file.user_id);
    if (user) {
      user.storage_used = (user.storage_used || 0) + file.file_size;
    }
    this.save();
    return file;
  }

  public updateFile(id: string, updates: Partial<FileItem>): FileItem | null {
    const idx = this.data.files.findIndex((f) => f.id === id);
    if (idx === -1) return null;
    this.data.files[idx] = {
      ...this.data.files[idx],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    this.save();
    return this.data.files[idx];
  }

  public deleteFile(id: string, permanent = false): boolean {
    const idx = this.data.files.findIndex((f) => f.id === id);
    if (idx === -1) return false;
    const file = this.data.files[idx];

    if (!permanent) {
      // Soft delete: move to trash
      file.is_trash = true;
      file.trashed_at = new Date().toISOString();
      this.save();
      return true;
    }

    // Permanent delete
    const user = this.getUserById(file.user_id);
    if (user) {
      user.storage_used = Math.max(0, (user.storage_used || 0) - file.file_size);
    }
    this.data.files.splice(idx, 1);

    // Remove physical file if on disk
    if (file.storage_path) {
      const fullPath = path.join(UPLOADS_DIR, file.storage_path);
      if (fs.existsSync(fullPath)) {
        try {
          fs.unlinkSync(fullPath);
        } catch (e) {
          console.error('Failed to unlink file:', e);
        }
      }
    }

    this.save();
    return true;
  }

  // Notifications
  public getNotifications(userId: string): NotificationItem[] {
    return this.data.notifications
      .filter((n) => n.user_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public addNotification(notification: NotificationItem) {
    this.data.notifications.unshift(notification);
    this.save();
  }

  public markNotificationRead(id: string) {
    const n = this.data.notifications.find((item) => item.id === id);
    if (n) {
      n.read = true;
      this.save();
    }
  }

  public markAllNotificationsRead(userId: string) {
    this.data.notifications.forEach((n) => {
      if (n.user_id === userId) n.read = true;
    });
    this.save();
  }

  // Activity Logs
  public addLog(log: ActivityLog) {
    this.data.logs.unshift(log);
    if (this.data.logs.length > 500) {
      this.data.logs = this.data.logs.slice(0, 500);
    }
    this.save();
  }

  public getLogs(): ActivityLog[] {
    return this.data.logs;
  }
}

export const db = new Database();
export { UPLOADS_DIR };
