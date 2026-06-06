import React, { useMemo, useState } from "react";
import {
  Shield,
  Mail,
  Trash2,
  Edit2,
  XCircle,
  Search,
  Users,
  Fingerprint,
} from "lucide-react";
import { useRemoveProjectMember } from "../hooks/useProjectQueries";
import { useQuery } from "@tanstack/react-query";
import axiosClient from "../../../lib/axiosClient";

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

const getSystemRoleName = (user: any) => {
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
  return getSystemRoleName(user) === "SYSTEM_ADMIN";
};

const isCurrentUserSystemAdmin = () => {
  return getSystemRoleName(getCurrentUser()) === "SYSTEM_ADMIN";
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

const extractRoles = (response: any) => {
  const payload =
    response?.data?.data?.content ??
    response?.data?.content ??
    response?.data?.data ??
    response?.data ??
    response?.content ??
    response;

  return Array.isArray(payload) ? payload : [];
};

const ProjectDetailMemberList = ({
  members = [],
  projectId,
  onEditRequest,
}: any) => {
  const [searchQuery, setSearchQuery] = useState("");
  const { mutateAsync: removeMember } = useRemoveProjectMember(projectId);

  const { data: systemRoles = [] } = useQuery({
    queryKey: ["all-system-roles"],
    queryFn: async () => {
      const response: any = await axiosClient.get("/rbac/roles", {
        params: {
          size: 100,
        },
      });

      return extractRoles(response);
    },
  });

  const visibleMembers = useMemo(() => {
    return members.filter((member: any) => {
      return shouldExposeUser(getMemberUser(member));
    });
  }, [members]);

  const getRoleName = (roleId: string) => {
    const role = systemRoles.find((item: any) => {
      return (
        item.id === roleId ||
        item._id === roleId ||
        item.code === roleId ||
        item.name === roleId
      );
    });

    return role ? role.name || role.code : roleId;
  };

  const filteredMembers = visibleMembers.filter((member: any) => {
    const userData = getMemberUser(member);
    const name =
      userData?.full_name ||
      userData?.fullName ||
      member.full_name ||
      member.name ||
      member.username ||
      "";

    const email = userData?.email || member.email || "";

    return (
      name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const handleKickMember = async (userId: string, memberName: string) => {
    if (!userId) return alert("Không tìm thấy ID người dùng.");

    if (
      window.confirm(
        `Bạn có chắc chắn muốn kick "${memberName}" ra khỏi dự án này không?`,
      )
    ) {
      try {
        await removeMember(userId);
      } catch (error) {
        console.error("Lỗi xóa member:", error);
        alert("Có lỗi xảy ra khi xóa thành viên.");
      }
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
      {}
      <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/50">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 shadow-sm">
            <Users size={18} />
          </div>

          <div>
            <h3 className="text-sm font-extrabold text-slate-800">
              Nhân sự Dự án
            </h3>

            <p className="text-[11px] text-slate-500 font-medium">
              Tổng cộng {visibleMembers.length} thành viên
            </p>
          </div>
        </div>

        <div className="relative w-full sm:w-80 group">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
            <Search size={16} />
          </div>

          <input
            type="text"
            placeholder="Tìm theo tên hoặc email..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 transition-all w-full font-medium placeholder:text-slate-300 shadow-sm"
          />
        </div>
      </div>

      {}
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-white text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
              <th className="px-6 py-4">Thành viên</th>
              <th className="px-6 py-4">Vai trò (Role)</th>
              <th className="px-6 py-4">Trạng thái</th>
              <th className="px-6 py-4 text-right">Thao tác</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {filteredMembers.length > 0 ? (
              filteredMembers.map((member: any, index: number) => {
                const userData = getMemberUser(member);

                const safeUserId =
                  userData?._id ||
                  userData?.id ||
                  userData?.user_id ||
                  member.userId ||
                  member._id ||
                  index;

                const name =
                  userData?.full_name ||
                  userData?.fullName ||
                  member.name ||
                  "Unnamed User";

                const email =
                  userData?.email || member.email || "Chưa có email";
                const avatar =
                  userData?.avatar_url ||
                  userData?.avatarUrl ||
                  member.avatar_url ||
                  member.avatarUrl;

                const isActive = member.is_active !== false;
                const roles = member.role_ids || member.roleIds || [];

                return (
                  <tr
                    key={safeUserId}
                    className="hover:bg-slate-50 transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        {avatar ? (
                          <img
                            src={avatar}
                            alt={name}
                            className="w-10 h-10 rounded-xl object-cover border border-slate-200 shadow-sm"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-100 to-violet-100 text-indigo-700 font-black flex items-center justify-center text-sm shadow-sm border border-indigo-50">
                            {name.charAt(0).toUpperCase()}
                          </div>
                        )}

                        <div>
                          <div className="font-bold text-slate-900 text-sm">
                            {name}
                          </div>

                          <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 mt-0.5">
                            <Mail size={12} className="opacity-70" />
                            {email}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-2">
                        {roles.map((role: any, roleIndex: number) => {
                          const roleKey =
                            typeof role === "string"
                              ? role
                              : role._id || role.id || roleIndex;

                          const roleDisplay =
                            typeof role === "string"
                              ? getRoleName(role)
                              : role.name || role.code || "MEMBER";

                          return (
                            <span
                              key={roleKey}
                              className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-1.5 rounded-lg uppercase tracking-wider"
                            >
                              <Shield
                                size={12}
                                className="text-indigo-500 shrink-0"
                              />

                              <span className="truncate max-w-[120px]">
                                {roleDisplay}
                              </span>
                            </span>
                          );
                        })}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      {isActive ? (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-full">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Đang hoạt động
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-full">
                          <XCircle size={14} className="text-slate-400" />
                          Vô hiệu hóa
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => onEditRequest(member)}
                          title="Chỉnh sửa quyền"
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>

                        <button
                          onClick={() => handleKickMember(safeUserId, name)}
                          title="Khai trừ khỏi dự án"
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={4} className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center justify-center text-slate-400">
                    <Fingerprint size={48} className="mb-4 opacity-20" />

                    <p className="text-sm font-bold text-slate-600">
                      Không tìm thấy nhân sự nào
                    </p>

                    <p className="text-xs font-medium mt-1">
                      Hãy thử tìm với một từ khóa khác hoặc mời thêm người mới.
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>
    </div>
  );
};

export default ProjectDetailMemberList;
