import React, { useState, useEffect } from 'react';
import {
  X,
  Share2,
  Lock,
  Globe,
  Users,
  Shield,
  Check,
  Copy,
} from 'lucide-react';
import { FileItem, User } from '../types.ts';
import { api } from '../services/api.ts';

interface ShareModalProps {
  file: FileItem | null;
  onClose: () => void;
  onShareUpdated: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ file, onClose, onShareUpdated }) => {
  const [sharingType, setSharingType] = useState<'private' | 'selected' | 'all_teachers' | 'admin_only'>('private');
  const [permission, setPermission] = useState<'view' | 'edit'>('view');
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [copiedLink, setCopiedLink] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (file) {
      setSharingType(file.sharing_type || 'private');
      if (file.shared_with && file.shared_with.length > 0) {
        setSelectedUserIds(file.shared_with.map((s) => s.shared_user_id));
        setPermission(file.shared_with[0].permission || 'view');
      }
    }
    // Fetch users for selection
    api.admin
      .getUsers()
      .then((res) => setAllUsers(res.users))
      .catch(() => {});
  }, [file]);

  if (!file) return null;

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSaveShare = async () => {
    setLoading(true);
    try {
      await api.files.share(file.id, {
        sharing_type: sharingType,
        target_user_ids: selectedUserIds,
        permission,
      });
      onShareUpdated();
      onClose();
    } catch {
      alert('Failed to update share settings.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/#file=${file.id}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div id="share-modal-container" className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 relative">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Resource Sharing</h3>
              <p className="text-2xs text-slate-400 truncate max-w-[240px]">{file.file_name}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 py-4">
          {/* Permission Level Selector per Requirement #10 */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 block">Who can access this resource?</label>

            {/* Option 1: Private */}
            <label
              className={`flex items-start p-3 rounded-xl border cursor-pointer transition-colors ${
                sharingType === 'private'
                  ? 'border-indigo-600 bg-indigo-50/50'
                  : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <input
                type="radio"
                name="sharing_type"
                value="private"
                checked={sharingType === 'private'}
                onChange={() => setSharingType('private')}
                className="mt-0.5 text-indigo-600"
              />
              <div className="ml-3">
                <div className="flex items-center space-x-1.5 font-medium text-xs text-slate-900">
                  <Lock className="w-3.5 h-3.5 text-slate-500" />
                  <span>Private</span>
                </div>
                <p className="text-2xs text-slate-500 mt-0.5">Only you and school administrators can access.</p>
              </div>
            </label>

            {/* Option 2: Shared with all teachers */}
            <label
              className={`flex items-start p-3 rounded-xl border cursor-pointer transition-colors ${
                sharingType === 'all_teachers'
                  ? 'border-indigo-600 bg-indigo-50/50'
                  : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <input
                type="radio"
                name="sharing_type"
                value="all_teachers"
                checked={sharingType === 'all_teachers'}
                onChange={() => setSharingType('all_teachers')}
                className="mt-0.5 text-indigo-600"
              />
              <div className="ml-3">
                <div className="flex items-center space-x-1.5 font-medium text-xs text-slate-900">
                  <Globe className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Shared with all teachers</span>
                </div>
                <p className="text-2xs text-slate-500 mt-0.5">
                  Available in the central Teaching Resource Hub library for all educators.
                </p>
              </div>
            </label>

            {/* Option 3: Shared with selected users */}
            <label
              className={`flex items-start p-3 rounded-xl border cursor-pointer transition-colors ${
                sharingType === 'selected'
                  ? 'border-indigo-600 bg-indigo-50/50'
                  : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <input
                type="radio"
                name="sharing_type"
                value="selected"
                checked={sharingType === 'selected'}
                onChange={() => setSharingType('selected')}
                className="mt-0.5 text-indigo-600"
              />
              <div className="ml-3">
                <div className="flex items-center space-x-1.5 font-medium text-xs text-slate-900">
                  <Users className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Shared with selected users</span>
                </div>
                <p className="text-2xs text-slate-500 mt-0.5">Pick specific teachers or department heads.</p>
              </div>
            </label>

            {/* Option 4: Admin only */}
            <label
              className={`flex items-start p-3 rounded-xl border cursor-pointer transition-colors ${
                sharingType === 'admin_only'
                  ? 'border-indigo-600 bg-indigo-50/50'
                  : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <input
                type="radio"
                name="sharing_type"
                value="admin_only"
                checked={sharingType === 'admin_only'}
                onChange={() => setSharingType('admin_only')}
                className="mt-0.5 text-indigo-600"
              />
              <div className="ml-3">
                <div className="flex items-center space-x-1.5 font-medium text-xs text-slate-900">
                  <Shield className="w-3.5 h-3.5 text-amber-600" />
                  <span>Admin Only Review</span>
                </div>
                <p className="text-2xs text-slate-500 mt-0.5">Restricted to administrator accounts.</p>
              </div>
            </label>
          </div>

          {/* User selector when 'selected' is picked */}
          {sharingType === 'selected' && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between text-xs font-medium text-slate-700">
                <span>Select Teachers</span>
                <select
                  value={permission}
                  onChange={(e) => setPermission(e.target.value as 'view' | 'edit')}
                  className="text-2xs px-2 py-1 bg-white border border-slate-300 rounded font-normal"
                >
                  <option value="view">Can View & Download</option>
                  <option value="edit">Can Edit & Rename</option>
                </select>
              </div>

              <div className="max-h-36 overflow-y-auto divide-y divide-slate-100 bg-white rounded-lg border border-slate-200">
                {allUsers
                  .filter((u) => u.id !== file.user_id)
                  .map((u) => {
                    const isSelected = selectedUserIds.includes(u.id);
                    return (
                      <div
                        key={u.id}
                        onClick={() => toggleUserSelection(u.id)}
                        className={`p-2 flex items-center justify-between text-xs cursor-pointer hover:bg-slate-50 ${
                          isSelected ? 'bg-indigo-50/40' : ''
                        }`}
                      >
                        <div className="flex items-center space-x-2 truncate">
                          <div
                            className="w-5 h-5 rounded-full text-white flex items-center justify-center text-[10px] font-bold"
                            style={{ backgroundColor: u.avatar_color }}
                          >
                            {u.username.charAt(0)}
                          </div>
                          <span className="font-medium text-slate-800 truncate">{u.username}</span>
                          <span className="text-slate-400 text-2xs truncate">({u.email})</span>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-indigo-600 flex-shrink-0" />}
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Quick Direct Link Share */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <span className="text-2xs text-slate-500">Cross-Device Web Link:</span>
              <button
                type="button"
                onClick={handleCopyLink}
                className="text-2xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3 h-3 mr-1 text-emerald-600" />
                    Copied to Clipboard!
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3 mr-1" />
                    Copy Share Link
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveShare}
            disabled={loading}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Permissions'}
          </button>
        </div>
      </div>
    </div>
  );
};
