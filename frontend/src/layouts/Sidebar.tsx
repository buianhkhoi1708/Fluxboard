import React, { useMemo } from "react";
import { NavLink } from "react-router-dom";
import { useAuthStore } from "../features/auth/store/useAuthStore";
import { useRoleAccess } from "../features/rbac/hooks/useRoleAccess";
import {
  LayoutDashboard,
  Briefcase,
  KanbanSquare,
  ListTodo,
  Building2,
  ShieldCheck,
  Activity,
  Settings,
  LogOut,
  UserPlus,
} from "lucide-react";

const Sidebar = () => {
  const { logout } = useAuthStore();
  const { hasAccess } = useRoleAccess();

  const executionItems = [
    {
      path: "/dashboard",
      icon: <LayoutDashboard size={20} />,
      label: "Bảng điều khiển",
      roles: ["MEMBER", "LEAD", "MANAGER", "ADMIN", "SYSTEM_ADMIN"],
    },
    {
      path: "/workspaces",
      icon: <Briefcase size={20} />,
      label: "Không gian làm việc",
      roles: ["MEMBER", "LEAD", "MANAGER", "ADMIN", "SYSTEM_ADMIN"],
    },
    {
      path: "/aigenerateboard",
      icon: <KanbanSquare size={20} />,
      label: "Tạo Board AI",
      roles: ["LEAD", "MANAGER", "ADMIN", "SYSTEM_ADMIN"],
    },
    {
      path: "/mytasks",
      icon: <ListTodo size={20} />,
      label: "Công việc của tôi",
      roles: ["MEMBER", "LEAD", "MANAGER", "ADMIN", "SYSTEM_ADMIN"],
    },
  ];

  const managementItems = [
    {
      path: "/organization",
      icon: <Building2 size={20} />,
      label: "Tổ chức",
      roles: ["ADMIN", "SYSTEM_ADMIN"],
    },
    {
      path: "/createuser",
      icon: <UserPlus size={20} />,
      label: "Tạo người dùng",
      roles: ["ADMIN", "SYSTEM_ADMIN"],
    },
    {
      path: "/adminrbac",
      icon: <ShieldCheck size={20} />,
      label: "Phân quyền (RBAC)",
      roles: ["ADMIN", "SYSTEM_ADMIN"],
    },
    {
      path: "/activity",
      icon: <Activity size={20} />,
      label: "Hoạt động",
      roles: ["SYSTEM_ADMIN"],
    },
    {
      path: "/settings",
      icon: <Settings size={20} />,
      label: "Cài đặt",
      roles: ["MEMBER", "LEAD", "MANAGER", "ADMIN", "SYSTEM_ADMIN"],
    },
  ];

  const visibleExecutionItems = useMemo(() => {
    return executionItems.filter((item) => hasAccess(item.roles));
  }, [hasAccess]);

  const visibleManagementItems = useMemo(() => {
    return managementItems.filter((item) => hasAccess(item.roles));
  }, [hasAccess]);

  const NavItem = ({
    item,
    isAiHighlight,
  }: {
    item: any;
    isAiHighlight?: boolean;
  }) => (
    <NavLink
      to={item.path}
      className={({ isActive }) =>
        `group flex flex-col md:flex-row items-center md:justify-start gap-1 md:gap-3 px-3 py-2.5 md:px-4 md:py-3 rounded-2xl transition-all duration-200 min-w-[64px] md:min-w-0 font-semibold ${
          isActive
            ? "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-200/50 scale-[1.02]"
            : "text-slate-500 hover:bg-white hover:text-indigo-600 hover:shadow-sm"
        }`
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={`transition-all ${
              isActive
                ? "text-white"
                : isAiHighlight
                  ? "text-amber-500"
                  : "text-slate-400 group-hover:text-indigo-500"
            }`}
          >
            {item.icon}
          </span>

          <span
            className={`text-[10px] md:text-sm whitespace-nowrap ${
              isAiHighlight && !isActive ? "text-indigo-600 font-bold" : ""
            }`}
          >
            {item.label}
          </span>
        </>
      )}
    </NavLink>
  );

  return (
    <aside className="fixed bottom-0 left-0 w-full z-50 bg-white/90 backdrop-blur-md border-t border-slate-200/80 flex flex-row md:relative md:w-64 md:h-screen md:flex-col md:border-t-0 md:border-r md:border-slate-200/80 shrink-0 transition-all shadow-[-2px_0_10px_rgba(0,0,0,0.05)] md:shadow-none">
      <div className="flex-1 flex flex-row md:flex-col gap-1 md:gap-4 overflow-x-auto md:overflow-y-auto no-scrollbar px-3 py-2 md:px-4 md:py-6 pb-20 md:pb-6">
        {}
        {visibleExecutionItems.length > 0 && (
          <div className="flex flex-row md:flex-col gap-1.5">
            <p className="hidden md:block text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 px-3 mt-2">
              Thực thi
            </p>

            {visibleExecutionItems.map((item) => (
              <NavItem
                key={item.path}
                item={item}
                isAiHighlight={item.path === "/aigenerateboard"}
              />
            ))}
          </div>
        )}

        {}
        {visibleManagementItems.length > 0 && (
          <div className="flex flex-row md:flex-col gap-1.5 md:mt-2">
            <p className="hidden md:block text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 px-3 mt-6">
              Quản trị
            </p>

            {visibleManagementItems.map((item) => (
              <NavItem key={item.path} item={item} />
            ))}
          </div>
        )}

        {}
        <div className="flex flex-row md:flex-col gap-1.5 md:mt-auto">
          <button
            onClick={() => logout()}
            className="flex flex-col md:flex-row items-center justify-center md:justify-start w-full gap-1 md:gap-3 px-3 py-2.5 md:px-4 md:py-3 rounded-2xl text-[10px] md:text-sm font-bold text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-all group min-w-[64px] md:min-w-0 border border-transparent md:mb-6"
          >
            <LogOut
              size={20}
              className="group-hover:text-rose-500 transition-colors"
            />

            <span className="whitespace-nowrap">Đăng xuất</span>
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
