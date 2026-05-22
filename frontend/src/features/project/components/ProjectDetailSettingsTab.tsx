import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, AlertTriangle, Trash2, CheckCircle, XCircle, X } from 'lucide-react';
// 🚀 ĐỔI SANG DÙNG HOOKS TANSTACK QUERY
import { 
    useProjectOverview, 
    useUpdateProjectInfo, 
    useDeleteProject 
} from '../hooks/useProjectQueries';

const ProjectSettingsTab = ({ projectId }) => {
    const navigate = useNavigate();

    // 🚀 BỐC DỮ LIỆU BẰNG REACT QUERY
    const { data: projectOverview } = useProjectOverview(projectId);
    const { mutateAsync: updateProject, isPending: isUpdating } = useUpdateProjectInfo(projectId);
    const { mutateAsync: deleteProject, isPending: isDeleting } = useDeleteProject(projectId);

    const currentProject = projectOverview?.project;
    const isActionLoading = isUpdating || isDeleting;

    const [formData, setFormData] = useState({
        name: '',
        status: '',
        departmentId: '',
        ownerId: ''
    });

    const [notification, setNotification] = useState({
        isOpen: false,
        message: '',
        type: 'success'
    });

    const showNotification = (message: string, type = 'success') => {
        setNotification({ isOpen: true, message, type });
    };

    useEffect(() => {
        if (currentProject) {
            setFormData({
                name: currentProject.name || '',
                status: currentProject.status || 'ACTIVE',
                departmentId: currentProject.departmentId || currentProject.department_id || 'DEP-DEFAULT',
                ownerId: currentProject.ownerId || currentProject.owner_id || '' 
            });
        }
    }, [currentProject]);

    const handleSave = async () => {
        if (!formData.name.trim()) {
            return showNotification("Tên dự án không được để trống!", "error");
        }

        const payloadToSend = {
            name: formData.name,
            status: formData.status,
            department_id: formData.departmentId,
            owner_id: formData.ownerId 
        };

        try {
            await updateProject(payloadToSend);
            showNotification("Đã lưu cài đặt dự án thành công!", "success");
        } catch (error) {
            console.error("Lỗi cập nhật dự án:", error);
            showNotification("Lưu thất bại! Vui lòng kiểm tra lại.", "error");
        }
    };

    const handleDelete = async () => {
        if (!currentProject) return;

        const confirmName = prompt(`CẢNH BÁO: Hành động này sẽ xóa vĩnh viễn dự án và toàn bộ Task bên trong!\n\nGõ "${currentProject.name}" để xác nhận xóa:`);
        
        if (confirmName === currentProject.name) {
            try {
                await deleteProject();
                navigate('/workspaces');
            } catch (error) {
                console.error("Lỗi xóa dự án:", error);
                showNotification("Xóa thất bại! Vui lòng kiểm tra lại.", "error");
            }
        } else if (confirmName !== null) {
            showNotification("Tên xác nhận không khớp, đã hủy lệnh xóa.", "error");
        }
    };

    return (
        <div className="max-w-3xl animate-in fade-in duration-300 relative">
            {/* Thông tin chung */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm mb-8">
                <h3 className="text-lg font-bold text-slate-800 mb-5">Thông tin chung</h3>
                
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Tên Dự Án</label>
                        <input 
                            type="text" 
                            value={formData.name}
                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all font-medium text-slate-700"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Trạng thái</label>
                        <select 
                            value={formData.status}
                            onChange={(e) => setFormData({...formData, status: e.target.value})}
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all font-medium text-slate-700 bg-white"
                        >
                            <option value="ACTIVE">Đang hoạt động (Active)</option>
                            <option value="ON_HOLD">Tạm dừng (On Hold)</option>
                            <option value="COMPLETED">Đã hoàn thành (Completed)</option>
                        </select>
                    </div>

                    <div className="pt-4 flex justify-end">
                        <button 
                            onClick={handleSave}
                            disabled={isActionLoading}
                            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-md transition-all active:scale-95 disabled:opacity-50"
                        >
                            <Save size={16} /> {isUpdating ? 'Đang lưu...' : 'Lưu thay đổi'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Danger Zone */}
            <div className="bg-rose-50/50 rounded-2xl border border-rose-200 p-6">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-rose-100 text-rose-600 rounded-full shrink-0">
                        <AlertTriangle size={24} />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-rose-800">Khu vực Nguy hiểm (Danger Zone)</h3>
                        <p className="text-sm text-rose-600/80 mt-1 mb-4 font-medium">
                            Xóa dự án sẽ xóa vĩnh viễn toàn bộ Bảng (Boards), Cột, và Công việc (Tasks) bên trong. 
                            Hành động này KHÔNG THỂ hoàn tác!
                        </p>
                        <button 
                            onClick={handleDelete}
                            disabled={isActionLoading}
                            className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-5 py-2 rounded-xl mt-2 font-bold text-sm shadow-sm transition-all active:scale-95 disabled:opacity-50"
                        >
                            <Trash2 size={16} /> {isDeleting ? 'Đang xóa...' : 'Xóa vĩnh viễn Dự án'}
                        </button>
                    </div>
                </div>
            </div>

            {/* KHUNG THÔNG BÁO CUSTOM */}
            {notification.isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div 
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in" 
                        onClick={() => setNotification({ ...notification, isOpen: false })}
                    ></div>
                    
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
                        <button 
                            onClick={() => setNotification({ ...notification, isOpen: false })}
                            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1 rounded-full transition-colors"
                        >
                            <X size={20} />
                        </button>

                        {notification.type === 'success' ? (
                            <div className="w-16 h-16 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mb-4">
                                <CheckCircle size={32} />
                            </div>
                        ) : (
                            <div className="w-16 h-16 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center mb-4">
                                <XCircle size={32} />
                            </div>
                        )}

                        <h3 className="text-xl font-bold text-slate-800 mb-2">
                            {notification.type === 'success' ? 'Thành công!' : 'Có lỗi xảy ra!'}
                        </h3>
                        <p className="text-slate-500 text-sm mb-6">
                            {notification.message}
                        </p>

                        <button
                            onClick={() => setNotification({ ...notification, isOpen: false })}
                            className={`w-full py-2.5 rounded-xl font-bold text-white transition-all active:scale-95 mt-2 ${
                                notification.type === 'success' 
                                    ? 'bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-200' 
                                    : 'bg-rose-500 hover:bg-rose-600 shadow-lg shadow-rose-200'
                            }`}
                        >
                            Đóng lại
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProjectSettingsTab;