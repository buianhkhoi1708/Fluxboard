import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { MoreVertical, AlertTriangle, ShieldAlert, Zap, Clock, Users, CalendarDays, FolderKanban, Loader2 } from 'lucide-react';
import type { ManagerDashboardData } from '../api/dashboardApi';
import { useAiDeviationInsights } from '../hooks/useDashBoardQueries';

interface ManagerDashboardProps {
  data: ManagerDashboardData | null;
}

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ec4899', '#0ea5e9', '#8b5cf6', '#f43f5e', '#64748b'];

export const ManagerDashboardSkeleton = () => (
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 pb-8 animate-pulse">
    {[...Array(3)].map((_, i) => (
      <div key={i} className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/80 p-5 lg:h-[calc(100vh-210px)] lg:max-h-[520px] min-h-[390px] space-y-4">
        <div className="h-5 w-44 bg-slate-200 rounded-md" />
        <div className="h-4 w-56 bg-slate-100 rounded-md" />
        <div className="space-y-3 pt-2">
          {[...Array(4)].map((__, idx) => (
            <div key={idx} className="p-3 rounded-2xl bg-slate-100 space-y-2">
              <div className="flex justify-between">
                <div className="h-4 w-28 bg-slate-200 rounded-md" />
                <div className="h-4 w-16 bg-slate-200 rounded-md" />
              </div>
              <div className="h-2.5 w-full bg-slate-200 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    ))}
  </div>
);

const formatDateTime = (value?: string | null) => {
  if (!value) return 'Chưa có hạn';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Không rõ hạn';
  return date.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
};

const getInitial = (name?: string) => String(name || 'U').charAt(0).toUpperCase();

const ManagerDashboard = ({ data }: ManagerDashboardProps) => {
  const navigate = useNavigate();
  if (!data) return <ManagerDashboardSkeleton />;

  const teamWorkload = data.team_workload_capacity || [];
  const atRiskTasks = data.at_risk_tasks || [];
  const aiProject = (data.ai_efficiency || [])[0] || null;
  const aiProjectId = aiProject?.project_id || null;
  const { data: aiInsight, isLoading: isAiLoading, isError: isAiError, refetch: refetchAi } = useAiDeviationInsights(aiProjectId);

  const workloadSummary = useMemo(() => {
    return teamWorkload.reduce((acc, team) => {
      acc.completed += Number(team.completed_points || 0);
      acc.total += Number(team.total_points || 0);
      return acc;
    }, { completed: 0, total: 0 });
  }, [teamWorkload]);

  const aiChartData = useMemo(() => {
    if (!aiInsight && !aiProject) return [];
    const projectName = aiInsight?.project_name || aiProject?.project_name || 'Project';
    return [{
      name: projectName,
      ai_suggested_point: Number(aiInsight?.ai_suggested_point || 0),
      actual_point: Number(aiInsight?.actual_point || aiProject?.actual_point || 0),
      tasks_count: Number(aiInsight?.tasks_count || aiProject?.tasks_count || 0),
      boards_count: Number(aiProject?.boards_count || 0),
    }];
  }, [aiInsight, aiProject]);

  const openTask = (task: any) => {
    if (!task?.board_id || !task?.task_id) return;
    navigate(`/board/${task.board_id}?taskId=${task.task_id}`);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 pb-8 animate-in fade-in zoom-in-95 duration-700">
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/80 shadow-lg shadow-slate-200/20 p-5 flex flex-col lg:h-[calc(100vh-210px)] lg:max-h-[520px] min-h-[390px] transition-all hover:shadow-xl hover:shadow-indigo-100/20">
        <div className="flex justify-between items-start mb-4 shrink-0">
          <div>
            <h3 className="font-black text-lg text-slate-800 tracking-tight">Khối lượng công việc</h3>
            <p className="text-xs text-slate-500 font-medium mt-1">Story points hoàn thành / tổng theo team</p>
          </div>
          <button className="text-slate-300 hover:text-indigo-600 p-1.5 rounded-xl hover:bg-indigo-50 transition-colors">
            <MoreVertical size={20} />
          </button>
        </div>

        <div className="mb-4 rounded-2xl bg-gradient-to-br from-indigo-50 to-white border border-indigo-100 p-3.5 shrink-0">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Tổng phòng ban</p>
              <p className="mt-1 text-2xl font-black tracking-tight text-slate-800">{workloadSummary.completed}<span className="text-slate-300"> / </span>{workloadSummary.total}</p>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-white text-indigo-600 flex items-center justify-center shadow-sm border border-indigo-100">
              <Users size={20} />
            </div>
          </div>
        </div>

        {teamWorkload.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-sm font-bold text-slate-300 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">Chưa có dữ liệu Team</div>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto pr-2 -mr-2 custom-scrollbar space-y-3">
            {teamWorkload.map((team, idx) => {
              const total = Number(team.total_points || 0);
              const completed = Number(team.completed_points || 0);
              const percent = total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0;
              const color = COLORS[idx % COLORS.length];

              return (
                <div key={team.team_id || idx} className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm hover:border-indigo-200 hover:shadow-md transition-all">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: color }} />
                        <h4 className="text-sm font-black text-slate-800 truncate">{team.team_name || team.team_code || 'Team'}</h4>
                      </div>
                      <p className="text-[11px] font-bold text-slate-400 mt-1">{team.member_count || 0} thành viên</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-base font-black text-slate-800">{completed}<span className="text-slate-300"> / </span>{total}</p>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">points</p>
                    </div>
                  </div>
                  <div className="mt-3 h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${percent}%`, backgroundColor: color }} />
                  </div>
                  <div className="mt-2 flex justify-between text-[11px] font-bold text-slate-400">
                    <span>{percent}% hoàn thành</span>
                    <span>{total === 0 ? 'Chưa có estimate' : 'Có story point'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/80 shadow-lg shadow-slate-200/20 p-5 flex flex-col lg:h-[calc(100vh-210px)] lg:max-h-[520px] min-h-[390px] transition-all hover:shadow-xl hover:shadow-indigo-100/20">
        <div className="flex justify-between items-start mb-4 shrink-0">
          <div>
            <h3 className="font-black text-lg text-slate-800 tracking-tight">Nguy Cơ Cháy Hạn</h3>
            <p className="text-xs text-rose-500 font-bold mt-1 flex items-center gap-1.5">
              <ShieldAlert size={14} strokeWidth={2.5} /> Top 10 task gần hạn trong project của bạn
            </p>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto pr-2 -mr-2 custom-scrollbar">
          {atRiskTasks.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-60 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mb-3 text-slate-300 shadow-sm">
                <Clock size={28} strokeWidth={1.5} />
              </div>
              <p className="text-sm font-bold text-slate-500">Mọi thứ đang trong tầm kiểm soát</p>
            </div>
          ) : (
            <div className="space-y-3">
              {atRiskTasks.map((task, idx) => {
                const assignees = task.assignees || [];
                const isOverdue = task.deadline_status === 'OVERDUE';

                return (
                  <button key={task.task_id || idx} type="button" onClick={() => openTask(task)} className="w-full text-left p-3.5 bg-white border border-rose-100 shadow-sm rounded-xl hover:shadow-md hover:border-rose-300 hover:-translate-y-0.5 transition-all group">
                    <div className="flex justify-between items-start gap-3 mb-2.5">
                      <h4 className="text-sm font-bold text-slate-800 line-clamp-1 leading-snug group-hover:text-rose-600 transition-colors">{task.title}</h4>
                      <span className={`shrink-0 text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider border ${isOverdue ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                        {isOverdue ? 'Đã trễ' : 'Gần hạn'}
                      </span>
                    </div>

                    <div className="space-y-2 text-xs font-semibold text-slate-500">
                      <div className="flex items-center gap-2 bg-slate-50 px-2 py-1.5 rounded-lg">
                        <CalendarDays size={14} className={isOverdue ? 'text-rose-500' : 'text-amber-500'} />
                        <span className="text-slate-700">{formatDateTime(task.due_date)}</span>
                      </div>
                      <div className="flex items-center gap-2 bg-slate-50 px-2 py-1.5 rounded-lg">
                        <FolderKanban size={14} className="text-indigo-400" />
                        <span className="text-slate-700 truncate">{task.project_name || 'Project'} · {task.board_name || 'Board'}</span>
                      </div>
                      <div className="flex items-center gap-2 bg-slate-50 px-2 py-1.5 rounded-lg">
                        <AlertTriangle size={14} className="text-amber-500" />
                        <span className="capitalize">{task.priority || 'MEDIUM'}</span>
                        <span className="text-slate-300">•</span>
                        <span>{task.story_point || 0} pts</span>
                        <span className="text-slate-300">•</span>
                        <span>Xin thêm {task.extension_count || 0}</span>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-3">
                      <div className="flex items-center -space-x-2 min-h-[28px]">
                        {assignees.length === 0 ? (
                          <span className="text-[11px] font-bold text-slate-400">Chưa có người phụ trách</span>
                        ) : (
                          <>
                            {assignees.slice(0, 4).map((user, userIdx) => {
                              const name = user.full_name || user.email || 'User';
                              return user.avatar_url ? (
                                <img key={user.user_id || userIdx} src={user.avatar_url} alt={name} title={name} className="w-7 h-7 rounded-full object-cover border-2 border-white shadow-sm" />
                              ) : (
                                <div key={user.user_id || userIdx} title={name} className="w-7 h-7 rounded-full border-2 border-white bg-indigo-600 text-white flex items-center justify-center text-[10px] font-black shadow-sm">
                                  {getInitial(name)}
                                </div>
                              );
                            })}
                            {assignees.length > 4 && (
                              <div className="w-7 h-7 rounded-full border-2 border-white bg-slate-100 text-slate-500 flex items-center justify-center text-[10px] font-black">+{assignees.length - 4}</div>
                            )}
                          </>
                        )}
                      </div>
                      <span className="text-[11px] font-black text-slate-400">{isOverdue ? 'Quá hạn' : `${task.hours_left ?? 0}h còn lại`}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/80 shadow-lg shadow-slate-200/20 p-5 flex flex-col lg:h-[calc(100vh-210px)] lg:max-h-[520px] min-h-[390px] transition-all hover:shadow-xl hover:shadow-indigo-100/20">
        <div className="flex justify-between items-start mb-4 shrink-0">
          <div>
            <h3 className="font-black text-lg text-slate-800 tracking-tight">AI vs Thực Tế</h3>
            <p className="text-xs text-slate-500 font-medium mt-1">AI quét project rồi so với story point thực tế</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-sm border border-indigo-100">
            <Zap size={20} strokeWidth={2.5} />
          </div>
        </div>

        {!aiProjectId ? (
          <div className="flex-1 flex items-center justify-center text-sm font-bold text-slate-300 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">AI chưa có project đủ dữ liệu để quét</div>
        ) : isAiLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 px-6">
            <div className="relative mb-4">
              <div className="absolute inset-0 rounded-full bg-indigo-200 blur-xl opacity-50" />
              <Loader2 size={34} className="animate-spin text-indigo-600 relative z-10" />
            </div>
            <p className="text-sm font-black text-slate-700">AI đang quét bảng và ước tính effort...</p>
            <p className="text-xs font-semibold text-slate-400 mt-1">Vui lòng chờ trong giây lát</p>
          </div>
        ) : isAiError ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center bg-rose-50/50 rounded-2xl border border-dashed border-rose-200 px-6">
            <AlertTriangle size={34} className="text-rose-400 mb-3" />
            <p className="text-sm font-black text-slate-700">AI chưa quét được dữ liệu</p>
            <button type="button" onClick={() => refetchAi()} className="mt-4 rounded-xl bg-rose-600 px-4 py-2 text-xs font-black text-white hover:bg-rose-700 transition">Quét lại</button>
          </div>
        ) : aiChartData.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-sm font-bold text-slate-300 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">AI chưa có dữ liệu đánh giá</div>
        ) : (
          <>
            <div className="shrink-0 mb-3 rounded-2xl bg-slate-50 border border-slate-100 p-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Project được AI quét</p>
              <p className="mt-1 text-sm font-black text-slate-800 truncate">{aiChartData[0]?.name}</p>
              <p className="mt-1 text-[11px] font-bold text-slate-400">{aiChartData[0]?.boards_count || 0} board · {aiInsight?.scanned_tasks_count || aiChartData[0]?.tasks_count || 0} task có story point</p>
            </div>

            <div className="shrink-0 mb-2 flex flex-wrap justify-center gap-4 bg-white py-2 rounded-xl border border-slate-100 shadow-sm">
              <div className="flex items-center gap-2 text-[11px] font-bold text-slate-600 uppercase tracking-wider"><div className="w-3 h-3 rounded-md bg-indigo-500 shadow-sm" /> AI ước tính</div>
              <div className="flex items-center gap-2 text-[11px] font-bold text-slate-600 uppercase tracking-wider"><div className="w-3 h-3 rounded-md bg-emerald-400 shadow-sm" /> Thực tế chốt</div>
            </div>

            <div className="w-full h-[245px] -ml-3">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={aiChartData} margin={{ top: 8, right: 6, left: -12, bottom: 4 }} barCategoryGap="45%">
                  <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 10, fontWeight: 800 }} dy={8} tickFormatter={(val) => String(val).length > 13 ? `${String(val).slice(0, 13)}...` : String(val)} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 11, fontWeight: 700 }} dx={-4} width={34} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} formatter={(value: number | string, name: string) => [`${Number(value || 0)} pts`, name]} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 20px rgba(0,0,0,0.08)', fontWeight: 600, fontSize: '12px', padding: '8px 12px' }} />
                  <Legend verticalAlign="bottom" height={26} iconType="circle" wrapperStyle={{ fontSize: 11, fontWeight: 800 }} />
                  <Bar dataKey="ai_suggested_point" name="AI ước tính" fill="#6366f1" barSize={34} radius={[9, 9, 0, 0]} />
                  <Bar dataKey="actual_point" name="Thực tế chốt" fill="#34d399" barSize={34} radius={[9, 9, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {aiInsight?.comment && (
              <div className="mt-2 rounded-xl bg-indigo-50/70 border border-indigo-100 px-3 py-2 text-[11px] font-bold text-indigo-700 line-clamp-2">
                {aiInsight.comment}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ManagerDashboard;