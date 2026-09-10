import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { User } from '../types.ts';
import { api } from '../services/api.ts';
import { formatBytes, formatDate } from '../utils/format.ts';

export const AdminUsersView: React.FC = () => {
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
                          <div className="font-semibold text-slate-900 truncate">{u.username}</div>
                          <div className="text-slate-400 text-2xs truncate">{u.email}</div>
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

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95">
            <h3 className="font-bold text-slate-900 text-base mb-1">Add Educator / Teacher Account</h3>
            <p className="text-xs text-slate-500 mb-4">
              Create a new account with customized access permissions and storage quota.
            </p>

            <form onSubmit={handleCreateUser} className="space-y-3">
              <div>
                <label className="block text-2xs font-bold text-slate-600 uppercase mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={createUsername}
                  onChange={(e) => setCreateUsername(e.target.value)}
                  placeholder="e.g. Dr. Robert Vance"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-2xs font-bold text-slate-600 uppercase mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={createEmail}
                  onChange={(e) => setCreateEmail(e.target.value)}
                  placeholder="e.g. robert.science@school.edu"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-2xs font-bold text-slate-600 uppercase mb-1">Initial Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={createPassword}
                  onChange={(e) => setCreatePassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-2xs font-bold text-slate-600 uppercase mb-1">Role</label>
                  <select
                    value={createRole}
                    onChange={(e) => setCreateRole(e.target.value as 'teacher' | 'admin')}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="teacher">Teacher</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>

                <div>
                  <label className="block text-2xs font-bold text-slate-600 uppercase mb-1">Storage Quota</label>
                  <div className="flex items-center space-x-1.5">
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={createStorageGb}
                      onChange={(e) => setCreateStorageGb(parseInt(e.target.value) || 10)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-mono font-bold outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <span className="text-2xs font-bold text-slate-500">GB</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingUser}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition-colors shadow-xs"
                >
                  {creatingUser ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
