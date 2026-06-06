import React, { useState, useEffect } from "react";
import {
  X,
  KanbanSquare,
  Loader2,
  Sparkles,
  LayoutTemplate,
} from "lucide-react";
import { useCreateBoard } from "../hooks/useWorkspaceQueries";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import axiosClient from "../../../lib/axiosClient";

interface CreateBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string | null;
  onSuccess?: () => void;
}

type BoardMode = "standard" | "ai";

const normalizeRoleName = (value?: string | null) => {
  if (!value) return "";

  return String(value)
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");
};

const getCurrentUser = () => {
  if (typeof window === "undefined") return null;

  try {
    const rawUser = localStorage.getItem("user");
    return rawUser ? JSON.parse(rawUser) : null;
  } catch {
    return null;
  }
};

const getUserId = (user: any) => {
  return String(user?.user_id || user?.id || user?._id || "");
};

const getRoleName = (user: any) => {
  if (!user) return "";

  const directRole =
    user.role_name ||
    user.roleName ||
    user.system_role ||
    user.systemRole ||
    user.role ||
    user.role_code ||
    user.roleCode;

  if (directRole) {
    return normalizeRoleName(directRole);
  }

  if (user.role_id && typeof user.role_id === "object") {
    return normalizeRoleName(user.role_id.name || user.role_id.code);
  }

  if (Array.isArray(user.system_role_ids)) {
    const matched = user.system_role_ids.find((item: any) => {
      return normalizeRoleName(item) === "SYSTEM_ADMIN";
    });

    if (matched) return "SYSTEM_ADMIN";
  }

  return "";
};

const isCurrentUserSystemAdmin = () => {
  return getRoleName(getCurrentUser()) === "SYSTEM_ADMIN";
};

const isSystemAdminUser = (user: any) => {
  return getRoleName(user) === "SYSTEM_ADMIN";
};

const shouldExposeUser = (candidate: any) => {
  if (!candidate) return false;

  if (!isSystemAdminUser(candidate)) {
    return true;
  }

  const currentUser = getCurrentUser();

  return (
    isCurrentUserSystemAdmin() &&
    getUserId(currentUser) === getUserId(candidate)
  );
};

const getMemberUser = (member: any) => {
  if (member?.user_id && typeof member.user_id === "object") {
    return member.user_id;
  }

  if (member?.user && typeof member.user === "object") {
    return member.user;
  }

  return member;
};

const extractList = (response: any) => {
  const payload =
    response?.data?.data?.content ??
    response?.data?.content ??
    response?.data?.data ??
    response?.data ??
    response?.content ??
    response;

  return Array.isArray(payload) ? payload : [];
};

const getUserVisibilityParams = () => {
  const currentUser = getCurrentUser();

  return {
    exclude_system_admin: true,
    include_current_system_admin: isCurrentUserSystemAdmin(),
    current_user_id: getUserId(currentUser) || undefined,
  };
};

