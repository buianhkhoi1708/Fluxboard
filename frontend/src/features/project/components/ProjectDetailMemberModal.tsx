import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  UserPlus,
  Shield,
  CheckCircle2,
  Loader2,
  Sparkles,
  AlertCircle,
  Fingerprint,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import axiosClient from "../../../lib/axiosClient";
import {
  useAddProjectMember,
  useUpdateProjectMember,
} from "../hooks/useProjectQueries";

const ALLOWED_PROJECT_ROLES = ["PM", "LEAD", "MEMBER", "VIEWER"];

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

const isSystemAdminUser = (user: any) => {
  return getRoleName(user) === "SYSTEM_ADMIN";
};

const isCurrentUserSystemAdmin = () => {
  return getRoleName(getCurrentUser()) === "SYSTEM_ADMIN";
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

const getUserVisibilityParams = () => {
  const currentUser = getCurrentUser();

  return {
    size: 100,
    include_role: true,
    include_session: true,
    exclude_system_admin: true,
    include_current_system_admin: isCurrentUserSystemAdmin(),
    current_user_id: getUserId(currentUser) || undefined,
  };
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

const ProjectDetailMemberModal = ({
  isOpen,
  onClose,
  projectId,
  editMember,
}: any) => {
  const { mutateAsync: addMember, isPending: isAdding } =
    useAddProjectMember(projectId);

  const { mutateAsync: updateMember, isPending: isUpdating } =
    useUpdateProjectMember(projectId);

  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [isActive, setIsActive] = useState(true);

  const { data: systemUsers = [], isLoading: isUsersLoading } = useQuery({
    queryKey: ["all-system-users", "assignable", projectId],
    queryFn: async () => {
      const response: any = await axiosClient.get("/users", {
        params: getUserVisibilityParams(),
      });

      return extractList(response).filter(shouldExposeUser);
    },
    enabled: isOpen,
  });

  const { data: systemRoles = [], isLoading: isRolesLoading } = useQuery({
    queryKey: ["filtered-project-roles"],
    queryFn: async () => {
      const response: any = await axiosClient.get("/rbac/roles", {
        params: {
          size: 100,
        },
      });

      const rawRoles = extractList(response);

      return rawRoles.filter((role: any) => {
        return ALLOWED_PROJECT_ROLES.includes(
          String(role.name || role.code || "").toUpperCase(),
        );
      });
    },
    enabled: isOpen,
  });

  useEffect(() => {
    if (!isOpen) return;

    if (editMember) {
      let safeUserId = "";

      if (typeof editMember.user_id === "string") {
        safeUserId = editMember.user_id;
      } else if (typeof editMember.userId === "string") {
        safeUserId = editMember.userId;
      } else if (editMember.user_id?._id || editMember.user_id?.id) {
        safeUserId = editMember.user_id._id || editMember.user_id.id;
      } else if (editMember.user?._id || editMember.user?.id) {
        safeUserId = editMember.user._id || editMember.user.id;
      } else {
        safeUserId = editMember._id || editMember.id || "";
      }

      const roles = editMember.roleIds || editMember.role_ids || [];
      const firstRole = roles[0];

      const safeRoleId = firstRole
        ? typeof firstRole === "string"
          ? firstRole
          : firstRole._id || firstRole.id
        : "";

      const safeIsActive =
        editMember.is_active !== undefined
          ? editMember.is_active
          : editMember.active !== false;

      setSelectedUserId(safeUserId);
      setSelectedRole(safeRoleId);
      setIsActive(safeIsActive);
    } else {
      setSelectedUserId("");
      setSelectedRole("");
      setIsActive(true);
    }
  }, [isOpen, editMember]);

  useEffect(() => {
    if (isOpen && !editMember && systemRoles.length > 0 && !selectedRole) {
      const defaultRole =
        systemRoles.find((role: any) =>
          String(role.name || role.code || "")
            .toUpperCase()
            .includes("MEMBER"),
        ) || systemRoles[0];

      if (defaultRole) {
        setSelectedRole(defaultRole.id || defaultRole._id);
      }
    }
  }, [isOpen, editMember, systemRoles, selectedRole]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!selectedUserId) return alert("Vui lòng chọn người dùng.");
    if (!selectedRole) return alert("Vui lòng gán một vai trò.");

    try {
      if (editMember) {
        await updateMember({
          memberId: selectedUserId,
          roleIds: [selectedRole],
          isActive,
        });
      } else {
        await addMember({
          userId: selectedUserId,
          roleIds: [selectedRole],
        });
      }

      onClose();
    } catch (error: any) {
      console.error("Lỗi:", error);
      alert(
        `Lỗi: ${
          error.response?.data?.message ||
          error.response?.data?.error?.message ||
          "Có lỗi xảy ra, vui lòng thử lại."
        }`,
      );
    }
  };

  const isProcessing = isAdding || isUpdating;

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in"
        onClick={onClose}
      />

      <div className="relative bg-[#F8FAFC] rounded-3xl shadow-2xl w-full max-w-4xl flex flex-col animate-in zoom-in-95 duration-200 overflow-hidden border border-slate-100 max-h-[92vh]">
        {}
        <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100 shadow-inner">
              {editMember ? <Shield size={24} /> : <UserPlus size={24} />}
            </div>

            <div>
              <h3 className="text-xl font-extrabold text-slate-950 tracking-tight">
                {editMember
                  ? "Cập nhật Quyền & Trạng thái"
                  : "Mời Thành Viên Vào Dự Án"}
              </h3>

              <p className="text-sm text-slate-500 font-medium mt-1">
                Cấu hình vai trò và quyền hạn chi tiết cho nhân sự.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 custom-scrollbar">
          {}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-3 tracking-widest flex items-center gap-2">
              <Fingerprint size={14} className="text-slate-400" />
              Bước 1: Người dùng *
            </label>

            {editMember ? (
              <div className="w-full px-5 py-4 border border-slate-200 rounded-2xl bg-slate-50 flex items-center gap-4 opacity-90 cursor-not-allowed">
                <div className="w-11 h-11 rounded-xl bg-indigo-100 text-indigo-700 font-black flex items-center justify-center shadow-sm text-lg border border-indigo-200">
                  {(
                    editMember.user_id?.full_name ||
                    editMember.user?.full_name ||
                    editMember.name ||
                    editMember.email ||
                    "U"
                  )
                    .charAt(0)
                    .toUpperCase()}
                </div>

                <div>
                  <div className="text-sm font-bold text-slate-800">
                    {editMember.user_id?.full_name ||
                      editMember.user?.full_name ||
                      editMember.name ||
                      "Thành viên"}
                  </div>

                  <div className="text-xs font-medium text-slate-500 mt-1 flex items-center gap-1.5">
                    {editMember.user_id?.email ||
                      editMember.user?.email ||
                      editMember.email ||
                      "Chưa có email"}
                  </div>
                </div>
              </div>
            ) : (
              <select
                value={selectedUserId}
                onChange={(event) => setSelectedUserId(event.target.value)}
                disabled={isUsersLoading}
                className="w-full px-5 py-3 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 outline-none text-sm font-semibold transition-all disabled:bg-slate-50 disabled:text-slate-500 appearance-none bg-slate-50 hover:bg-slate-100 cursor-pointer"
              >
                <option value="" disabled>
                  {isUsersLoading
                    ? "Đang tải danh sách nhân sự..."
                    : " -- Click để chọn một người dùng từ hệ thống --"}
                </option>

                {systemUsers.map((user: any, index: number) => {
                  const safeId =
                    user.id || user._id || user.user_id || `user-${index}`;

                  return (
                    <option key={safeId} value={safeId}>
                      {user.full_name ||
                        user.fullName ||
                        user.name ||
                        user.username}{" "}
                      ({user.email})
                    </option>
                  );
                })}
              </select>
            )}
          </div>

          {}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-4 tracking-widest flex items-center gap-2">
              <Sparkles size={14} className="text-slate-400" />
              Bước 2: Cấu hình Quyền (Role) *
            </label>

            {isRolesLoading ? (
              <div className="flex flex-col items-center justify-center py-10 text-slate-400 gap-3 border-2 border-dashed border-slate-100 rounded-2xl">
                <Loader2 size={32} className="animate-spin text-indigo-500" />
                <span className="text-sm font-medium">
                  Đang tải hệ thống phân quyền...
                </span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 content-start">
                {systemRoles.map((role: any, index: number) => {
                  const roleId = role.id || role._id;
                  const isSelected = selectedRole === roleId;

                  return (
                    <button
                      key={roleId || `role-${index}`}
                      type="button"
                      onClick={() => setSelectedRole(roleId)}
                      className={`group relative flex flex-col p-5 rounded-2xl border-2 transition-all duration-200 text-left h-full ${
                        isSelected
                          ? "border-indigo-600 bg-indigo-50 shadow-lg shadow-indigo-100"
                          : "border-slate-100 bg-white hover:border-slate-300 hover:bg-slate-50 hover:shadow-md"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3 mb-3 shrink-0">
                        <div
                          className={`p-2 rounded-xl border ${
                            isSelected
                              ? "bg-indigo-600 text-white border-indigo-700"
                              : "bg-slate-100 text-slate-600 border-slate-200"
                          }`}
                        >
                          <Shield size={18} />
                        </div>

                        {isSelected && (
                          <CheckCircle2
                            size={20}
                            className="text-indigo-600 shrink-0 animate-in zoom-in"
                          />
                        )}
                      </div>

                      <div className="flex-1 flex flex-col justify-between">
                        <div>
                          <h4
                            className={`font-bold text-sm tracking-tight mb-1 ${
                              isSelected ? "text-indigo-950" : "text-slate-900"
                            }`}
                          >
                            {role.name || role.code}
                          </h4>

                          <p
                            className={`text-[11px] font-medium leading-relaxed ${
                              isSelected
                                ? "text-indigo-800 opacity-90"
                                : "text-slate-500"
                            }`}
                          >
                            {role.description ||
                              "Quyền hạn cơ bản trong hệ thống."}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {}
          {editMember && (
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-300">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-4 tracking-widest flex items-center gap-2">
                <AlertCircle size={14} className="text-slate-400" />
                Bước 3: Trạng thái Hoạt động
              </label>

              <label className="flex items-center gap-4 cursor-pointer group w-max p-4 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-slate-100/50 transition-colors">
                <div
                  className={`w-14 h-7 rounded-full transition-colors relative flex items-center px-1 ${
                    isActive ? "bg-emerald-500" : "bg-slate-300"
                  }`}
                >
                  <div
                    className={`bg-white w-5 h-5 rounded-full transition-transform shadow-md ${
                      isActive ? "translate-x-7" : "translate-x-0"
                    }`}
                  />
                </div>

                <div>
                  <span
                    className={`text-sm font-bold block ${
                      isActive ? "text-emerald-700" : "text-slate-600"
                    }`}
                  >
                    {isActive ? "Đang hoạt động" : "Đã vô hiệu hóa"}
                  </span>

                  <span className="text-xs text-slate-400 font-medium">
                    {isActive
                      ? "User có thể truy cập dự án này."
                      : "User tạm thời bị chặn truy cập."}
                  </span>
                </div>
              </label>
            </div>
          )}
        </div>

        {}
        <div className="px-8 py-5 bg-white border-t border-slate-100 flex justify-end gap-3 shrink-0">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="px-6 py-2.5 text-slate-600 hover:bg-slate-100 bg-white rounded-xl text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50"
          >
            Hủy bỏ
          </button>

          <button
            onClick={handleSubmit}
            disabled={
              isProcessing ||
              !selectedUserId ||
              !selectedRole ||
              isUsersLoading ||
              isRolesLoading
            }
            className="flex items-center gap-2.5 bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-2.5 rounded-xl text-xs font-black active:scale-95 disabled:opacity-50 shadow-lg shadow-indigo-100 transition-all uppercase tracking-widest"
          >
            {isProcessing ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <CheckCircle2 size={16} />
            )}

            {editMember ? "Lưu cập nhật" : "Gán vào dự án"}
          </button>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default ProjectDetailMemberModal;
