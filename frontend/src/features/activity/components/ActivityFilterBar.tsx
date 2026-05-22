import React, { useState, useEffect } from "react";
import { FunnelIcon, ArrowPathIcon, CalendarDaysIcon, ClockIcon } from "@heroicons/react/24/outline";
import { useActivityFilters } from "../hooks/useActivityFilters";

const ActivityFilterBar = () => {
  // Lấy state bộ lọc từ URL
  const [filters, setFilters] = useActivityFilters();

  // Local state đồng bộ với URL ban đầu
  const [localFilters, setLocalFilters] = useState({
    action: filters?.actions || "",
    source_type: filters?.sourceTypes || "",
    startDate: filters?.from ? filters.from.split('T')[0] : "",
    endDate: filters?.to ? filters.to.split('T')[0] : ""
  });

  // Đồng bộ localFilters khi URL thay đổi (back/forward)
  useEffect(() => {
    setLocalFilters({
      action: filters?.actions || "",
      source_type: filters?.sourceTypes || "",
      startDate: filters?.from ? filters.from.split('T')[0] : "",
      endDate: filters?.to ? filters.to.split('T')[0] : ""
    });
  }, [filters.actions, filters.sourceTypes, filters.from, filters.to]);

  const handleApplyFilter = (e) => {
    e.preventDefault();
    const formattedFilters = {
      sourceTypes: localFilters.source_type || undefined,
      actions: localFilters.action || undefined,
      from: undefined,
      to: undefined
    };

    if (localFilters.startDate) {
      formattedFilters.from = new Date(`${localFilters.startDate}T00:00:00Z`).toISOString();
    }
    if (localFilters.endDate) {
      formattedFilters.to = new Date(`${localFilters.endDate}T23:59:59.999Z`).toISOString();
    }

    setFilters(formattedFilters);
  };

  const handleClearFilter = () => {
    const emptyFilters = { action: "", source_type: "", startDate: "", endDate: "" };
    setLocalFilters(emptyFilters);
    setFilters({});
  };

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/30 p-5 mb-8 transition-all duration-200">
      <div className="flex flex-col lg:flex-row lg:items-end gap-4">
        {/* Phạm vi */}
        <div className="flex-1 min-w-[140px]">
          <label className="block text-xs font-semibold text-slate-500 mb-1.5 tracking-wide">
            Phạm vi
          </label>
          <select
            value={localFilters.source_type}
            onChange={(e) => setLocalFilters({ ...localFilters, source_type: e.target.value })}
            className="w-full text-sm p-2.5 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all duration-200"
          >
            <option value="">Tất cả</option>
            <option value="PROJECT">📁 Project</option>
            <option value="BOARD">📌 Board</option>
            <option value="TASK">✅ Task</option>
            <option value="USER">👤 User</option>
          </select>
        </div>

        {/* Hành động */}
        <div className="flex-1 min-w-[140px]">
          <label className="block text-xs font-semibold text-slate-500 mb-1.5 tracking-wide">
            Hành động
          </label>
          <select
            value={localFilters.action}
            onChange={(e) => setLocalFilters({ ...localFilters, action: e.target.value })}
            className="w-full text-sm p-2.5 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all duration-200"
          >
            <option value="">Tất cả</option>
            <option value="CREATE">✨ Tạo mới</option>
            <option value="UPDATE">✏️ Cập nhật</option>
            <option value="DELETE">🗑️ Xóa</option>
            <option value="ADD_MEMBER">👥 Thêm thành viên</option>
            <option value="MOVE_STATUS">🔄 Chuyển trạng thái</option>
          </select>
        </div>

        {/* Từ ngày */}
        <div className="flex-1 min-w-[150px]">
          <label className="block text-xs font-semibold text-slate-500 mb-1.5 tracking-wide flex items-center gap-1">
            <CalendarDaysIcon className="w-3.5 h-3.5" />
            Từ ngày
          </label>
          <input
            type="date"
            value={localFilters.startDate}
            onChange={(e) => setLocalFilters({ ...localFilters, startDate: e.target.value })}
            className="w-full text-sm p-2.5 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all duration-200 text-slate-700"
            placeholder="dd/mm/yyyy"
          />
        </div>

        {/* Đến ngày */}
        <div className="flex-1 min-w-[150px]">
          <label className="block text-xs font-semibold text-slate-500 mb-1.5 tracking-wide flex items-center gap-1">
            <ClockIcon className="w-3.5 h-3.5" />
            Đến ngày
          </label>
          <input
            type="date"
            value={localFilters.endDate}
            onChange={(e) => setLocalFilters({ ...localFilters, endDate: e.target.value })}
            className="w-full text-sm p-2.5 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all duration-200 text-slate-700"
          />
        </div>

        {/* Nút hành động */}
        <div className="flex gap-3 lg:w-auto w-full">
          <button
            type="button"
            onClick={handleApplyFilter}
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
            <ArrowPathIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ActivityFilterBar;