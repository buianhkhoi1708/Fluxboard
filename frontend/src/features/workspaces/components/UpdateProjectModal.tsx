import React, { useState, useEffect, FormEvent } from 'react';
import { X, Edit, Loader2 } from 'lucide-react';
import { useProjectStore } from '../store/useProjectStore';

interface UpdateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: any;
}

const UpdateProjectModal: React.FC<UpdateProjectModalProps> = ({ isOpen, onClose, project }) => {
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const updateExistingProject = useProjectStore((state: any) => state.updateExistingProject);

  // Đổ dữ liệu cũ của Workspace vào form khi mở Modal
  useEffect(() => {
    if (isOpen && project) {
      setName(project.name || '');
      setDescription(project.description || '');
    }
  }, [isOpen, project]);

  if (!isOpen || !project) return null;

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setIsSubmitting(true);
      const projectId = project._id || project.id;
      const success = await updateExistingProject(projectId, {
        name: name.trim(),
        description: description.trim()
      });

      if (success) {
        onClose();
      } else {
        alert("Không thể cập nhật dự án. Vui lòng kiểm tra lại quyền.");
      }
    } catch (error) {
      console.error("❌ Lỗi submit form sửa project:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[110] p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-[24px] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Edit size={20} className="text-amber-600" />
            </div>
            Sửa Workspace
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-rose-500 transition-colors p-1 hover:bg-rose-50 rounded-full">
            <X size={22} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase mb-2 tracking-wider">Tên dự án *</label>
              <input 
                type="text" 
                value={name} 
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 transition-all font-bold text-slate-700"
                required 
              />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-500 uppercase mb-2 tracking-wider">Mô tả chi tiết</label>
              <textarea 
                value={description} 
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 transition-all font-medium text-slate-600 resize-none"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="mt-8 flex items-center justify-end gap-3 pt-5 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-xl text-sm font-black text-slate-500 hover:bg-slate-100 transition-colors">
              Hủy
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting || !name.trim()}
              className="bg-amber-500 hover:bg-amber-600 text-white px-8 py-2.5 rounded-xl text-sm font-black flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-amber-100 disabled:bg-slate-300"
            >
              {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UpdateProjectModal;