import React, { useState, useEffect } from 'react';
import { useProfileOverview, useUpdateProfile } from '../hooks/useSettingQueries';
import { useSettingUiStore } from '../store/useSettingUIStore';
import { Loader2, Camera, CheckCircle2, AlertTriangle } from 'lucide-react';

// Sử dụng chuỗi Base64 SVG làm ảnh đại diện mặc định để triệt tiêu lỗi mất kết nối mạng bên thứ ba
const DEFAULT_AVATAR =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='150' height='150' viewBox='0 0 150 150'><rect width='150' height='150' fill='%23cbd5e1'/><path d='M75 80c19.33 0 35-15.67 35-35S94.33 10 75 10 40 25.67 40 45s15.67 35 35 35zm0 15c-26.67 0-80 13.33-80 40v15h160v-15c0-26.67-53-40-80-40z' fill='%2394a3b8'/></svg>";

export const ProfileTab: React.FC = () => {
  const { data: profile, isLoading } = useProfileOverview();
  const { mutate: updateProfile, isPending } = useUpdateProfile();
  const { message, setMessage, clearMessage } = useSettingUiStore();

  const [name, setName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');

  useEffect(() => {
    if (profile) {
      setName(profile.full_name || '');
      setPreview(profile.avatar_url || DEFAULT_AVATAR);
    }
  }, [profile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];

    if (selectedFile) {
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
    }
  };

  const handleSave = () => {
    clearMessage();

    if (!name.trim()) {
      setMessage('error', 'Tên không được để trống.');
      return;
    }

    updateProfile(
      { name, file },
      {
        onSuccess: () => {
          setMessage('success', 'Cập nhật hồ sơ thành công.');
        },
        onError: (err: any) => {
          setMessage(
            'error',
            err?.response?.data?.message || 'Cập nhật hồ sơ thất bại.',
          );
        },
      },
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl animate-in fade-in duration-300">
      <div>
        <h3 className="text-lg font-bold text-slate-800">
          Thông tin cá nhân
        </h3>

        <p className="text-xs text-slate-500">
          Cập nhật chi tiết hồ sơ cá nhân và thông tin nhân sự liên kết trong hệ thống.
        </p>
      </div>

      {message.text && (
        <div
          className={`p-4 rounded-xl border flex items-center gap-3 text-sm ${
            message.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 size={18} />
          ) : (
            <AlertTriangle size={18} />
          )}
          <span>{message.text}</span>
        </div>
      )}

      <div className="flex items-center gap-6">
        <div className="relative group">
          <img
            src={preview || DEFAULT_AVATAR}
            alt="Avatar"
            className="w-24 h-24 rounded-2xl object-cover border-2 border-slate-200 shadow-inner"
          />

          <label className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
            <Camera className="text-white" size={20} />
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </label>
        </div>

        <div>
          <h4 className="text-sm font-bold text-slate-700">
            {profile?.email}
          </h4>

          <p className="text-xs text-slate-400">
            Định dạng cho phép: JPG, PNG. Dung lượng tối đa 10MB.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-700">
            Họ và tên
          </label>

          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 transition-colors text-sm"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-700">
            Phòng ban
          </label>

          <input
            type="text"
            value={profile?.department?.name || 'Chưa phân bổ phòng ban'}
            readOnly
            className="px-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-500 rounded-xl cursor-not-allowed outline-none text-sm font-medium"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-700">
            Nhóm (Team)
          </label>

          <input
            type="text"
            value={profile?.team?.name || 'Chưa phân bổ nhóm'}
            readOnly
            className="px-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-500 rounded-xl cursor-not-allowed outline-none text-sm font-medium"
          />
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-slate-100">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-2.5 rounded-xl shadow-sm transition-all text-sm disabled:opacity-50 flex items-center gap-2"
        >
          {isPending && <Loader2 className="animate-spin" size={16} />}
          <span>Lưu thay đổi</span>
        </button>
      </div>
    </div>
  );
};