import React, { useState } from 'react';
import { Plus, Loader2, Users } from 'lucide-react';
import { useProjectMembersDetail } from '../hooks/useProjectQueries';
import ProjectMemberList from './ProjectDetailMemberList';
import ProjectMemberModal from './ProjectDetailMemberModal';

const ProjectMembersTab = ({ projectId }) => {
    // 🚀 LẤY DATA BẰNG REACT QUERY
    const { data: apiMembers, isLoading } = useProjectMembersDetail(projectId);
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [memberToEdit, setMemberToEdit] = useState(null);

    // Chắc chắn members luôn là một mảng
    const members = Array.isArray(apiMembers) ? apiMembers : [];

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4 text-slate-400">
                <Loader2 size={32} className="animate-spin text-indigo-500" />
                <p className="font-medium">Đang tải danh sách nhân sự...</p>
            </div>
        );
    }

    return (
        <div className="animate-in fade-in duration-300">
            <div className="mb-6 flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Users size={20} className="text-indigo-600" />
                    Thành viên tham gia ({members.length})
                </h3>
                
                <button 
                    onClick={() => { setMemberToEdit(null); setIsModalOpen(true); }}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-sm transition-all active:scale-95 outline-none"
                >
                    <Plus size={16} /> Mời thành viên
                </button>
            </div>
            
            <ProjectMemberList 
                members={members} 
                projectId={projectId} 
                onEditRequest={(memberData) => { setMemberToEdit(memberData); setIsModalOpen(true); }} 
            />

            <ProjectMemberModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                projectId={projectId}
                editMember={memberToEdit}
            />
        </div>
    );
};

export default ProjectMembersTab;