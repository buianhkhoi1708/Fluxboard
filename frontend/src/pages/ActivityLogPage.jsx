// ActivityLogPage.jsx
import React, { useEffect } from "react";
import { useActivityStore } from "../features/activity/store/useActivityStore";
import {
  ClockIcon,
  UserCircleIcon,
  EllipsisHorizontalIcon,
} from "@heroicons/react/24/outline";

const ActivityLogPage = () => {
  const { activities, fetchAdminLogs, loading } = useActivityStore();

  useEffect(() => {
    fetchAdminLogs();
  }, []);

  const getRelativeTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Vừa xong";
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;
    return date.toLocaleDateString("vi-VN");
  };

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 bg-gray-200 rounded"></div>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                <div className="h-4 w-32 bg-gray-200 rounded"></div>
              </div>
              <div className="h-4 w-full bg-gray-200 rounded"></div>
              <div className="h-3 w-24 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
              Nhật ký hoạt động
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Theo dõi mọi thay đổi và hành động trong hệ thống
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <ClockIcon className="w-4 h-4" />
            <span>Cập nhật theo thời gian thực</span>
          </div>
        </div>

        {/* Danh sách logs với thanh cuộn */}
        {activities?.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl shadow-sm border border-gray-100">
            <UserCircleIcon className="w-16 h-16 mx-auto text-gray-300" />
            <p className="mt-4 text-gray-500">Chưa có hoạt động nào</p>
          </div>
        ) : (
          <div className="max-h-[calc(100vh-240px)] overflow-y-auto pr-2 custom-scrollbar">
            <div className="space-y-4">
              {activities?.map((log) => (
                <div
                  key={log.id}
                  className="group bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100 hover:border-gray-200"
                >
                  <div className="p-5">
                    <div className="flex items-start gap-4">
                      {/* Avatar */}
                      <div className="flex-shrink-0">
                        {log.actor?.avatar_url ? (
                          <img
                            src={log.actor.avatar_url}
                            alt={log.actor.full_name}
                            className="w-10 h-10 rounded-full object-cover ring-2 ring-white shadow-sm"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold shadow-sm">
                            {log.actor?.full_name?.charAt(0) || "A"}
                          </div>
                        )}
                      </div>

                      {/* Nội dung */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-baseline gap-2 mb-1">
                          <span className="font-semibold text-gray-900">
                            {log.actor?.full_name || "Hệ thống"}
                          </span>
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <ClockIcon className="w-3 h-3" />
                            {getRelativeTime(log.created_at)}
                          </span>
                        </div>
                        <p className="text-gray-600 text-sm leading-relaxed">
                          {log.message}
                        </p>
                        <div className="mt-2 text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          {new Date(log.created_at).toLocaleString("vi-VN")}
                        </div>
                      </div>

                      <button className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-gray-400 hover:text-gray-600">
                        <EllipsisHorizontalIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Tuỳ chỉnh scrollbar (global hoặc trong component) */}
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </div>
  );
};

export default ActivityLogPage;