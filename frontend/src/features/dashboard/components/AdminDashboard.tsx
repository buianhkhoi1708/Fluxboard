import React, { memo } from "react";
import type { ReactNode } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import {
  MoreVertical, Users, Building2, Network, ShieldAlert,
  CheckCircle2, Clock, AlertTriangle,
} from "lucide-react";
import type { AdminDashboardData } from "../api/dashboardApi";
import { useGetOrgTree } from "../../organization/hooks/useOrgQueries";

// ==========================================
// SKELETON LOADING
// ==========================================
export const AdminDashboardSkeleton = () => (
  <div className="space-y-5 lg:space-y-6 animate-pulse pb-8">
    {/* 3 StatCard skeletons */}
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 lg:gap-6">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/80 p-5 lg:p-6 shadow-sm">
          <div className="flex justify-between items-start mb-3">
            <div className="h-4 w-24 bg-slate-200 rounded-md" />
            <div className="h-8 w-8 bg-slate-200 rounded-xl" />
          </div>
          <div className="h-9 w-16 bg-slate-200 rounded-md mt-3" />
          <div className="h-3 w-32 bg-slate-200 rounded-full mt-2" />
        </div>
      ))}
    </div>

    {/* Deadline health + BarChart skeletons */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-6">
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/80 p-6 shadow-sm min-h-[400px] space-y-4">
        <div className="h-5 w-48 bg-slate-200 rounded-md" />
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-slate-100">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-slate-200" />
                <div className="space-y-2">
                  <div className="h-4 w-24 bg-slate-200 rounded-md" />
                  <div className="h-3 w-16 bg-slate-200 rounded-md" />
                </div>
              </div>
              <div className="h-6 w-8 bg-slate-200 rounded-md" />
            </div>
          ))}
        </div>
        <div className="h-8 bg-slate-200 rounded-xl w-3/4 mx-auto mt-4" />
      </div>

      <div className="lg:col-span-2 bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/80 p-6 shadow-sm min-h-[400px] space-y-4">
        <div className="h-5 w-56 bg-slate-200 rounded-md" />
        <div className="h-64 bg-slate-100 rounded-2xl" />
      </div>
    </div>
  </div>
);

// ==========================================
// STAT CARD (ĐỒNG BỘ GIAO DIỆN MỚI)
// ==========================================
interface StatCardProps {
  title: string;
  value?: string | number;
  icon?: ReactNode;
  subtitle?: string;
  className?: string;
}

const StatCard = ({ title, value, icon, subtitle, className = "" }: StatCardProps) => (
  <div
    className={`bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/80 shadow-lg shadow-slate-200/20 p-5 lg:p-6 flex flex-col transition-all duration-300 hover:shadow-xl hover:shadow-indigo-100/20 hover:-translate-y-0.5 ${className}`}
  >
    <div className="flex justify-between items-start mb-3">
      <div className="flex items-center gap-2.5">
        {icon && (
          <div className="p-2 bg-white shadow-sm text-slate-600 rounded-xl border border-slate-100">
            {icon}
          </div>
        )}
        <h3 className="font-extrabold text-[12px] uppercase tracking-widest text-slate-500">{title}</h3>
      </div>
      <button className="text-slate-300 hover:text-indigo-600 p-1.5 rounded-lg hover:bg-indigo-50 transition-colors">
        <MoreVertical size={18} />
      </button>
    </div>

    <div className="mt-auto pt-3">
      {value !== undefined && (
        <div className="text-[36px] leading-none font-black tracking-tighter text-slate-800">{value}</div>
      )}
      {subtitle && (
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-2">{subtitle}</div>
      )}
    </div>
  </div>
);

// ==========================================
// MAIN COMPONENT
// ==========================================
interface AdminDashboardProps {
  data: AdminDashboardData | null;
}

