import React from 'react';
import { useNotificationSettings, useUpdateNotifications } from '../hooks/useSettingQueries';
import { Loader2, CheckCircle, Mail, BellRing, CalendarClock } from 'lucide-react';

type NotificationSettingKey =
  | 'email_notifications'
  | 'push_notifications'
  | 'task_deadline_reminders';

const notificationOptions: Array<{
  key: NotificationSettingKey;
  label: string;
  description: string;
  icon: React.ReactNode;
}> = [
  {
    key: 'email_notifications',
    label: 'Thông báo nhận việc qua Email',
    description: 'Bật/tắt việc gửi email khi có task, deadline, xin dời hạn hoặc cập nhật quan trọng.',
    icon: <Mail size={18} />,
  },
  {
    key: 'push_notifications',
    label: 'Thông báo đẩy thời gian thực',
    description: 'Bật/tắt thông báo realtime trên header và popup nhỏ khi đang online.',
    icon: <BellRing size={18} />,
  },
  {
    key: 'task_deadline_reminders',
    label: 'Nhắc nhở thời hạn chót công việc',
    description: 'Bật/tắt các nhắc nhở deadline sắp đến hoặc quá hạn.',
    icon: <CalendarClock size={18} />,
  },
];

export const NotificationTab = () => {
  const { data: settings, isLoading, isError } = useNotificationSettings();
  const { mutate: updateSettings, isPending } = useUpdateNotifications();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 gap-2 text-sm text-slate-500 font-medium">
        <Loader2 className="animate-spin text-indigo-600" size={20} />
        <span>Đang tải cấu hình thông báo...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="max-w-2xl rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm font-bold text-rose-700">
        Không thể tải cấu hình thông báo. Vui lòng thử lại sau.
      </div>
    );
  }

  const handleToggle = (key: NotificationSettingKey, currentValue: boolean) => {
    if (!settings || isPending) return;

    updateSettings({
      email_notifications: !!settings.email_notifications,
      push_notifications: !!settings.push_notifications,
      task_deadline_reminders: !!settings.task_deadline_reminders,
      [key]: !currentValue,
    });
  };

  const ToggleSwitch = ({
    label,
    description,
    stateKey,
    icon,
  }: {
    label: string;
    description: string;
    stateKey: NotificationSettingKey;
    icon: React.ReactNode;
  }) => {
    const isChecked = !!settings?.[stateKey];

    return (
      <div className="flex items-center justify-between gap-5 p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-colors">
        <div className="flex items-start gap-3 min-w-0">
          <div className={`mt-0.5 w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            isChecked ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-200 text-slate-500'
          }`}>
            {icon}
          </div>

          <div className="min-w-0">
            <span className="text-sm font-black text-slate-700">
              {label}
            </span>
            <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
              {description}
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={isPending}
          onClick={() => handleToggle(stateKey, isChecked)}
          className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-300 disabled:opacity-60 disabled:cursor-not-allowed ${
            isChecked ? 'bg-indigo-600' : 'bg-slate-300'
          }`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition duration-300 ${
              isChecked ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>
    );
  };

  return (
    <div className="max-w-2xl animate-in fade-in duration-300">
      <div className="mb-6">
        <h3 className="text-lg font-bold text-slate-800">
          Cấu hình thông báo
        </h3>
        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
          <CheckCircle size={12} className="text-emerald-500" />
          Thay đổi sẽ được đồng bộ với cơ sở dữ liệu trung tâm.
        </p>
      </div>

      <div className="space-y-4">
        {notificationOptions.map((option) => (
          <ToggleSwitch
            key={option.key}
            label={option.label}
            description={option.description}
            stateKey={option.key}
            icon={option.icon}
          />
        ))}
      </div>

      {isPending && (
        <div className="mt-4 flex items-center gap-2 text-xs font-bold text-indigo-600">
          <Loader2 size={14} className="animate-spin" />
          Đang lưu thay đổi...
        </div>
      )}
    </div>
  );
};

export default NotificationTab;