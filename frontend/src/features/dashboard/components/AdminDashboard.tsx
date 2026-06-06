import React, { memo } from "react";
import type { ReactNode } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  MoreVertical,
  Users,
  Building2,
  Network,
  ShieldAlert,
  CheckCircle2,
  Clock,
  AlertTriangle,
  PlayCircle,
} from "lucide-react";
import type { AdminDashboardData } from "../api/dashboardApi";
import { useGetOrgTree } from "../../organization/hooks/useOrgQueries";

export const AdminDashboardSkeleton = () => (
  <div className="space-y-5 lg:space-y-6 animate-pulse pb-8">
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 lg:gap-6">
      {[...Array(3)].map((_, i) => (
        <div
          key={i}
          className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/80 p-5 lg:p-6 shadow-sm"
        >
          <div className="flex justify-between items-start mb-3">
            <div className="h-4 w-24 bg-slate-200 rounded-md" />
            <div className="h-8 w-8 bg-slate-200 rounded-xl" />
          </div>
          <div className="h-9 w-16 bg-slate-200 rounded-md mt-3" />
          <div className="h-3 w-32 bg-slate-200 rounded-full mt-2" />
        </div>
      ))}
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-6">
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/80 p-6 shadow-sm min-h-[400px] space-y-4">
        <div className="h-5 w-48 bg-slate-200 rounded-md" />
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-4 rounded-2xl bg-slate-100"
            >
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
      </div>

      <div className="lg:col-span-2 bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/80 p-6 shadow-sm min-h-[400px] space-y-4">
        <div className="h-5 w-56 bg-slate-200 rounded-md" />
        <div className="h-64 bg-slate-100 rounded-2xl" />
      </div>
    </div>
  </div>
);

interface StatCardProps {
  title: string;
  value?: string | number;
  icon?: ReactNode;
  subtitle?: string;
  className?: string;
}

const StatCard = ({
  title,
  value,
  icon,
  subtitle,
  className = "",
}: StatCardProps) => (
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
        <h3 className="font-extrabold text-[12px] uppercase tracking-widest text-slate-500">
          {title}
        </h3>
      </div>
      <button className="text-slate-300 hover:text-indigo-600 p-1.5 rounded-lg hover:bg-indigo-50 transition-colors">
        <MoreVertical size={18} />
      </button>
    </div>

    <div className="mt-auto pt-3">
      {value !== undefined && (
        <div className="text-[36px] leading-none font-black tracking-tighter text-slate-800">
          {value}
        </div>
      )}
      {subtitle && (
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-2">
          {subtitle}
        </div>
      )}
    </div>
  </div>
);

interface DeadlineRowProps {
  label: string;
  subtitle: string;
  value: number;
  icon: ReactNode;
  className: string;
  iconClassName: string;
  valueClassName: string;
}

const DeadlineRow = ({
  label,
  subtitle,
  value,
  icon,
  className,
  iconClassName,
  valueClassName,
}: DeadlineRowProps) => (
  <div
    className={`flex items-center justify-between p-4 rounded-2xl border transition-colors ${className}`}
  >
    <div className="flex items-center gap-3.5">
      <div
        className={`w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm border ${iconClassName}`}
      >
        {icon}
      </div>
      <div>
        <div className="font-bold text-sm leading-tight">{label}</div>
        <div className="text-[10px] font-black uppercase tracking-widest mt-1 opacity-80">
          {subtitle}
        </div>
      </div>
    </div>
    <span className={`text-2xl font-black ${valueClassName}`}>{value}</span>
  </div>
);

interface AdminDashboardProps {
  data: AdminDashboardData | null;
}

