import React, { useMemo } from "react";
import { useDashboardMetrics } from "../features/dashboard/hooks/useDashBoardQueries";
import { useAuthStore } from "../features/auth/store/useAuthStore";
import { useRolesDictionary } from "../features/rbac/hooks/useRbacQueries";

import AdminDashboard from "../features/dashboard/components/AdminDashboard";
import ManagerDashboard from "../features/dashboard/components/ManagerDashboard";
import MemberDashboard from "../features/dashboard/components/MemberDashboard";

import {
  LayoutDashboard,
  RefreshCw,
  AlertTriangle,
  Loader2,
} from "lucide-react";

const LoadingScreen = ({
  message = "Đang tải dữ liệu...",
}: {
  message?: string;
}) => (
  <div className="flex flex-col items-center justify-center h-[400px] gap-4">
    <div className="relative">
      <div className="absolute inset-0 bg-indigo-200/30 blur-2xl rounded-full"></div>
      <Loader2
        size={48}
        className="animate-spin text-indigo-600 relative z-10"
      />
    </div>
    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest animate-pulse">
      {message}
    </p>
  </div>
);

const normalizeRoleName = (value?: any) => {
  if (!value) return "";
  return String(value)
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");
};

const getRoleId = (value: any) => {
  if (!value) return "";
  if (typeof value === "object") return String(value._id || value.id || "");
  return String(value);
};

const SYSTEM_ADMIN_ROLES = new Set(["SYSTEM_ADMIN", "ADMIN"]);
const MANAGER_ROLES = new Set([
  "MANAGER",
  "PM",
  "LEAD",
  "PROJECT_ADMIN",
  "PROJECT_MANAGER",
  "TEAM_LEAD",
]);

const DashboardPage = () => {
  const { user } = useAuthStore();
  const {
    data,
    isLoading: isDashboardLoading,
    isError,
    error,
    refetch,
  } = useDashboardMetrics();
  const { data: rolesList, isLoading: isRolesLoading } = useRolesDictionary();

  const currentRoleName = useMemo(() => {
    if (!user) return "MEMBER";

    const roles = Array.isArray(rolesList) ? rolesList : [];
    const roleFromObject =
      user.role_id && typeof user.role_id === "object"
        ? user.role_id.name
        : null;

    const directRole =
      roleFromObject ||
      user.system_role ||
      user.systemRole ||
      user.role_name ||
      user.roleName ||
      user.role;

    if (directRole) return normalizeRoleName(directRole);

    const userRoleId = getRoleId(user.role_id);
    if (userRoleId && roles.length > 0) {
      const matchedRole = roles.find((role: any) => {
        const roleId = getRoleId(role);
        return roleId && String(roleId) === String(userRoleId);
      });

      if (matchedRole?.name) return normalizeRoleName(matchedRole.name);
    }

    return "MEMBER";
  }, [user, rolesList]);

  const renderDashboardByRole = () => {
    const dashboardData = data || null;

    if (SYSTEM_ADMIN_ROLES.has(currentRoleName)) {
      return <AdminDashboard data={dashboardData as any} />;
    }

    if (
      MANAGER_ROLES.has(currentRoleName) ||
      currentRoleName.includes("MANAGER") ||
      currentRoleName.includes("LEAD")
    ) {
      return <ManagerDashboard data={dashboardData as any} />;
    }

    return <MemberDashboard data={dashboardData as any} />;
  };

  return (
    <div className="flex-1 bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 h-full overflow-y-auto no-scrollbar p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight flex items-center gap-3 text-slate-800">
              <div className="p-2 bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-indigo-100">
                <LayoutDashboard className="text-indigo-600" size={24} />
              </div>
              Bảng điều khiển
            </h1>
            <p className="text-sm font-medium text-slate-500 pl-12">
              Chào mừng trở lại,{" "}
              <span className="text-indigo-600 font-bold">
                {user?.full_name || user?.fullName || "Khách"}
              </span>
              .
            </p>
          </div>
        </div>

        {(isRolesLoading || isDashboardLoading) && (
          <LoadingScreen
            message={
              isRolesLoading
                ? "Đang xác thực quyền truy cập..."
                : "Đang tải dữ liệu bảng điều khiển..."
            }
          />
        )}

        {!isRolesLoading && !isDashboardLoading && isError && (
          <div className="bg-white/80 backdrop-blur-sm border border-dashed border-rose-200 rounded-2xl p-16 flex flex-col items-center justify-center text-center shadow-sm">
            <div className="p-5 bg-rose-50 rounded-full mb-5">
              <AlertTriangle size={56} className="text-rose-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">
              Hệ thống đang bận
            </h3>
            <p className="text-slate-500 text-sm mb-6 max-w-md">
              {(error as any)?.response?.data?.message ||
                (error as Error)?.message ||
                "Không thể lấy dữ liệu Bảng điều khiển."}
            </p>
            <button
              onClick={() => refetch()}
              className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-indigo-200/50 transition-all duration-200 active:scale-95"
            >
              <RefreshCw size={18} strokeWidth={2.5} />
              <span>Thử kết nối lại</span>
            </button>
          </div>
        )}

        {!isRolesLoading && !isDashboardLoading && !isError && (
          <div className="animate-in fade-in slide-in-from-bottom-6 duration-700">
            {renderDashboardByRole()}
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
