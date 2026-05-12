import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { MoreVertical, UserCog, Trash2 } from 'lucide-react';

// ==========================================
// StatCard – gọn, linh hoạt
// ==========================================
const StatCard = ({ title, value, children, className = "" }) => (
  <div className={`bg-white p-5 rounded-2xl shadow-sm hover:shadow-md border border-slate-200/80 transition-all duration-300 flex flex-col ${className}`}>
    <div className="flex justify-between items-start mb-2">
      <h3 className="font-bold text-[15px] text-slate-700">{title}</h3>
      <button className="text-slate-400 hover:text-indigo-600 hover:bg-slate-100 p-1 rounded-md transition-colors">
        <MoreVertical size={18} />
      </button>
    </div>
    {value !== undefined && <div className="text-[40px] leading-none font-bold tracking-tight text-slate-800">{value}</div>}
    {children && <div className="mt-2">{children}</div>}
  </div>
);

// ==========================================
// AdminDashboard – tối ưu trực quan
// ==========================================
const AdminDashboard = ({ data }) => {
  if (!data) return null;

  const cards = data?.cards ?? {};
  const projectStatusDistribution = data?.project_status_distribution ?? [];
  const atRiskProjects = data?.at_risk_projects ?? [];
  const auditLogs = data?.audit_logs ?? [];
  const membersByDepartment = data?.members_by_department ?? []; // [{ department, count }]

  const chartData = useMemo(() => {
    return projectStatusDistribution.map((item) => ({
      name: item.status,
      value: item.count,
      color: item.color
    }));
  }, [projectStatusDistribution]);

  const projectStatusList = useMemo(() => {
    return atRiskProjects.map((project) => ({
      name: project.name,
      value: project.status,
      isBadge: project.status === 'At Risk' || project.status === 'Delayed'
    }));
  }, [atRiskProjects]);

  return (
    <div className="space-y-5 font-sans text-slate-800 animate-in fade-in zoom-in-95 duration-500 pb-10">
      
      {/* ================= ROW 1: 4 CARD CHÍNH ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Users */}
        <StatCard title="Total Users" value={cards.total_users?.toLocaleString()} />
        
        {/* Active Projects */}
        <StatCard title="Active Projects">
          <div className="flex items-end gap-6 pb-1">
            <div className="flex flex-col">
              <span className="text-[36px] leading-none font-bold text-slate-800">{cards.projects?.active}</span>
              <span className="text-sm font-semibold text-slate-500 mt-1">Active</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[22px] leading-none font-bold text-slate-800">{cards.projects?.archived}</span>
              <span className="text-sm font-semibold text-slate-500 mt-1">Archived</span>
            </div>
          </div>
        </StatCard>

        {/* Departments – hiển thị tổng + danh sách phòng ban */}
        <StatCard title="Departments" value={cards.total_departments}>
          <div className="mt-3 space-y-2 max-h-[100px] overflow-y-auto pr-1">
            {membersByDepartment.length === 0 ? (
              <p className="text-sm text-slate-400 italic">No department data</p>
            ) : (
              membersByDepartment.map((dept, idx) => (
                <div key={idx} className="flex justify-between items-center text-sm border-b border-slate-100 pb-1 last:border-0">
                  <span className="font-medium text-slate-700 truncate">{dept.department}</span>
                  <span className="font-bold text-indigo-600 ml-2">{dept.count}</span>
                </div>
              ))
            )}
          </div>
        </StatCard>

        {/* Audit Log */}
        <StatCard title="Audit Log">
          <div className="space-y-3 mt-1 max-h-[100px] overflow-y-auto">
            {auditLogs.length === 0 ? (
              <p className="text-sm text-slate-400 italic">No activities recorded.</p>
            ) : (
              auditLogs.slice(0, 2).map((log, idx) => (
                <div key={log.id || idx} className="flex items-start gap-2.5 group cursor-pointer">
                  {log.actor === 'System' ? <UserCog size={16} className="text-slate-400 group-hover:text-indigo-500 shrink-0 mt-0.5" /> : <Trash2 size={16} className="text-slate-400 group-hover:text-rose-500 shrink-0 mt-0.5" />}
                  <p className="text-[13px] leading-snug font-medium text-slate-600 group-hover:text-slate-800 line-clamp-2">{log.action}</p>
                </div>
              ))
            )}
          </div>
        </StatCard>
      </div>

      {/* ================= ROW 2: CHI TIẾT & BIỂU ĐỒ ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        
        {/* Cột bên trái: Members Info */}
        <div className="flex flex-col gap-5">
          <StatCard title="Members" value={cards.total_members?.toLocaleString()} />
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex-1 flex flex-col justify-center">
            <div className="space-y-4">
              <div className="flex justify-between items-center text-[14px] font-medium">
                <span className="text-slate-500">Total Users</span>
                <span className="font-bold text-slate-800">{cards.total_users?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-[14px] font-medium">
                <span className="text-slate-500">Active Members</span>
                <span className="font-bold text-emerald-600">{cards.total_members?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-[14px] font-medium">
                <span className="text-slate-500">Archived Projects</span>
                <span className="font-bold text-slate-800">{cards.projects?.archived}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Project Status List */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col min-h-[320px]">
          <div className="flex justify-between items-start mb-4 shrink-0">
            <h3 className="font-bold text-[16px] text-slate-800">Project Status</h3>
            <button className="text-slate-400 hover:text-indigo-600 p-1"><MoreVertical size={18} /></button>
          </div>
          <div className="flex-1 overflow-y-auto pr-1 -mr-1">
            {projectStatusList.length === 0 ? (
              <p className="text-sm text-slate-400 italic text-center mt-10">No active risk projects</p>
            ) : (
              <div className="space-y-1">
                {projectStatusList.map((item, idx) => (
                  <div key={idx} className="group flex justify-between items-center py-2.5 border-b border-slate-100 last:border-0 hover:bg-slate-50 px-2 -mx-2 rounded-lg transition-colors">
                    <span className="text-[14px] font-semibold text-slate-700 group-hover:text-indigo-600 truncate pr-2">{item.name}</span>
                    {item.isBadge ? (
                      <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold uppercase shadow-sm shrink-0 ${item.value === 'At Risk' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                        {item.value}
                      </span>
                    ) : (
                      <span className="text-[15px] font-bold text-slate-800 shrink-0">{item.value}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Project Status Distribution Chart */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col min-h-[320px]">
          <div className="flex justify-between items-start mb-4 shrink-0">
            <h3 className="font-bold text-[16px] text-slate-800">Project Status Distribution</h3>
            <button className="text-slate-400 hover:text-indigo-600 p-1"><MoreVertical size={18} /></button>
          </div>
          <div className="flex-1 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12, fontWeight: 600}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12, fontWeight: 600}} />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '10px', border: '1px solid #e2e8f0'}} />
                <Bar dataKey="value" barSize={48} radius={[6, 6, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AdminDashboard;