const AdminDashboard = ({ data }: AdminDashboardProps) => {
  const { data: orgDepartments } = useGetOrgTree();

  if (!data) return <AdminDashboardSkeleton />;

  const kpi = data.organization_kpi || {
    total_active_members: 0,
    total_departments: 0,
    total_teams: 0,
  };

  const health = data.company_deadline_health || {
    in_progress: 0,
    completed: 0,
    on_track: 0,
    at_risk: 0,
    overdue: 0,
    total_tasks: 0,
    total_extensions_this_week: 0,
  };

  const chartData = (data.department_performance || [])
    .filter((dept) => {
      const deptId = String(dept.department_id || "").toLowerCase();
      const deptName = String(dept.department_name || "")
        .trim()
        .toLowerCase();
      return (
        Boolean(deptId) &&
        deptId !== "unassigned" &&
        deptName !== "unassigned" &&
        deptName !== "chưa gán"
      );
    })
    .map((dept) => {
      let deptName = dept.department_name || "Chưa gán";

      if (
        orgDepartments &&
        dept.department_id &&
        dept.department_id !== "unassigned"
      ) {
        const foundDept = orgDepartments.find(
          (d: any) => String(d.id || d._id) === String(dept.department_id),
        );
        if (foundDept) {
          deptName =
            foundDept.name ||
            foundDept.department_name ||
            foundDept.list_name ||
            deptName;
        }
      }

      const inProgress = Number(dept.in_progress_tasks || 0);
      const atRisk = Number(dept.at_risk_tasks || 0);
      const completed = Number(
        dept.completed_tasks || dept.on_track_tasks || 0,
      );
      const overdue = Number(dept.overdue_tasks || 0);

      return {
        name: deptName,
        in_progress: inProgress + atRisk,
        completed,
        overdue,
        raw_in_progress: inProgress,
        at_risk: atRisk,
        total: Number(
          dept.total_tasks || inProgress + atRisk + completed + overdue,
        ),
      };
    });

  return (
    <div className="space-y-5 lg:space-y-6 pb-8 animate-in fade-in zoom-in-95 duration-500">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 lg:gap-6">
        <StatCard
          title="Tổng Nhân Sự"
          value={kpi.total_active_members.toLocaleString()}
          icon={<Users size={18} />}
          subtitle="Tài khoản hoạt động"
          className="border-l-4 border-l-indigo-500"
        />
        <StatCard
          title="Phòng Ban"
          value={kpi.total_departments.toLocaleString()}
          icon={<Building2 size={18} />}
          subtitle="Tổng toàn hệ thống"
          className="border-l-4 border-l-emerald-500"
        />
        <StatCard
          title="Đội Nhóm (Teams)"
          value={kpi.total_teams.toLocaleString()}
          icon={<Network size={18} />}
          subtitle="Tổng toàn hệ thống"
          className="border-l-4 border-l-amber-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-6">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/80 shadow-lg shadow-slate-200/20 p-6 flex flex-col min-h-[430px] transition-all hover:shadow-xl hover:shadow-indigo-100/20">
          <div className="flex justify-between items-start mb-5 shrink-0">
            <div>
              <h3 className="font-black text-lg text-slate-800 tracking-tight">
                Cảnh Báo Deadline
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Toàn bộ task trong công ty
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500 shadow-sm border border-indigo-100">
              <ShieldAlert size={20} strokeWidth={2} />
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-center gap-3 mt-1">
            <DeadlineRow
              label="Đang Thực Hiện"
              subtitle="In Progress"
              value={health.in_progress || 0}
              icon={<PlayCircle size={20} strokeWidth={2.5} />}
              className="bg-slate-50/80 border-slate-200 hover:bg-slate-50 text-slate-800"
              iconClassName="text-slate-500 border-slate-200"
              valueClassName="text-slate-700"
            />

            <DeadlineRow
              label="Đúng Tiến Độ"
              subtitle="Completed"
              value={health.completed ?? health.on_track ?? 0}
              icon={<CheckCircle2 size={20} strokeWidth={2.5} />}
              className="bg-emerald-50/70 border-emerald-100 hover:bg-emerald-50 text-emerald-900"
              iconClassName="text-emerald-500 border-emerald-100/50"
              valueClassName="text-emerald-600"
            />

            <DeadlineRow
              label="Nguy Cơ Trễ"
              subtitle="Under 24h"
              value={health.at_risk || 0}
              icon={<AlertTriangle size={20} strokeWidth={2.5} />}
              className="bg-amber-50/70 border-amber-100 hover:bg-amber-50 text-amber-900"
              iconClassName="text-amber-500 border-amber-100/50"
              valueClassName="text-amber-600"
            />

            <DeadlineRow
              label="Đã Cháy Hạn"
              subtitle="Overdue"
              value={health.overdue || 0}
              icon={<Clock size={20} strokeWidth={2.5} />}
              className="bg-rose-50/70 border-rose-100 hover:bg-rose-50 text-rose-900"
              iconClassName="text-rose-400 border-rose-100/50"
              valueClassName="text-rose-500"
            />

            <div className="mt-1 text-center">
              <span className="inline-block text-[11px] font-bold text-slate-500 bg-white px-3.5 py-2 rounded-xl border border-slate-200/80 shadow-sm">
                Tổng task:{" "}
                <strong className="text-indigo-600 text-[13px] ml-1">
                  {health.total_tasks || 0}
                </strong>
                <span className="mx-2 text-slate-300">•</span>
                Xin gia hạn:{" "}
                <strong className="text-indigo-600 text-[13px] ml-1">
                  {health.total_extensions_this_week || 0}
                </strong>
              </span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/80 shadow-lg shadow-slate-200/20 p-6 flex flex-col min-h-[430px] transition-all hover:shadow-xl hover:shadow-indigo-100/20">
          <div className="flex justify-between items-start mb-6 shrink-0">
            <div>
              <h3 className="font-black text-lg text-slate-800 tracking-tight">
                Trạng thái công việc theo phòng ban
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Xám: đang thực hiện · Xanh: đã hoàn thành · Hồng đỏ: trễ hạn
              </p>
            </div>
          </div>

          {chartData.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-sm font-bold text-slate-300 uppercase tracking-widest bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
              Chưa có dữ liệu phòng ban
            </div>
          ) : (
            <div className="flex-1 w-full min-h-[290px] -ml-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                  barCategoryGap="30%"
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#e2e8f0"
                  />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#475569", fontSize: 11, fontWeight: 700 }}
                    dy={10}
                    interval={0}
                    tickFormatter={(value) =>
                      String(value).length > 16
                        ? `${String(value).slice(0, 16)}...`
                        : String(value)
                    }
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#475569", fontSize: 11, fontWeight: 700 }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    cursor={{ fill: "#f8fafc" }}
                    formatter={(
                      value: number | string,
                      name: string,
                      props: any,
                    ) => {
                      if (name === "Đang thực hiện") {
                        return [
                          `${value} task`,
                          `Đang thực hiện (${props?.payload?.raw_in_progress || 0}) + nguy cơ trễ (${props?.payload?.at_risk || 0})`,
                        ];
                      }
                      return [`${value} task`, name];
                    }}
                    contentStyle={{
                      borderRadius: "12px",
                      border: "none",
                      boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
                      fontWeight: 600,
                      fontSize: "12px",
                      padding: "8px 12px",
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={32}
                    iconType="circle"
                    wrapperStyle={{ fontSize: 12, fontWeight: 700 }}
                  />
                  <Bar
                    dataKey="in_progress"
                    name="Đang thực hiện"
                    stackId="status"
                    fill="#cbd5e1"
                    radius={[0, 0, 4, 4]}
                    barSize={32}
                    maxBarSize={32}
                  />
                  <Bar
                    dataKey="completed"
                    name="Đúng hạn"
                    stackId="status"
                    fill="#10b981"
                    radius={[0, 0, 0, 0]}
                    barSize={32}
                    maxBarSize={32}
                  />
                  <Bar
                    dataKey="overdue"
                    name="Trễ hạn"
                    stackId="status"
                    fill="#fda4af"
                    radius={[4, 4, 0, 0]}
                    barSize={32}
                    maxBarSize={32}
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
