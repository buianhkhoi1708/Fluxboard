import React, { useEffect, startTransition } from "react";
import { useActivityFilters } from "../features/activity/hooks/useActivityFilters";
import { useInfiniteAdminLogs } from "../features/activity/api/useInfiniteAdminLogs";
import { useUserStore } from "../features/user/store/useUserStore";
import ActivityFilterBar from "../features/activity/components/ActivityFilterBar";
import { Clock, RefreshCw, Activity, Loader2 } from "lucide-react";

const SOURCE_TYPE_STYLES: Record<string, string> = {
  PROJECT: "bg-gradient-to-r from-emerald-50 to-emerald-100 text-emerald-700 border-emerald-200/80",
  BOARD: "bg-gradient-to-r from-indigo-50 to-indigo-100 text-indigo-700 border-indigo-200/80",
  TASK: "bg-gradient-to-r from-amber-50 to-amber-100 text-amber-700 border-amber-200/80",
  USER: "bg-gradient-to-r from-sky-50 to-sky-100 text-sky-700 border-sky-200/80",
  SYSTEM: "bg-gradient-to-r from-rose-50 to-rose-100 text-rose-700 border-rose-200/80",
};

const ACTION_STYLES: Record<string, string> = {
  CREATE: "text-emerald-600 font-semibold",
  UPDATE: "text-amber-600 font-semibold",
  DELETE: "text-rose-600 font-semibold",
  MOVE: "text-indigo-600 font-semibold",
};

const ActivityLogSkeleton = () => (
  <div className="space-y-4 animate-pulse">
    <div className="h-8 w-48 bg-slate-200 rounded-xl" />
    <div className="h-12 bg-slate-200 rounded-xl" />
    {[...Array(4)].map((_, i) => (
      <div key={i} className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/80 p-5 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-slate-200 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="flex gap-2">
              <div className="h-4 w-24 bg-slate-200 rounded-md" />
              <div className="h-4 w-16 bg-slate-200 rounded-md" />
            </div>
            <div className="h-4 w-3/4 bg-slate-200 rounded-md" />
            <div className="h-3 w-1/4 bg-slate-200 rounded-md" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

const ActivityLogPage = () => {
  const [filters] = useActivityFilters();
  const {
    data,
    isLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteAdminLogs(filters);
  const { userDictionary, fetchAllSystemUsers } = useUserStore();

  useEffect(() => {
    if (!userDictionary || Object.keys(userDictionary || {}).length === 0) {
      startTransition(() => {
        fetchAllSystemUsers();
      });
    }
  }, [fetchAllSystemUsers, userDictionary]);

  const getRelativeTime = (dateString?: string) => {
    if (!dateString) return "Không rõ thời gian";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Vừa xong";
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;
    return date.toLocaleDateString("vi-VN", { day: "numeric", month: "short" });
  };

  const formatMessage = (message?: string) => {
    if (!message) return "";
    const objectIdRegex = /[0-9a-fA-F]{24}/g;
    return message.replace(objectIdRegex, (match) => {
      return userDictionary?.[match]?.full_name || match;
    });
  };

  const isEmpty = !data || data.pages?.[0]?.data?.length === 0;

  return (
    <div className="flex-1 bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 h-full overflow-y-auto no-scrollbar p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header đồng bộ WorkspacesPage */}
   

         <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight flex items-center gap-3 text-slate-800">
              <div className="p-2 bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-indigo-100">
            <Activity className="text-indigo-600" size={20} />

              </div>
              Nhật ký hoạt động
            </h1>
            <p className="text-sm font-medium text-slate-500 pl-12">
              Nhật ký hoạt động theo thời gian thực.
            </p>
          </div>
        </div>

        {/* FILTER BAR */}
        <div className="mb-6">
          <ActivityFilterBar />
        </div>

        {/* CONTENT */}
        {isLoading ? (
          <ActivityLogSkeleton />
        ) : isEmpty ? (
          <div className="bg-white/80 backdrop-blur-sm border border-dashed border-indigo-200 rounded-2xl p-16 flex flex-col items-center justify-center text-center shadow-sm">
            <div className="p-5 bg-indigo-50 rounded-full mb-5">
              <Activity size={56} className="text-indigo-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Không có bản ghi nào</h3>
            <p className="text-slate-500 text-sm max-w-md">
              Không tìm thấy hoạt động nào phù hợp với bộ lọc.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {data?.pages?.map((page, pageIndex) => (
              <React.Fragment key={pageIndex}>
                {page?.data?.map((log: any) => {
                  const sourceStyle =
                    SOURCE_TYPE_STYLES[log?.source_type] ||
                    "bg-slate-100 text-slate-700 border-slate-200/80";
                  const actionStyle =
                    ACTION_STYLES[log?.action] || "text-slate-600 font-medium";

                  return (
                    <div
                      key={log?.id || Math.random()}
                      className="group bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:shadow-indigo-100/20 hover:border-indigo-300 transition-all duration-200 hover:-translate-y-0.5"
                    >
                      <div className="p-5">
                        <div className="flex items-start gap-4">
                          <div className="relative flex-shrink-0">
                            {log?.actor?.avatar_url ? (
                              <img
                                loading="lazy"
                                src={log.actor.avatar_url}
                                alt={log.actor.full_name || "User"}
                                className="w-10 h-10 rounded-full object-cover ring-2 ring-white shadow-sm"
                                onError={(e: any) => {
                                  e.target.style.display = "none";
                                  const fallback = e.target.nextSibling;
                                  if (fallback) fallback.style.display = "flex";
                                }}
                              />
                            ) : null}
                            <div
                              className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold shadow-sm"
                              style={{
                                display: log?.actor?.avatar_url ? "none" : "flex",
                              }}
                            >
                              {(log?.actor?.full_name || "S").charAt(0).toUpperCase()}
                            </div>
                          </div>

                          <div className="flex-1 min-w-0 space-y-1.5">
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                              <span className="font-semibold text-slate-800 text-sm">
                                {log?.actor?.full_name || "Hệ thống"}
                              </span>
                              <span
                                className={`text-[11px] font-bold px-2 py-0.5 rounded-md border tracking-wide uppercase shadow-sm ${sourceStyle}`}
                              >
                                {log?.source_type || "UNKNOWN"}
                              </span>
                              <span className="text-xs text-slate-400 flex items-center gap-1 ml-auto">
                                <Clock className="w-3.5 h-3.5 stroke-[1.5]" />
                                {getRelativeTime(log?.created_at)}
                              </span>
                            </div>

                            <p className="text-slate-700 text-sm leading-relaxed break-words bg-slate-50/80 p-2 rounded-lg">
                              <span className={`text-xs uppercase mr-1 tracking-wider ${actionStyle}`}>
                                [{log?.action || "LOG"}]
                              </span>{" "}
                              {formatMessage(log?.message)}
                            </p>

                            <div className="text-[11px] text-slate-400 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {log?.created_at
                                ? new Date(log.created_at).toLocaleString("vi-VN", {
                                    dateStyle: "medium",
                                    timeStyle: "short",
                                  })
                                : ""}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </React.Fragment>
            ))}

            {hasNextPage && (
              <div className="flex justify-center mt-8 pt-2">
                <button
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white disabled:from-slate-400 disabled:to-slate-500 text-sm font-bold rounded-xl shadow-lg shadow-indigo-200/50 transition-all duration-200 active:scale-95 disabled:pointer-events-none disabled:shadow-none"
                >
                  {isFetchingNextPage ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang tải thêm...</span>
                    </>
                  ) : (
                    <>
                      <span>Xem thêm hoạt động cũ</span>
                      <RefreshCw className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityLogPage;