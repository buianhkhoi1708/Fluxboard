import React, { useEffect } from 'react';
import { useOrganizationStore } from '../features/organization/state/useOrganizationStore';

export const OrganizationPage = () => {
  const { orgTree, fetchOrgTree, loading } = useOrganizationStore();

  useEffect(() => { fetchOrgTree(); }, []);

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Cấu trúc Tổ chức</h1>
        <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg shadow-indigo-100">
          + Thêm Phòng Ban
        </button>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {orgTree.map((dept) => (
          <div key={dept.id} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
            {/* Header Phòng Ban - API 1.1 mapping */}
            <div className="flex items-center justify-between mb-6 border-b pb-4">
              <div>
                <h2 className="text-xl font-bold text-indigo-900">{dept.name}</h2>
                <p className="text-sm text-slate-400">Quản lý: <span className="text-slate-600 font-medium">{dept.managerName || "Bùi Anh Khôi"}</span></p>
              </div>
              <span className="px-3 py-1 bg-green-100 text-green-600 text-xs font-bold rounded-full">{dept.status}</span>
            </div>

            {/* Danh sách Team - API 2.1 mapping */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {dept.teams?.map((team) => (
                <div key={team.id} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-bold text-slate-700">{team.name}</h3>
                    <span className="text-[10px] bg-white px-2 py-1 rounded border text-slate-400">Lead: {team.leadName}</span>
                  </div>
                  
                  {/* Members - API 4.1 mapping */}
                  <div className="flex -space-x-2">
                    {team.members?.map((m) => (
                      <div key={m.id} className="w-8 h-8 rounded-full border-2 border-white bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-600" title={m.fullName}>
                        {m.fullName.charAt(0)}
                      </div>
                    ))}
                    <button className="w-8 h-8 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 text-xs hover:bg-white">+</button>
                  </div>
                </div>
              ))}
              <button className="border-2 border-dashed border-slate-200 rounded-xl p-4 flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-all">
                + Thêm Nhóm Mới
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};