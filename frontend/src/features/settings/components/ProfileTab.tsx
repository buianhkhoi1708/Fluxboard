import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query'; // 🚀 Import thêm useQueryClient
import { useAuthUser, AUTH_KEYS } from '../../auth/hooks/useAuthQueries'; // 🚀 Nhúng hook Auth mới của sếp vào đây
import { useUpdateProfile } from '../hooks/useSettingQueries';
import { useSettingUiStore } from '../store/useSettingUIStore';
import { useRolesDictionary } from '../../rbac/hooks/useRbacQueries';
import { Loader2, AlertTriangle, CheckCircle2, Camera } from 'lucide-react';

export const ProfileTab: React.FC = () => {
  const queryClient = useQueryClient(); // 🚀 Khởi tạo queryClient để điều khiển cache
  
  // 🚀 BƯỚC 1: Thay thế useAuthStore của Zustand bằng hookuseAuthUser của TanStack
  const { data: user, isLoading: isLoadingUser } = useAuthUser(); 
  
  const { message, setMessage, clearMessage } = useSettingUiStore();
  const { mutate: updateProfile, isPending } = useUpdateProfile();
  const { data: roles = [], isLoading: isLoadingRoles } = useRolesDictionary();

  // Local State cho form input và preview ảnh
  const [name, setName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');

  // 🚀 BƯỚC 2: Đồng bộ dữ liệu từ Query Cache vào Form khi user tải xong
  useEffect(() => {
    if (user) {
      setName(user.full_name || '');
      setPreview(user.avatar_url || '');
    }
  }, [user]);

  useEffect(() => {
    clearMessage();
  }, [clearMessage]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setPreview(URL.createObjectURL(selected));
    }
  };

  const handleSave = () => {
    // Hỗ trợ linh hoạt cả id lẫn user_id từ cache
    const userId = user?.id || user?.user_id;
    if (!userId) return;

    updateProfile(
      { userId, name, file },
      {
        onSuccess: (data: any) => {
          setMessage('success', 'Cập nhật hồ sơ thành công!');
          
          // 🚀 BƯỚC 3: ĐẬP BẢO TÀNG CACHE CŨ - Ghi đè dữ liệu mới thẳng vào TanStack Cache
          queryClient.setQueryData(AUTH_KEYS.me, (old: any) => {
            if (!old) return old;
            
            const updatedUser = {
              ...old,
              full_name: data.name,
              avatar_url: data.avatarUrl 
                ? `${data.avatarUrl}?t=${Date.now()}` // Chống trình duyệt giữ cache ảnh cũ
                : old.avatar_url
            };

            // Đồng bộ luôn xuống localStorage để lần sau F5 không bị mất
            localStorage.setItem('user', JSON.stringify(updatedUser));
            return updatedUser;
          });
        },
        onError: (err: any) =>
          setMessage('error', err.response?.data?.message || 'Có lỗi xảy ra!'),
      }
    );
  };

  // Màn hình chờ nếu bốc dữ liệu User lúc đầu chưa kịp xong
  if (isLoadingUser) {
    return (
      <div className="w-full h-48 flex items-center justify-center gap-2 text-slate-400">
        <Loader2 size={24} className="animate-spin text-indigo-600" />
        <span className="text-sm font-medium">Đang tải thông tin tài khoản...</span>
      </div>
    );
  }

  const matchedRole = roles.find(
    (r: any) => r.id === user?.role_id || r.name === user?.system_role
  );
  const displayRoleName = isLoadingRoles
    ? 'Đang tải...'
    : matchedRole?.name || user?.system_role || 'Chưa xác định';

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Message báo lỗi / thành công */}
      {message.text && (
        <div
          className={`p-3 mb-6 rounded-xl text-sm font-medium border flex items-center gap-2 ${
            message.type === 'error'
              ? 'bg-rose-50 text-rose-700 border-rose-200'
              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
          }`}
        >
          {message.type === 'error' ? (
            <AlertTriangle className="w-4 h-4 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          )}
          {message.text}
        </div>
      )}

      {/* Avatar section */}
      <div className="flex items-center gap-5 mb-10">
        <div className="relative">
          <img
            src={
              preview ||
              `https://ui-avatars.com/api/?name=${name}&background=6366f1&color=fff&bold=true`
            }
            className="w-20 h-20 rounded-full object-cover ring-2 ring-white shadow-sm border border-slate-200 bg-white"
            alt="Avatar Preview"
          />
          <label className="absolute -bottom-1 -right-1 p-1.5 bg-indigo-600 text-white rounded-full cursor-pointer shadow-sm hover:bg-indigo-700 transition-colors">
            <Camera size={14} strokeWidth={2.5} />
            <input
              type="file"
              className="hidden"
              accept="image/*"
              onChange={handleFileChange}
            />
          </label>
        </div>
        <div>
          <p className="font-semibold text-slate-800">{name}</p>
          <p className="text-xs text-slate-500 mt-0.5">
            {file ? file.name : 'PNG, JPG hoặc GIF (tối đa 2MB)'}
          </p>
        </div>
      </div>

      {/* Form chỉnh sửa */}
      <div className="space-y-5 max-w-lg">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">
            Họ và tên
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none text-slate-800 placeholder-slate-400 transition-all bg-white/80 backdrop-blur-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            placeholder="Nhập họ tên"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={user?.email || ''}
              readOnly
              className="w-full px-4 py-2.5 bg-slate-100/80 border border-slate-200/80 text-slate-500 font-medium rounded-xl cursor-not-allowed outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Phòng ban
            </label>
            <input
              type="text"
              value={user?.department || 'Chưa xác định'}
              readOnly
              className="w-full px-4 py-2.5 bg-slate-100/80 border border-slate-200/80 text-slate-500 font-medium rounded-xl cursor-not-allowed outline-none"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Vai trò hệ thống
            </label>
            {isLoadingRoles ? (
              <div className="flex items-center gap-2 w-full px-4 py-2.5 bg-slate-100/80 border border-slate-200/80 rounded-xl">
                <Loader2 size={16} className="animate-spin text-slate-400" />
                <span className="text-sm text-slate-400 font-medium">Đang tải vai trò...</span>
              </div>
            ) : (
              <input
                type="text"
                value={displayRoleName}
                readOnly
                className="w-full px-4 py-2.5 bg-slate-100/80 border border-slate-200/80 text-slate-500 font-medium rounded-xl cursor-not-allowed outline-none"
              />
            )}
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={isPending}
          className="mt-8 w-full sm:w-auto bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-8 py-2.5 rounded-xl font-bold hover:from-indigo-700 hover:to-indigo-800 active:scale-[0.98] disabled:opacity-70 disabled:pointer-events-none transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-200/50"
        >
          {isPending ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Đang lưu...
            </>
          ) : (
            'Lưu thay đổi'
          )}
        </button>
      </div>
    </div>
  );
};