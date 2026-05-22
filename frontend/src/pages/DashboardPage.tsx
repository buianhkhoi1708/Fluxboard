import React, { useMemo } from 'react';
import { useDashboardMetrics } from '../features/dashboard/hooks/useDashBoardQueries';
import { useAuthStore } from '../features/auth/store/useAuthStore';
import { useRolesDictionary } from '../features/rbac/hooks/useRbacQueries';

import AdminDashboard from '../features/dashboard/components/AdminDashboard';
import ManagerDashboard from '../features/dashboard/components/ManagerDashboard';
import MemberDashboard from '../features/dashboard/components/MemberDashboard';

import { LayoutDashboard, RefreshCw, AlertTriangle, Loader2 } from 'lucide-react';

// Giao diện chờ xác thực quyền – hiển thị cho mọi role
const RoleLoadingScreen = () => (
  <div className="flex flex-col items-center justify-center h-[400px] gap-4">
    <div className="relative">
      <div className="absolute inset-0 bg-indigo-200/30 blur-2xl rounded-full"></div>
      <Loader2 size={48} className="animate-spin text-indigo-600 relative z-10" />
    </div>
    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest animate-pulse">
      Đang xác thực quyền truy cập...
    </p>
  </div>
);

const DashboardPage = () => {
  const { user } = useAuthStore();
  const { data, isLoading: isDashboardLoading, isError, error, refetch } = useDashboardMetrics();
  const { data: rolesList, isLoading: isRolesLoading } = useRolesDictionary();

  // Xác định role sau khi từ điển đã tải
  const currentRoleName = useMemo(() => {
    if (!user) return "MEMBER";
    const rawRole = 
      user.system_role || 
      user.systemRole ||
      user.role_id || 
      user.role?.id ||
      user.role_name || 
      user.role?.name || 
      user.role || 
      "MEMBER";
    const roleString = String(rawRole).toUpperCase().trim();

    if (rolesList && rolesList.length > 0) {
      const matchedRole = rolesList.find(r => r.id.toUpperCase() === roleString);
      if (matchedRole) return matchedRole.name.toUpperCase();
    }
    return roleString;
  }, [user, rolesList]);

  const renderDashboardByRole = () => {
    if (currentRoleName.includes('ADMIN') || currentRoleName === 'SYSTEM_ADMIN' || currentRoleName === 'PROJECT_ADMIN') {
      return <AdminDashboard data={data || null} />;
    }
    if (currentRoleName.includes('MANAGER') || currentRoleName.includes('PM') || currentRoleName.includes('LEAD')) {
      return <ManagerDashboard data={data || null} />;
    }
    return <MemberDashboard data={data || null} />;
  };

  return (
    <div className="flex-1 bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 h-full overflow-y-auto no-scrollbar p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight flex items-center gap-3 text-slate-800">
              <div className="p-2 bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-indigo-100">
                <LayoutDashboard className="text-indigo-600" size={24} />
              </div>
              Bảng điều khiển
            </h1>
            <p className="text-sm font-medium text-slate-500 pl-12">
              Chào mừng trở lại, <span className="text-indigo-600 font-bold">{user?.full_name || 'Khách'}</span>.
            </p>
          </div>
        </div>

        {/* 1. ĐANG XÁC THỰC QUYỀN (chưa có role) -> hiển thị giao diện chờ */}
        {isRolesLoading && <RoleLoadingScreen />}

        {/* 2. CÓ QUYỀN NHƯNG LỖI DỮ LIỆU DASHBOARD */}
        {!isRolesLoading && isError && (
          <div className="bg-white/80 backdrop-blur-sm border border-dashed border-rose-200 rounded-2xl p-16 flex flex-col items-center justify-center text-center shadow-sm">
            <div className="p-5 bg-rose-50 rounded-full mb-5">
              <AlertTriangle size={56} className="text-rose-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Hệ thống đang bận</h3>
            <p className="text-slate-500 text-sm mb-6 max-w-md">
              {(error as any)?.response?.data?.message || (error as Error)?.message || "Không thể lấy dữ liệu Bảng điều khiển."}
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

        {/* 3. ĐÃ CÓ QUYỀN & KHÔNG LỖI -> Render dashboard thật (component tự lo loading dữ liệu) */}
        {!isRolesLoading && !isError && (
          <div className="animate-in fade-in slide-in-from-bottom-6 duration-700">
            {renderDashboardByRole()}
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;