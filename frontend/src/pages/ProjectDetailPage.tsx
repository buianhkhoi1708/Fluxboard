import React from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, LayoutGrid, Users, Settings, Loader2 } from "lucide-react";
import { useProjectOverview } from "../features/project/hooks/useProjectQueries";
import ProjectMembersTab from "../features/project/components/ProjectDetailMembersTab";
import ProjectBoardsTab from "../features/project/components/ProjectDetailBoardsTab";
import ProjectSettingsTab from "../features/project/components/ProjectDetailSettingsTab";

const ProjectDetailPage = () => {
  const params = useParams();
  const safeProjectId = params.projectId || params.id || "";

  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = searchParams.get("tab") || "boards";

  const { data: projectOverview, isLoading } =
    useProjectOverview(safeProjectId);

  const handleTabChange = (tabId: string) => {
    setSearchParams({ tab: tabId });
  };

  const TABS = [
    { id: "boards", label: "Bảng (Boards)", icon: LayoutGrid },
    { id: "members", label: "Thành viên", icon: Users },
    { id: "settings", label: "Cài đặt", icon: Settings },
  ];

  const currentProject = projectOverview?.project;

  return (
    <div className="min-h-screen bg-slate-50/50 pb-12">
      <div className="bg-white px-6 pt-6 sticky top-0 z-20 border-b border-slate-200">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => navigate("/workspaces")}
              className="p-2 bg-slate-100 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl transition-colors outline-none"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                {currentProject?.name ||
                  (isLoading ? "Đang tải..." : "Chi tiết Dự án")}
              </h1>
              <p className="text-sm text-slate-500 font-medium mt-1">
                Quản lý không gian làm việc và nhân sự
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6 overflow-x-auto no-scrollbar">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex items-center gap-2 pb-4 border-b-2 font-bold text-sm transition-all whitespace-nowrap outline-none ${
                    isActive
                      ? "border-indigo-600 text-indigo-600"
                      : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                  }`}
                >
                  <Icon size={16} /> {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 mt-8">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Loader2 size={32} className="animate-spin text-indigo-600 mb-4" />
            <p className="text-sm font-medium">
              Đang tải không gian làm việc...
            </p>
          </div>
        ) : (
          <>
            {activeTab === "boards" && (
              <ProjectBoardsTab projectId={safeProjectId} />
            )}
            {activeTab === "members" && (
              <ProjectMembersTab projectId={safeProjectId} />
            )}
            {activeTab === "settings" && (
              <ProjectSettingsTab projectId={safeProjectId} />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ProjectDetailPage;
