import React, { useMemo } from 'react';
import { 
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { MoreVertical, Target, CheckCircle2, Clock } from 'lucide-react';

const MemberDashboard = ({ data }: { data: any }) => {
  if (!data) return null;

  // ==========================================
  // 🧠 PHẦN LOGIC: Rút trích và tính toán
  // ==========================================
  const {
    my_contribution = { completed: 0, total: 0 },
    my_focus = [],
    sprint_history = []
  } = data;

  // Tính phần trăm hoàn thành task
  const contributionPercent = useMemo(() => {
    if (!my_contribution.total) return 0;
    return Math.round((my_contribution.completed / my_contribution.total) * 100);
  }, [my_contribution]);

  // Hàm helper sinh màu tự động cho Priority
  const getPriorityStyles = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'bg-rose-100 text-rose-700';
      case 'HIGH': return 'bg-orange-100 text-orange-700';
      case 'MEDIUM': return 'bg-blue-100 text-blue-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  // ==========================================
  // 🎨 PHẦN UI: Hiển thị (Dumb Component)
  // ==========================================
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans animate-in fade-in duration-500 pb-10">
      
      {/* ================= HÀNG 1: MY CONTRIBUTION & MY FOCUS ================= */}
      <div className="lg:col-span-1 flex flex-col gap-6">
        
        {/* Box 1: My Contribution (Progress) */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-start mb-6">
            <h3 className="font-bold text-[15px] text-slate-800 flex items-center gap-2">
              <Target size={18} className="text-indigo-600" /> My Contribution
            </h3>
            <button className="text-slate-400 hover:text-slate-600"><MoreVertical size={18} /></button>
          </div>
          
          <div className="flex items-end gap-2 mb-2">
            <span className="text-[40px] font-black leading-none text-slate-800">{my_contribution.completed}</span>
            <span className="text-[15px] font-bold text-slate-400 mb-1">/ {my_contribution.total} tasks</span>
          </div>
          
          <div className="w-full bg-slate-100 rounded-full h-3 mb-2 overflow-hidden">
            <div 
              className="bg-indigo-600 h-3 rounded-full transition-all duration-1000 ease-out relative" 
              style={{ width: `${contributionPercent}%` }}
            >
              <div className="absolute inset-0 bg-white/20 w-full h-full rounded-full animate-pulse"></div>
            </div>
          </div>
          <p className="text-right text-[12px] font-bold text-indigo-600">{contributionPercent}% Completed</p>
        </div>

        {/* Box 2: My Focus (To-do List) */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex-1 flex flex-col min-h-[250px]">
          <div className="flex justify-between items-start mb-5 shrink-0">
            <h3 className="font-bold text-[15px] text-slate-800">My Focus</h3>
            <button className="text-slate-400 hover:text-slate-600"><MoreVertical size={18} /></button>
          </div>
          
          <div className="flex-1 overflow-y-auto no-scrollbar space-y-3">
            {my_focus.length === 0 ? (
               <div className="h-full flex flex-col items-center justify-center text-slate-400">
                 <CheckCircle2 size={32} className="mb-2 opacity-50" />
                 <p className="text-sm font-medium">You're all caught up!</p>
               </div>
            ) : (
              my_focus.map((task: any) => (
                <div key={task.id} className="group p-3 border border-slate-100 rounded-xl hover:border-indigo-200 hover:shadow-sm transition-all bg-slate-50/50 hover:bg-white cursor-pointer flex flex-col gap-2">
                  <div className="flex justify-between items-start gap-2">
                    <p className="text-[13px] font-bold text-slate-700 group-hover:text-indigo-700 leading-tight">
                      {task.title}
                    </p>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider shrink-0 ${getPriorityStyles(task.priority)}`}>
                      {task.priority}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
                    <Clock size={12} /> <span>{task.due_date}</span>
                    <span className="mx-1 text-slate-300">•</span>
                    <span>{task.id}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* ================= HÀNG 2/CỘT PHẢI: SPRINT VELOCITY & TRANSPARENCY ================= */}
      <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col min-h-[450px]">
        <div className="flex justify-between items-start mb-6 shrink-0">
          <div>
            <h3 className="font-bold text-[15px] text-slate-800">Velocity & Transparency Index</h3>
            <p className="text-[12px] font-medium text-slate-500 mt-1">Your performance over recent sprints</p>
          </div>
          <button className="text-slate-400 hover:text-slate-600"><MoreVertical size={18} /></button>
        </div>

        <div className="flex-1 w-full relative -ml-4">
          <ResponsiveContainer width="100%" height="100%">
            {/* Dùng ComposedChart để kết hợp Cột và Đường */}
            <ComposedChart data={sprint_history}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12, fontWeight: 600}} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12, fontWeight: 600}} />
              <Tooltip 
                cursor={{fill: '#f8fafc'}} 
                contentStyle={{borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} 
              />
              <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px', fontWeight: 600 }} />
              
              {/* Cột: Story points hoàn thành */}
              <Bar dataKey="velocity" name="Velocity (Points)" barSize={40} fill="#3b82f6" radius={[4, 4, 0, 0]} />
              
              {/* Đường 1: Chỉ số AI đánh giá độ minh bạch */}
              <Line type="monotone" dataKey="transparency" name="Transparency Index" stroke="#10b981" strokeWidth={3} dot={{r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff'}} />
              
              {/* Đường 2: Dự đoán xu hướng (Nét đứt) */}
              <Line type="monotone" dataKey="trend" name="Expected Trend" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
};

export default MemberDashboard;