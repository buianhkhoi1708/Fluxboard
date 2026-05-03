import React from "react";
import { NavLink } from "react-router-dom";
import { useAuthStore } from "../features/auth/store/useAuthStore";
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
  Layers,
  Sparkles,
} from "lucide-react";

const Sidebar = () => {
  const { logout } = useAuthStore();

  // ==========================================
  // GROUP 1: EXECUTION & AI (Phases 3 & 4)
  // ==========================================
  const executionItems = [
    {
      path: "/dashboard",
      icon: <LayoutDashboard size={20} />,
      label: "Dashboard",
    },
    { path: "/workspaces", icon: <Briefcase size={20} />, label: "Workspaces" },
    {
      path: "/aigenerateboard",
      icon: <KanbanSquare size={20} />,
      label: "AI Boards",
    }, // AI Highlighted
    { path: "/tasks", icon: <ListTodo size={20} />, label: "My Tasks" },
  ];

  // ==========================================
  // GROUP 2: SYSTEM MANAGEMENT (Phases 1, 2 & 5)
  // ==========================================
  const managementItems = [
    {
      path: "/organization",
      icon: <Building2 size={20} />,
      label: "Organization",
    },
    {
      path: "/adminrbac",
      icon: <ShieldCheck size={20} />,
      label: "Role Access (RBAC)",
    },
    { path: "/activity", icon: <Activity size={20} />, label: "Activities" },
    { path: "/settings", icon: <Settings size={20} />, label: "Settings" },
  ];

  // Reusable Navigation Item Component
  const NavItem = ({ item, isAiHighlight }) => (
    <NavLink
      to={item.path}
      className={({ isActive }) =>
        `flex flex-col md:flex-row items-center md:justify-start gap-1 md:gap-3 px-2 py-2 md:px-3 md:py-2.5 rounded-xl transition-all duration-200 min-w-[64px] md:min-w-0 ${
          isActive
            ? "bg-indigo-600 text-white font-bold shadow-md shadow-indigo-200/50"
            : "text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 font-medium"
        }`
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={`${isActive ? "text-white" : isAiHighlight ? "text-amber-500" : "text-slate-400"} transition-all`}
          >
            {item.icon}
          </span>
          <span
            className={`text-[10px] md:text-sm whitespace-nowrap ${isAiHighlight && !isActive ? "text-indigo-600 font-semibold" : ""}`}
          >
            {item.label}
          </span>
        </>
      )}
    </NavLink>
  );

  return (
    <aside
      className="
      fixed bottom-0 left-0 w-full z-50 bg-white border-t border-slate-200 flex flex-row
      md:relative md:w-64 md:h-screen md:flex-col md:border-t-0 md:border-r shrink-0 transition-all
    "
    >
      {/* 2. MENU CONTENT */}
      <div className="flex-1 flex flex-row md:flex-col gap-1 md:gap-6 overflow-x-auto md:overflow-y-auto no-scrollbar px-2 py-2 md:px-4 pb-20 md:pb-0">
        {/* EXECUTION SECTION */}
        <div className="flex flex-row md:flex-col gap-1">
          <p className="hidden md:block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-3">
            Execution
          </p>
          {executionItems.map((item) => (
            <NavItem
              key={item.path}
              item={item}
              isAiHighlight={item.path === "/board"}
            />
          ))}
        </div>

        {/* MANAGEMENT SECTION */}
        <div className="flex flex-row md:flex-col gap-1 md:mt-2">
          <p className="hidden md:block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-3">
            Management
          </p>
          {managementItems.map((item) => (
            <NavItem key={item.path} item={item} />
          ))}
          <button
            onClick={logout}
            className="flex flex-col md:flex-row items-center justify-center md:justify-start w-full gap-1 md:gap-3 px-3 py-2.5 rounded-xl text-[10px] md:text-sm font-bold text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-all group min-w-[64px] md:min-w-0 border border-transparent md:hover:border-rose-100"
          >
            <LogOut
              size={20}
              className="text-slate-400 group-hover:text-rose-500 transition-colors"
            />
            <span className="whitespace-nowrap">Logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
