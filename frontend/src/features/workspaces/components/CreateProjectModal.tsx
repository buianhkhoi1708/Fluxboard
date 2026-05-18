import React, { useState, FormEvent } from 'react';
import { X, Briefcase, Loader2 } from 'lucide-react';
import { useProjectStore } from '../store/useProjectStore';

// 1. ĐỊNH NGHĨA INTERFACE (Đã loại bỏ projectId vì đây là tạo Project mới)
interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const CreateProjectModal: React.FC<CreateProjectModalProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess 
}) => {
  // 2. STATE CHO FORM
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Lấy hàm tạo từ store
  const createNewProject = useProjectStore((state: any) => state.createNewProject);

  if (!isOpen) return null;

  const handleClose = () => {
    if (isSubmitting) return;
    setName('');
    setDescription('');
    onClose();
  };

  // 3. XỬ LÝ SUBMIT
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setIsSubmitting(true);
      
      const payload = {
        name: name.trim(),
        description: description.trim()
      };

      console.log("📤 Creating Project Payload:", payload);

      const success = await createNewProject(payload);
      
      if (success) {
        if (onSuccess) onSuccess();
        handleClose();
      } else {
        alert("Không thể tạo dự án. Vui lòng kiểm tra lại quyền hạn (RBAC).");
      }
    } catch (error: any) {
      console.error("❌ Lỗi tạo Project:", error);
      const msg = error.response?.data?.message || "Lỗi kết nối server";
      alert(`Backend báo lỗi: ${msg}`);
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
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Briefcase size={20} className="text-indigo-600" />
            </div>
            New Workspace
          </h2>
          <button 
            onClick={handleClose} 
            className="text-slate-400 hover:text-rose-500 transition-colors p-1 hover:bg-rose-50 rounded-full"
          >
            <X size={22} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-5">
            {/* Project Name */}
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase mb-2 tracking-wider">
                Workspace Name <span className="text-rose-500">*</span>
              </label>
              <input 
                type="text" 
                value={name} 
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Marketing Team, Web Development..."
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 transition-all font-bold text-slate-700"
                required 
                autoFocus
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase mb-2 tracking-wider">
                Description (Optional)
              </label>
              <textarea 
                value={description} 
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this workspace for?"
                rows={3}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 transition-all font-medium text-slate-600 resize-none"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="mt-8 flex items-center justify-end gap-3 pt-5 border-t border-slate-100">
            <button 
              type="button" 
              onClick={handleClose} 
              className="px-6 py-2.5 rounded-xl text-sm font-black text-slate-500 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting || !name.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-2.5 rounded-xl text-sm font-black flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-indigo-100 disabled:bg-slate-300 disabled:shadow-none"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Workspace'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateProjectModal;