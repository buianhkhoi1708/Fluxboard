import React, { useMemo } from 'react';
import { 
  BarChart, Bar, 
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { MoreVertical, AlertTriangle, ShieldAlert, Zap, Clock } from 'lucide-react';
import type { ManagerDashboardData } from '../api/dashboardApi';

interface ManagerDashboardProps {
  data: ManagerDashboardData | null;
}

const COLORS = ['#0ea5e9', '#f59e0b', '#ec4899', '#10b981', '#8b5cf6', '#64748b', '#0284c7', '#f43f5e'];

// Thêm export skeleton
export const ManagerDashboardSkeleton = () => (
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 pb-12 animate-pulse">
    {/* Cột 1: Donut chart skeleton */}
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/80 p-6 min-h-[480px] space-y-4">
      <div className="h-5 w-48 bg-slate-200 rounded-md" />
      <div className="flex justify-center">
        <div className="w-40 h-40 rounded-full bg-slate-200" />
      </div>
      <div className="space-y-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded bg-slate-200" />
              <div className="h-4 w-24 bg-slate-200 rounded-md" />
            </div>
            <div className="h-4 w-12 bg-slate-200 rounded-md" />
          </div>
        ))}
      </div>
    </div>
    {/* Cột 2: Task list skeleton */}
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/80 p-6 min-h-[480px] space-y-4">
      <div className="h-5 w-36 bg-slate-200 rounded-md" />
      {[...Array(4)].map((_, i) => (
        <div key={i} className="p-4 rounded-xl bg-slate-100 space-y-2">
          <div className="h-4 w-3/4 bg-slate-200 rounded-md" />
          <div className="flex gap-2">
            <div className="h-3 w-16 bg-slate-200 rounded-md" />
            <div className="h-3 w-12 bg-slate-200 rounded-md" />
          </div>
        </div>
      ))}
    </div>
    {/* Cột 3: Bar chart skeleton */}
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/80 p-6 min-h-[480px] space-y-4">
      <div className="h-5 w-32 bg-slate-200 rounded-md" />
      <div className="h-64 bg-slate-100 rounded-2xl" />
    </div>
  </div>
);

