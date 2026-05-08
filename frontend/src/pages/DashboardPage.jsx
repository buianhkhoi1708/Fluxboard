import React, { useEffect, useState } from 'react';
import { useDashboardStore } from '../features/dashboard/store/useDashboardStore';
import AdminDashboard from '../features/dashboard/components/AdminDashboard';
import ManagerDashboard from '../features/dashboard/components/ManagerDashboard';
import LeadDashboard from '../features/dashboard/components/LeadDashboard';
import MemberDashboard from '../features/dashboard/components/MemberDashboard';

const DashboardPage = () => {
  const [activeRole, setActiveRole] = useState('SYSTEM_ADMIN'); 
  
  const { data, isLoading, error, fetchData } = useDashboardStore();

  useEffect(() => {
    fetchData(activeRole);
  }, [activeRole, fetchData]);

  const roles = ['SYSTEM_ADMIN', 'MANAGER', 'LEAD', 'MEMBER'];

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto w-full h-full overflow-y-auto bg-slate-50">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <h1 className="text-3xl font-black text-slate-800">Dashboard</h1>
        
        <div className="flex bg-slate-200 p-1.5 rounded-xl gap-1 overflow-x-auto max-w-full">
          {roles.map((r) => (
            <button 
              key={r} 
              onClick={() => setActiveRole(r)} 
              className={`px-4 py-2 text-sm font-bold rounded-lg transition-all whitespace-nowrap ${
                activeRole === r ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-300/50'
              }`}
            >
              {r.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-[400px]">
           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : error ? (
        <div className="text-center text-rose-500 p-10 font-bold bg-rose-50 rounded-2xl border border-rose-200">
          {error}
        </div>
      ) : (
        <>
          {activeRole === 'SYSTEM_ADMIN' && <AdminDashboard data={data} />}
          {activeRole === 'MANAGER' && <ManagerDashboard data={data} />}
          {activeRole === 'LEAD' && <LeadDashboard data={data} />}
          {activeRole === 'MEMBER' && <MemberDashboard data={data} />}
        </>
      )}

    </div>
  );
};

export default DashboardPage;