import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar'; 
import TopNavbar from './TopNavbar'; 

const MainLayout = () => {

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch('http://localhost:8080/api/v1/health-check');
        if (res.ok) {
          console.log('Backend connection successful!');
        } else {
          console.warn('Backend responded with an error!');
        }
      } catch (err) {
        console.error('Backend is offline or CORS error:', err);
      }
    };
    checkHealth();
  }, []);

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-slate-50 font-sans text-slate-800">
      <TopNavbar />
      
      <div className="flex flex-1 w-full overflow-hidden">
        <Sidebar />
        
        <main className="flex-1 w-full overflow-hidden flex flex-col bg-white shadow-[-4px_0_24px_-12px_rgba(0,0,0,0.05)] z-10">
          <div className="flex-1 overflow-hidden min-h-0 relative">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default MainLayout;