const ManagerDashboard = ({ data }: ManagerDashboardProps) => {
   if (!data) return <ManagerDashboardSkeleton />;

  const teamWorkload = data.team_workload_capacity || [];
  const atRiskTasks = data.at_risk_tasks || [];
  const aiEfficiency = data.ai_efficiency || [];

  // Dữ liệu cho donut chart
  const workloadChartData = useMemo(() => {
    return teamWorkload.map(user => ({
      name: user.full_name,
      value: user.current_points,
      status: user.status
    }));
  }, [teamWorkload]);

  const totalPoints = workloadChartData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 pb-12 animate-in fade-in zoom-in-95 duration-700">
      
      {/* ========== CỘT 1: DONUT CHART (TEAM WORKLOAD) ========== */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/80 shadow-lg shadow-slate-200/20 p-6 flex flex-col min-h-[480px] transition-all hover:shadow-xl hover:shadow-indigo-100/20">
        <div className="flex justify-between items-start mb-4 shrink-0">
          <div>
            <h3 className="font-black text-lg text-slate-800 tracking-tight">Khối lượng công việc</h3>
            <p className="text-xs text-slate-500 font-medium mt-1">Story points hiện tại của Team</p>
          </div>
          <button className="text-slate-300 hover:text-indigo-600 p-1.5 rounded-xl hover:bg-indigo-50 transition-colors">
            <MoreVertical size={20} />
          </button>
        </div>

        {workloadChartData.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-sm font-bold text-slate-300 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
            Chưa có dữ liệu Team
          </div>
        ) : (
          <>
            <div className="flex-1 w-full relative flex items-center justify-center mt-2">
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={workloadChartData}
                    cx="50%" cy="50%"
                    innerRadius={75} outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {workloadChartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.status === 'OVERLOADED' ? '#ef4444' : COLORS[index % COLORS.length]} 
                        className="transition-all duration-300 hover:opacity-80"
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => [`${value} Pts`, 'Đang gánh']} 
                    contentStyle={{
                      borderRadius: '12px', border: 'none', boxShadow: '0 8px 20px rgba(0,0,0,0.08)',
                      fontWeight: 600, fontSize: '12px', padding: '8px 12px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>

              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-2 text-center">
                <span className="text-4xl font-black text-slate-800 leading-none tracking-tighter">{totalPoints}</span>
                <span className="text-[11px] font-extrabold text-slate-400 mt-1.5 uppercase tracking-widest">Tổng Pts</span>
              </div>
            </div>

            <div className="shrink-0 pt-5 mt-4 border-t border-slate-100 h-[140px] overflow-y-auto pr-2 custom-scrollbar">
              <div className="space-y-3.5">
                {workloadChartData.map((user, idx) => (
                  <div key={idx} className="flex justify-between items-center group cursor-default">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-md shadow-sm ${user.status === 'OVERLOADED' ? 'bg-red-500 animate-pulse ring-2 ring-red-200' : ''}`} 
                        style={user.status !== 'OVERLOADED' ? { backgroundColor: COLORS[idx % COLORS.length] } : {}} />
                      <span className="text-sm font-bold text-slate-700 group-hover:text-indigo-600 transition-colors line-clamp-1">{user.name}</span>
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0">
                      {user.status === 'OVERLOADED' && (
                        <span className="text-[10px] px-2 py-1 rounded-md bg-red-100 text-red-600 font-black uppercase tracking-wider">Quá tải</span>
                      )}
                      <span className="text-base font-black text-slate-800">{user.value} <span className="text-slate-400 text-xs font-semibold">pts</span></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* ========== CỘT 2: DANH SÁCH TASK CHÁY HẠN ========== */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/80 shadow-lg shadow-slate-200/20 p-6 flex flex-col min-h-[480px] transition-all hover:shadow-xl hover:shadow-indigo-100/20">
        <div className="flex justify-between items-start mb-5 shrink-0">
          <div>
            <h3 className="font-black text-lg text-slate-800 tracking-tight">Nguy Cơ Cháy Hạn</h3>
            <p className="text-xs text-rose-500 font-bold mt-1 flex items-center gap-1.5">
              <ShieldAlert size={14} strokeWidth={2.5}/> Top 10 task khẩn cấp
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 -mr-2 custom-scrollbar">
          {atRiskTasks.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-60 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-4 text-slate-300 shadow-sm">
                <Clock size={32} strokeWidth={1.5}/>
              </div>
              <p className="text-[15px] font-bold text-slate-500">Mọi thứ đang trong tầm kiểm soát</p>
            </div>
          ) : (
            <div className="space-y-4">
              {atRiskTasks.map((task, idx) => (
                <div key={idx} className="p-4 bg-white border border-rose-100 shadow-sm rounded-xl hover:shadow-md hover:border-rose-200 transition-all cursor-pointer group">
                  <div className="flex justify-between items-start gap-3 mb-2.5">
                    <h4 className="text-sm font-bold text-slate-800 line-clamp-2 leading-snug group-hover:text-rose-600 transition-colors">{task.title}</h4>
                    <span className="shrink-0 text-[10px] font-black px-2.5 py-1 rounded-lg bg-rose-50 text-rose-600 uppercase tracking-wider border border-rose-100/50">
                      {task.deadline_status === 'OVERDUE' ? 'Đã trễ' : 'Nguy hiểm'}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-semibold text-slate-500">
                    <span className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-md">
                      <AlertTriangle size={14} className="text-amber-500"/> 
                      <span className="text-slate-700 capitalize">{task.priority}</span>
                    </span>
                    <span className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-md">
                      ⏱️ Xin thêm: <span className="text-slate-700 font-bold">{task.extension_count}</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ========== CỘT 3: BAR CHART (AI EFFICIENCY) ========== */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/80 shadow-lg shadow-slate-200/20 p-6 flex flex-col min-h-[480px] transition-all hover:shadow-xl hover:shadow-indigo-100/20">
        <div className="flex justify-between items-start mb-5 shrink-0">
          <div>
            <h3 className="font-black text-lg text-slate-800 tracking-tight">AI vs Thực Tế</h3>
            <p className="text-xs text-slate-500 font-medium mt-1">So sánh điểm AI gợi ý & điểm Chốt</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-sm border border-indigo-100">
            <Zap size={20} strokeWidth={2.5}/>
          </div>
        </div>

        {aiEfficiency.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-sm font-bold text-slate-300 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
            AI chưa có dữ liệu đánh giá
          </div>
        ) : (
          <>
            <div className="shrink-0 mb-5 space-y-2 flex justify-center gap-6 bg-white py-2 rounded-xl border border-slate-100 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-600 uppercase tracking-wider">
                <div className="w-3 h-3 rounded-md bg-indigo-500 shadow-sm"/> AI Dự Đoán
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-600 uppercase tracking-wider">
                <div className="w-3 h-3 rounded-md bg-emerald-400 shadow-sm"/> Chốt Thực Tế
              </div>
            </div>

            <div className="flex-1 w-full relative -ml-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={aiEfficiency} margin={{top: 10, right: 0, left: -15, bottom: 0}}>
                  <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="task_title" 
                    axisLine={false} tickLine={false} 
                    tick={{fill: '#475569', fontSize: 11, fontWeight: 700}} 
                    dy={12}
                    tickFormatter={(val) => val.length > 7 ? val.substring(0, 7) + '...' : val} 
                  />
                  <YAxis 
                    axisLine={false} tickLine={false} 
                    tick={{fill: '#475569', fontSize: 12, fontWeight: 700}} 
                    dx={-5}
                  />
                  <Tooltip 
                    cursor={{fill: '#f8fafc'}} 
                    contentStyle={{
                      borderRadius: '12px', border: 'none', boxShadow: '0 8px 20px rgba(0,0,0,0.08)',
                      fontWeight: 600, fontSize: '12px', padding: '8px 12px'
                    }}
                  />
                  <Bar dataKey="ai_suggested_point" name="AI Dự Đoán" fill="#6366f1" barSize={18} radius={[6, 6, 0, 0]} />
                  <Bar dataKey="actual_point" name="Điểm Chốt" fill="#34d399" barSize={18} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ManagerDashboard;