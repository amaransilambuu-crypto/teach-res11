import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Key,
  HardDrive,
  Trash2,
  Check,
  X,
  Search,
  UserPlus,
  RefreshCw,
  AlertCircle,
  UploadCloud,
  Download,
  Share2,
  Sliders,
  Info,
  Lock,
  Unlock,
  FileSpreadsheet,
  Mail,
  Copy,
  CheckCheck,
  FileUp,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { User } from '../types.ts';
import { api, firestoreSubscribeUsers } from '../services/api.ts';
import { formatBytes, formatDate } from '../utils/format.ts';

interface AdminUsersViewProps {
  rosterUsers?: User[];
}

export const AdminUsersView: React.FC<AdminUsersViewProps> = ({ rosterUsers }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'teacher'>('all');
  const [showMatrixInfo, setShowMatrixInfo] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Permission Configuration Modal
  const [permissionsUser, setPermissionsUser] = useState<User | null>(null);
  const [permRole, setPermRole] = useState<'admin' | 'teacher'>('teacher');
  const [permStatus, setPermStatus] = useState<'active' | 'suspended'>('active');
  const [permCanUpload, setPermCanUpload] = useState(true);
  const [permCanDownload, setPermCanDownload] = useState(true);
  const [permCanDelete, setPermCanDelete] = useState(true);
  const [permCanShare, setPermCanShare] = useState(true);
  const [permStorageGb, setPermStorageGb] = useState(10);
  const [savingPermissions, setSavingPermissions] = useState(false);

  // Password reset modal
  const [resetUser, setResetUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);

  // Storage update modal
  const [quotaUser, setQuotaUser] = useState<User | null>(null);
  const [newQuotaGb, setNewQuotaGb] = useState<number>(10);

  // Delete User Confirmation Modal
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState(false);

  // Create User Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createUsername, setCreateUsername] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createRole, setCreateRole] = useState<'teacher' | 'admin'>('teacher');
  const [createStorageGb, setCreateStorageGb] = useState(10);
  const [creatingUser, setCreatingUser] = useState(false);

  // Bulk Pre-Register Teachers Modal State
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkEmailsText, setBulkEmailsText] = useState('');
  const [bulkRole, setBulkRole] = useState<'teacher' | 'admin'>('teacher');
  const [bulkStorageGb, setBulkStorageGb] = useState<number>(10);
  const [bulkSchoolId, setBulkSchoolId] = useState('pannaipuram_high');
  const [bulkDefaultPassword, setBulkDefaultPassword] = useState('teacher123');
  const [bulkLoading, setBulkLoading] = useState(false);
  const [copiedRoster, setCopiedRoster] = useState(false);
  const [bulkResult, setBulkResult] = useState<{
    success: boolean;
    totalSubmitted: number;
    registeredCount: number;
    skippedCount: number;
    invalidCount: number;
    users: User[];
    skippedEmails: string[];
    invalidEmails: string[];
    message: string;
  } | null>(null);

  // Real-time Firestore Listener: updates active admin sessions instantly when any user registers
  useEffect(() => {
    const unsubscribe = firestoreSubscribeUsers((cloudUsers, changes) => {
      if (cloudUsers && cloudUsers.length > 0) {
        setUsers(cloudUsers);
        setLoading(false);
      }
      if (!changes.isInitial && changes.added && changes.added.length > 0) {
        const addedList = changes.added.map((u) => u.username || u.email).join(', ');
        showToast(
          `🔔 Live Firestore Broadcast: ${changes.added.length} staff account(s) registered (${addedList})`,
          'success'
        );
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Sync with prop if supplied from App.tsx
  useEffect(() => {
    if (rosterUsers && rosterUsers.length > 0) {
      setUsers(rosterUsers);
      setLoading(false);
    }
  }, [rosterUsers]);

  // Live validation for bulk email list
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const parsedBulkEmails = useMemo(() => {
    if (!bulkEmailsText.trim()) return { raw: [], valid: [], duplicates: [], invalid: [] };
    const tokens = bulkEmailsText
      .split(/[\n,;\s]+/)
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    const seen = new Set<string>();
    const valid: string[] = [];
    const duplicates: string[] = [];
    const invalid: string[] = [];

    tokens.forEach((token) => {
      if (!emailRegex.test(token)) {
        invalid.push(token);
      } else if (seen.has(token) || users.some((u) => u.email.toLowerCase() === token)) {
        duplicates.push(token);
      } else {
        seen.add(token);
        valid.push(token);
      }
    });

    return { raw: tokens, valid, duplicates, invalid };
  }, [bulkEmailsText, users]);

  const handleBulkFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      if (content) {
        setBulkEmailsText((prev) => (prev ? `${prev}\n${content}` : content));
        showToast(`Loaded emails from ${file.name}`, 'success');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedBulkEmails.valid.length === 0) {
      showToast('Please enter at least one valid, unregistered email address.', 'error');
      return;
    }

    setBulkLoading(true);
    try {
      const res = await api.admin.bulkRegister({
        emails: parsedBulkEmails.valid,
        role: bulkRole,
        storage_limit_gb: bulkStorageGb,
        school_id: bulkSchoolId,
        default_password: bulkDefaultPassword,
      });

      setBulkResult(res);
      showToast(res.message, 'success');
      fetchUsers();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Bulk pre-registration failed.', 'error');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleCopyOnboardingRoster = () => {
    if (!bulkResult || !bulkResult.users) return;
    const lines = [
      'Teacher Onboarding Roster - Teacher Resource Hub',
      `Institution / School ID: ${bulkSchoolId}`,
      `Generated At: ${new Date().toLocaleString()}`,
      '-------------------------------------------------------',
      'Name | Email | Initial Password | Role | Storage Quota',
      ...bulkResult.users.map(
        (u) =>
          `${u.username} | ${u.email} | ${u.temporary_password || bulkDefaultPassword} | ${u.role} | ${Math.round(
            u.storage_limit / (1024 * 1024 * 1024)
          )} GB`
      ),
    ].join('\n');

    navigator.clipboard.writeText(lines);
    setCopiedRoster(true);
    setTimeout(() => setCopiedRoster(false), 2500);
    showToast('Onboarding roster credentials copied to clipboard!', 'success');
  };

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.admin.getUsers();
      setUsers(res.users);
    } catch {
      showToast('Failed to load user management list.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openPermissionsModal = (user: User) => {
    setPermissionsUser(user);
    setPermRole(user.role as 'admin' | 'teacher');
    setPermStatus((user.status as 'active' | 'suspended') || 'active');
    setPermCanUpload(user.can_upload !== false);
    setPermCanDownload(user.can_download !== false);
    setPermCanDelete(user.can_delete !== false);
    setPermCanShare(user.can_share !== false);
    const gb = Math.round((user.storage_limit || 10 * 1024 * 1024 * 1024) / (1024 * 1024 * 1024));
    setPermStorageGb(gb);
  };

  const handleApplyPreset = (preset: 'standard' | 'contributor' | 'readonly' | 'suspended') => {
    if (preset === 'standard') {
      setPermStatus('active');
      setPermCanUpload(true);
      setPermCanDownload(true);
      setPermCanDelete(true);
      setPermCanShare(true);
    } else if (preset === 'contributor') {
      setPermStatus('active');
      setPermCanUpload(true);
      setPermCanDownload(true);
      setPermCanDelete(false);
      setPermCanShare(false);
    } else if (preset === 'readonly') {
      setPermStatus('active');
      setPermCanUpload(false);
      setPermCanDownload(true);
      setPermCanDelete(false);
      setPermCanShare(false);
    } else if (preset === 'suspended') {
      setPermStatus('suspended');
      setPermCanUpload(false);
      setPermCanDownload(false);
      setPermCanDelete(false);
      setPermCanShare(false);
    }
  };

  const handleSavePermissions = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!permissionsUser) return;

    setSavingPermissions(true);
    try {
      await api.admin.updateUser(permissionsUser.id, {
        role: permRole,
        status: permStatus,
        can_upload: permCanUpload,
        can_download: permCanDownload,
        can_delete: permCanDelete,
        can_share: permCanShare,
        storage_limit_gb: permStorageGb,
      });

      showToast(`Access permissions updated for ${permissionsUser.username}!`);
      setPermissionsUser(null);
      fetchUsers();
    } catch {
      showToast('Failed to update user access permissions.', 'error');
    } finally {
      setSavingPermissions(false);
    }
  };

  // Quick single permission toggle directly from table
  const handleQuickTogglePermission = async (
    user: User,
    permissionKey: 'can_upload' | 'can_download' | 'can_delete' | 'can_share'
  ) => {
    const currentValue = user[permissionKey] !== false;
    const nextValue = !currentValue;

    try {
      // Optimistic update
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, [permissionKey]: nextValue } : u))
      );

      await api.admin.updateUser(user.id, {
        [permissionKey]: nextValue,
      });
      showToast(`Updated ${permissionKey.replace('can_', '')} permission for ${user.username}`);
    } catch {
      showToast('Failed to toggle permission.', 'error');
      fetchUsers();
    }
  };

  const handleQuickToggleStatus = async (user: User) => {
    const nextStatus = user.status === 'suspended' ? 'active' : 'suspended';
    try {
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, status: nextStatus } : u))
      );

      await api.admin.updateUser(user.id, {
        status: nextStatus,
      });
      showToast(`Account for ${user.username} is now ${nextStatus.toUpperCase()}`);
    } catch {
      showToast('Failed to update status.', 'error');
      fetchUsers();
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetUser || !newPassword.trim()) return;

    try {
      await api.admin.updateUser(resetUser.id, { password: newPassword.trim() });
      setResetSuccess(true);
      showToast(`Password successfully reset for ${resetUser.username}!`);
      setTimeout(() => {
        setResetSuccess(false);
        setResetUser(null);
        setNewPassword('');
      }, 1200);
    } catch {
      showToast('Failed to reset password.', 'error');
    }
  };

  const handleUpdateQuota = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quotaUser) return;

    try {
      const limitBytes = newQuotaGb * 1024 * 1024 * 1024;
      await api.admin.updateUser(quotaUser.id, { storage_limit: limitBytes });
      setQuotaUser(null);
      showToast(`Storage limit set to ${newQuotaGb} GB for ${quotaUser.username}`);
      fetchUsers();
    } catch {
      showToast('Failed to update storage limit.', 'error');
    }
  };

  const handleExecuteDeleteUser = async () => {
    if (!deleteConfirmUser) return;
    setDeletingUser(true);
    try {
      await api.admin.deleteUser(deleteConfirmUser.id);
      showToast(`Account "${deleteConfirmUser.username}" permanently removed.`);
      setDeleteConfirmUser(null);
      fetchUsers();
    } catch {
      showToast('Failed to delete user account.', 'error');
    } finally {
      setDeletingUser(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createUsername.trim() || !createEmail.trim() || !createPassword.trim()) return;

    setCreatingUser(true);
    try {
      await api.admin.createUser({
        username: createUsername.trim(),
        email: createEmail.trim(),
        password: createPassword.trim(),
        role: createRole,
        storage_limit_gb: createStorageGb,
      });

      showToast(`User account created for ${createUsername}!`);
      setShowCreateModal(false);
      setCreateUsername('');
      setCreateEmail('');
      setCreatePassword('');
      fetchUsers();
    } catch {
      showToast('Failed to create user account.', 'error');
    } finally {
      setCreatingUser(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'suspended'
        ? u.status === 'suspended'
        : u.status !== 'suspended';
    const matchesRole = roleFilter === 'all' ? true : u.role === roleFilter;
    return matchesSearch && matchesStatus && matchesRole;
  });

  return (
    <div id="admin-users-view" className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold flex items-center space-x-2 animate-in fade-in slide-in-from-bottom-2 ${
            toastMessage.type === 'error'
              ? 'bg-red-50 text-red-700 border-red-200'
              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
          }`}
        >
          {toastMessage.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          ) : (
            <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Top Banner & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center">
            <ShieldCheck className="w-5 h-5 text-indigo-600 mr-2" />
            Teacher Access Permissions & Rights Control
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Administer educator accounts, roles, granular access permission rights (Upload, Download, Delete, Share), and cloud quotas.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            type="button"
            onClick={() => setShowMatrixInfo(!showMatrixInfo)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors flex items-center space-x-1.5 ${
              showMatrixInfo
                ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Info className="w-3.5 h-3.5 text-indigo-600" />
            <span>{showMatrixInfo ? 'Hide Rights Matrix' : 'View Rights Matrix'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setBulkResult(null);
              setShowBulkModal(true);
            }}
            className="px-3 py-1.5 bg-sky-600 text-white rounded-lg text-xs font-semibold hover:bg-sky-700 transition-colors flex items-center space-x-1.5 shadow-xs"
            title="Bulk pre-register multiple teachers at once from a list or file"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Bulk Pre-Register</span>
          </button>

          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition-colors flex items-center space-x-1.5 shadow-xs"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Add Educator</span>
          </button>

          <button
            type="button"
            onClick={fetchUsers}
            className="p-2 text-slate-500 hover:text-indigo-600 rounded-lg hover:bg-slate-100 transition-colors"
            title="Refresh Users"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Role & Access Permissions Matrix Info Box */}
      {showMatrixInfo && (
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-5 rounded-2xl border border-slate-800 shadow-md animate-in fade-in">
          <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-3">
            <div className="flex items-center space-x-2">
              <Shield className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-bold">School Access Rights & Security Policy Definition</h3>
            </div>
            <span className="text-2xs bg-indigo-500/20 text-indigo-200 px-2 py-0.5 rounded border border-indigo-400/30">
              Role-Based Access Control (RBAC)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Admin Policy */}
            <div className="bg-white/5 p-3.5 rounded-xl border border-white/10">
              <div className="flex items-center space-x-2 mb-2">
                <span className="px-2 py-0.5 rounded bg-indigo-500 text-white font-bold text-2xs">ADMIN ROLE</span>
                <span className="text-slate-300 font-semibold">Full Authority</span>
              </div>
              <p className="text-slate-300 text-2xs mb-2">
                School administrators possess unrestricted oversight over system resources and teacher privileges.
              </p>
              <ul className="space-y-1 text-slate-300 text-2xs">
                <li className="flex items-center space-x-1.5">
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span>Control & toggle teachers' upload, download, delete, and share rights</span>
                </li>
                <li className="flex items-center space-x-1.5">
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span>Allocate storage quotas (5GB - 50GB+) per teacher</span>
                </li>
                <li className="flex items-center space-x-1.5">
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span>Suspend accounts or perform password resets</span>
                </li>
                <li className="flex items-center space-x-1.5">
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span>View global system audit log & file activity</span>
                </li>
              </ul>
            </div>

            {/* Teacher Policy */}
            <div className="bg-white/5 p-3.5 rounded-xl border border-white/10">
              <div className="flex items-center space-x-2 mb-2">
                <span className="px-2 py-0.5 rounded bg-emerald-500 text-white font-bold text-2xs">TEACHER ROLE</span>
                <span className="text-slate-300 font-semibold">Curriculum Faculty</span>
              </div>
              <p className="text-slate-300 text-2xs mb-2">
                Teachers access digital classroom materials according to granular permissions granted by Admin:
              </p>
              <ul className="space-y-1 text-slate-300 text-2xs">
                <li className="flex items-center space-x-1.5">
                  <UploadCloud className="w-3 h-3 text-blue-400" />
                  <span><strong>Upload:</strong> Add lesson plans, PDFs, video lectures, and worksheets</span>
                </li>
                <li className="flex items-center space-x-1.5">
                  <Download className="w-3 h-3 text-emerald-400" />
                  <span><strong>Download:</strong> Save files locally to desktop or mobile teaching device</span>
                </li>
                <li className="flex items-center space-x-1.5">
                  <Trash2 className="w-3 h-3 text-red-400" />
                  <span><strong>Delete:</strong> Move obsolete teaching materials to Trash or purge</span>
                </li>
                <li className="flex items-center space-x-1.5">
                  <Share2 className="w-3 h-3 text-purple-400" />
                  <span><strong>Share:</strong> Distribute teaching resources to peer faculty</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative max-w-sm w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search teachers by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center space-x-3 text-xs">
          {/* Status Filter */}
          <div className="flex items-center space-x-1 bg-slate-50 p-1 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 rounded text-2xs font-semibold ${
                statusFilter === 'all' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500'
              }`}
            >
              All Status
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('active')}
              className={`px-2.5 py-1 rounded text-2xs font-semibold ${
                statusFilter === 'active' ? 'bg-white shadow-xs text-emerald-700' : 'text-slate-500'
              }`}
            >
              Active
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('suspended')}
              className={`px-2.5 py-1 rounded text-2xs font-semibold ${
                statusFilter === 'suspended' ? 'bg-white shadow-xs text-red-700' : 'text-slate-500'
              }`}
            >
              Suspended
            </button>
          </div>

          {/* Role Filter */}
          <div className="flex items-center space-x-1 bg-slate-50 p-1 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => setRoleFilter('all')}
              className={`px-2.5 py-1 rounded text-2xs font-semibold ${
                roleFilter === 'all' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500'
              }`}
            >
              All Roles
            </button>
            <button
              type="button"
              onClick={() => setRoleFilter('teacher')}
              className={`px-2.5 py-1 rounded text-2xs font-semibold ${
                roleFilter === 'teacher' ? 'bg-white shadow-xs text-emerald-700' : 'text-slate-500'
              }`}
            >
              Teachers
            </button>
            <button
              type="button"
              onClick={() => setRoleFilter('admin')}
              className={`px-2.5 py-1 rounded text-2xs font-semibold ${
                roleFilter === 'admin' ? 'bg-white shadow-xs text-indigo-700' : 'text-slate-500'
              }`}
            >
              Admins
            </button>
          </div>

          <span className="text-slate-400 font-medium whitespace-nowrap">
            {filteredUsers.length} shown
          </span>
        </div>
      </div>

      {/* Users & Access Permissions Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-2xs uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">User Profile</th>
                <th className="py-3 px-4">Role & Status</th>
                <th className="py-3 px-4">
                  <div className="flex items-center space-x-1">
                    <span>Access Permission Rights</span>
                    <span className="text-[10px] text-slate-400 normal-case font-normal">(Click chip to toggle)</span>
                  </div>
                </th>
                <th className="py-3 px-4">Storage Usage</th>
                <th className="py-3 px-4">Last Device</th>
                <th className="py-3 px-4 text-right">Administrative Controls</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((u) => {
                const usedBytes = u.storage_used || 0;
                const limitBytes = u.storage_limit || 10 * 1024 * 1024 * 1024;
                const pct = Math.min(100, Math.round((usedBytes / limitBytes) * 100));

                const canUpload = u.can_upload !== false;
                const canDownload = u.can_download !== false;
                const canDelete = u.can_delete !== false;
                const canShare = u.can_share !== false;
                const isSuspended = u.status === 'suspended';

                return (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* User Profile */}
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2.5">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs shrink-0"
                          style={{ backgroundColor: u.avatar_color || '#4f46e5' }}
                        >
                          {u.username.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center space-x-1.5">
                            <span className="font-semibold text-slate-900 truncate">{u.username}</span>
                            {u.pre_registered && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-200">
                                Pre-Registered
                              </span>
                            )}
                          </div>
                          <div className="text-slate-400 text-2xs truncate flex items-center space-x-1">
                            <span>{u.email}</span>
                            {(u.schoolId || u.school_id) && (
                              <span className="text-slate-300">· {u.schoolId || u.school_id}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Role & Status */}
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        <div>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-2xs font-bold ${
                              u.role === 'admin'
                                ? 'bg-indigo-100 text-indigo-700'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {u.role === 'admin' && <Shield className="w-3 h-3 mr-1" />}
                            {u.role === 'admin' ? 'Administrator' : 'Teacher'}
                          </span>
                        </div>
                        <div>
                          <button
                            type="button"
                            onClick={() => handleQuickToggleStatus(u)}
                            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                              isSuspended
                                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                            }`}
                            title="Click to toggle account status"
                          >
                            {isSuspended ? (
                              <>
                                <Lock className="w-2.5 h-2.5 mr-1" /> Suspended
                              </>
                            ) : (
                              <>
                                <Unlock className="w-2.5 h-2.5 mr-1" /> Active
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </td>

                    {/* Granular Permission Rights Chips */}
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1.5 items-center">
                        {/* Upload Right */}
                        <button
                          type="button"
                          disabled={u.role === 'admin'}
                          onClick={() => handleQuickTogglePermission(u, 'can_upload')}
                          className={`inline-flex items-center px-2 py-0.5 rounded text-2xs font-medium border transition-colors ${
                            canUpload
                              ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                              : 'bg-slate-100 text-slate-400 border-slate-200 line-through opacity-70 hover:opacity-100'
                          } ${u.role === 'admin' ? 'cursor-default opacity-80' : 'cursor-pointer'}`}
                          title={u.role === 'admin' ? 'Admin has all rights' : 'Click to toggle Upload permission'}
                        >
                          <UploadCloud className="w-3 h-3 mr-1" />
                          Upload
                        </button>

                        {/* Download Right */}
                        <button
                          type="button"
                          disabled={u.role === 'admin'}
                          onClick={() => handleQuickTogglePermission(u, 'can_download')}
                          className={`inline-flex items-center px-2 py-0.5 rounded text-2xs font-medium border transition-colors ${
                            canDownload
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-400 border-slate-200 line-through opacity-70 hover:opacity-100'
                          } ${u.role === 'admin' ? 'cursor-default opacity-80' : 'cursor-pointer'}`}
                          title={u.role === 'admin' ? 'Admin has all rights' : 'Click to toggle Download permission'}
                        >
                          <Download className="w-3 h-3 mr-1" />
                          Download
                        </button>

                        {/* Delete Right */}
                        <button
                          type="button"
                          disabled={u.role === 'admin'}
                          onClick={() => handleQuickTogglePermission(u, 'can_delete')}
                          className={`inline-flex items-center px-2 py-0.5 rounded text-2xs font-medium border transition-colors ${
                            canDelete
                              ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                              : 'bg-slate-100 text-slate-400 border-slate-200 line-through opacity-70 hover:opacity-100'
                          } ${u.role === 'admin' ? 'cursor-default opacity-80' : 'cursor-pointer'}`}
                          title={u.role === 'admin' ? 'Admin has all rights' : 'Click to toggle Delete permission'}
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          Delete
                        </button>

                        {/* Share Right */}
                        <button
                          type="button"
                          disabled={u.role === 'admin'}
                          onClick={() => handleQuickTogglePermission(u, 'can_share')}
                          className={`inline-flex items-center px-2 py-0.5 rounded text-2xs font-medium border transition-colors ${
                            canShare
                              ? 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
                              : 'bg-slate-100 text-slate-400 border-slate-200 line-through opacity-70 hover:opacity-100'
                          } ${u.role === 'admin' ? 'cursor-default opacity-80' : 'cursor-pointer'}`}
                          title={u.role === 'admin' ? 'Admin has all rights' : 'Click to toggle Share permission'}
                        >
                          <Share2 className="w-3 h-3 mr-1" />
                          Share
                        </button>
                      </div>
                    </td>

                    {/* Storage Usage */}
                    <td className="py-3 px-4">
                      <div className="w-32">
                        <div className="flex justify-between text-2xs mb-0.5 font-mono">
                          <span>{formatBytes(usedBytes)}</span>
                          <span className="text-slate-400">{pct}%</span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${pct > 80 ? 'bg-red-500' : 'bg-indigo-600'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Device */}
                    <td className="py-3 px-4 text-slate-700 font-medium">
                      <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-2xs">
                        {u.last_login_device || 'Web Browser'}
                      </span>
                    </td>

                    {/* Administrative Controls */}
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center space-x-1">
                        {/* Granular Permissions Modal Opener */}
                        <button
                          type="button"
                          onClick={() => openPermissionsModal(u)}
                          className="px-2 py-1 text-2xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg transition-colors flex items-center space-x-1"
                          title="Manage Access Permission Rights"
                        >
                          <Sliders className="w-3 h-3 mr-0.5" />
                          <span>Permissions</span>
                        </button>

                        {/* Adjust Quota */}
                        <button
                          type="button"
                          onClick={() => {
                            setQuotaUser(u);
                            setNewQuotaGb(Math.round(limitBytes / (1024 * 1024 * 1024)));
                          }}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                          title="Adjust Storage Quota"
                        >
                          <HardDrive className="w-3.5 h-3.5" />
                        </button>

                        {/* Password Reset */}
                        <button
                          type="button"
                          onClick={() => {
                            setResetUser(u);
                            setNewPassword('');
                          }}
                          className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded"
                          title="Reset Password"
                        >
                          <Key className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete User */}
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmUser(u)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                          title="Delete Account"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Permissions & Access Rights Configuration Modal */}
      {permissionsUser && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between mb-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center">
                  <Shield className="w-4 h-4 text-indigo-600 mr-2" />
                  Access Permission Rights Configuration
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure teacher privileges for <strong>{permissionsUser.username}</strong> ({permissionsUser.email}).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPermissionsUser(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Presets Bar */}
            <div className="mb-4 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <span className="block text-[11px] font-bold text-slate-600 mb-1.5">Apply Quick Security Preset:</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                <button
                  type="button"
                  onClick={() => handleApplyPreset('standard')}
                  className="px-2 py-1 text-2xs font-semibold bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 rounded-lg border border-slate-200 text-center transition-colors"
                >
                  Standard Teacher
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('contributor')}
                  className="px-2 py-1 text-2xs font-semibold bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded-lg border border-slate-200 text-center transition-colors"
                >
                  Contributor Only
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('readonly')}
                  className="px-2 py-1 text-2xs font-semibold bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-700 rounded-lg border border-slate-200 text-center transition-colors"
                >
                  Read-Only Reviewer
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('suspended')}
                  className="px-2 py-1 text-2xs font-semibold bg-white hover:bg-red-50 text-slate-700 hover:text-red-700 rounded-lg border border-slate-200 text-center transition-colors"
                >
                  Suspend Access
                </button>
              </div>
            </div>

            <form onSubmit={handleSavePermissions} className="space-y-4">
              {/* Role & Status Row */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50/70 p-3 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-2xs font-bold uppercase text-slate-500 mb-1">Assigned Role</label>
                  <select
                    value={permRole}
                    onChange={(e) => setPermRole(e.target.value as 'admin' | 'teacher')}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-semibold text-slate-800 outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="teacher">Teacher (Educator)</option>
                    <option value="admin">Administrator (Full Access)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-2xs font-bold uppercase text-slate-500 mb-1">Account Status</label>
                  <select
                    value={permStatus}
                    onChange={(e) => setPermStatus(e.target.value as 'active' | 'suspended')}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-semibold text-slate-800 outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="active">Active (Granted Access)</option>
                    <option value="suspended">Suspended (Locked Out)</option>
                  </select>
                </div>
              </div>

              {/* Granular Permission Toggles */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Teacher Functional Rights
                </h4>

                {/* Upload Right */}
                <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                      <UploadCloud className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">Upload Resources & Lesson Materials</div>
                      <div className="text-2xs text-slate-500">Allow uploading videos, PDFs, worksheets, and lecture audio.</div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={permCanUpload}
                    onChange={(e) => setPermCanUpload(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                  />
                </label>

                {/* Download Right */}
                <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                      <Download className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">Download Teaching Resources</div>
                      <div className="text-2xs text-slate-500">Allow saving resources directly to PC, iPad, or mobile phone.</div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={permCanDownload}
                    onChange={(e) => setPermCanDownload(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                  />
                </label>

                {/* Delete Right */}
                <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">Move to Trash & Delete Files</div>
                      <div className="text-2xs text-slate-500">Allow moving resources to Trash and deleting owned curriculum.</div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={permCanDelete}
                    onChange={(e) => setPermCanDelete(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                  />
                </label>

                {/* Share Right */}
                <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                      <Share2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">Share Resources with Peer Faculty</div>
                      <div className="text-2xs text-slate-500">Allow sharing resources with all teachers or specific colleagues.</div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={permCanShare}
                    onChange={(e) => setPermCanShare(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                  />
                </label>
              </div>

              {/* Storage Quota */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <label className="block text-2xs font-bold uppercase text-slate-500 mb-1">
                  Assigned Storage Quota (GB)
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={permStorageGb}
                    onChange={(e) => setPermStorageGb(parseInt(e.target.value) || 1)}
                    className="w-32 px-3 py-1.5 border border-slate-300 bg-white rounded-lg text-xs font-mono font-bold outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <span className="text-xs font-semibold text-slate-600">Gigabytes</span>
                  <div className="flex items-center space-x-1 ml-auto">
                    {[5, 10, 20, 50].map((gb) => (
                      <button
                        key={gb}
                        type="button"
                        onClick={() => setPermStorageGb(gb)}
                        className={`px-2 py-0.5 rounded text-2xs font-semibold border ${
                          permStorageGb === gb
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {gb}GB
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPermissionsUser(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPermissions}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition-colors flex items-center shadow-xs"
                >
                  {savingPermissions ? 'Saving Rights...' : 'Save Permission Rights'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete User Confirmation Modal */}
      {deleteConfirmUser && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-xl bg-red-100 text-red-600 flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 text-base mb-1">Permanently Delete User Account?</h3>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Are you sure you want to permanently delete the account for <strong>{deleteConfirmUser.username}</strong> ({deleteConfirmUser.email})? All their stored teaching resources will be purged.
            </p>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={deletingUser}
                onClick={() => setDeleteConfirmUser(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingUser}
                onClick={handleExecuteDeleteUser}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 transition-colors shadow-xs"
              >
                {deletingUser ? 'Deleting...' : 'Delete User Account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {resetUser && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95">
            <h3 className="font-bold text-slate-900 text-base mb-1">Reset Account Password</h3>
            <p className="text-xs text-slate-500 mb-4">
              Enter a new secure password for <strong>{resetUser.username}</strong> ({resetUser.email}).
            </p>

            {resetSuccess ? (
              <div className="p-3 bg-emerald-100 text-emerald-800 rounded-xl text-xs flex items-center space-x-2">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Password updated and encrypted!</span>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">New Password</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-600 outline-none"
                    autoFocus
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setResetUser(null)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition-colors shadow-xs"
                  >
                    Update Password
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Storage Quota Modal */}
      {quotaUser && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95">
            <h3 className="font-bold text-slate-900 text-base mb-1">Adjust Cloud Storage Quota</h3>
            <p className="text-xs text-slate-500 mb-4">
              Set storage limit in GB for <strong>{quotaUser.username}</strong>.
            </p>

            <form onSubmit={handleUpdateQuota} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Storage Quota (GB)</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={newQuotaGb}
                    onChange={(e) => setNewQuotaGb(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-600 outline-none font-mono"
                    autoFocus
                  />
                  <span className="text-xs font-semibold text-slate-600">GB</span>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setQuotaUser(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition-colors shadow-xs"
                >
                  Save Quota
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Pre-Register Teachers Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 my-8 max-h-[90vh] flex flex-col">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <UploadCloud className="w-5 h-5 text-sky-600" />
                  Bulk Pre-Register Teachers & Staff
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Onboard multiple faculty members simultaneously from an email list or CSV file.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowBulkModal(false);
                  setBulkResult(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {bulkResult ? (
              /* Success / Results Summary View */
              <div className="space-y-4 overflow-y-auto flex-1 pr-1">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900">
                  <div className="flex items-center space-x-2 font-bold text-sm text-emerald-800">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>{bulkResult.message}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                    <div className="p-2 bg-white rounded-lg border border-emerald-100 shadow-2xs">
                      <div className="text-lg font-black text-emerald-600">{bulkResult.registeredCount}</div>
                      <div className="text-2xs font-semibold text-slate-500 uppercase">Pre-Registered</div>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-emerald-100 shadow-2xs">
                      <div className="text-lg font-black text-amber-600">{bulkResult.skippedCount}</div>
                      <div className="text-2xs font-semibold text-slate-500 uppercase">Skipped (Existing)</div>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-emerald-100 shadow-2xs">
                      <div className="text-lg font-black text-slate-500">{bulkResult.totalSubmitted}</div>
                      <div className="text-2xs font-semibold text-slate-500 uppercase">Total Processed</div>
                    </div>
                  </div>
                </div>

                {bulkResult.users && bulkResult.users.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Onboarded Staff Accounts ({bulkResult.users.length})
                      </h4>
                      <button
                        type="button"
                        onClick={handleCopyOnboardingRoster}
                        className="px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg flex items-center space-x-1.5 transition-colors"
                      >
                        {copiedRoster ? (
                          <>
                            <CheckCheck className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Copied to Clipboard!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy Roster & Passwords</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="border border-slate-200 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                          <tr>
                            <th className="py-2 px-3">Name</th>
                            <th className="py-2 px-3">Email</th>
                            <th className="py-2 px-3">Default Password</th>
                            <th className="py-2 px-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {bulkResult.users.map((u) => (
                            <tr key={u.id} className="hover:bg-slate-50/50">
                              <td className="py-2 px-3 font-medium text-slate-900">{u.username}</td>
                              <td className="py-2 px-3 text-slate-600 font-mono text-2xs">{u.email}</td>
                              <td className="py-2 px-3 font-mono text-2xs text-slate-700">
                                {u.temporary_password || bulkDefaultPassword}
                              </td>
                              <td className="py-2 px-3">
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                  Active
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {bulkResult.skippedEmails && bulkResult.skippedEmails.length > 0 && (
                  <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-800">
                    <span className="font-bold">Skipped (already registered): </span>
                    <span className="font-mono text-2xs">{bulkResult.skippedEmails.join(', ')}</span>
                  </div>
                )}

                <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setBulkResult(null);
                      setBulkEmailsText('');
                    }}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    Register More
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowBulkModal(false);
                      setBulkResult(null);
                    }}
                    className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition-colors shadow-xs"
                  >
                    Done & View Roster
                  </button>
                </div>
              </div>
            ) : (
              /* Input Form View */
              <form onSubmit={handleBulkSubmit} className="space-y-4 overflow-y-auto flex-1 pr-1">
                {/* Method selector banner */}
                <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="flex items-center space-x-2 text-xs text-slate-700 font-medium">
                    <FileSpreadsheet className="w-4 h-4 text-sky-600" />
                    <span>Upload CSV or TXT file of staff emails</span>
                  </div>
                  <label className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer shadow-2xs flex items-center space-x-1.5 transition-colors">
                    <FileUp className="w-3.5 h-3.5 text-sky-600" />
                    <span>Choose File</span>
                    <input
                      type="file"
                      accept=".csv,.txt"
                      onChange={handleBulkFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Textarea for emails */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-2xs font-bold text-slate-700 uppercase">
                      Paste Teacher Emails (Comma, Semicolon, or Newline separated)
                    </label>
                    <span className="text-2xs text-slate-400">e.g. j.smith@school.edu, r.vance@school.edu</span>
                  </div>
                  <textarea
                    rows={6}
                    required
                    value={bulkEmailsText}
                    onChange={(e) => setBulkEmailsText(e.target.value)}
                    placeholder="sarah.math@school.edu
john.science@school.edu
elena.english@school.edu, robert.cs@school.edu"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all placeholder:text-slate-400"
                  />
                </div>

                {/* Real-time parse status pills */}
                {bulkEmailsText.trim() && (
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-medium">
                      Detected: <strong className="text-slate-900">{parsedBulkEmails.raw.length}</strong>
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium">
                      Valid & Ready: <strong className="text-emerald-700">{parsedBulkEmails.valid.length}</strong>
                    </span>
                    {parsedBulkEmails.duplicates.length > 0 && (
                      <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-medium">
                        Duplicate / Registered: <strong>{parsedBulkEmails.duplicates.length}</strong>
                      </span>
                    )}
                    {parsedBulkEmails.invalid.length > 0 && (
                      <span className="px-2.5 py-1 rounded-full bg-red-50 text-red-800 border border-red-200 font-medium">
                        Invalid Format: <strong>{parsedBulkEmails.invalid.length}</strong>
                      </span>
                    )}
                  </div>
                )}

                {/* Configuration Options */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <div>
                    <label className="block text-2xs font-bold text-slate-700 uppercase mb-1">
                      Institution / School ID
                    </label>
                    <input
                      type="text"
                      required
                      value={bulkSchoolId}
                      onChange={(e) => setBulkSchoolId(e.target.value)}
                      placeholder="e.g. pannaipuram_high"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono outline-none focus:ring-1 focus:ring-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block text-2xs font-bold text-slate-700 uppercase mb-1">
                      Default Initial Password
                    </label>
                    <input
                      type="text"
                      required
                      minLength={6}
                      value={bulkDefaultPassword}
                      onChange={(e) => setBulkDefaultPassword(e.target.value)}
                      placeholder="teacher123"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono outline-none focus:ring-1 focus:ring-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block text-2xs font-bold text-slate-700 uppercase mb-1">
                      Storage Quota
                    </label>
                    <div className="flex items-center space-x-1.5">
                      <select
                        value={bulkStorageGb}
                        onChange={(e) => setBulkStorageGb(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold outline-none focus:ring-1 focus:ring-sky-500"
                      >
                        <option value={5}>5 GB</option>
                        <option value={10}>10 GB (Recommended)</option>
                        <option value={20}>20 GB</option>
                        <option value={50}>50 GB</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <div className="text-2xs text-slate-500">
                    Accounts will be created with teacher access rights and synced to Firestore in real-time.
                  </div>
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={() => setShowBulkModal(false)}
                      className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={bulkLoading || parsedBulkEmails.valid.length === 0}
                      className="px-5 py-2 bg-sky-600 text-white rounded-lg text-xs font-semibold hover:bg-sky-700 transition-colors shadow-xs flex items-center space-x-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {bulkLoading ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Pre-Registering...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Pre-Register {parsedBulkEmails.valid.length} Teacher(s)</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
