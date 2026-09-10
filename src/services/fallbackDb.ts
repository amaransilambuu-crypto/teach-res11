import {
  User,
  Folder,
  FileItem,
  UserStats,
  AdminStats,
  NotificationItem,
  ActivityLog,
  SharePermission,
} from '../types.ts';

const STORAGE_KEY = 'trh_local_fallback_db_v3';

interface LocalData {
  users: Array<User & { password: string }>;
  folders: Folder[];
  files: Array<FileItem & { dataUrl?: string }>;
  shares: SharePermission[];
  notifications: NotificationItem[];
  logs: ActivityLog[];
}

function getFileCategory(ext: string): 'document' | 'image' | 'video' | 'audio' | 'other' {
  const e = ext.toLowerCase();
  if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv', 'md'].includes(e)) return 'document';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(e)) return 'image';
  if (['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(e)) return 'video';
  if (['mp3', 'wav', 'aac', 'ogg', 'm4a'].includes(e)) return 'audio';
  return 'other';
}

function createSamplePdfDataUrl(): string {
  const pdfStr = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj
4 0 obj << /Length 285 >> stream
BT
/F1 22 Tf
50 720 Td
(Teacher Resource Hub - Class 12 CS) Tj
/F1 14 Tf
0 -36 Td
(Lesson 1: Introduction to Object Oriented Programming) Tj
0 -24 Td
(Topics: Classes, Objects, Encapsulation, Inheritance) Tj
0 -24 Td
(Teacher: Prof. Sarah Jenkins | Verified Mobile Access Active) Tj
ET
endstream endobj
5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000266 00000 n 
0000000602 00000 n 
trailer << /Size 6 /Root 1 0 R >>
startxref
673
%%EOF`;
  return 'data:application/pdf;base64,' + btoa(pdfStr);
}

function createSampleDiagramDataUrl(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500">
    <rect width="800" height="500" fill="#0f172a"/>
    <text x="400" y="45" fill="#f8fafc" font-size="24" font-family="sans-serif" text-anchor="middle" font-weight="bold">Computer Network Topologies Overview</text>
    <text x="400" y="75" fill="#94a3b8" font-size="14" font-family="sans-serif" text-anchor="middle">Teacher Resource Hub - Grade 12 Computer Science Diagram</text>
    
    <rect x="50" y="110" width="320" height="340" rx="12" fill="#1e293b" stroke="#3b82f6" stroke-width="2"/>
    <text x="210" y="140" fill="#60a5fa" font-size="18" font-family="sans-serif" text-anchor="middle" font-weight="bold">1. Star Topology</text>
    <circle cx="210" cy="260" r="32" fill="#2563eb"/>
    <text x="210" y="265" fill="#ffffff" font-size="12" font-family="sans-serif" text-anchor="middle" font-weight="bold">HUB</text>
    
    <line x1="210" y1="228" x2="210" y2="180" stroke="#38bdf8" stroke-width="3"/>
    <circle cx="210" cy="180" r="18" fill="#0284c7"/>
    <text x="210" y="185" fill="#ffffff" font-size="10" font-family="sans-serif" text-anchor="middle">Node A</text>

    <line x1="242" y1="260" x2="310" y2="260" stroke="#38bdf8" stroke-width="3"/>
    <circle cx="310" cy="260" r="18" fill="#0284c7"/>
    <text x="310" y="265" fill="#ffffff" font-size="10" font-family="sans-serif" text-anchor="middle">Node B</text>

    <line x1="210" y1="292" x2="210" y2="360" stroke="#38bdf8" stroke-width="3"/>
    <circle cx="210" cy="360" r="18" fill="#0284c7"/>
    <text x="210" y="365" fill="#ffffff" font-size="10" font-family="sans-serif" text-anchor="middle">Node C</text>

    <line x1="178" y1="260" x2="110" y2="260" stroke="#38bdf8" stroke-width="3"/>
    <circle cx="110" cy="260" r="18" fill="#0284c7"/>
    <text x="110" y="265" fill="#ffffff" font-size="10" font-family="sans-serif" text-anchor="middle">Node D</text>

    <rect x="430" y="110" width="320" height="340" rx="12" fill="#1e293b" stroke="#10b981" stroke-width="2"/>
    <text x="590" y="140" fill="#34d399" font-size="18" font-family="sans-serif" text-anchor="middle" font-weight="bold">2. Full Mesh Topology</text>
    <polygon points="590,190 670,260 640,360 540,360 510,260" fill="none" stroke="#059669" stroke-width="2"/>
    <line x1="590" y1="190" x2="640" y2="360" stroke="#059669" stroke-width="2"/>
    <line x1="590" y1="190" x2="540" y2="360" stroke="#059669" stroke-width="2"/>
    <line x1="510" y1="260" x2="670" y2="260" stroke="#059669" stroke-width="2"/>
    <line x1="510" y1="260" x2="640" y2="360" stroke="#059669" stroke-width="2"/>
    <line x1="670" y1="260" x2="540" y2="360" stroke="#059669" stroke-width="2"/>

    <circle cx="590" cy="190" r="18" fill="#10b981"/>
    <circle cx="670" cy="260" r="18" fill="#10b981"/>
    <circle cx="640" cy="360" r="18" fill="#10b981"/>
    <circle cx="540" cy="360" r="18" fill="#10b981"/>
    <circle cx="510" cy="260" r="18" fill="#10b981"/>
  </svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

function getInitialData(): LocalData {
  const adminUser: User & { password: string } = {
    id: 'usr_admin_01',
    username: 'Admin',
    email: 'admin@school.edu',
    password: 'admin123',
    role: 'admin',
    status: 'active',
    storage_used: 125991212,
    storage_limit: 21474836480,
    avatar_color: '#4f46e5',
    created_at: '2026-08-10T01:47:53.444Z',
    last_login: new Date().toISOString(),
    device: 'Mobile Browser',
    can_upload: true,
    can_download: true,
    can_delete: true,
    can_share: true,
  };

  const teacherUser: User & { password: string } = {
    id: 'usr_teacher_01',
    username: 'Prof. Sarah Jenkins',
    email: 'teacher@school.edu',
    password: 'teacher123',
    role: 'teacher',
    status: 'active',
    storage_used: 89456123,
    storage_limit: 10737418240,
    avatar_color: '#059669',
    created_at: '2026-08-15T09:30:00.000Z',
    last_login: new Date().toISOString(),
    device: 'Mobile Browser',
    can_upload: true,
    can_download: true,
    can_delete: true,
    can_share: true,
  };

  const folders: Folder[] = [
    {
      id: 'fld_101',
      user_id: 'usr_teacher_01',
      folder_name: 'Class 10 - Mathematics',
      parent_folder_id: null,
      color: '#3b82f6',
      created_at: '2026-08-20T08:00:00.000Z',
      updated_at: '2026-08-20T08:00:00.000Z',
    },
    {
      id: 'fld_102',
      user_id: 'usr_teacher_01',
      folder_name: 'Class 12 - Computer Science',
      parent_folder_id: null,
      color: '#8b5cf6',
      created_at: '2026-08-21T09:15:00.000Z',
      updated_at: '2026-08-21T09:15:00.000Z',
    },
    {
      id: 'fld_103',
      user_id: 'usr_teacher_01',
      folder_name: 'Science & Lab Manuals',
      parent_folder_id: null,
      color: '#10b981',
      created_at: '2026-08-22T11:00:00.000Z',
      updated_at: '2026-08-22T11:00:00.000Z',
    },
    {
      id: 'fld_104',
      user_id: 'usr_admin_01',
      folder_name: 'Curriculum & Guidelines 2026-27',
      parent_folder_id: null,
      color: '#f59e0b',
      created_at: '2026-08-25T14:30:00.000Z',
      updated_at: '2026-08-25T14:30:00.000Z',
    },
  ];

  const files: Array<FileItem & { dataUrl?: string }> = [
    {
      id: 'file_pdf_1',
      user_id: 'usr_teacher_01',
      owner_name: 'Prof. Sarah Jenkins',
      owner_email: 'teacher@school.edu',
      folder_id: 'fld_102',
      file_name: 'Class_12_CS_Lesson_1_Overview.pdf',
      file_type: 'pdf',
      file_size: 245890,
      mime_type: 'application/pdf',
      storage_path: 'uploads/sample_lesson_1.pdf',
      device: 'Mobile Browser',
      sharing_type: 'all_teachers',
      shared_with: [],
      is_favorite: true,
      is_trash: false,
      uploaded_at: '2026-09-01T10:00:00.000Z',
      updated_at: '2026-09-01T10:00:00.000Z',
      description: 'Introduction to OOP concepts: classes, inheritance, polymorphism, and practical exercises.',
      dataUrl: createSamplePdfDataUrl(),
    },
    {
      id: 'file_png_1',
      user_id: 'usr_teacher_01',
      owner_name: 'Prof. Sarah Jenkins',
      owner_email: 'teacher@school.edu',
      folder_id: 'fld_102',
      file_name: 'Network_Topologies_Diagram.png',
      file_type: 'png',
      file_size: 142000,
      mime_type: 'image/png',
      storage_path: 'uploads/sample_network.png',
      device: 'Mobile Browser',
      sharing_type: 'all_teachers',
      shared_with: [],
      is_favorite: true,
      is_trash: false,
      uploaded_at: '2026-09-03T08:15:00.000Z',
      updated_at: '2026-09-03T08:15:00.000Z',
      description: 'High-res diagram explaining Star, Mesh, Ring, and Bus topologies.',
      dataUrl: createSampleDiagramDataUrl(),
    },
    {
      id: 'file_xlsx_1',
      user_id: 'usr_teacher_01',
      owner_name: 'Prof. Sarah Jenkins',
      owner_email: 'teacher@school.edu',
      folder_id: 'fld_101',
      file_name: 'Class_10_Math_Term_Grades.xlsx',
      file_type: 'xlsx',
      file_size: 18450,
      mime_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      storage_path: 'uploads/sample_grades.xlsx',
      device: 'Desktop Browser',
      sharing_type: 'private',
      shared_with: [],
      is_favorite: false,
      is_trash: false,
      uploaded_at: '2026-09-02T11:20:00.000Z',
      updated_at: '2026-09-02T11:20:00.000Z',
      description: 'Semester test scores, attendance, and quarterly averages for Class 10.',
    },
    {
      id: 'file_docx_1',
      user_id: 'usr_teacher_01',
      owner_name: 'Prof. Sarah Jenkins',
      owner_email: 'teacher@school.edu',
      folder_id: 'fld_102',
      file_name: 'Unit_3_Data_Structures_Guide.docx',
      file_type: 'docx',
      file_size: 32500,
      mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      storage_path: 'uploads/sample_notes.docx',
      device: 'Mobile Browser',
      sharing_type: 'all_teachers',
      shared_with: [],
      is_favorite: false,
      is_trash: false,
      uploaded_at: '2026-09-04T14:30:00.000Z',
      updated_at: '2026-09-04T14:30:00.000Z',
      description: 'Stack, Queue, and Binary Tree lecture notes with Python code examples.',
    },
  ];

  const notifications: NotificationItem[] = [
    {
      id: 'notif_1',
      user_id: 'usr_teacher_01',
      title: 'Cloud Storage Synchronized',
      message: 'Your educational resources are safely accessible across mobile and desktop devices.',
      type: 'info',
      read: false,
      created_at: new Date().toISOString(),
    },
    {
      id: 'notif_2',
      user_id: 'usr_admin_01',
      title: 'System Health Optimal',
      message: 'All school resource repositories and mobile gateways are online and active.',
      type: 'success',
      read: false,
      created_at: new Date().toISOString(),
    },
  ];

  const logs: ActivityLog[] = [
    {
      id: 'log_01',
      user_id: 'usr_teacher_01',
      user_name: 'Prof. Sarah Jenkins',
      user_email: 'teacher@school.edu',
      action: 'USER_LOGIN',
      details: 'Logged in from Mobile Browser',
      timestamp: new Date().toISOString(),
      device: 'Mobile Phone',
    },
    {
      id: 'log_02',
      user_id: 'usr_admin_01',
      user_name: 'Admin',
      user_email: 'admin@school.edu',
      action: 'ADMIN_ACCESS',
      details: 'Accessed administrator management dashboard',
      timestamp: new Date().toISOString(),
      device: 'Desktop Browser',
    },
  ];

  return {
    users: [adminUser, teacherUser],
    folders,
    files,
    shares: [],
    notifications,
    logs,
  };
}

class LocalFallbackDb {
  private data: LocalData;

  constructor() {
    this.data = this.load();
  }

  private load(): LocalData {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && Array.isArray(parsed.users) && parsed.users.length > 0) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    const initial = getInitialData();
    this.saveData(initial);
    return initial;
  }

  private saveData(data: LocalData) {
    this.data = data;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // ignore quota exceeded if too large
    }
  }

  private save() {
    this.saveData(this.data);
  }

  public login(identifier: string, pass: string): { token: string; user: User } {
    const cleanId = identifier.trim().toLowerCase();
    const user = this.data.users.find(
      (u) => u.email.toLowerCase() === cleanId || u.username.toLowerCase() === cleanId
    );

    if (!user) {
      throw new Error('Invalid username/email or password.');
    }

    if (user.status === 'suspended') {
      throw new Error('Your account has been suspended. Please contact the administrator.');
    }

    if (user.password !== pass) {
      throw new Error('Invalid username/email or password.');
    }

    user.last_login = new Date().toISOString();
    this.save();

    const token = `trh_local_token_${user.id}_${Date.now()}`;
    const { password: _, ...safeUser } = user;
    return { token, user: safeUser };
  }

  public register(username: string, email: string, pass: string, role = 'teacher'): { token: string; user: User } {
    const cleanEmail = email.trim().toLowerCase();
    if (this.data.users.some((u) => u.email.toLowerCase() === cleanEmail)) {
      throw new Error('An account with this email address already exists.');
    }

    const newUser: User & { password: string } = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      username: username.trim(),
      email: cleanEmail,
      password: pass,
      role: role === 'admin' ? 'admin' : 'teacher',
      status: 'active',
      storage_used: 0,
      storage_limit: role === 'admin' ? 21474836480 : 10737418240,
      avatar_color: '#4f46e5',
      created_at: new Date().toISOString(),
      last_login: new Date().toISOString(),
      device: 'Mobile Browser',
      can_upload: true,
      can_download: true,
      can_delete: true,
      can_share: true,
    };

    this.data.users.push(newUser);
    this.save();

    const token = `trh_local_token_${newUser.id}_${Date.now()}`;
    const { password: _, ...safeUser } = newUser;
    return { token, user: safeUser };
  }

  public getCurrentUserFromToken(token: string): User | null {
    if (!token) return null;
    const match = token.match(/(usr_[a-zA-Z0-9_]+)/);
    const userId = match ? match[1] : null;
    const user = userId ? this.data.users.find((u) => u.id === userId) : this.data.users[0];
    if (!user) return null;
    const { password: _, ...safeUser } = user;
    return safeUser;
  }

  public getUserById(id: string): User | null {
    const user = this.data.users.find((u) => u.id === id);
    if (!user) return null;
    const { password: _, ...safeUser } = user;
    return safeUser;
  }

  public getFolders(userId: string): Folder[] {
    return this.data.folders.filter((f) => f.user_id === userId || userId === 'usr_admin_01');
  }

  public createFolder(name: string, parentId: string | null, color: string | undefined, userId: string): Folder {
    const folder: Folder = {
      id: `fld_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      user_id: userId,
      folder_name: name,
      parent_folder_id: parentId,
      color: color || '#3b82f6',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.data.folders.push(folder);
    this.save();
    return folder;
  }

  public updateFolder(id: string, updates: Partial<Folder>): Folder {
    const folder = this.data.folders.find((f) => f.id === id);
    if (!folder) throw new Error('Folder not found.');
    Object.assign(folder, updates, { updated_at: new Date().toISOString() });
    this.save();
    return folder;
  }

  public deleteFolder(id: string) {
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
    for (const file of this.data.files) {
      if (file.folder_id && subfolderIds.includes(file.folder_id)) {
        file.is_trash = true;
        file.folder_id = null;
      }
    }
    this.save();
  }

  public getFiles(params: { folder_id?: string | null; category?: string; search?: string; view?: string; is_favorite?: boolean }, userId: string): FileItem[] {
    let result = this.data.files.filter((f) => !f.is_trash);

    if (params.view === 'favorites') {
      result = result.filter((f) => f.is_favorite);
    } else if (params.view === 'trash') {
      result = this.data.files.filter((f) => f.is_trash);
    } else if (params.view === 'shared') {
      result = result.filter((f) => f.sharing_type !== 'private' || f.user_id !== userId);
    } else if (params.view !== 'all') {
      if (params.folder_id && params.folder_id !== 'root') {
        result = result.filter((f) => f.folder_id === params.folder_id);
      } else if (params.folder_id === 'root') {
        result = result.filter((f) => !f.folder_id);
      }
    }

    if (params.category && params.category !== 'all') {
      result = result.filter((f) => getFileCategory(f.file_type) === params.category);
    }

    if (params.search) {
      const q = params.search.toLowerCase();
      result = result.filter((f) => f.file_name.toLowerCase().includes(q) || (f.description && f.description.toLowerCase().includes(q)));
    }

    return result;
  }

  public getFileById(id: string): (FileItem & { dataUrl?: string }) | null {
    return this.data.files.find((f) => f.id === id) || null;
  }

  public uploadFile(
    fileName: string,
    fileSize: number,
    fileType: string,
    folderId: string | null,
    sharingType: 'private' | 'selected' | 'all_teachers' | 'admin_only',
    userId: string,
    ownerName: string,
    ownerEmail: string,
    device: string,
    dataUrl?: string
  ): FileItem {
    const file: FileItem & { dataUrl?: string } = {
      id: `file_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      user_id: userId,
      owner_name: ownerName,
      owner_email: ownerEmail,
      folder_id: folderId,
      file_name: fileName,
      file_type: fileType,
      file_size: fileSize,
      mime_type: 'application/octet-stream',
      storage_path: `uploads/${fileName}`,
      device,
      sharing_type: sharingType,
      shared_with: [],
      is_favorite: false,
      is_trash: false,
      uploaded_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      dataUrl,
    };

    this.data.files.unshift(file);
    const user = this.data.users.find((u) => u.id === userId);
    if (user) {
      user.storage_used = (user.storage_used || 0) + fileSize;
    }
    this.save();
    return file;
  }

  public updateFile(id: string, updates: Partial<FileItem>): FileItem {
    const file = this.data.files.find((f) => f.id === id);
    if (!file) throw new Error('File not found.');
    Object.assign(file, updates, { updated_at: new Date().toISOString() });
    this.save();
    return file;
  }

  public deleteFile(id: string, permanent = false): boolean {
    const idx = this.data.files.findIndex((f) => f.id === id);
    if (idx === -1) return false;
    if (!permanent) {
      this.data.files[idx].is_trash = true;
      this.data.files[idx].trashed_at = new Date().toISOString();
    } else {
      this.data.files.splice(idx, 1);
    }
    this.save();
    return true;
  }

  public getUserStats(userId: string): UserStats {
    const userFiles = this.data.files.filter((f) => f.user_id === userId && !f.is_trash);
    const totalStorage = userFiles.reduce((acc, f) => acc + f.file_size, 0);

    const docs = userFiles.filter((f) => getFileCategory(f.file_type) === 'document').length;
    const imgs = userFiles.filter((f) => getFileCategory(f.file_type) === 'image').length;
    const vids = userFiles.filter((f) => getFileCategory(f.file_type) === 'video').length;
    const auds = userFiles.filter((f) => getFileCategory(f.file_type) === 'audio').length;
    const others = userFiles.filter((f) => getFileCategory(f.file_type) === 'other').length;

    return {
      total_folders: this.getFolders(userId).length,
      documents: docs,
      images: imgs,
      videos: vids,
      audio: auds,
      other_files: others,
      total_files: userFiles.length,
      storage_used: totalStorage,
      storage_limit: 10737418240,
    };
  }

  public getAdminStats(): AdminStats {
    const activeFiles = this.data.files.filter((f) => !f.is_trash);
    const totalStorage = activeFiles.reduce((acc, f) => acc + f.file_size, 0);

    const docSize = activeFiles.filter((f) => getFileCategory(f.file_type) === 'document').reduce((a, b) => a + b.file_size, 0);
    const vidSize = activeFiles.filter((f) => getFileCategory(f.file_type) === 'video').reduce((a, b) => a + b.file_size, 0);
    const imgSize = activeFiles.filter((f) => getFileCategory(f.file_type) === 'image').reduce((a, b) => a + b.file_size, 0);
    const audSize = activeFiles.filter((f) => getFileCategory(f.file_type) === 'audio').reduce((a, b) => a + b.file_size, 0);
    const otherSize = activeFiles.filter((f) => getFileCategory(f.file_type) === 'other').reduce((a, b) => a + b.file_size, 0);

    return {
      total_users: this.data.users.length,
      active_users: this.data.users.filter((u) => u.status === 'active').length,
      total_files: activeFiles.length,
      total_documents: activeFiles.filter((f) => getFileCategory(f.file_type) === 'document').length,
      total_videos: activeFiles.filter((f) => getFileCategory(f.file_type) === 'video').length,
      total_audio: activeFiles.filter((f) => getFileCategory(f.file_type) === 'audio').length,
      total_images: activeFiles.filter((f) => getFileCategory(f.file_type) === 'image').length,
      total_storage: totalStorage,
      today_uploads: activeFiles.length,
      storage_by_type: {
        documents: docSize,
        videos: vidSize,
        images: imgSize,
        audio: audSize,
        other: otherSize,
      },
      device_breakdown: {
        desktop: 2,
        mobile: 4,
        tablet: 1,
      },
      top_users: this.data.users.map((u) => {
        const { password: _, ...safe } = u;
        return {
          user: safe,
          files_count: activeFiles.filter((f) => f.user_id === u.id).length,
          storage_used: u.storage_used,
        };
      }),
    };
  }

  public getAdminUsers(): User[] {
    return this.data.users.map((u) => {
      const { password: _, ...safe } = u;
      return safe;
    });
  }

  public getAdminLogs(): ActivityLog[] {
    return this.data.logs;
  }

  public getNotifications(userId: string): NotificationItem[] {
    return this.data.notifications.filter((n) => n.user_id === userId);
  }
}

export const localFallbackDb = new LocalFallbackDb();
