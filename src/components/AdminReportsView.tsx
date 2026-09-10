import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Smartphone, Laptop, Users, Film, FileText, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api.ts';
import { FileItem, User } from '../types.ts';
import { formatBytes } from '../utils/format.ts';

export const AdminReportsView: React.FC = () => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    Promise.all([api.admin.getAllFiles(), api.admin.getUsers()])
      .then(([filesRes, usersRes]) => {
        setFiles(filesRes.files);
        setUsers(usersRes.users);
      })
      .catch(() => {});
  }, []);

  const mobileUploads = files.filter((f) => /mobile|iphone|android/i.test(f.device)).length;
  const computerUploads = files.length - mobileUploads;

  return (
    <div id="admin-reports-view" className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-slate-200">
        <h2 className="text-lg font-bold text-slate-900 flex items-center">
          <BarChart3 className="w-5 h-5 text-indigo-600 mr-2" />
          Teaching System & Resource Reports
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Analytics on multi-device usage, curriculum resources distribution, and teacher activity.
        </p>
      </div>

      {/* Device Adoption Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3">
          <h3 className="font-bold text-sm text-slate-900 flex items-center">
            <Smartphone className="w-4 h-4 text-blue-600 mr-2" />
            Uploads by Source Device
          </h3>
          <p className="text-xs text-slate-500">
            Real-world tracking of teacher access between mobile phones and computers.
          </p>

          <div className="space-y-3 pt-2">
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="flex items-center text-slate-700">
                  <Laptop className="w-3.5 h-3.5 mr-1.5 text-indigo-600" />
                  Desktop / Laptop Computer
                </span>
                <span className="font-mono">{computerUploads} ({files.length > 0 ? Math.round((computerUploads / files.length) * 100) : 0}%)</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-indigo-600 h-full rounded-full"
                  style={{ width: `${files.length > 0 ? (computerUploads / files.length) * 100 : 50}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="flex items-center text-slate-700">
                  <Smartphone className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                  Mobile Phone / Tablet
                </span>
                <span className="font-mono">{mobileUploads} ({files.length > 0 ? Math.round((mobileUploads / files.length) * 100) : 0}%)</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-blue-500 h-full rounded-full"
                  style={{ width: `${files.length > 0 ? (mobileUploads / files.length) * 100 : 50}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Top Active Teachers */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200">
          <h3 className="font-bold text-sm text-slate-900 mb-3 flex items-center">
            <Users className="w-4 h-4 text-indigo-600 mr-2" />
            Active Teachers
          </h3>

          <div className="divide-y divide-slate-100">
            {users.map((u) => {
              const teacherFiles = files.filter((f) => f.user_id === u.id);
              const teacherBytes = teacherFiles.reduce((acc, f) => acc + f.file_size, 0);

              return (
                <div key={u.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <div
                      className="w-7 h-7 rounded-lg text-white font-bold flex items-center justify-center text-2xs"
                      style={{ backgroundColor: u.avatar_color }}
                    >
                      {u.username.charAt(0)}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-800">{u.username}</div>
                      <div className="text-2xs text-slate-400">{u.email}</div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-semibold text-slate-700">{teacherFiles.length} files</div>
                    <div className="text-2xs text-slate-400 font-mono">{formatBytes(teacherBytes)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
