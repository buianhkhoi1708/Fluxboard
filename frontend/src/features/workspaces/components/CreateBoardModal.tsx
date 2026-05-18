import React, { useState, FormEvent } from 'react';
import { boardApi } from '../../board/api/boardApi'; 
import { X, KanbanSquare, Loader2 } from 'lucide-react';
import { useProjectStore } from '../store/useProjectStore';

interface CreateBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  onSuccess: () => void;
}

const CreateBoardModal: React.FC<CreateBoardModalProps> = ({ isOpen, onClose, projectId, onSuccess }) => {
  const [name, setName] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const addBoardToProject = useProjectStore((state: any) => state.addBoardToProject);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setIsSubmitting(true);
      
      // 🚀 Đã sửa thành project_id
      const payload = {
        project_id: projectId,
        name: name.trim(),
        status: 'ACTIVE'  
      };
      
      const response: any = await boardApi.createBoard(payload);
      
      if (response.success || response) {
          addBoardToProject(projectId, response.data || response); 
          setName('');
          onSuccess(); 
      }
    } catch (error: any) {
      console.error("❌ Lỗi tạo Board:", error);
      const msg = error.response?.data?.message || "Lỗi tạo Board (400)";
      alert(`Backend báo: ${msg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[110] p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <KanbanSquare size={20} className="text-indigo-600" /> Create New Board
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-rose-500 transition-colors">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Board Name *</label>
              <input 
                type="text" value={name} onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Sprint Planning, Bug Tracker..."
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 transition-all font-medium"
                required autoFocus
              />
            </div>
          </div>
          <div className="mt-8 flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-5 py-2 rounded-lg text-sm font-bold text-slate-500 hover:bg-slate-100">Cancel</button>
            <button type="submit" disabled={isSubmitting || !name.trim()} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all active:scale-95 disabled:bg-slate-300">
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : 'Create Board'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateBoardModal;