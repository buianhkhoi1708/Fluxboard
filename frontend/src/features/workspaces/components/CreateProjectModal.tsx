import React, { useState, useEffect, useMemo } from "react";
import { X, Briefcase, Loader2, Users, Layers, Check } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axiosClient from "../../../lib/axiosClient";
import { useCreateWorkspace } from "../hooks/useWorkspaceQueries";

const EMPTY_ARRAY: any[] = [];

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { mutateAsync: createWorkspaceAsync } = useCreateWorkspace();
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);

  const {
    data: availableDepartments = EMPTY_ARRAY,
    isLoading: isLoadingDepts,
  } = useQuery({
    queryKey: ["departments-list"],
    queryFn: async () => {
      const response: any = await axiosClient.get("/departments", {
        params: { size: 100 },
      });
      if (Array.isArray(response)) return response;
      if (Array.isArray(response.data)) return response.data;
      if (Array.isArray(response.data?.data?.content))
        return response.data.data.content;
      if (Array.isArray(response.data?.data)) return response.data.data;
      return [];
    },
    enabled: isOpen,
  });

  const [name, setName] = useState("");
  const [status, setStatus] = useState("ACTIVE");
  const [departmentId, setDepartmentId] = useState("");

  const { data: departmentHierarchy = null, isLoading: isLoadingHierarchy } =
    useQuery({
      queryKey: ["department-hierarchy", departmentId],
      queryFn: async () => {
        const response: any = await axiosClient.get(
          `/departments/${departmentId}/teams`,
        );

        const rawData =
          response.data?.data || response.data?.content || response.data || [];

        if (Array.isArray(rawData)) {
          return { teams: rawData };
        }
        return rawData;
      },
      enabled: !!departmentId && isOpen,
    });

  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);

  const availableTeams = departmentHierarchy?.teams || EMPTY_ARRAY;

  const availableMembers = useMemo(() => {
    if (!departmentHierarchy?.teams || selectedTeamIds.length === 0)
      return EMPTY_ARRAY;

    const activeTeams = departmentHierarchy.teams.filter((t: any) =>
      selectedTeamIds.includes(t._id || t.id),
    );
    const membersMap = new Map();
    activeTeams.forEach((team: any) => {
      const members = team.members || [];
      members.forEach((m: any) => {
        const memberId = m._id || m.id;
        if (memberId) membersMap.set(memberId, m);
      });
    });

    return Array.from(membersMap.values());
  }, [departmentHierarchy, selectedTeamIds]);

  useEffect(() => {
    if (availableDepartments.length > 0 && !departmentId) {
      setDepartmentId(
        availableDepartments[0]._id || availableDepartments[0].id,
      );
    }
  }, [availableDepartments]);

  useEffect(() => {
    setSelectedTeamIds([]);
    setSelectedMemberIds([]);
  }, [departmentId]);

  useEffect(() => {
    if (selectedTeamIds.length === 0) {
      if (selectedMemberIds.length > 0) setSelectedMemberIds([]);
      return;
    }
    setSelectedMemberIds((prev) => {
      const validMemberIds = availableMembers.map((m) => m._id || m.id);
      const newFiltered = prev.filter((mId) => validMemberIds.includes(mId));
      if (newFiltered.length === prev.length) return prev;
      return newFiltered;
    });
  }, [availableMembers]);

  useEffect(() => {
    if (isOpen) {
      setName("");
      setStatus("ACTIVE");
      setDepartmentId(
        availableDepartments.length > 0
          ? availableDepartments[0]._id || availableDepartments[0].id
          : "",
      );
      setSelectedTeamIds([]);
      setSelectedMemberIds([]);
      setIsProcessing(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggleTeam = (teamId: string) => {
    setSelectedTeamIds((prev) =>
      prev.includes(teamId)
        ? prev.filter((id) => id !== teamId)
        : [...prev, teamId],
    );
  };

  const handleToggleMember = (memberId: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return alert("Vui lòng nhập tên dự án!");
    if (!departmentId) return alert("Vui lòng chọn phòng ban quản lý!");
    if (selectedTeamIds.length === 0)
      return alert("Vui lòng chọn ít nhất một team tham gia!");
    if (selectedMemberIds.length === 0)
      return alert("Vui lòng gán ít nhất một thành viên vào dự án!");

    try {
      setIsProcessing(true);

      const projectPayload = {
        name: name.trim(),
        department_id: departmentId,
        status: status,
      };

      const projectRes: any = await createWorkspaceAsync(projectPayload);
      const newProjectId =
        projectRes?.data?.data?._id ||
        projectRes?.data?._id ||
        projectRes?.data?.id ||
        projectRes?._id ||
        projectRes?.id;

      if (!newProjectId) {
        throw new Error("Không lấy được ID dự án từ Backend sau khi tạo!");
      }

      const memberPromises = selectedMemberIds.map((userId) =>
        axiosClient.post(`/projects/${newProjectId}/members`, {
          user_id: userId,
          role_ids: [],
        }),
      );

      await Promise.all(memberPromises);
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });

      onClose();
      if (onSuccess) onSuccess();
    } catch (error: any) {
      const errorData = error.response?.data;
      console.error("Lỗi hệ thống:", errorData || error);

      if (errorData?.errors && Array.isArray(errorData.errors)) {
        const errorMsg = errorData.errors
          .map((e: any) => `${e.field || "Trường"}: ${e.message}`)
          .join("\n");
        alert(`Lỗi dữ liệu đầu vào:\n${errorMsg}`);
      } else {
        alert(`Lỗi: ${errorData?.message || error.message || "Có lỗi xảy ra"}`);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Briefcase size={20} className="text-indigo-600" /> Khởi tạo Dự án
          </h2>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="text-slate-400 hover:text-rose-500 transition-colors disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-6 space-y-5 no-scrollbar"
        >
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
              Tên Dự Án *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Dự án Fluxboard Core..."
              maxLength={150}
              disabled={isProcessing}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 transition-all font-medium disabled:opacity-60"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
              Phòng Ban Chủ Quản *
            </label>
            <select
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              disabled={
                isLoadingDepts ||
                availableDepartments.length === 0 ||
                isProcessing
              }
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 transition-all font-medium cursor-pointer disabled:opacity-60"
            >
              {isLoadingDepts && (
                <option value="">Đang tải danh sách phòng ban...</option>
              )}
              {availableDepartments.map((dept: any) => {
                const deptId = dept._id || dept.id;
                return (
                  <option key={deptId} value={deptId}>
                    {dept.name}
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-1.5">
              <Layers size={14} className="text-slate-400" /> Các Team Tham Gia
              * ({selectedTeamIds.length} đã chọn)
            </label>
            <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 space-y-1.5 max-h-36 overflow-y-auto no-scrollbar">
              {isLoadingHierarchy ? (
                <div className="flex items-center gap-2 py-2 text-xs font-medium text-slate-400 justify-center">
                  <Loader2 size={14} className="animate-spin text-indigo-500" />{" "}
                  Đang load sơ đồ tổ chức...
                </div>
              ) : availableTeams.length === 0 ? (
                <div className="text-center py-2 text-xs text-slate-400 font-medium">
                  Phòng ban này chưa có Team nào.
                </div>
              ) : (
                availableTeams.map((team: any) => {
                  const teamId = team._id || team.id;
                  const isChecked = selectedTeamIds.includes(teamId);
                  return (
                    <button
                      type="button"
                      key={teamId}
                      disabled={isProcessing}
                      onClick={() => handleToggleTeam(teamId)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-xs font-bold transition-all disabled:opacity-60 ${
                        isChecked
                          ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <span>
                        {team.name} ({team.code || "No Code"})
                      </span>
                      {isChecked && (
                        <div className="bg-indigo-600 text-white p-0.5 rounded-full shrink-0">
                          <Check size={10} strokeWidth={3} />
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-1.5">
              <Users size={14} className="text-slate-400" /> Thành Viên Dự Án *
              ({selectedMemberIds.length} nhân sự)
            </label>
            <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 space-y-1.5 max-h-44 overflow-y-auto no-scrollbar">
              {selectedTeamIds.length === 0 ? (
                <div className="text-center py-4 text-xs text-slate-400 font-medium">
                  Vui lòng chọn Team ở trên.
                </div>
              ) : availableMembers.length === 0 ? (
                <div className="text-center py-4 text-xs text-slate-400 font-medium">
                  Các Team được chọn chưa có thành viên.
                </div>
              ) : (
                availableMembers.map((member: any) => {
                  const memberId = member._id || member.id;
                  const isChecked = selectedMemberIds.includes(memberId);
                  return (
                    <button
                      type="button"
                      key={memberId}
                      disabled={isProcessing}
                      onClick={() => handleToggleMember(memberId)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-xs font-bold transition-all disabled:opacity-60 ${
                        isChecked
                          ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex flex-col items-start gap-0.5">
                        <span>
                          {member.fullName || member.full_name || member.name}
                        </span>
                        <span className="text-[10px] font-medium text-slate-400">
                          {member.email}
                        </span>
                      </div>
                      {isChecked && (
                        <div className="bg-emerald-600 text-white p-0.5 rounded-full shrink-0">
                          <Check size={10} strokeWidth={3} />
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
              Trạng Thái *
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              disabled={isProcessing}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 transition-all cursor-pointer disabled:opacity-60"
            >
              <option value="ACTIVE">Đang hoạt động (Active)</option>
              <option value="PLANNING">Đang lên kế hoạch (Planning)</option>
              <option value="ON_HOLD">Tạm dừng (On Hold)</option>
            </select>
          </div>

          <div className="mt-8 flex items-center justify-end gap-3 pt-4 border-t border-slate-100 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="px-5 py-2 rounded-lg text-sm font-bold text-slate-500 hover:bg-slate-100 disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={
                isProcessing || isLoadingDepts || selectedMemberIds.length === 0
              }
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all disabled:opacity-50 shadow-md"
            >
              {isProcessing ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Đang cấu
                  hình...
                </>
              ) : (
                "Khai sinh Dự án"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateProjectModal;
