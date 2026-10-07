import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { useInstitutionTheme, SettingsModalTab } from '../context/ThemeContext.tsx';
import { ThemeSelector } from './ThemeSelector.tsx';
import {
  X,
  Palette,
  User as UserIcon,
  Lock,
  Smartphone,
  Laptop,
  Check,
  Shield,
  School,
  HardDrive,
  Save,
  AlertCircle,
} from 'lucide-react';
import { api } from '../services/api.ts';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: SettingsModalTab;
  onSettingsUpdated?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'theme',
}) => {
  const { user, currentDevice, refreshCurrentUser } = useAuth();
  const { schoolName } = useInstitutionTheme();

  const [activeTab, setActiveTab] = useState<SettingsModalTab>(initialTab);

  // Profile Form State
  const [username, setUsername] = useState(user?.username || '');
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab, isOpen]);

  useEffect(() => {
    if (user?.username) {
      setUsername(user.username);
    }
  }, [user]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;

    setProfileSaving(true);
    try {
      await api.auth.updateProfile({ username: username.trim() });
      setProfileSuccess(true);
      await refreshCurrentUser();
      setTimeout(() => setProfileSuccess(false), 2500);
    } catch {
      alert('Failed to update teacher profile.');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    if (!newPassword || newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters.');
      return;
    }

    setPasswordSaving(true);
    try {
      await api.auth.updateProfile({ password: newPassword });
      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch {
      setPasswordError('Failed to change password. Please check credentials.');
    } finally {
      setPasswordSaving(false);
    }
  };

  const isMobile = /mobile|iphone|android/i.test(currentDevice);

  return (
    <div
      id="settings-modal"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
    >
      <div
        className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-200 bg-white flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <School className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">
                Settings & Institution Customization
              </h2>
              <p className="text-xs text-slate-500 mt-0.5 truncate max-w-sm sm:max-w-lg">
                Brand themes, account credentials, and cross-device preferences for {schoolName}
              </p>
            </div>
          </div>

          <button
            id="close-settings-modal-btn"
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close Settings Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-5 sm:px-6 border-b border-slate-200 bg-slate-50/70 flex space-x-1 sm:space-x-2 overflow-x-auto no-scrollbar flex-shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('theme')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center space-x-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'theme'
                ? 'border-indigo-600 text-indigo-600 bg-white shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            <Palette className="w-4 h-4" />
            <span>Institution Theme & Brand</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center space-x-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'profile'
                ? 'border-indigo-600 text-indigo-600 bg-white shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            <UserIcon className="w-4 h-4" />
            <span>Teacher Profile</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center space-x-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'security'
                ? 'border-indigo-600 text-indigo-600 bg-white shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>Security & Password</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('devices')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center space-x-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'devices'
                ? 'border-indigo-600 text-indigo-600 bg-white shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            <Laptop className="w-4 h-4" />
            <span>Connected Devices</span>
          </button>
        </div>

        {/* Modal Scrollable Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1">
          {/* 1. Theme Selector Tab */}
          {activeTab === 'theme' && (
            <div id="settings-tab-theme">
              <ThemeSelector onSaved={() => {}} />
            </div>
          )}

          {/* 2. Profile Tab */}
          {activeTab === 'profile' && (
            <div id="settings-tab-profile" className="space-y-5 max-w-xl">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center">
                  <UserIcon className="w-4 h-4 text-slate-600 mr-2" />
                  Teacher Profile Credentials
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Update your educator display name shown across shared resources and logs.
                </p>
              </div>

              {profileSuccess && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs flex items-center space-x-2">
                  <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>Profile updated successfully!</span>
                </div>
              )}

              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Display Name / Username
                  </label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    School Email Address
                  </label>
                  <input
                    type="email"
                    disabled
                    value={user?.email || ''}
                    className="w-full px-3.5 py-2.5 border border-slate-200 bg-slate-100 text-slate-500 rounded-xl text-xs cursor-not-allowed font-medium"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Assigned and managed by your school administrator.
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={profileSaving}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {profileSaving ? 'Saving Profile...' : 'Save Profile Changes'}
                </button>
              </form>
            </div>
          )}

          {/* 3. Security Tab */}
          {activeTab === 'security' && (
            <div id="settings-tab-security" className="space-y-5 max-w-xl">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center">
                  <Lock className="w-4 h-4 text-slate-600 mr-2" />
                  Password & Security Credentials
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Update your personal account password. Passwords are encrypted using BCrypt on the secure server.
                </p>
              </div>

              {passwordSuccess && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs flex items-center space-x-2">
                  <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>Password updated and encrypted successfully!</span>
                </div>
              )}

              {passwordError && (
                <div className="p-3.5 bg-red-50 border border-red-200 text-red-900 rounded-xl text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}

              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    New Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter at least 6 characters"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={passwordSaving}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {passwordSaving ? 'Updating...' : 'Update Password'}
                </button>
              </form>
            </div>
          )}

          {/* 4. Devices Tab */}
          {activeTab === 'devices' && (
            <div id="settings-tab-devices" className="space-y-5">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center">
                  <Laptop className="w-4 h-4 text-indigo-600 mr-2" />
                  Multi-Device Access Ecosystem
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Seamlessly access resources on computer lab desktops, tablets, and personal smartphones.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-start space-x-3">
                  <div className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0">
                    <Laptop className="w-5 h-5" />
                  </div>
                  <div className="text-xs">
                    <span className="font-bold text-slate-800 block">Desktop / Laptop Workstation</span>
                    <p className="text-slate-500 text-2xs mt-1 leading-relaxed">
                      Optimized for hierarchical folder management, multi-file uploads, and full-screen document inspection.
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-start space-x-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div className="text-xs">
                    <span className="font-bold text-slate-800 block">Smartphone / Mobile Browser</span>
                    <p className="text-slate-500 text-2xs mt-1 leading-relaxed">
                      Optimized touch navigation, direct camera uploads, PWA offline home screen icon, and responsive audio/video players.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs flex items-center space-x-2">
                <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>
                  Currently connected device: <strong>{currentDevice}</strong> ({isMobile ? 'Mobile View' : 'Desktop View'})
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 sm:px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between flex-shrink-0">
          <span className="text-[11px] text-slate-500">
            {schoolName} • Educational Cloud Hub
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
