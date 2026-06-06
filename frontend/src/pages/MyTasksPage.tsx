import React from "react";
import { useNavigate } from "react-router-dom";
import { useGetMyTasks } from "../features/tasks/hooks/useTaskQueries";
import {
  Clock,
  AlertCircle,
  Sparkles,
  CheckCircle2,
  RefreshCw,
  Timer,
  Flame,
  CircleDotDashed,
} from "lucide-react";

type TaskViewState = "IN_PROGRESS" | "COMPLETED" | "OVERDUE";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const TaskCardSkeleton = () => (
  <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-slate-200/80 shadow-sm p-5 flex flex-col animate-pulse">
    <div className="flex justify-between items-start mb-3">
      <div className="h-5 w-16 bg-slate-200 rounded-full" />
      <div className="h-5 w-24 bg-slate-200 rounded-md" />
    </div>

    <div className="space-y-2 mb-4">
      <div className="h-5 w-3/4 bg-slate-200 rounded-md" />
      <div className="h-4 w-full bg-slate-200 rounded-md" />
      <div className="h-4 w-2/3 bg-slate-200 rounded-md" />
    </div>

    <div className="space-y-2 mt-auto pt-4 border-t border-slate-100">
      <div className="h-4 w-32 bg-slate-200 rounded-md" />
      <div className="h-4 w-28 bg-slate-200 rounded-md" />
    </div>
  </div>
);

const isTaskCompleted = (task: any) => {
  return (
    task?.is_done === true ||
    String(task?.status || "").toUpperCase() === "DONE" ||
    Boolean(task?.completed_at)
  );
};

const getDueDateValue = (task: any) => {
  return task?.deadline_info?.due_date || task?.due_date || null;
};

const getTaskViewState = (task: any): TaskViewState => {
  if (isTaskCompleted(task)) {
    return "COMPLETED";
  }

  const dueDateValue = getDueDateValue(task);

  if (dueDateValue) {
    const dueDate = new Date(dueDateValue);

    if (!Number.isNaN(dueDate.getTime()) && dueDate.getTime() < Date.now()) {
      return "OVERDUE";
    }
  }

  return "IN_PROGRESS";
};

const isNearDeadline = (task: any) => {
  if (isTaskCompleted(task)) return false;

  const dueDateValue = getDueDateValue(task);

  if (!dueDateValue) return false;

  const dueDate = new Date(dueDateValue);

  if (Number.isNaN(dueDate.getTime())) return false;

  const diff = dueDate.getTime() - Date.now();

  return diff > 0 && diff <= ONE_DAY_MS;
};

