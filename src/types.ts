export type UserRole = 'admin' | 'teacher';
export type UserStatus = 'active' | 'suspended';

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  storage_used: number; // in bytes
  storage_limit: number; // in bytes, default 5GB = 5 * 1024 * 1024 * 1024
  avatar_color: string;
  created_at: string;
  last_login?: string;
  device?: string;
  last_login_device?: string;
  can_upload?: boolean;
  can_download?: boolean;
  can_delete?: boolean;
  can_share?: boolean;
}

export interface Folder {
  id: string;
  user_id: string;
  parent_folder_id: string | null;
  folder_name: string;
  color?: string;
  created_at: string;
  updated_at?: string;
}

export type FileCategory = 'video' | 'audio' | 'document' | 'image' | 'other';

export interface SharePermission {
  id: string;
  file_id: string;
  owner_id: string;
  shared_user_id: string; // 'all' or specific user_id
  shared_user_name?: string;
  shared_user_email?: string;
  permission: 'view' | 'edit';
  created_at: string;
}

export interface FileItem {
  id: string;
  user_id: string;
  folder_id: string | null;
  file_name: string;
  file_type: string; // extension e.g. "mp4", "pdf"
  file_size: number; // bytes
  mime_type: string;
  storage_path: string;
  device: string; // e.g., "Desktop Computer", "iPhone 15", "Android Phone"
  uploaded_at: string;
  updated_at: string;
  is_favorite?: boolean;
  is_trash?: boolean;
  trashed_at?: string;
  owner_name?: string;
  owner_email?: string;
  duration?: number; // for video/audio in seconds
  description?: string;
  sharing_type: 'private' | 'selected' | 'all_teachers' | 'admin_only';
  shared_with: SharePermission[];
}

export interface NotificationItem {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'share';
  read: boolean;
  created_at: string;
  link?: string;
}

export interface ActivityLog {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  action: string;
  details: string;
  timestamp: string;
  device: string;
  ip?: string;
}

export interface UserStats {
  total_folders: number;
  documents: number;
  audio: number;
  videos: number;
  images: number;
  other_files: number;
  total_documents?: number;
  total_audio?: number;
  total_videos?: number;
  total_images?: number;
  total_others?: number;
  total_files: number;
  storage_used: number;
  storage_limit: number;
  storage_by_category?: {
    documents: number;
    audio: number;
    videos: number;
    images: number;
    other: number;
  };
}

export interface AdminStats {
  total_users: number;
  active_users: number;
  total_files: number;
  total_videos: number;
  total_documents: number;
  total_audio: number;
  total_images: number;
  total_storage: number;
  today_uploads: number;
  storage_by_type: {
    videos: number;
    documents: number;
    audio: number;
    images: number;
    other: number;
  };
  device_breakdown: {
    desktop: number;
    mobile: number;
    tablet: number;
  };
  top_users: Array<{
    user: User;
    files_count: number;
    storage_used: number;
  }>;
}

export type ViewTab =
  | 'dashboard'
  | 'my_resources'
  | 'videos'
  | 'audio'
  | 'documents'
  | 'images'
  | 'folders'
  | 'upload'
  | 'shared_with_me'
  | 'favorites'
  | 'recent'
  | 'trash'
  | 'settings'
  | 'about'
  | 'admin_users'
  | 'admin_storage'
  | 'admin_reports'
  | 'admin_security';
