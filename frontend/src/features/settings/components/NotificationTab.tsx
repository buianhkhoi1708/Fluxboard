import React from 'react';
import { useNotificationSettings, useUpdateNotifications } from '../hooks/useSettingQueries';

export const NotificationTab = () => {
  const { data: settings, isLoading } = useNotificationSettings();
  const { mutate: updateSettings } = useUpdateNotifications();

  if (isLoading) return <div>Đang tải cấu hình...</div>;

  const handleToggle = (key: string, currentValue: boolean) => {
    updateSettings({ ...settings, [key]: !currentValue });
  };

  const ToggleSwitch = ({ label, stateKey }: { label: string, stateKey: string }) => (
    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <button 
        onClick={() => handleToggle(stateKey, settings?.[stateKey])}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 ${
          settings?.[stateKey] ? 'bg-indigo-600' : 'bg-slate-300'
        }`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-300 ${
          settings?.[stateKey] ? 'translate-x-6' : 'translate-x-1'
        }`} />
      </button>
    </div>
  );

  return (
    <div className="max-w-2xl animate-in fade-in duration-300">
      <h2 className="text-2xl font-bold text-slate-800 mb-2">Notification Center</h2>
      <p className="text-sm text-slate-500 mb-8">Thay đổi sẽ được tự động lưu ngay khi bạn bật/tắt.</p>
      
      <div className="space-y-8">
        <div>
          <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-4 border-b pb-2">Project Notifications</h3>
          <div className="space-y-3">
            <ToggleSwitch label="Khi được giao việc" stateKey="tasks" />
            <ToggleSwitch label="Nhắc nhở sắp đến hạn" stateKey="reminders" />
          </div>
        </div>
        {/* Các group khác tương tự... */}
      </div>
    </div>
  );
};