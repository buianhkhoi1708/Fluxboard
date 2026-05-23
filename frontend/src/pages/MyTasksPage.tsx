import React from "react";
import { useNavigate } from "react-router-dom";
import { useGetMyTasks } from "../features/tasks/hooks/useTaskQueries";
import {
  Calendar,
  Clock,
  AlertCircle,
  Sparkles,
  CheckCircle2,
  User,
  RefreshCw,
  Loader2,
} from "lucide-react";

// ------- Task Card Skeleton -------
const TaskCardSkeleton = () => (
  <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-slate-200/80 shadow-sm p-5 flex flex-col animate-pulse">
    <div className="flex justify-between items-start mb-3">
      <div className="h-5 w-16 bg-slate-200 rounded-full" />
      <div className="h-5 w-16 bg-slate-200 rounded-md" />
    </div>
    <div className="space-y-2 mb-4">
      <div className="h-5 w-3/4 bg-slate-200 rounded-md" />
      <div className="h-4 w-full bg-slate-200 rounded-md" />
      <div className="h-4 w-2/3 bg-slate-200 rounded-md" />
    </div>
    <div className="space-y-2 mt-auto pt-4 border-t border-slate-100">
      <div className="h-4 w-28 bg-slate-200 rounded-md" />
      <div className="h-4 w-32 bg-slate-200 rounded-md" />
      <div className="flex items-center gap-2 pt-2">
        <div className="w-6 h-6 bg-slate-200 rounded-full" />
        <div className="h-4 w-24 bg-slate-200 rounded-md" />
      </div>
    </div>
  </div>
);

// ------- Main Component -------
const MyTasksPage = () => {
  const navigate = useNavigate();
  const { data: myTasks, isLoading, isError, refetch } = useGetMyTasks();

  // Màu priority
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "HIGH":
        return "bg-red-100 text-red-700 border-red-200/80";
      case "MEDIUM":
        return "bg-orange-100 text-orange-700 border-orange-200/80";
      case "LOW":
        return "bg-green-100 text-green-700 border-green-200/80";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200/80";
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "Chưa cấu hình hạn";
    return new Date(dateString).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const isOverdue = (dateString: string) => {
    if (!dateString) return false;
    return new Date(dateString) < new Date();
  };

  return (
    <div className="flex-1 bg-linear-to-br from-slate-50 via-white to-indigo-50/30 h-full overflow-y-auto no-scrollbar p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* HEADER */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight flex items-center gap-3 text-slate-800">
              <div className="p-2 bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-indigo-100">
                <CheckCircle2 className="text-indigo-600" size={24} />
              </div>
              Công việc của tôi
            </h1>
            <p className="text-sm font-medium text-slate-500 pl-12 mt-1">
              {myTasks?.length
                ? `Hệ thống ghi nhận ${myTasks.length} công việc được phân bổ cho tài khoản.`
                : "Quản lý các nhiệm vụ cá nhân của bạn."}
            </p>
          </div>
        </div>

        {/* LOADING SKELETON */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <TaskCardSkeleton key={i} />
            ))}
          </div>
        )}

        {/* ERROR STATE */}
        {isError && !isLoading && (
          <div className="bg-white/80 backdrop-blur-sm border border-dashed border-red-200 rounded-2xl p-16 flex flex-col items-center justify-center text-center shadow-sm">
            <div className="p-5 bg-red-50 rounded-full mb-5">
              <AlertCircle size={56} className="text-red-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">
              Tải dữ liệu thất bại
            </h3>
            <p className="text-slate-500 text-sm mb-6 max-w-md">
              Có lỗi xảy ra khi tải công việc. Vui lòng thử lại.
            </p>
            <button
              onClick={() => refetch()}
              className="flex items-center gap-2 bg-linear-to-br from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-indigo-200/50 transition-all duration-200 active:scale-95"
            >
              <RefreshCw size={18} strokeWidth={2.5} />
              <span>Tải lại</span>
            </button>
          </div>
        )}

        {/* EMPTY STATE */}
        {!isLoading && !isError && myTasks?.length === 0 && (
          <div className="bg-white/80 backdrop-blur-sm border border-dashed border-indigo-200 rounded-2xl p-16 flex flex-col items-center justify-center text-center shadow-sm">
            <div className="p-5 bg-indigo-50 rounded-full mb-5 animate-bounce-slow">
              <CheckCircle2 size={56} className="text-emerald-500" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">
              Tuyệt vời!
            </h3>
            <p className="text-slate-500 text-sm max-w-md">
              Không còn đầu việc nào cần xử lý vào lúc này.
            </p>
          </div>
        )}

        {/* TASKS GRID */}
        {!isLoading && !isError && myTasks && myTasks.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {myTasks.map((task: any) => (
              <div
                key={task._id || task.id}
                onClick={() => {
                  const taskId = task._id || task.id;
                  // Lấy ID chuẩn xác dù nó là object (sau khi populate) hay chuỗi
                  const boardId = task.board_id?._id || task.board_id;

                  if (boardId) {
                    navigate(`/board/${boardId}?taskId=${taskId}`);
                  } else {
                    console.warn(`Task ${taskId} không tìm thấy board_id.`);
                  }
                }}
                className="bg-white/80 backdrop-blur-sm rounded-xl border border-slate-200/80 shadow-sm hover:shadow-md hover:shadow-indigo-100/20 hover:border-indigo-300 hover:-translate-y-0.5 cursor-pointer transition-all duration-200 p-5 flex flex-col group"
              >
                {/* Priority & Status */}
                <div className="flex justify-between items-start mb-3">
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${getPriorityColor(task.priority)}`}
                  >
                    {task.priority || "MEDIUM"}
                  </span>
                  <span className="text-xs font-medium bg-slate-100/80 text-slate-600 px-2.5 py-1 rounded-md border border-slate-200/60">
                    {task.status}
                  </span>
                </div>

                {/* Title & Description */}
                <h3 className="text-lg font-bold text-slate-800 mb-2 line-clamp-2 leading-snug group-hover:text-indigo-700 transition-colors">
                  {task.title}
                </h3>
                {task.description && (
                  <p className="text-sm text-slate-500 line-clamp-2 mb-4 grow">
                    {task.description}
                  </p>
                )}

                {/* Footer info */}
                <div className="space-y-2 mt-auto pt-4 border-t border-slate-100">
                  {task.ai_suggested_point && (
                    <div className="flex items-center text-sm text-indigo-600 font-medium bg-indigo-50 w-fit px-2 py-1 rounded-md">
                      <Sparkles className="w-4 h-4 mr-1.5" />
                      AI ước tính: {task.ai_suggested_point} Point
                    </div>
                  )}

                  <div className="flex items-center text-sm text-slate-600">
                    <Clock className="w-4 h-4 mr-2 text-slate-400" />
                    <span
                      className={
                        isOverdue(task.due_date)
                          ? "text-red-500 font-semibold"
                          : ""
                      }
                    >
                      Hạn chót: {formatDate(task.due_date)}
                    </span>
                  </div>

                 
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyTasksPage;
