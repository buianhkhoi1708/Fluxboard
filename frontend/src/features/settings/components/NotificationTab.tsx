import React from 'react';
import { useNotificationSettings, useUpdateNotifications } from '../hooks/useSettingQueries';
import { Loader2, CheckCircle } from 'lucide-react';

export const NotificationTab = () => {
  const { data: settings, isLoading } = useNotificationSettings();
  const { mutate: updateSettings } = useUpdateNotifications();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 gap-2 text-sm text-slate-500 font-medium">
        <Loader2 className="animate-spin text-indigo-600" size={20} />
        <span>Loading notification parameters...</span>
      </div>
    );
  }

  const handleToggle = (key: string, currentValue: boolean) => {
    if (!settings) return;
    // Gửi toàn bộ object kèm trạng thái phủ định của trường vừa click
    updateSettings({ ...settings, [key]: !currentValue });
  };

  const ToggleSwitch = ({ label, stateKey }: { label: string; stateKey: string }) => {
    const isChecked = !!settings?.[stateKey];

    return (
      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors">
        <span className="text-sm font-semibold text-slate-700">{label}</span>
        <button
          type="button"
          onClick={() => handleToggle(stateKey, isChecked)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 ${
            isChecked ? 'bg-indigo-600' : 'bg-slate-300'
          }`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-300 ${
            isChecked ? 'translate-x-6' : 'translate-x-1'
          }`} />
        </button>
      </div>
    );
  };

  return (
    <div className="max-w-2xl animate-in fade-in duration-300">
      <div className="mb-6">
        <h3 className="text-lg font-bold text-slate-800">Cấu hình thông báo</h3>
        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
          <CheckCircle size={12} className="text-emerald-500" /> Changes will be synchronized automatically with the central database.
        </p>
      </div>

      <div className="space-y-4">
        {/* Đồng bộ chính xác tên các trường dữ liệu mapping với cấu trúc DB */}
        <ToggleSwitch label="Thông báo nhận việc qua Email" stateKey="email_notifications" />
        <ToggleSwitch label="Thông báo đẩy thời gian thực (Push)" stateKey="push_notifications" />
        <ToggleSwitch label="Nhắc nhở thời hạn chót công việc" stateKey="task_deadline_reminders" />
        <ToggleSwitch label="Báo cáo tóm tắt tiến độ hàng ngày" stateKey="daily_digest" />
      </div>
    </div>
  );
};