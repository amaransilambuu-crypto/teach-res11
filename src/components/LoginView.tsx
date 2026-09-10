import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import {
  GraduationCap,
  Lock,
  Mail,
  User as UserIcon,
  ShieldCheck,
  Eye,
  EyeOff,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  Laptop,
} from 'lucide-react';
import { api } from '../services/api.ts';

export const LoginView: React.FC = () => {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);

  // Login form state - prefill with teacher demo account for quick sign-in
  const [identifier, setIdentifier] = useState('teacher@school.edu');
  const [password, setPassword] = useState('teacher123');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  // Register form state
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState<'teacher' | 'admin'>('teacher');

  // Forgot password form state
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [forgotStep, setForgotStep] = useState<'request' | 'reset'>('request');
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);

  // Feedback
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(identifier, password, rememberMe);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await register(regUsername, regEmail, regPassword, regRole);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.auth.forgotPassword(forgotEmail);
      if (res.resetCode) {
        setGeneratedCode(res.resetCode);
        setResetCode(res.resetCode); // auto-fill for convenience
      }
      setForgotStep('reset');
      setSuccessMsg(`Verification code sent to ${forgotEmail}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to process password reset.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.auth.resetPassword(forgotEmail, newPassword);
      setSuccessMsg('Password has been reset successfully! You can now log in.');
      setTimeout(() => {
        setShowForgotModal(false);
        setForgotStep('request');
        setIdentifier(forgotEmail);
        setPassword(newPassword);
      }, 1500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  const fillCredentials = (email: string, pass: string) => {
    setIdentifier(email);
    setPassword(pass);
    setError(null);
  };

  const handleQuickLogin = async (email: string, pass: string) => {
    setIdentifier(email);
    setPassword(pass);
    setError(null);
    setLoading(true);
    try {
      await login(email, pass, true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="login-container" className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-200 mb-4">
          <GraduationCap className="w-9 h-9" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Teacher Resource Hub</h1>
        <p className="mt-2 text-sm text-slate-600 max-w-sm mx-auto">
          Centralized cloud platform for teachers to organize, preview, and access educational materials across mobile and computer.
        </p>
      </div>

      {/* Main Card */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200 rounded-2xl sm:px-10">
          {/* Mode Switcher */}
          <div className="flex border-b border-slate-200 mb-6 pb-2">
            <button
              id="tab-login-btn"
              type="button"
              onClick={() => {
                setIsRegister(false);
                setError(null);
              }}
              className={`flex-1 text-center py-2 text-sm font-semibold border-b-2 transition-colors ${
                !isRegister
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Sign In
            </button>
            <button
              id="tab-register-btn"
              type="button"
              onClick={() => {
                setIsRegister(true);
                setError(null);
              }}
              className={`flex-1 text-center py-2 text-sm font-semibold border-b-2 transition-colors ${
                isRegister
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div id="auth-error-alert" className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 flex items-start space-x-2 text-red-700 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Success Message */}
          {successMsg && (
            <div id="auth-success-alert" className="mb-5 p-3 rounded-lg bg-emerald-50 border border-emerald-200 flex items-start space-x-2 text-emerald-700 text-sm">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {!isRegister ? (
            /* Login Form */
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Username or Email
                </label>
                <div className="relative rounded-lg shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-5 h-5" />
                  </div>
                  <input
                    id="login-identifier-input"
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="teacher@school.edu"
                    className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 sm:text-sm"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-slate-700">Password</label>
                  <button
                    id="forgot-password-link"
                    type="button"
                    onClick={() => {
                      setForgotEmail(identifier || '');
                      setShowForgotModal(true);
                      setError(null);
                    }}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-500"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative rounded-lg shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input
                    id="login-password-input"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="block w-full pl-10 pr-10 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 sm:text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center text-sm text-slate-600 cursor-pointer select-none">
                  <input
                    id="remember-me-checkbox"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded"
                  />
                  <span className="ml-2">Remember Me</span>
                </label>
                <div className="flex items-center text-xs text-slate-500 space-x-1">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Encrypted Sessions</span>
                </div>
              </div>

              <button
                id="login-submit-btn"
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Authenticating...' : 'Sign In'}
              </button>
            </form>
          ) : (
            /* Register Form */
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                <div className="relative rounded-lg shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <UserIcon className="w-5 h-5" />
                  </div>
                  <input
                    id="register-username-input"
                    type="text"
                    required
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    placeholder="Prof. Alex Smith"
                    className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 sm:text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">School Email</label>
                <div className="relative rounded-lg shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-5 h-5" />
                  </div>
                  <input
                    id="register-email-input"
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="teacher@school.edu"
                    className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 sm:text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                <div className="relative rounded-lg shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input
                    id="register-password-input"
                    type="password"
                    required
                    minLength={6}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 sm:text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                <select
                  id="register-role-select"
                  value={regRole}
                  onChange={(e) => setRegRole(e.target.value as 'teacher' | 'admin')}
                  className="block w-full px-3 py-2.5 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 sm:text-sm"
                >
                  <option value="teacher">Teacher (Upload, organize, share files)</option>
                  <option value="admin">Administrator (Manage users & school storage)</option>
                </select>
              </div>

              <button
                id="register-submit-btn"
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Creating Account...' : 'Create Teacher Account'}
              </button>
            </form>
          )}

          {/* Quick Demo Accounts Helper */}
          <div className="mt-6 pt-6 border-t border-slate-200">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              <div className="flex items-center space-x-1">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                <span>1-Click Instant Sign In</span>
              </div>
              <span className="text-indigo-600 font-normal normal-case">Click to enter directly</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                id="demo-pssofttech-btn"
                disabled={loading}
                onClick={() => handleQuickLogin('pssofttech@gmail.com', 'admin123')}
                className="p-2.5 border border-indigo-200 bg-indigo-50/40 rounded-lg text-left hover:bg-indigo-100/70 hover:border-indigo-300 transition-colors group cursor-pointer disabled:opacity-50"
              >
                <div className="font-semibold text-slate-800 flex items-center justify-between">
                  <span className="flex items-center">
                    <ShieldCheck className="w-3.5 h-3.5 mr-1 text-indigo-600" />
                    Admin
                  </span>
                  <span className="text-2xs bg-indigo-600 text-white px-1.5 py-0.5 rounded font-medium group-hover:bg-indigo-700">Enter</span>
                </div>
                <div className="text-slate-600 truncate mt-1">pssofttech@gmail.com</div>
                <div className="text-slate-500 font-mono text-2xs">Admin Dashboard</div>
              </button>

              <button
                type="button"
                id="demo-vasisoft-btn"
                disabled={loading}
                onClick={() => handleQuickLogin('vasisoft20815@gmail.com', 'teacher123')}
                className="p-2.5 border border-emerald-200 bg-emerald-50/40 rounded-lg text-left hover:bg-emerald-100/70 hover:border-emerald-300 transition-colors group cursor-pointer disabled:opacity-50"
              >
                <div className="font-semibold text-slate-800 flex items-center justify-between">
                  <span className="flex items-center">
                    <Laptop className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                    Teacher
                  </span>
                  <span className="text-2xs bg-emerald-600 text-white px-1.5 py-0.5 rounded font-medium group-hover:bg-emerald-700">Enter</span>
                </div>
                <div className="text-slate-600 truncate mt-1">vasisoft20815@gmail.com</div>
                <div className="text-slate-500 font-mono text-2xs">Teacher Portal</div>
              </button>

              <button
                type="button"
                id="demo-teacher-btn"
                disabled={loading}
                onClick={() => handleQuickLogin('teacher@school.edu', 'teacher123')}
                className="p-2 border border-slate-200 bg-slate-50 rounded-lg text-left hover:bg-slate-100 transition-colors group cursor-pointer disabled:opacity-50"
              >
                <div className="font-medium text-slate-700 flex items-center justify-between">
                  <span className="flex items-center text-xs">
                    <Laptop className="w-3 h-3 mr-1 text-slate-500" />
                    School Teacher
                  </span>
                  <span className="text-2xs text-slate-500">1-Click</span>
                </div>
                <div className="text-slate-500 truncate text-2xs mt-0.5">teacher@school.edu</div>
              </button>

              <button
                type="button"
                id="demo-admin-btn"
                disabled={loading}
                onClick={() => handleQuickLogin('admin@school.edu', 'admin123')}
                className="p-2 border border-slate-200 bg-slate-50 rounded-lg text-left hover:bg-slate-100 transition-colors group cursor-pointer disabled:opacity-50"
              >
                <div className="font-medium text-slate-700 flex items-center justify-between">
                  <span className="flex items-center text-xs">
                    <ShieldCheck className="w-3 h-3 mr-1 text-slate-500" />
                    School Admin
                  </span>
                  <span className="text-2xs text-slate-500">1-Click</span>
                </div>
                <div className="text-slate-500 truncate text-2xs mt-0.5">admin@school.edu</div>
              </button>
            </div>
          </div>
        </div>

        {/* Cross-Device Notice Card */}
        <div className="mt-4 p-3 rounded-xl bg-blue-50/70 border border-blue-100 flex items-center justify-between text-xs text-blue-900">
          <div className="flex items-center space-x-2">
            <Smartphone className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <span>Works seamlessly across Mobile Phones & Desktop Computers</span>
          </div>
          <span className="font-medium text-blue-700 bg-white px-2 py-0.5 rounded shadow-2xs">Cloud Sync Active</span>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Reset Password</h3>
            <p className="text-xs text-slate-500 mb-4">
              Enter your registered school email address to receive a secure recovery code.
            </p>

            {error && (
              <div className="mb-3 p-2.5 rounded bg-red-50 text-red-700 text-xs border border-red-200">
                {error}
              </div>
            )}
            {successMsg && (
              <div className="mb-3 p-2.5 rounded bg-emerald-50 text-emerald-700 text-xs border border-emerald-200">
                {successMsg}
              </div>
            )}

            {forgotStep === 'request' ? (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="teacher@school.edu"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-600 outline-none"
                  />
                </div>
                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {loading ? 'Sending...' : 'Send Recovery Code'}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                {generatedCode && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                    <span className="font-semibold">Demo Recovery Code:</span> {generatedCode}
                  </div>
                )}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">6-Digit Code</label>
                  <input
                    type="text"
                    required
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm tracking-widest font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">New Password</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-600 outline-none"
                  />
                </div>
                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setForgotStep('request')}
                    className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {loading ? 'Resetting...' : 'Save New Password'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
