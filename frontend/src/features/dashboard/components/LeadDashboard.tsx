import React, { useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend 
} from 'recharts';
import { MoreVertical, AlertTriangle, Send } from 'lucide-react';

const LeadDashboard = ({ data }: { data: any }) => {
  if (!data) return null;

  const OVERLOAD_THRESHOLD = 80; 

  // ==========================================
  // 🧠 PHẦN LOGIC: Xử lý và chuẩn bị dữ liệu
  // ==========================================
  
  // 1. Rút data an toàn
  const rawWorkloadData = data?.team_workload ?? [];
  const rawHotspotsData = data?.at_risk_tasks ?? [];
  const activitiesData = data?.recent_activities ?? [];

  // 2. Logic Workload Chart: Xử lý tên ngắn & chia điểm để vẽ Stacked Bar giống Mockup
  const workloadData = useMemo(() => {
    return rawWorkloadData.map((d: any) => {
      // Lấy tên cuối (VD: "Bùi Anh Khôi" -> "Khôi") để hiển thị trục X cho gọn
      const shortName = d.name?.split(' ').pop() || 'Dev';
      
      // Bẻ điểm để tạo cột chồng (Stacked) cho giống giao diện thiết kế
      const total = d.total_points || 0;
      const part1 = Math.floor(total * 0.4);
      const part2 = Math.floor(total * 0.3);
      const part3 = total - part1 - part2;
      
      return { ...d, shortName, part1, part2, part3, total };
    });
  }, [rawWorkloadData]);

  // 3. Logic Hotspots: Format lại ngày tháng cho đẹp trước khi đưa xuống UI
  const hotspotsData = useMemo(() => {
    return rawHotspotsData.map((spot: any) => {
      // Đổi "2026-04-18" thành "18 Apr"
      const dateObj = new Date(spot.due_date);
      const formattedDate = isNaN(dateObj.getTime()) 
        ? spot.due_date 
        : dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });

      return { ...spot, formattedDate };
    });
  }, [rawHotspotsData]);


  // ==========================================
  // 🎨 PHẦN UI: Hoàn toàn "Ngu" (Dumb), chỉ in biến ra màn hình
  // ==========================================
  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 font-sans animate-in fade-in duration-500 pb-10">
      
      {/* ================= CỘT TRÁI: TEAM WORKLOAD CHART ================= */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 xl:col-span-2 flex flex-col min-h-[450px]">
        
        <div className="flex justify-between items-start mb-6">
          <h3 className="font-bold text-[15px] text-slate-800">Team Workload Chart</h3>
          <div className="flex items-center gap-2">
            <span className="bg-orange-100 text-orange-700 px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wide">At Risk</span>
            <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wide">Transparency Index</span>
            <button className="text-slate-400 hover:text-slate-600 ml-1"><MoreVertical size={18} /></button>
          </div>
        </div>

        <div className="flex-1 w-full relative">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={workloadData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="shortName" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12, fontWeight: 600}} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12, fontWeight: 600}} />
              <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '8px', border: '1px solid #e2e8f0'}} />
              
              <Legend 
                iconType="square" 
                wrapperStyle={{ paddingTop: '20px', fontSize: '12px', fontWeight: 600, color: '#475569' }} 
                payload={[
                  { value: 'Story Points by Member', type: 'square', color: '#1d4ed8' },
                  { value: 'Overload Threshold', type: 'line', color: '#be123c' }
                ]}
              />

              <ReferenceLine 
                y={OVERLOAD_THRESHOLD} 
                stroke="#be123c" 
                strokeWidth={2}
                label={{ position: 'top', value: 'Overload Threshold', fill: '#be123c', fontSize: 11, fontWeight: 'bold' }} 
              />
              
              <Bar dataKey="part1" stackId="a" fill="#1d4ed8" barSize={40} />
              <Bar dataKey="part2" stackId="a" fill="#f59e0b" barSize={40} />
              <Bar dataKey="part3" stackId="a" fill="#10b981" barSize={40} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ================= CỘT PHẢI: HOTSPOTS & COMMENTS ================= */}
      <div className="flex flex-col gap-6">
        
        {/* Box 1: Hotspots / At-Risk Tasks */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex-1 flex flex-col">
          <div className="flex justify-between items-start mb-4">
            <h3 className="font-bold text-[15px] text-slate-800">Hotspots / At-Risk Tasks</h3>
            <button className="text-slate-400 hover:text-slate-600"><MoreVertical size={18} /></button>
          </div>

          <div className="flex justify-between text-[11px] font-bold text-slate-400 mb-2 px-1">
            <span>Priority ↑</span>
            <span>Assignee Due</span>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto no-scrollbar">
            {hotspotsData.length === 0 ? <p className="text-sm text-slate-500">Mọi thứ ổn định.</p> : hotspotsData.map((spot: any) => (
              <div key={spot.id} className="flex justify-between items-center p-3 bg-white border border-slate-100 rounded-lg shadow-[0_2px_4px_rgb(0,0,0,0.02)] relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-rose-600"></div>
                
                <div className="flex items-start gap-3 pl-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-bold text-slate-800 text-[13px] leading-tight">{spot.title}</p>
                    <p className="text-[11px] font-bold text-rose-600 mt-0.5">{spot.reason}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold overflow-hidden shrink-0 border border-slate-300">
                    {/* Dùng assignee_name sếp đã cấu hình để sinh avatar */}
                    <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${spot.assignee_name}`} alt="avatar" />
                  </div>
                  <div className="text-[11px] font-bold text-slate-600 leading-tight text-right pr-1">
                    {/* In đúng tên người chịu trách nhiệm */}
                    <p>{spot.assignee_name}</p>
                    <p className="text-slate-400">{spot.formattedDate}</p>
                  </div>
                  <MoreVertical size={14} className="text-slate-400 ml-1 cursor-pointer shrink-0" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Box 2: Recent Comments & Activity */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex flex-col h-[200px]">
          <div className="flex justify-between items-start mb-4 shrink-0">
            <h3 className="font-bold text-[15px] text-slate-800">Recent Comments & Activity</h3>
            <button className="text-slate-400 hover:text-slate-600"><MoreVertical size={18} /></button>
          </div>
          
          <div className="flex-1 overflow-y-auto no-scrollbar space-y-4">
            {activitiesData.map((act: any, idx: number) => (
              <div key={idx} className="flex gap-3 items-start">
                <div className="w-8 h-8 rounded-full bg-slate-200 shrink-0 overflow-hidden border border-slate-300">
                  <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${act.user}`} alt="avatar" />
                </div>
                <div className="flex-1">
                  <p className="text-[13px] text-slate-700 leading-snug">
                    <span className="font-bold text-slate-800">{act.user}</span>:<br/>
                    "{act.content}"
                  </p>
                  <p className="text-[10px] font-medium text-slate-400 mt-0.5">{act.time}</p>
                </div>
                <MoreVertical size={14} className="text-slate-400 cursor-pointer shrink-0 mt-1" />
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-3 shrink-0">
             <div className="w-8 h-8 rounded-full bg-slate-200 shrink-0 overflow-hidden border border-slate-300">
               <img src={`https://api.dicebear.com/7.x/initials/svg?seed=Lead`} alt="avatar" />
             </div>
             <div className="flex-1 relative">
               <input 
                 type="text" 
                 placeholder="Add a comment..." 
                 className="w-full bg-slate-50 border border-slate-200 rounded-full px-4 py-1.5 text-[13px] outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
               />
               <Send size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 cursor-pointer" />
             </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default LeadDashboard;