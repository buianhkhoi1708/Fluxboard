import React, { useState, useMemo, useEffect } from "react";
import { X, Search, UserPlus, Loader2, User } from "lucide-react";

import {
  useGetUnassignedUsers,
  useAssignUserToTeam,
} from "../hooks/useOrgQueries";

export interface UserPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetDeptId: string | null;
  targetTeamId: string | null;
}

export interface UnassignedUser {
  id?: string;
  _id?: string;
  full_name: string;
  email: string;
  role_id: string | null;
}

const UserPickerModal: React.FC<UserPickerModalProps> = ({
  isOpen,
  onClose,
  targetDeptId,
  targetTeamId,
}) => {
  const { data: users = [], isLoading } = useGetUnassignedUsers();

  const assignMutation = useAssignUserToTeam();

  const [searchQuery, setSearchQuery] = useState("");
  const [assigningUserId, setAssigningUserId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) setSearchQuery("");
  }, [isOpen]);

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const lowerQuery = searchQuery.toLowerCase();
    return users.filter(
      (u: UnassignedUser) =>
        (u.full_name && u.full_name.toLowerCase().includes(lowerQuery)) ||
        (u.email && u.email.toLowerCase().includes(lowerQuery)),
    );
  }, [users, searchQuery]);

  const handleAssignUser = async (userId: string) => {
    if (!targetTeamId || !targetDeptId || !userId) return;

    setAssigningUserId(userId);
    try {
      await assignMutation.mutateAsync({
        userId,
        teamId: targetTeamId,
        departmentId: targetDeptId,
      });
    } catch (error: any) {
      console.error("Lỗi khi gán user:", error);
      alert(error.response?.data?.message || "Có lỗi xảy ra khi gán nhân sự.");
    } finally {
      setAssigningUserId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-[24px] w-full max-w-xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] flex flex-col max-h-[85vh] relative overflow-hidden">
        {}
        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-sm border border-indigo-100">
              <UserPlus size={24} strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="font-black text-xl text-slate-800 tracking-tight">
                Thêm thành viên
              </h2>
              <p className="text-xs font-medium text-slate-400 mt-0.5">
                Chọn nhân sự chưa có nhóm làm việc
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-colors self-start"
          >
            <X size={20} />
          </button>
        </div>

        {}
        <div className="px-8 py-5 border-b border-slate-100 bg-slate-50/50">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Tìm kiếm theo tên hoặc email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 transition-all text-sm font-medium text-slate-800 placeholder:text-slate-400 shadow-sm"
            />
          </div>
        </div>

        {}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/30 custom-scrollbar">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-indigo-600">
              <Loader2
                className="animate-spin mb-3"
                size={32}
                strokeWidth={2.5}
              />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Đang tải dữ liệu...
              </span>
            </div>
          ) : filteredUsers.length > 0 ? (
            <div className="space-y-2">
              {filteredUsers.map((user: UnassignedUser) => {
                const activeId = user._id || user.id || "";

                return (
                  <div
                    key={activeId}
                    className="group flex items-center justify-between p-4 bg-white hover:bg-indigo-50/50 rounded-2xl border border-slate-100 hover:border-indigo-100 shadow-sm hover:shadow-md transition-all duration-300"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 text-white font-black text-sm flex items-center justify-center uppercase shadow-sm">
                        {user.full_name ? (
                          user.full_name.charAt(0)
                        ) : (
                          <User size={18} />
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-slate-800 group-hover:text-indigo-700 transition-colors">
                          {user.full_name}
                        </p>
                        <p className="text-[12px] font-medium text-slate-400 mt-0.5">
                          {user.email}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleAssignUser(activeId)}
                      disabled={assigningUserId === activeId}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-slate-50 text-slate-600 border border-slate-200 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all duration-300 active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none group-hover:bg-indigo-50 group-hover:text-indigo-600 group-hover:border-indigo-200"
                    >
                      {assigningUserId === activeId ? (
                        <>
                          <Loader2 size={16} className="animate-spin" /> Đang
                          gán...
                        </>
                      ) : (
                        <>
                          <UserPlus size={16} /> Thêm
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-sm">
                <User size={32} className="text-slate-300" />
              </div>
              <p className="text-base font-bold text-slate-600">
                {searchQuery
                  ? "Không tìm thấy kết quả phù hợp"
                  : "Tất cả nhân sự đã có nhóm"}
              </p>
              <p className="text-sm text-slate-400 mt-1 max-w-[250px] mx-auto leading-relaxed">
                {searchQuery
                  ? "Vui lòng thử tìm kiếm với từ khóa khác."
                  : "Không có nhân viên nào đang trống trong hệ thống hiện tại."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserPickerModal;
