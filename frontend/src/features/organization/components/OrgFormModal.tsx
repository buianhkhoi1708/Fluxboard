import React, { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  X,
  Search,
  ChevronDown,
  Loader2,
  Building2,
  Users,
  User,
  Hash,
  Check,
} from "lucide-react";
import { useGetOrgTree } from "../hooks/useOrgQueries";
import { orgApi } from "../api/organizationApi";
import { OrgMember } from "../types/orgTypes";

function useOnClickOutside(
  ref: React.RefObject<any>,
  handler: (event: MouseEvent | TouchEvent) => void,
) {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) return;
      handler(event);
    };
    document.addEventListener("mousedown", listener);
    document.addEventListener("touchstart", listener);
    return () => {
      document.removeEventListener("mousedown", listener);
      document.removeEventListener("touchstart", listener);
    };
  }, [ref, handler]);
}

export interface OrgFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: "DEPARTMENT" | "TEAM";
  action?: "CREATE" | "EDIT";
  targetDeptId?: string | null;
  targetTeam?: any | null;
  targetDept?: any | null;
}

export interface OrgFormData {
  name: string;
  code: string;
  description: string;
  departmentId: string;
  leadId: string;
  leadName: string;
}

const OrgFormModal: React.FC<OrgFormModalProps> = ({
  isOpen,
  onClose,
  mode = "DEPARTMENT",
  action = "CREATE",
  targetDeptId,
  targetTeam,
  targetDept,
}) => {
  const queryClient = useQueryClient();
  const { data: orgTree = [] } = useGetOrgTree();

  const initialForm: OrgFormData = {
    name: "",
    code: "",
    description: "",
    departmentId: targetDeptId || "",
    leadId: "",
    leadName: "",
  };

  const [formData, setFormData] = useState<OrgFormData>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [searchLeadTerm, setSearchLeadTerm] = useState("");
  const [showLeadDropdown, setShowLeadDropdown] = useState(false);
  const [searchResults, setSearchResults] = useState<OrgMember[]>([]);
  const [isSearchingLead, setIsSearchingLead] = useState(false);

  const [unassignedUsers, setUnassignedUsers] = useState<any[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<any[]>([]);
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);

  const leadDropdownRef = useRef<HTMLDivElement>(null);
  const memberDropdownRef = useRef<HTMLDivElement>(null);

  useOnClickOutside(leadDropdownRef, () => setShowLeadDropdown(false));
  useOnClickOutside(memberDropdownRef, () => setShowMemberDropdown(false));

  const handleCloseModal = () => {
    setFormData(initialForm);
    setSearchLeadTerm("");
    setShowLeadDropdown(false);
    setShowMemberDropdown(false);
    setSearchResults([]);
    setSelectedMembers([]);
    onClose();
  };

  useEffect(() => {
    if (isOpen) {
      if (action === "EDIT" && mode === "TEAM" && targetTeam) {
        setFormData({
          name: targetTeam.name || "",
          code:
            targetTeam.code ||
            targetTeam.team_code ||
            targetTeam.teamCode ||
            "",
          description: targetTeam.description || "",
          departmentId:
            targetDeptId ||
            targetTeam.department_id ||
            targetTeam.departmentId ||
            "",
          leadId: targetTeam.leadId || targetTeam.lead_id || "",
          leadName: targetTeam.leadName || targetTeam.lead_name || "",
        });
      } else if (action === "EDIT" && mode === "DEPARTMENT" && targetDept) {
        setFormData({
          name: targetDept.name || "",
          code:
            targetDept.code ||
            targetDept.department_code ||
            targetDept.departmentCode ||
            "",
          description: targetDept.description || "",
          departmentId: "",
          leadId: targetDept.managerId || targetDept.manager_id || "",
          leadName: targetDept.managerName || targetDept.manager_name || "",
        });
      } else {
        setFormData((prev) => ({
          ...initialForm,
          departmentId: targetDeptId || "",
        }));
      }

      if (mode === "TEAM") {
        orgApi
          .getUnassignedUsers()
          .then((res: any) => {
            const payload = res.data || res;
            const userData = payload.data || payload.content || payload;
            setUnassignedUsers(Array.isArray(userData) ? userData : []);
          })
          .catch((err) => console.error("Lỗi lấy user:", err));
      }
    }
  }, [isOpen, targetDeptId, action, targetTeam, targetDept, mode]);

  useEffect(() => {
    if (searchLeadTerm.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setIsSearchingLead(true);
    const delayDebounce = setTimeout(async () => {
      try {
        const res: any = await orgApi.searchOrgUsers(searchLeadTerm);
        const payload = res.data || res;
        const usersData = payload.data || payload.content || payload;
        setSearchResults(Array.isArray(usersData) ? usersData : []);
      } catch (err) {
        console.error("Lỗi tìm kiếm user:", err);
      } finally {
        setIsSearchingLead(false);
      }
    }, 500);
    return () => clearTimeout(delayDebounce);
  }, [searchLeadTerm]);

  useEffect(() => {
    if (!showLeadDropdown && searchLeadTerm !== "" && !formData.leadId) {
      setSearchLeadTerm("");
    }
  }, [showLeadDropdown]);

  const handleSelectLead = (user: OrgMember) => {
    setFormData((prev) => ({
      ...prev,

      leadId: user._id || user.id || user.user_id || "",
      leadName: user.full_name || user.fullName || user.name || "",
    }));
    setShowLeadDropdown(false);
    setSearchLeadTerm("");
  };

  const toggleSelectMember = (user: any) => {
    const targetId = user._id || user.id;
    const isSelected = selectedMembers.some(
      (m) => (m._id || m.id) === targetId,
    );

    if (isSelected) {
      setSelectedMembers((prev) =>
        prev.filter((m) => (m._id || m.id) !== targetId),
      );
    } else {
      setSelectedMembers((prev) => [...prev, user]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (mode === "DEPARTMENT") {
        const payload = {
          name: formData.name,
          code: formData.code,
          description: formData.description,
          manager_id: formData.leadId || null,
        };

        if (action === "EDIT" && targetDept) {
          const deptId = targetDept._id || targetDept.id;
          await orgApi.updateDepartment(deptId, payload);
        } else {
          await orgApi.createDepartment(payload);
        }
      } else {
        const payload = {
          name: formData.name,
          code: formData.code,
          department_id: formData.departmentId,
          lead_id: formData.leadId || null,
          description: formData.description,
        };

        let activeTeamId = targetTeam?._id || targetTeam?.id;

        if (action === "EDIT" && targetTeam) {
          await orgApi.updateTeam(activeTeamId, payload);
        } else {
          const res: any = await orgApi.createTeam(payload);
          const responseData = res.data?.data || res.data;
          activeTeamId = responseData?._id || responseData?.id;
        }

        if (activeTeamId) {
          const assignPromises = [];

          if (activeTeamId) {
            if (formData.leadId) {
              assignPromises.push(
                orgApi.assignUserToTeam(
                  formData.leadId,
                  activeTeamId,
                  formData.departmentId,
                ),
              );
            }

            selectedMembers.forEach((member) => {
              const memberIdToAssign = member._id || member.id;
              if (memberIdToAssign !== formData.leadId) {
                assignPromises.push(
                  orgApi.assignUserToTeam(
                    memberIdToAssign,
                    activeTeamId,
                    formData.departmentId,
                  ),
                );
              }
            });
          }
          await Promise.all(assignPromises);
        }
      }

      queryClient.invalidateQueries({ queryKey: ["orgTree"] });
      handleCloseModal();
    } catch (error: any) {
      console.error("Lỗi:", error);
      alert(
        error.response?.data?.message || "Có lỗi xảy ra khi lưu trữ thông tin!",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-[24px] w-full max-w-lg shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] flex flex-col relative max-h-[90vh]">
        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white rounded-t-[24px] shrink-0">
          <div className="flex items-center gap-4">
            <div
              className={`p-3 rounded-2xl flex items-center justify-center shadow-sm border ${mode === "DEPARTMENT" ? "bg-indigo-50 text-indigo-600 border-indigo-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"}`}
            >
              {mode === "DEPARTMENT" ? (
                <Building2 size={24} strokeWidth={1.5} />
              ) : (
                <Users size={24} strokeWidth={1.5} />
              )}
            </div>
            <div>
              <h2 className="font-black text-xl text-slate-800 tracking-tight">
                {mode === "DEPARTMENT"
                  ? action === "EDIT"
                    ? "Cập nhật Phòng ban"
                    : "Tạo Phòng Ban mới"
                  : action === "EDIT"
                    ? "Cập nhật thông tin Team"
                    : "Thêm Team mới"}
              </h2>
              <p className="text-xs font-medium text-slate-400 mt-0.5">
                Thiết lập thông tin & nhân sự
              </p>
            </div>
          </div>
          <button
            onClick={handleCloseModal}
            className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-colors self-start"
          >
            <X size={20} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-8 space-y-6 overflow-visible"
        >
          {mode === "TEAM" && (
            <div className="relative z-10">
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Thuộc phòng ban <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Building2
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <select
                  required
                  value={formData.departmentId}
                  onChange={(e) =>
                    setFormData({ ...formData, departmentId: e.target.value })
                  }
                  className="w-full pl-11 pr-10 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 outline-none focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 transition-all appearance-none cursor-pointer"
                >
                  <option value="" disabled>
                    -- Chọn phòng ban --
                  </option>
                  {orgTree.map((dept: any) => (
                    <option
                      key={dept._id || dept.id || Math.random()}
                      value={dept._id || dept.id}
                    >
                      {dept.name}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={16}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Tên {mode === "DEPARTMENT" ? "phòng ban" : "Team"}{" "}
                <span className="text-rose-500">*</span>
              </label>
              <input
                required
                type="text"
                placeholder="VD: Khối Kỹ Thuật"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 outline-none focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 transition-all placeholder:text-slate-400"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Mã Code <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Hash
                  size={16}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  required
                  type="text"
                  placeholder="VD: ENG"
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      code: e.target.value.toUpperCase(),
                    })
                  }
                  className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 outline-none focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 transition-all uppercase placeholder:text-slate-400 placeholder:normal-case"
                />
              </div>
            </div>
          </div>

          {}
          <div className="relative z-30" ref={leadDropdownRef}>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              Chỉ định Leader
            </label>
            <div
              onClick={() => {
                setShowLeadDropdown(!showLeadDropdown);
                setShowMemberDropdown(false);
              }}
              className={`w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center cursor-pointer transition-all hover:bg-slate-100 ${showLeadDropdown ? "ring-4 ring-indigo-50 border-indigo-400 bg-white" : ""}`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${formData.leadName ? "bg-indigo-100 text-indigo-700" : "bg-slate-200 text-slate-500"}`}
                >
                  {formData.leadName ? (
                    formData.leadName.charAt(0).toUpperCase()
                  ) : (
                    <User size={14} />
                  )}
                </div>
                <span
                  className={`text-sm font-medium ${formData.leadName ? "text-slate-800" : "text-slate-400"}`}
                >
                  {formData.leadName || "Tìm kiếm người quản lý..."}
                </span>
              </div>
              <ChevronDown
                size={18}
                className={`text-slate-400 transition-transform duration-200 ${showLeadDropdown ? "rotate-180" : ""}`}
              />
            </div>

            {showLeadDropdown && (
              <div className="absolute w-full mt-2 bg-white border border-slate-100 shadow-2xl rounded-2xl overflow-hidden">
                <div className="p-3 border-b border-slate-100 bg-slate-50/50 relative">
                  <Search
                    size={16}
                    className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    autoFocus
                    type="text"
                    placeholder="Gõ tên hoặc email..."
                    value={searchLeadTerm}
                    onChange={(e) => setSearchLeadTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg outline-none text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50"
                  />
                </div>
                <ul className="max-h-48 overflow-y-auto custom-scrollbar py-1">
                  {isSearchingLead ? (
                    <li className="p-4 text-center text-slate-400">
                      <Loader2 className="animate-spin inline" size={18} />
                    </li>
                  ) : searchResults.length > 0 ? (
                    searchResults.map((u) => (
                      <li
                        key={u._id || u.id || u.user_id}
                        onClick={() => handleSelectLead(u)}
                        className="px-4 py-3 hover:bg-indigo-50 cursor-pointer border-b border-slate-50 last:border-0 flex items-center gap-3 group"
                      >
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-xs group-hover:bg-indigo-200 group-hover:text-indigo-700">
                          {(u.full_name || u.fullName || u.name || "U")
                            .charAt(0)
                            .toUpperCase()}
                        </div>
                        <div>
                          <span className="font-bold text-sm block group-hover:text-indigo-700">
                            {u.full_name || u.fullName || u.name}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {u.email}
                          </span>
                        </div>
                      </li>
                    ))
                  ) : (
                    <li className="p-4 text-center text-sm text-slate-400">
                      Không tìm thấy kết quả.
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>

          {}
          {mode === "TEAM" && (
            <div
              className="pt-4 border-t border-slate-100 relative z-20"
              ref={memberDropdownRef}
            >
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-bold text-slate-700">
                  Gom nhanh thành viên{" "}
                  <span className="text-xs font-normal text-slate-400 ml-1">
                    (Từ danh sách chưa gán)
                  </span>
                </label>
              </div>

              {selectedMembers.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {selectedMembers.map((m) => (
                    <div
                      key={m._id || m.id}
                      className="bg-indigo-50 border border-indigo-100 text-indigo-700 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 group shadow-sm transition-all"
                    >
                      <span>{m.full_name || m.fullName}</span>
                      <X
                        size={14}
                        className="cursor-pointer text-indigo-400 group-hover:text-rose-500 group-hover:scale-110 transition-all"
                        onClick={() => toggleSelectMember(m)}
                      />
                    </div>
                  ))}
                </div>
              )}

              <div
                onClick={() => {
                  setShowMemberDropdown(!showMemberDropdown);
                  setShowLeadDropdown(false);
                }}
                className={`w-full px-4 py-3 bg-slate-50 border border-dashed border-slate-300 rounded-xl flex justify-between items-center cursor-pointer transition-all hover:bg-slate-100 ${showMemberDropdown ? "border-indigo-400 bg-white" : ""}`}
              >
                <span className="text-sm font-medium text-slate-500">
                  <Users size={16} className="inline mr-2 text-slate-400" /> Bấm
                  để chọn nhân sự...
                </span>
                <ChevronDown
                  size={18}
                  className={`text-slate-400 transition-transform duration-200 ${showMemberDropdown ? "rotate-180" : ""}`}
                />
              </div>

              {showMemberDropdown && (
                <div className="absolute bottom-full mb-2 w-full bg-white border border-slate-100 shadow-2xl rounded-2xl overflow-hidden">
                  <ul className="max-h-56 overflow-y-auto custom-scrollbar py-2">
                    {unassignedUsers.length > 0 ? (
                      unassignedUsers.map((u) => {
                        const userId = u._id || u.id;
                        const isSelected = selectedMembers.some(
                          (m) => (m._id || m.id) === userId,
                        );
                        return (
                          <li
                            key={userId}
                            onClick={() => toggleSelectMember(u)}
                            className={`px-4 py-2.5 cursor-pointer border-b border-slate-50 last:border-0 flex items-center justify-between group transition-colors ${isSelected ? "bg-indigo-50/50" : "hover:bg-slate-50"}`}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-colors ${isSelected ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500 group-hover:bg-slate-200"}`}
                              >
                                {(u.full_name || u.fullName || "U")
                                  .charAt(0)
                                  .toUpperCase()}
                              </div>
                              <div>
                                <span
                                  className={`text-sm font-bold block transition-colors ${isSelected ? "text-indigo-700" : "text-slate-700 group-hover:text-slate-900"}`}
                                >
                                  {u.full_name || u.fullName}
                                </span>
                                <span className="text-[11px] text-slate-400">
                                  {u.email}
                                </span>
                              </div>
                            </div>
                            <div
                              className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${isSelected ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-300 bg-white group-hover:border-indigo-400"}`}
                            >
                              {isSelected && (
                                <Check size={14} strokeWidth={3} />
                              )}
                            </div>
                          </li>
                        );
                      })
                    ) : (
                      <li className="p-6 text-center">
                        <User
                          className="mx-auto text-slate-300 mb-2"
                          size={24}
                        />
                        <span className="text-sm text-slate-500 font-medium">
                          Hiện không có nhân sự nào đang trống.
                        </span>
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="pt-6 shrink-0 bg-white relative z-0">
            <button
              disabled={
                isSubmitting || (mode === "TEAM" && !formData.departmentId)
              }
              type="submit"
              className="w-full bg-slate-900 text-white font-bold text-sm py-4 rounded-xl hover:bg-indigo-600 shadow-[0_8px_20px_rgb(0,0,0,0.08)] hover:shadow-[0_8px_20px_rgb(79,70,229,0.25)] disabled:opacity-50 transition-all duration-300 active:scale-[0.98] flex justify-center gap-2 items-center"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin" size={18} /> Đang xử lý...
                </>
              ) : action === "EDIT" ? (
                "Lưu thay đổi"
              ) : (
                "Xác nhận & Cập nhật"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OrgFormModal;
