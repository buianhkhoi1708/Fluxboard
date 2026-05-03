import React, { useState, useEffect } from 'react';
import ChangePasswordForm from '../features/board/components/ChangePassWordForm';
import { useAuthStore } from '../features/auth/store/useAuthStore';
import { useRbacStore } from '../features/rbac/store/useRbacStore'; 
import { useSettingStore } from '../features/settings/store/useSettingStore';

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState('profile');

  // Helper function để render class cho tab active
  const getTabClass = (tabName) => `w-full text-left px-4 py-3 rounded-xl font-semibold transition-all ${
    activeTab === tabName 
      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200/50' 
      : 'text-slate-600 hover:bg-indigo-50 hover:text-indigo-600'
  }`;

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto w-full h-full overflow-y-auto bg-slate-50">
      <h1 className="text-3xl font-bold text-slate-800 mb-8">Cài đặt hệ thống</h1>
      
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col md:flex-row min-h-[550px]">
        {/* Menu Tabs bên trái */}
        <div className="w-full md:w-72 bg-slate-50/50 border-r border-slate-200 p-5 shrink-0">
          <ul className="space-y-2">
            <li><button onClick={() => setActiveTab('profile')} className={getTabClass('profile')}>Hồ sơ cá nhân</button></li>
            <li><button onClick={() => setActiveTab('security')} className={getTabClass('security')}>Trung tâm bảo mật</button></li>
            <li><button onClick={() => setActiveTab('notifications')} className={getTabClass('notifications')}>Cấu hình thông báo</button></li>
          </ul>
        </div>

        {/* Nội dung Tab bên phải */}
        <div className="flex-1 p-8 md:p-10 relative">
          {activeTab === 'profile' && <ProfileTab />}
          {activeTab === 'security' && <div className="animate-in fade-in duration-300"><ChangePasswordForm /></div>}
          {activeTab === 'notifications' && <NotificationTab />}
        </div>
      </div>
    </div>
  );
};

// ==========================================
// COMPONENT TAB 1: HỒ SƠ CÁ NHÂN
// ==========================================
const ProfileTab = () => {
  const { user, updateUserProfile } = useAuthStore();
  const { roles, fetchInitialData } = useRbacStore();
  
  const { isSaving, message, saveProfile, clearMessage } = useSettingStore();

  const [name, setName] = useState(user?.full_name || '');
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar_url || `https://ui-avatars.com/api/?name=${name || 'User'}&background=random`);
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    if (roles.length === 0) fetchInitialData();
    clearMessage();
  }, [roles.length, fetchInitialData, clearMessage]);

  useEffect(() => {
    if (user) {
      setName(user.full_name || '');
      if (user.avatar_url) setAvatarPreview(user.avatar_url);
    }
  }, [user]);

  const matchedRole = roles.find((r) => r.id === user?.role_id || r.name === user?.system_role || r.id === user?.system_role);
  const displayRoleName = matchedRole?.name || user?.system_role || 'Chưa xác định';

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file); 
      setAvatarPreview(URL.createObjectURL(file)); 
    }
  };

  const onSaveClick = () => {
    const userId = user?.id ?? user?.user_id;
    if (!userId) return;
    
    saveProfile({
      userId,
      name,
      selectedFile,
      currentAvatar: avatarPreview,
      updateAuthStore: updateUserProfile
    }).then(() => setSelectedFile(null));
  };

  return (
    <div className="max-w-2xl animate-in fade-in duration-300">
      <h2 className="text-2xl font-bold text-slate-800 mb-8">Hồ sơ cá nhân</h2>
      
      {message.text && (
        <div className={`p-3 mb-6 rounded-xl text-sm font-medium border ${message.type === 'error' ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>
          {message.text}
        </div>
      )}

      <div className="flex items-center gap-6 mb-10">
        <img src={avatarPreview} alt="Avatar Preview" className="w-24 h-24 rounded-full object-cover border-4 border-slate-100 shadow-sm" />
        <div>
          <label className="cursor-pointer bg-white text-slate-700 px-5 py-2.5 rounded-xl font-semibold hover:bg-slate-50 transition border border-slate-200 shadow-sm block">
            Đổi ảnh đại diện
            <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
          </label>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Họ và tên</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-2.5 border border-slate-300 text-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email</label>
            <input type="email" value={user?.email || ''} readOnly className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 text-slate-500 font-medium rounded-xl cursor-not-allowed outline-none" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Phòng ban</label>
            <input type="text" value={user?.department || 'Chưa xác định'} readOnly className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 text-slate-500 font-medium rounded-xl cursor-not-allowed outline-none" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Vai trò (Role)</label>
            <input type="text" value={displayRoleName} readOnly className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 text-slate-500 font-medium rounded-xl cursor-not-allowed outline-none" />
          </div>
        </div>

        <button onClick={onSaveClick} disabled={isSaving} className="mt-8 bg-indigo-600 text-white px-8 py-2.5 rounded-xl font-bold hover:bg-indigo-700 active:scale-[0.98] transition-all disabled:opacity-70 flex items-center gap-2">
          {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
        </button>
      </div>
    </div>
  );
};

// ==========================================
// COMPONENT TAB 3: THÔNG BÁO 
// ==========================================
const NotificationTab = () => {
  const { notificationToggles, toggleNotification, saveNotificationSettings, isSaving } = useSettingStore();

  const ToggleSwitch = ({ label, stateKey }) => (
    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <button 
        onClick={() => toggleNotification(stateKey)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 focus:outline-none ${notificationToggles[stateKey] ? 'bg-indigo-600' : 'bg-slate-300'}`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-300 ${notificationToggles[stateKey] ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  );

  return (
    <div className="max-w-2xl animate-in fade-in duration-300">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Notification Center</h2>
          <p className="text-sm text-slate-500">Quản lý cách bạn nhận thông tin từ hệ thống.</p>
        </div>
        <button onClick={saveNotificationSettings} disabled={isSaving} className="bg-indigo-600 text-white px-5 py-2 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50">
          {isSaving ? 'Đang lưu...' : 'Lưu cấu hình'}
        </button>
      </div>
      
      <div className="space-y-8">
        <div>
          <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-4 border-b pb-2">Project Notifications</h3>
          <div className="space-y-3">
            <ToggleSwitch label="Khi được giao việc" stateKey="tasks" />
            <ToggleSwitch label="Nhắc nhở sắp đến hạn" stateKey="reminders" />
          </div>
        </div>

        <div>
          <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-4 border-b pb-2">Communication Channels</h3>
          <div className="space-y-3">
            <ToggleSwitch label="Thông báo toàn hệ thống" stateKey="announcements" />
            <ToggleSwitch label="Tin nhắn trực tiếp" stateKey="messages" />
            <ToggleSwitch label="Khi bị nhắc tên @" stateKey="mentions" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;