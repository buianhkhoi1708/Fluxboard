import React from 'react';
import { useQueryState, parseAsString } from 'nuqs';
import { User, Shield, Bell, Laptop, Trash2, Key } from 'lucide-react';
import ChangePasswordForm from '../features/settings/components/ChangePassWordForm';
import { ProfileTab } from '../features/settings/components/ProfileTab';
import { NotificationTab } from '../features/settings/components/NotificationTab';
import { useActiveSessions, useRevokeSession, useSignOutAllSessions, useSecurityLogs } from '../features/settings/hooks/useSettingQueries';

const TABS = [
  { key: 'profile', label: 'Hồ sơ', icon: User },
  { key: 'security', label: 'Bảo mật', icon: Shield },
  { key: 'notifications', label: 'Thông báo', icon: Bell },
];

const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useQueryState('tab', parseAsString.withDefault('profile'));

  const { data: sessions = [] } = useActiveSessions();
  const { data: logs = [] } = useSecurityLogs();
  const { mutate: revokeSession } = useRevokeSession();
  const { mutate: signOutAll } = useSignOutAllSessions();

  return (
    <div className="flex-1 bg-gradient-to-r from-slate-50 via-white to-indigo-50/30 h-full overflow-y-auto no-scrollbar p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">Trung tâm quản lý danh tính</h1>
            <p className="text-sm text-slate-500">Quản lý các thông tin xác thực bảo mật, quản trị thiết bị kết nối và cấu hình hệ thống dữ liệu.</p>
          </div>
        </div>

        <div className="flex gap-1 bg-white/80 backdrop-blur-sm p-1 rounded-2xl border border-slate-200/80 shadow-sm mb-8 w-fit">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  isActive ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-200/50' : 'text-slate-600 hover:text-indigo-600 hover:bg-indigo-50'
                }`}
              >
                <Icon size={16} strokeWidth={2} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/80 shadow-sm p-6 md:p-8">
          {activeTab === 'profile' && <ProfileTab />}
          
          {activeTab === 'security' && (
            <div className="space-y-8 divide-y divide-slate-100">
              <ChangePasswordForm />
              
              <div className="pt-8">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">Quản lý phiên hoạt động</h4>
                    <p className="text-xs text-slate-500">Danh sách các thiết bị đầu cuối đang có kết nối hoạt động hợp lệ vào hệ thống.</p>
                  </div>
                  {sessions.length > 1 && (
                    <button onClick={() => signOutAll()} className="text-xs text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1">
                      <Trash2 size={14} /> Đăng xuất tất cả thiết bị khác
                    </button>
                  )}
                </div>
                <div className="space-y-3">
                  {sessions.map((sess: any) => (
                    <div key={sess._id} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-xl">
                      <div className="flex items-center gap-3">
                        <Laptop className="text-slate-400" size={18} />
                        <div>
                          <p className="text-sm font-semibold text-slate-700">{sess.device_type} <span className="text-xs font-normal text-slate-400">({sess.ip_address})</span></p>
                          <p className="text-[10px] text-slate-400">Hoạt động gần nhất: {new Date(sess.last_activity).toLocaleString('en-US')}</p>
                        </div>
                      </div>
                      <button onClick={() => revokeSession(sess._id)} className="text-slate-400 hover:text-rose-600 p-1 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-8">
                <h4 className="text-sm font-bold text-slate-800 mb-3">Nhật ký bảo mật hệ thống</h4>
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-3">
                  {logs.length > 0 ? logs.map((log: any) => (
                    <div key={log._id} className="flex justify-between text-xs text-slate-600 border-b border-slate-200/50 pb-2 last:border-none last:pb-0">
                      <span className="font-medium flex items-center gap-1.5"><Key size={12} className="text-slate-400" /> {log.message}</span>
                      <span className="text-slate-400">{new Date(log.created_at).toLocaleDateString('en-US')}</span>
                    </div>
                  )) : (
                    <p className="text-xs text-slate-400 italic">Chưa ghi nhận lịch sử thay đổi thông số bảo mật nào.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && <NotificationTab />}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;