import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import {
  Settings,
  User as UserIcon,
  Lock,
  Smartphone,
  Laptop,
  Check,
  Shield,
  HardDrive,
  Globe,
} from 'lucide-react';
import { api } from '../services/api.ts';
import { formatBytes } from '../utils/format.ts';

export const SettingsView: React.FC = () => {
  const { user, currentDevice, refreshCurrentUser } = useAuth();

  const [username, setUsername] = useState(user?.username || '');
  const [profileSuccess, setProfileSuccess] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;

    try {
      await api.auth.updateProfile({ username: username.trim() });
      setProfileSuccess(true);
      await refreshCurrentUser();
      setTimeout(() => setProfileSuccess(false), 2000);
    } catch {
      alert('Failed to update profile.');
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    if (!newPassword || newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters.');
      return;
    }

    try {
      await api.auth.updateProfile({ password: newPassword });
      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setTimeout(() => setPasswordSuccess(false), 2500);
    } catch {
      setPasswordError('Failed to change password.');
    }
  };

  const isMobile = /mobile|iphone|android/i.test(currentDevice);

  return (
    <div id="settings-view" className="space-y-6 max-w-4xl mx-auto">
      <div className="bg-white p-5 rounded-2xl border border-slate-200">
        <h2 className="text-lg font-bold text-slate-900 flex items-center">
          <Settings className="w-5 h-5 text-indigo-600 mr-2" />
          Account & Device Settings
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Manage teacher credentials, cross-device preferences, and security options.
        </p>
      </div>

      {/* Cross-Device Status Card (Requirement #11) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3">
        <h3 className="font-bold text-sm text-slate-900 flex items-center">
          {isMobile ? (
            <Smartphone className="w-4 h-4 text-blue-600 mr-2" />
          ) : (
            <Laptop className="w-4 h-4 text-indigo-600 mr-2" />
          )}
          Cross-Device Multi-Access (Computer & Mobile)
        </h3>
        <p className="text-xs text-slate-600 leading-relaxed">
          Teacher Resource Hub is optimized for both desktop web browsers (Chrome, Edge, Safari, Firefox) and mobile phones (iPhone Safari, Android Chrome).
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start space-x-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0">
              <Laptop className="w-4 h-4" />
            </div>
            <div className="text-xs">
              <span className="font-bold text-slate-800 block">Desktop / Laptop Browser</span>
              <span className="text-slate-500 text-2xs block mt-0.5">
                Full-screen media players, multi-file drag and drop, hierarchical folder navigator.
              </span>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start space-x-3">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
              <Smartphone className="w-4 h-4" />
            </div>
            <div className="text-xs">
              <span className="font-bold text-slate-800 block">Mobile Phone Browser</span>
              <span className="text-slate-500 text-2xs block mt-0.5">
                Direct camera uploads, touch responsive playback, mobile download support.
              </span>
            </div>
          </div>
        </div>

        <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs flex items-center space-x-2 mt-2">
          <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>Currently connected device: <strong>{currentDevice}</strong></span>
        </div>
      </div>

      {/* Edit Profile */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
        <h3 className="font-bold text-sm text-slate-900 flex items-center">
          <UserIcon className="w-4 h-4 text-slate-600 mr-2" />
          Teacher Profile Information
        </h3>

        {profileSuccess && (
          <div className="p-3 bg-emerald-100 text-emerald-800 rounded-xl text-xs flex items-center space-x-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>Profile successfully updated!</span>
          </div>
        )}

        <form onSubmit={handleUpdateProfile} className="space-y-4 max-w-md">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Display Name / Username</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-600 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
            <input
              type="email"
              disabled
              value={user?.email || ''}
              className="w-full px-3 py-2 border border-slate-200 bg-slate-100 text-slate-500 rounded-lg text-xs cursor-not-allowed"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">
              Email is managed by the school administrator.
            </span>
          </div>

          <button
            type="submit"
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700"
          >
            Save Profile
          </button>
        </form>
      </div>

      {/* Change Password */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
        <h3 className="font-bold text-sm text-slate-900 flex items-center">
          <Lock className="w-4 h-4 text-slate-600 mr-2" />
          Security Credentials
        </h3>

        {passwordSuccess && (
          <div className="p-3 bg-emerald-100 text-emerald-800 rounded-xl text-xs flex items-center space-x-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>Password updated and encrypted using BCrypt!</span>
          </div>
        )}

        {passwordError && (
          <div className="p-3 bg-red-100 text-red-800 rounded-xl text-xs">
            {passwordError}
          </div>
        )}

        <form onSubmit={handleUpdatePassword} className="space-y-4 max-w-md">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">New Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-600 outline-none"
            />
          </div>

          <button
            type="submit"
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700"
          >
            Update Password
          </button>
        </form>
      </div>
    </div>
  );
};