const AdminDashboard = ({ data }: AdminDashboardProps) => {
  const { data: orgDepartments, isLoading: isOrgLoading } = useGetOrgTree();

  // Loading state: hiển thị skeleton
  if (!data || isOrgLoading) {
    return <AdminDashboardSkeleton />;
  }

  const kpi = data.organization_kpi || { total_users: 0, total_departments: 0, total_teams: 0 };
  const health = data.company_deadline_health || { on_track: 0, at_risk: 0, overdue: 0, total_extensions: 0 };

  const chartData = (data.department_points_distribution || []).map((dept) => {
    let deptName = "Chưa gán";
    if (dept.department_id !== "Unassigned") {
      const foundDept = orgDepartments?.find((d: any) => String(d.id) === String(dept.department_id));
      deptName = foundDept
        ? foundDept.name || foundDept.department_name || foundDept.list_name
        : `Phòng ${dept.department_id.substring(0, 4).toUpperCase()}`;
    }
    return {
      name: deptName,
      total: dept.total_points,
      completed: dept.completed_points,
      remaining: dept.total_points - dept.completed_points,
    };
  });

  return (
    <div className="space-y-5 lg:space-y-6 pb-8 animate-in fade-in zoom-in-95 duration-500">
      {/* ROW 1: KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 lg:gap-6">
        <StatCard
          title="Tổng Nhân Sự"
          value={kpi.total_users.toLocaleString()}
          icon={<Users size={18} />}
          subtitle="Tài khoản hoạt động"
          className="border-l-4 border-l-indigo-500"
        />
        <StatCard
          title="Phòng Ban"
          value={kpi.total_departments.toLocaleString()}
          icon={<Building2 size={18} />}
          subtitle="Đang vận hành"
          className="border-l-4 border-l-emerald-500"
        />
        <StatCard
          title="Đội Nhóm (Teams)"
          value={kpi.total_teams.toLocaleString()}
          icon={<Network size={18} />}
          subtitle="Các dự án nhỏ"
          className="border-l-4 border-l-amber-500"
        />
      </div>

      {/* ROW 2: Deadline Health & Biểu đồ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-6">
        {/* Deadline Health */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/80 shadow-lg shadow-slate-200/20 p-6 flex flex-col min-h-[400px] transition-all hover:shadow-xl hover:shadow-indigo-100/20">
          <div className="flex justify-between items-start mb-5 shrink-0">
            <div>
              <h3 className="font-black text-lg text-slate-800 tracking-tight">Cảnh Báo Deadline</h3>
              <p className="text-xs text-slate-500 font-medium mt-1">Sức khỏe toàn công ty</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500 shadow-sm border border-indigo-100">
              <ShieldAlert size={20} strokeWidth={2} />
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-center gap-3.5 mt-1">
            <div className="flex items-center justify-between p-4 rounded-2xl bg-emerald-50/70 border border-emerald-100 transition-colors hover:bg-emerald-50">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-white text-emerald-500 flex items-center justify-center shadow-sm border border-emerald-100/50">
                  <CheckCircle2 size={20} strokeWidth={2.5} />
                </div>
                <div>
                  <div className="font-bold text-sm text-emerald-900 leading-tight">Đúng Tiến Độ</div>
                  <div className="text-[10px] font-black text-emerald-500/80 uppercase tracking-widest mt-1">On Track</div>
                </div>
              </div>
              <span className="text-2xl font-black text-emerald-600">{health.on_track}</span>
            </div>

            <div className="flex items-center justify-between p-4 rounded-2xl bg-amber-50/70 border border-amber-100 transition-colors hover:bg-amber-50">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-white text-amber-500 flex items-center justify-center shadow-sm border border-amber-100/50">
                  <AlertTriangle size={20} strokeWidth={2.5} />
                </div>
                <div>
                  <div className="font-bold text-sm text-amber-900 leading-tight">Nguy Cơ Trễ</div>
                  <div className="text-[10px] font-black text-amber-500/80 uppercase tracking-widest mt-1">At Risk</div>
                </div>
              </div>
              <span className="text-2xl font-black text-amber-600">{health.at_risk}</span>
            </div>

            <div className="flex items-center justify-between p-4 rounded-2xl bg-rose-50/70 border border-rose-100 transition-colors hover:bg-rose-50">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-white text-rose-500 flex items-center justify-center shadow-sm border border-rose-100/50">
                  <Clock size={20} strokeWidth={2.5} />
                </div>
                <div>
                  <div className="font-bold text-sm text-rose-900 leading-tight">Đã Cháy Hạn</div>
                  <div className="text-[10px] font-black text-rose-500/80 uppercase tracking-widest mt-1">Overdue</div>
                </div>
              </div>
              <span className="text-2xl font-black text-rose-600">{health.overdue}</span>
            </div>

            <div className="mt-2 text-center">
              <span className="inline-block text-[11px] font-bold text-slate-500 bg-white px-3.5 py-2 rounded-xl border border-slate-200/80 shadow-sm">
                Tổng lượt xin gia hạn (Extensions): <strong className="text-indigo-600 text-[13px] ml-1">{health.total_extensions}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Biểu đồ Story Points */}
        <div className="lg:col-span-2 bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/80 shadow-lg shadow-slate-200/20 p-6 flex flex-col min-h-[400px] transition-all hover:shadow-xl hover:shadow-indigo-100/20">
          <div className="flex justify-between items-start mb-6 shrink-0">
            <div>
              <h3 className="font-black text-lg text-slate-800 tracking-tight">Phân Bổ Điểm Số (Story Points)</h3>
              <p className="text-xs text-slate-500 font-medium mt-1">
                So sánh điểm hoàn thành và điểm được giao theo phòng ban
              </p>
            </div>
          </div>

          {chartData.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-sm font-bold text-slate-300 uppercase tracking-widest bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
              Chưa có dữ liệu phòng ban
            </div>
          ) : (
            <div className="flex-1 w-full min-h-[280px] -ml-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#475569", fontSize: 11, fontWeight: 700 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#475569", fontSize: 11, fontWeight: 700 }}
                  />
                  <Tooltip
                    cursor={{ fill: "#f8fafc" }}
                    contentStyle={{
                      borderRadius: "12px",
                      border: "none",
                      boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
                      fontWeight: 600,
                      fontSize: "12px",
                      padding: "8px 12px",
                    }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: "12px", fontWeight: 600, paddingTop: "16px" }} />
                  <Bar
                    dataKey="completed"
                    name="Điểm hoàn thành"
                    stackId="a"
                    fill="#6366f1"
                    barSize={36}
                    radius={[0, 0, 6, 6]}
                    className="hover:opacity-90 transition-opacity"
                  />
                  <Bar
                    dataKey="remaining"
                    name="Điểm còn lại"
                    stackId="a"
                    fill="#cbd5e1"
                    barSize={36}
                    radius={[6, 6, 0, 0]}
                    className="hover:opacity-90 transition-opacity"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default memo(AdminDashboard);