const CreateBoardModal: React.FC<CreateBoardModalProps> = ({
  isOpen,
  onClose,
  projectId,
  onSuccess,
}) => {
  const { mutate: createBoard, isPending } = useCreateBoard();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [mode, setMode] = useState<BoardMode>("standard");

  const { data: projectMembers = [], isLoading: isLoadingMembers } = useQuery({
    queryKey: ["project-members-for-ai", projectId],
    queryFn: async () => {
      const response: any = await axiosClient.get(
        `/projects/${projectId}/members`,
        {
          params: getUserVisibilityParams(),
        },
      );

      return extractList(response).filter((member: any) => {
        return shouldExposeUser(getMemberUser(member));
      });
    },
    enabled: isOpen && !!projectId && mode === "ai",
  });

  useEffect(() => {
    if (isOpen) {
      setName("");
      setMode("standard");
    }
  }, [isOpen]);

  if (!isOpen || !projectId) return null;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (mode === "standard") {
      if (!name.trim()) return;

      createBoard(
        {
          project_id: projectId,
          name: name.trim(),
        } as any,
        {
          onSuccess: () => {
            onClose();

            if (onSuccess) {
              onSuccess();
            }
          },
          onError: (err: any) => {
            alert(
              `Lỗi: ${
                err.response?.data?.message ||
                err.response?.data?.error?.message ||
                "Có lỗi xảy ra"
              }`,
            );
          },
        },
      );

      return;
    }

    onClose();

    navigate("/aigenerateboard", {
      state: {
        projectId,
        members: projectMembers,
      },
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[110] p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95">
        {}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <KanbanSquare size={20} className="text-indigo-600" />
            Khởi tạo Bảng công việc
          </h2>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-rose-500 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-6">
            {}
            <div className="grid grid-cols-2 gap-3">
              <div
                onClick={() => setMode("standard")}
                className={`cursor-pointer p-4 rounded-xl border-2 transition-all flex flex-col items-center text-center gap-2 ${
                  mode === "standard"
                    ? "border-indigo-600 bg-indigo-50/50 shadow-sm"
                    : "border-slate-100 hover:border-indigo-200 hover:bg-slate-50 text-slate-500"
                }`}
              >
                <div
                  className={`p-2 rounded-lg ${
                    mode === "standard"
                      ? "bg-indigo-100 text-indigo-700"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  <LayoutTemplate size={24} />
                </div>

                <div>
                  <h3
                    className={`text-sm font-bold ${
                      mode === "standard" ? "text-indigo-900" : "text-slate-700"
                    }`}
                  >
                    Bảng Tiêu Chuẩn
                  </h3>

                  <p className="text-[11px] mt-1 opacity-70">
                    Tự tạo cột và quản lý thủ công
                  </p>
                </div>
              </div>

              <div
                onClick={() => setMode("ai")}
                className={`cursor-pointer p-4 rounded-xl border-2 transition-all flex flex-col items-center text-center gap-2 ${
                  mode === "ai"
                    ? "border-violet-600 bg-violet-50/50 shadow-sm"
                    : "border-slate-100 hover:border-violet-200 hover:bg-slate-50 text-slate-500"
                }`}
              >
                <div
                  className={`p-2 rounded-lg ${
                    mode === "ai"
                      ? "bg-violet-100 text-violet-700"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  <Sparkles size={24} />
                </div>

                <div>
                  <h3
                    className={`text-sm font-bold flex items-center justify-center gap-1.5 ${
                      mode === "ai" ? "text-violet-900" : "text-slate-700"
                    }`}
                  >
                    AI Board
                    <span className="px-1.5 py-0.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-[9px] rounded-full uppercase tracking-wider">
                      Mới
                    </span>
                  </h3>

                  <p className="text-[11px] mt-1 opacity-70">
                    Phân rã task tự động bằng AI
                  </p>
                </div>
              </div>
            </div>

            {}
            <div className="min-h-[70px]">
              {mode === "standard" ? (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-200">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
                    Tên Bảng *
                  </label>

                  <input
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="VD: Sprint Planning, Backend Tasks..."
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 transition-all font-medium"
                    required
                    autoFocus
                  />
                </div>
              ) : (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-200 bg-violet-50 border border-violet-100 rounded-xl p-4 flex items-start gap-3">
                  <div className="bg-violet-200/50 p-2 rounded-lg text-violet-700 shrink-0">
                    <Sparkles size={16} />
                  </div>

                  <div className="text-sm text-violet-800">
                    <p className="font-semibold mb-1">Cấu hình AI Generator</p>

                    <p className="text-xs opacity-80 leading-relaxed">
                      Hệ thống sẽ lấy tự động dữ liệu Workspace và chuẩn bị danh
                      sách{" "}
                      <b>
                        {isLoadingMembers ? "..." : projectMembers.length} thành
                        viên
                      </b>{" "}
                      để chuyển sang cấu hình với trợ lý AI. SYSTEM_ADMIN đã
                      được ẩn khỏi danh sách này.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {}
          <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-lg text-sm font-bold text-slate-500 hover:bg-slate-100"
            >
              Hủy
            </button>

            {mode === "standard" ? (
              <button
                type="submit"
                disabled={isPending || !name.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all disabled:opacity-50"
              >
                {isPending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  "Tạo Bảng"
                )}
              </button>
            ) : (
              <button
                type="submit"
                disabled={isLoadingMembers}
                className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white px-6 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-md shadow-violet-200 disabled:opacity-50"
              >
                {isLoadingMembers ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Sparkles size={16} />
                )}
                Tiếp tục với AI
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateBoardModal;
