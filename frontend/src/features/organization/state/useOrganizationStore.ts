import { create } from "zustand";
import { orgApi } from "../api/organizationApi";
import { OrgDepartment, OrgTeam, OrgMember } from "../types/orgTypes";

interface OrgState {
  orgTree: OrgDepartment[];
  isLoading: boolean;

  fetchTree: () => Promise<void>;
  setOrgTree: (data: OrgDepartment[]) => void;
  addDepartmentToTree: (dept: Partial<OrgDepartment>) => void;
  addTeamToDepartment: (deptId: string, team: Partial<OrgTeam>) => void;
  addMemberToTeam: (deptId: string, teamId: string, member: OrgMember) => void;
}

export const useOrgStore = create<OrgState>((set) => ({
  orgTree: [],
  isLoading: false,

  fetchTree: async () => {
    set({ isLoading: true });
    try {
      const deptRes: any = await orgApi.getOrgTree({ size: 100 });

      let rawDepts = [];
      if (Array.isArray(deptRes)) rawDepts = deptRes;
      else if (Array.isArray(deptRes.data)) rawDepts = deptRes.data;
      else if (Array.isArray(deptRes.data?.data)) rawDepts = deptRes.data.data;
      else if (Array.isArray(deptRes.data?.data?.content))
        rawDepts = deptRes.data.data.content;

      const fullTreePromises = rawDepts.map(async (dept: any) => {
        try {
          const detailRes: any = await orgApi.getDepartmentHierarchy(dept.id);
          const detailData = detailRes.data?.data || detailRes.data || {};

          return {
            ...dept,
            ...detailData,
            teams: (detailData.teams || []).map((t: any) => ({
              ...t,
              members: t.members || [],
            })),
          };
        } catch (detailError) {
          console.warn(
            `Không lấy được chi tiết cho phòng ban ${dept.id}`,
            detailError,
          );

          return { ...dept, teams: [] };
        }
      });

      const fullTree = await Promise.all(fullTreePromises);

      set({ orgTree: fullTree, isLoading: false });
    } catch (err) {
      console.error("Fetch Tree Error:", err);
      set({ isLoading: false });
    }
  },

  setOrgTree: (data) => set({ orgTree: data }),

  addDepartmentToTree: (dept) =>
    set((state) => ({
      orgTree: [...state.orgTree, { ...dept, teams: [] } as OrgDepartment],
    })),

  addTeamToDepartment: (deptId, team) =>
    set((state) => ({
      orgTree: state.orgTree.map((d) =>
        d.id === deptId
          ? {
              ...d,
              teams: [...(d.teams || []), { ...team, members: [] } as OrgTeam],
            }
          : d,
      ),
    })),

  addMemberToTeam: (deptId, teamId, member) =>
    set((state) => ({
      orgTree: state.orgTree.map((d) =>
        d.id === deptId
          ? {
              ...d,
              teams: (d.teams || []).map((t) =>
                t.id === teamId
                  ? { ...t, members: [...(t.members || []), member] }
                  : t,
              ),
            }
          : d,
      ),
    })),
}));
