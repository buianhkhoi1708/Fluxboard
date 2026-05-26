import React, { useState, useEffect } from 'react';
import {
  FunnelIcon,
  ArrowPathIcon,
  CalendarDaysIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { useActivityFilters } from '../hooks/useActivityFilters';

const SOURCE_OPTIONS = [
  { value: '', label: 'Tất cả' },
  { value: 'PROJECT', label: '📁 Project' },
  { value: 'BOARD', label: '📌 Board' },
  { value: 'TASK', label: '✅ Task' },
  { value: 'USER', label: '👤 User' },
  { value: 'SYSTEM', label: '⚙️ System' },
  { value: 'SECURITY', label: '🛡️ Security' },
];

const ACTION_OPTIONS = [
  { value: '', label: 'Tất cả' },
  { value: 'CREATE', label: '✨ Tạo mới' },
  { value: 'UPDATE', label: '✏️ Cập nhật' },
  { value: 'DELETE', label: '🗑️ Xóa' },
  { value: 'MOVE', label: '🔄 Chuyển trạng thái' },
  { value: 'ADD_MEMBER', label: '👥 Thêm thành viên' },
  { value: 'UPDATE_MEMBER', label: '🧩 Cập nhật thành viên' },
  { value: 'REMOVE_MEMBER', label: '🚫 Xóa thành viên' },
  { value: 'CREATE_USER', label: '🆕 Tạo tài khoản' },
  { value: 'CHANGE_PASSWORD', label: '🔐 Đổi mật khẩu' },
  { value: 'EXTENSION_REQUEST', label: '⏰ Xin dời hạn' },
  { value: 'EXTENSION_APPROVE', label: '✅ Duyệt dời hạn' },
  { value: 'EXTENSION_REJECT', label: '❌ Từ chối dời hạn' },
];

const ActivityFilterBar = () => {
  const [filters, setFilters] = useActivityFilters();

  const [localFilters, setLocalFilters] = useState({
    action: filters?.actions || '',
    source_type: filters?.sourceTypes || '',
    startDate: filters?.from ? filters.from.split('T')[0] : '',
    endDate: filters?.to ? filters.to.split('T')[0] : '',
  });

  useEffect(() => {
    setLocalFilters({
      action: filters?.actions || '',
      source_type: filters?.sourceTypes || '',
      startDate: filters?.from ? filters.from.split('T')[0] : '',
      endDate: filters?.to ? filters.to.split('T')[0] : '',
    });
  }, [filters.actions, filters.sourceTypes, filters.from, filters.to]);

  const handleApplyFilter = (event: React.FormEvent) => {
    event.preventDefault();

    const formattedFilters: any = {
      sourceTypes: localFilters.source_type || undefined,
      actions: localFilters.action || undefined,
      from: undefined,
      to: undefined,
    };

    if (localFilters.startDate) {
      const fromDate = new Date(`${localFilters.startDate}T00:00:00`);
      formattedFilters.from = fromDate.toISOString();
    }

    if (localFilters.endDate) {
      const toDate = new Date(`${localFilters.endDate}T23:59:59.999`);
      formattedFilters.to = toDate.toISOString();
    }

    setFilters(formattedFilters);
  };

  const handleClearFilter = () => {
    setLocalFilters({
      action: '',
      source_type: '',
      startDate: '',
      endDate: '',
    });

    setFilters({
      sourceTypes: undefined,
      actions: undefined,
      from: undefined,
      to: undefined,
    });
  };

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/30 p-5 mb-8 transition-all duration-200">
      <form
        onSubmit={handleApplyFilter}
        className="flex flex-col lg:flex-row lg:items-end gap-4"
      >
        {/* Phạm vi */}
        <div className="flex-1 min-w-[140px]">
          <label className="block text-xs font-semibold text-slate-500 mb-1.5 tracking-wide">
            Phạm vi
          </label>

          <select
            value={localFilters.source_type}
            onChange={(event) =>
              setLocalFilters({
                ...localFilters,
                source_type: event.target.value,
              })
            }
            className="w-full text-sm p-2.5 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all duration-200 cursor-pointer"
          >
            {SOURCE_OPTIONS.map((option) => (
              <option key={option.value || 'all'} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Hành động */}
        <div className="flex-1 min-w-[140px]">
          <label className="block text-xs font-semibold text-slate-500 mb-1.5 tracking-wide">
            Hành động
          </label>

          <select
            value={localFilters.action}
            onChange={(event) =>
              setLocalFilters({
                ...localFilters,
                action: event.target.value,
              })
            }
            className="w-full text-sm p-2.5 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all duration-200 cursor-pointer"
          >
            {ACTION_OPTIONS.map((option) => (
              <option key={option.value || 'all'} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Từ ngày */}
        <div className="flex-1 min-w-[150px]">
          <label className="text-xs font-semibold text-slate-500 mb-1.5 tracking-wide flex items-center gap-1">
            <CalendarDaysIcon className="w-3.5 h-3.5" />
            Từ ngày
          </label>

          <input
            type="date"
            value={localFilters.startDate}
            onChange={(event) =>
              setLocalFilters({
                ...localFilters,
                startDate: event.target.value,
              })
            }
            className="w-full text-sm p-2.5 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all duration-200 text-slate-700 cursor-pointer"
          />
        </div>

        {/* Đến ngày */}
        <div className="flex-1 min-w-[150px]">
          <label className="text-xs font-semibold text-slate-500 mb-1.5 tracking-wide flex items-center gap-1">
            <ClockIcon className="w-3.5 h-3.5" />
            Đến ngày
          </label>

          <input
            type="date"
            value={localFilters.endDate}
            onChange={(event) =>
              setLocalFilters({
                ...localFilters,
                endDate: event.target.value,
              })
            }
            className="w-full text-sm p-2.5 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all duration-200 text-slate-700 cursor-pointer"
          />
        </div>

        {/* Nút hành động */}
        <div className="flex gap-3 lg:w-auto w-full">
          <button
            type="submit"
            className="flex-1 lg:flex-none inline-flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white px-5 py-2.5 rounded-xl font-medium shadow-md hover:shadow-lg transition-all duration-200 active:scale-95"
          >
            <FunnelIcon className="w-4 h-4" />
            <span>Lọc</span>
          </button>

          <button
            type="button"
            onClick={handleClearFilter}
            className="flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800 p-2.5 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95"
            title="Xóa tất cả bộ lọc"
          >
            <ArrowPathIcon className="w-5 h-5 stroke-2" />
          </button>
        </div>
      </form>
    </div>
  );
};

export default ActivityFilterBar;