const getPriorityColor = (priority: string) => {
  switch (String(priority || "").toUpperCase()) {
    case "CRITICAL":
      return "bg-rose-100 text-rose-700 border-rose-200/80";
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

const getStateConfig = (state: TaskViewState) => {
  switch (state) {
    case "COMPLETED":
      return {
        label: "Đã hoàn thành",
        icon: CheckCircle2,
        badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
        cardClass:
          "border-emerald-200/80 hover:border-emerald-300 hover:shadow-emerald-100/40",
      };

    case "OVERDUE":
      return {
        label: "Trễ hạn",
        icon: Flame,
        badgeClass: "bg-rose-50 text-rose-700 border-rose-200 animate-pulse",
        cardClass:
          "border-rose-300 bg-rose-50/40 hover:border-rose-400 hover:shadow-rose-100/60",
      };

    case "IN_PROGRESS":
    default:
      return {
        label: "Đang thực hiện",
        icon: CircleDotDashed,
        badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200",
        cardClass:
          "border-slate-200/80 hover:border-indigo-300 hover:shadow-indigo-100/20",
      };
  }
};

const formatDate = (dateString: string) => {
  if (!dateString) return "Chưa cấu hình hạn";

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "Chưa cấu hình hạn";
  }

  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const getDeadlineTextClass = (task: any) => {
  const state = getTaskViewState(task);

  if (state === "OVERDUE") {
    return "text-rose-600 font-black animate-pulse";
  }

  if (isNearDeadline(task)) {
    return "text-red-500 font-black animate-pulse";
  }

  if (state === "COMPLETED") {
    return "text-emerald-600 font-semibold";
  }

  return "text-slate-600";
};

const getDeadlinePrefix = (task: any) => {
  const state = getTaskViewState(task);

  if (state === "OVERDUE") {
    return "Trễ hạn:";
  }

  if (isNearDeadline(task)) {
    return "Sắp hết hạn:";
  }

  return "Hạn chót:";
};

const MyTasksPage = () => {
  const navigate = useNavigate();
  const { data: myTasks, isLoading, isError, refetch } = useGetMyTasks();

  const tasks = Array.isArray(myTasks) ? myTasks : [];

  const counters = tasks.reduce(
    (acc, task) => {
      const state = getTaskViewState(task);

      if (state === "COMPLETED") acc.completed += 1;
      if (state === "OVERDUE") acc.overdue += 1;
      if (state === "IN_PROGRESS") acc.inProgress += 1;

      return acc;
    },
    {
      inProgress: 0,
      completed: 0,
      overdue: 0,
    },
  );

  return (
    <div className="flex-1 bg-linear-to-br from-slate-50 via-white to-indigo-50/30 h-full overflow-y-auto no-scrollbar p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {}
        <div className="mb-8 flex flex-col xl:flex-row xl:items-end xl:justify-between gap-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight flex items-center gap-3 text-slate-800">
              <div className="p-2 bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-indigo-100">
                <CheckCircle2 className="text-indigo-600" size={24} />
              </div>
              Công việc của tôi
            </h1>

            <p className="text-sm font-medium text-slate-500 pl-12 mt-1">
              {tasks.length
                ? `Hệ thống ghi nhận ${tasks.length} công việc được phân bổ cho tài khoản.`
                : "Quản lý các nhiệm vụ cá nhân của bạn."}
            </p>
          </div>

          {!isLoading && !isError && tasks.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-white/80 border border-indigo-100 rounded-2xl px-4 py-3 shadow-sm">
                <div className="flex items-center gap-2 text-indigo-700 font-black text-sm">
                  <CircleDotDashed size={16} />
                  Đang thực hiện
                </div>
                <p className="text-2xl font-black text-slate-800 mt-1">
                  {counters.inProgress}
                </p>
              </div>

              <div className="bg-white/80 border border-emerald-100 rounded-2xl px-4 py-3 shadow-sm">
                <div className="flex items-center gap-2 text-emerald-700 font-black text-sm">
                  <CheckCircle2 size={16} />
                  Đã hoàn thành
                </div>
                <p className="text-2xl font-black text-slate-800 mt-1">
                  {counters.completed}
                </p>
              </div>

              <div className="bg-white/80 border border-rose-100 rounded-2xl px-4 py-3 shadow-sm">
                <div className="flex items-center gap-2 text-rose-700 font-black text-sm">
                  <Flame size={16} />
                  Trễ hạn
                </div>
                <p className="text-2xl font-black text-rose-600 mt-1">
                  {counters.overdue}
                </p>
              </div>
            </div>
          )}
        </div>

        {}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, index) => (
              <TaskCardSkeleton key={index} />
            ))}
          </div>
        )}

        {}
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
              type="button"
              onClick={() => refetch()}
              className="flex items-center gap-2 bg-linear-to-br from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-indigo-200/50 transition-all duration-200 active:scale-95"
            >
              <RefreshCw size={18} strokeWidth={2.5} />
              <span>Tải lại</span>
            </button>
          </div>
        )}

        {}
        {!isLoading && !isError && tasks.length === 0 && (
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

        {}
        {!isLoading && !isError && tasks.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tasks.map((task: any) => {
              const taskId = task._id || task.id;
              const boardId = task.board_id?._id || task.board_id;
              const dueDateValue = getDueDateValue(task);
              const state = getTaskViewState(task);
              const stateConfig = getStateConfig(state);
              const StateIcon = stateConfig.icon;
              const nearDeadline = isNearDeadline(task);

              return (
                <div
                  key={taskId}
                  onClick={() => {
                    if (boardId) {
                      navigate(`/board/${boardId}?taskId=${taskId}`);
                    } else {
                      console.warn(`Task ${taskId} không tìm thấy board_id.`);
                    }
                  }}
                  className={`bg-white/80 backdrop-blur-sm rounded-xl border shadow-sm hover:shadow-md hover:-translate-y-0.5 cursor-pointer transition-all duration-200 p-5 flex flex-col group ${stateConfig.cardClass}`}
                >
                  {}
                  <div className="flex justify-between items-start mb-3 gap-3">
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${getPriorityColor(task.priority)}`}
                    >
                      {task.priority || "MEDIUM"}
                    </span>

                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-black px-2.5 py-1 rounded-md border uppercase tracking-wide ${stateConfig.badgeClass}`}
                    >
                      <StateIcon size={13} />
                      {stateConfig.label}
                    </span>
                  </div>

                  {}
                  <h3 className="text-lg font-bold text-slate-800 mb-2 line-clamp-2 leading-snug group-hover:text-indigo-700 transition-colors">
                    {task.title}
                  </h3>

                  {task.description && (
                    <p className="text-sm text-slate-500 line-clamp-2 mb-4 grow">
                      {task.description}
                    </p>
                  )}

                  {}
                  <div className="space-y-2 mt-auto pt-4 border-t border-slate-100">
                    {task.ai_suggested_point ? (
                      <div className="flex items-center text-sm text-indigo-600 font-medium bg-indigo-50 w-fit px-2 py-1 rounded-md">
                        <Sparkles className="w-4 h-4 mr-1.5" />
                        AI ước tính: {task.ai_suggested_point} Point
                      </div>
                    ) : null}

                    <div className="flex items-center text-sm">
                      {state === "OVERDUE" ? (
                        <Flame className="w-4 h-4 mr-2 text-rose-500 animate-pulse" />
                      ) : nearDeadline ? (
                        <Timer className="w-4 h-4 mr-2 text-red-500 animate-pulse" />
                      ) : (
                        <Clock className="w-4 h-4 mr-2 text-slate-400" />
                      )}

                      <span className={getDeadlineTextClass(task)}>
                        {getDeadlinePrefix(task)} {formatDate(dueDateValue)}
                      </span>
                    </div>

                    {nearDeadline && (
                      <div className="text-xs font-bold text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2 animate-pulse">
                        Cảnh báo: công việc này còn dưới 24 giờ đến hạn.
                      </div>
                    )}

                    {state === "OVERDUE" && (
                      <div className="text-xs font-black text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2 animate-pulse">
                        Công việc đã trễ hạn. Cần xử lý ngay.
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyTasksPage;
