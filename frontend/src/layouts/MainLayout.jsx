import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar'; 
import TopNavbar from './TopNavbar'; 

import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const MainLayout = () => {

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch('http://localhost:8080/api/v1/health-check');
        if (res.ok) {
          console.log('🟢 Kết nối Backend thành công!');
        } else {
          console.warn('🔴 Backend phản hồi lỗi!');
        }
      } catch (err) {
        console.error('⚪ Backend đang Offline hoặc lỗi CORS:', err);
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
          <div className="flex-1 overflow-auto bg-slate-50/50 p-6 md:p-8">
            <Outlet />
          </div>
        </main>
      </div>

      <ToastContainer 
        position="top-right" 
        autoClose={4000} 
        hideProgressBar={false} 
        newestOnTop={true} 
        closeOnClick 
        pauseOnHover 
        theme="light" 
      />
    </div>
  );
};

export default MainLayout;