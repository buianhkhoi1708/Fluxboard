import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { Link } from 'react-router-dom';
import { KanbanSquare, Plus, LayoutGrid, Edit2, Trash2 } from 'lucide-react';

import { useProjectOverview } from '../hooks/useProjectQueries';
import { useUpdateBoard, useDeleteBoard } from '../../board/hooks/useBoardQueries'; 
import CreateBoardModal from '../../workspaces/components/CreateBoardModal';

// ---------- Modal sửa tên bảng ----------
const EditBoardNameModal = ({ isOpen, onClose, onSave, initialName }) => {
  const [name, setName] = useState(initialName || '');
  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4 transform transition-all scale-100 animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-slate-800 mb-4">Sửa tên bảng</h3>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { onSave(name); onClose(); }
          }}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mb-5 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400"
        />
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">Hủy</button>
          <button onClick={() => { onSave(name); onClose(); }} className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors">Lưu</button>
        </div>
      </div>
    </div>,
    document.body
  );
};

// ---------- Modal xác nhận xóa ----------
const ConfirmDeleteBoardModal = ({ isOpen, onClose, onConfirm, boardName }) => {
  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4 transform transition-all scale-100 animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-slate-800 mb-2">Xóa bảng</h3>
        <p className="text-sm text-slate-600 mb-5">
          Bạn có chắc chắn muốn xóa bảng <span className="font-semibold text-slate-800">“{boardName}”</span>? Hành động này không thể hoàn tác.
        </p>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">Hủy</button>
          <button onClick={onConfirm} className="px-4 py-2 text-sm font-semibold text-white bg-rose-500 hover:bg-rose-600 rounded-lg transition-colors">Xóa</button>
        </div>
      </div>
    </div>,
    document.body
  );
};

const ProjectBoardsTab = ({ projectId }) => {
    const { data: projectOverview, refetch } = useProjectOverview(projectId);
    const [isBoardModalOpen, setIsBoardModalOpen] = useState(false);

    const { mutate: updateBoard } = useUpdateBoard();
    const { mutate: deleteBoard } = useDeleteBoard();

    const boards = projectOverview?.boards || [];

    // State cho modal sửa và xóa
    const [editingBoard, setEditingBoard] = useState(null); // { id, name }
    const [deletingBoard, setDeletingBoard] = useState(null); // { id, name }

    // Hàm xử lý sửa tên
    const handleEditBoardSave = (newName) => {
        if (newName && newName.trim() !== '' && newName !== editingBoard?.name) {
            updateBoard({ 
                boardId: editingBoard.id, 
                payload: { name: newName.trim() } 
            });
        }
        setEditingBoard(null);
    };

    // Hàm xử lý xóa bảng
    const handleDeleteBoardConfirm = () => {
        if (deletingBoard) {
            deleteBoard({ boardId: deletingBoard.id, projectId });
        }
        setDeletingBoard(null);
    };

    return (
        <div className="animate-in fade-in duration-300">
            <div className="mb-6 flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <LayoutGrid size={20} className="text-indigo-600" />
                    Danh sách Bảng ({boards.length})
                </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {boards.map((item, idx) => {
                    const b = item.board || item; 
                    if (!b || (!b.id && !b._id)) return null;
                    
                    const boardId = b.id || b._id;
                    const boardName = b.name;

                    return (
                        <Link 
                            to={`/board/${boardId}`} 
                            key={boardId || idx}
                            className="group relative bg-white border border-slate-200 rounded-xl p-5 hover:border-indigo-300 hover:shadow-md hover:shadow-indigo-100/30 transition-all duration-200 overflow-hidden block"
                        >
                            <div className="absolute -right-4 -top-4 w-16 h-16 bg-indigo-500/5 rounded-full blur-xl group-hover:bg-indigo-500/10 transition-colors"></div>
                            
                            <div className="flex items-center justify-between relative z-10 mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="bg-indigo-50 text-indigo-600 w-10 h-10 rounded-lg flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors shadow-sm">
                                        <KanbanSquare size={18} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-sm text-slate-800 group-hover:text-indigo-700 line-clamp-1 transition-colors">{boardName}</h3>
                                        <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                                            {item.columns?.length || b.columns?.length || 0} cột
                                        </p>
                                    </div>
                                </div>

                                {/* BỘ NÚT ACTION */}
                                <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                        onClick={(e) => {
                                            e.preventDefault(); 
                                            e.stopPropagation();
                                            setEditingBoard({ id: boardId, name: boardName });
                                        }}
                                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                        title="Sửa tên bảng"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button 
                                        onClick={(e) => {
                                            e.preventDefault(); 
                                            e.stopPropagation();
                                            setDeletingBoard({ id: boardId, name: boardName });
                                        }}
                                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                        title="Xóa bảng"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        </Link>
                    );
                })}

                {/* Nút Tạo Bảng Mới */}
                <button 
                    onClick={() => setIsBoardModalOpen(true)}
                    className="group border-2 border-dashed border-slate-300 rounded-xl p-5 flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-indigo-600 hover:border-indigo-400 hover:bg-indigo-50/50 transition-all min-h-[104px] backdrop-blur-sm"
                >
                    <div className="p-1.5 rounded-full bg-slate-100 group-hover:bg-indigo-100 transition-colors">
                        <Plus size={20} strokeWidth={2} />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider">Tạo Bảng mới</span>
                </button>
            </div>

            <CreateBoardModal 
                isOpen={isBoardModalOpen} 
                onClose={() => setIsBoardModalOpen(false)} 
                projectId={projectId} 
                onSuccess={() => {
                    setIsBoardModalOpen(false);
                    refetch(); 
                }} 
            />

            {/* 🆕 Các modal thay thế prompt/confirm */}
            <EditBoardNameModal
                isOpen={!!editingBoard}
                onClose={() => setEditingBoard(null)}
                initialName={editingBoard?.name || ''}
                onSave={handleEditBoardSave}
            />

            <ConfirmDeleteBoardModal
                isOpen={!!deletingBoard}
                onClose={() => setDeletingBoard(null)}
                boardName={deletingBoard?.name || ''}
                onConfirm={handleDeleteBoardConfirm}
            />
        </div>
    );
};

export default ProjectBoardsTab;