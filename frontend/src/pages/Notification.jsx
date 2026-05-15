import React, { useEffect, useState, useRef } from 'react';
import { Bell } from 'lucide-react';

import { useNotificationStore } from '../features/notification/store/useNotificationStore';
import { notificationApi } from '../features/notification/api/notificationApi';

// 1. IMPORT HOOK BẠN ĐÃ VIẾT SẴN (Đã sửa)
import { useSocket } from '../context/SocketContext'; 

const Notification = () => {
    const { 
        notifications, 
        unreadCount, 
        fetchNotifications, 
        addNotification, 
        markAsRead 
    } = useNotificationStore();

    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    
    // 2. LẤY SOCKET TỪ HOOK (Đã sửa)
    // Phải dùng bóc tách object { socket } vì hook của bạn trả về object
    const { socket } = useSocket();

    // 1. Fetch data lần đầu
    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    // 2. Xử lý click ra ngoài để đóng dropdown
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // 3. LẮNG NGHE SOCKET.IO
    useEffect(() => {
        // Kiểm tra nếu socket chưa khởi tạo xong thì bỏ qua
        if (!socket) return;

        const handleNewNotif = (newNotif) => addNotification(newNotif);
        const handleDeadlineAlert = (newNotif) => addNotification(newNotif);

        // Lắng nghe các event từ Backend trả về
        socket.on('newNotification', handleNewNotif);
        socket.on('notification', handleDeadlineAlert);

        return () => {
            socket.off('newNotification', handleNewNotif);
            socket.off('notification', handleDeadlineAlert);
        };
    }, [socket, addNotification]);

    // 4. LẮNG NGHE LONG POLLING (Dự phòng)
    useEffect(() => {
        let isMounted = true; 

        const fetchLongPolling = async () => {
            try {
                const response = await notificationApi.getLongPolling();
                
                if (isMounted) {
                    const newData = response.data?.data;
                    if (newData) {
                        addNotification(newData);
                    }
                    fetchLongPolling(); // Gọi tiếp ngay lập tức
                }
            } catch (error) {
                if (isMounted) {
                    setTimeout(fetchLongPolling, 3000); // Lỗi mạng thì chờ 3s
                }
            }
        };

        fetchLongPolling();
        return () => { isMounted = false; };
    }, [addNotification]);

    const handleNotificationClick = (id, referenceId) => {
        markAsRead(id);
        if (referenceId) {
            // Chuyển hướng trang nếu cần: window.location.href = ...
            setIsOpen(false);
        }
    };

    return (
        <div className="relative flex items-center" ref={dropdownRef}>
            {/* Nút Chuông */}
            <button 
                className={`relative p-2 rounded-full transition-all ${
                    isOpen ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'
                }`}
                onClick={() => setIsOpen(!isOpen)}
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1.5 bg-rose-500 text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full border-2 border-white shadow-sm">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown danh sách */}
            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-[350px] bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-50">
                    {/* Header Dropdown */}
                    <div className="flex justify-between items-center p-4 bg-slate-50 border-b border-slate-100">
                        <span className="font-bold text-slate-800 text-sm">Notifications</span>
                        <span className="text-xs text-indigo-600 font-medium cursor-pointer hover:text-indigo-800 hover:underline">
                            Mark all as read
                        </span>
                    </div>
                    
                    {/* Danh sách thông báo */}
                    <div className="max-h-[400px] overflow-y-auto no-scrollbar">
                        {notifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                                <Bell size={32} className="text-slate-200 mb-3" />
                                <span className="text-sm">You have no notifications</span>
                            </div>
                        ) : (
                            notifications.map((notif) => (
                                <div 
                                    key={notif._id} 
                                    onClick={() => handleNotificationClick(notif._id, notif.reference_id)}
                                    className={`p-4 border-b border-slate-100 cursor-pointer transition-all duration-200 flex gap-3
                                        ${notif.is_read ? 'bg-white hover:bg-slate-50' : 'bg-indigo-50/50 hover:bg-indigo-50'}`}
                                >
                                    {/* Avatar người gửi */}
                                    {notif.sender_id?.avatar_url ? (
                                        <img 
                                            src={notif.sender_id.avatar_url} 
                                            alt="avatar" 
                                            className="w-10 h-10 rounded-full object-cover shadow-sm flex-shrink-0 border border-slate-200"
                                        />
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-indigo-200 text-indigo-700 flex items-center justify-center font-bold flex-shrink-0 shadow-sm border border-indigo-100">
                                            {notif.type === 'DEADLINE_REMINDER' ? '🔥' : '👤'}
                                        </div>
                                    )}
                                    
                                    {/* Nội dung tin nhắn */}
                                    <div className="flex-1">
                                        <p className={`text-sm ${notif.is_read ? 'text-slate-600' : 'text-slate-800 font-medium'}`}>
                                            <span dangerouslySetInnerHTML={{ __html: notif.message }} />
                                        </p>
                                        <span className="text-xs text-slate-400 mt-1.5 block font-medium">
                                            {new Date(notif.created_at).toLocaleString('en-US', {
                                                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                            })}
                                        </span>
                                    </div>
                                    
                                    {/* Chấm xanh cho tin chưa đọc */}
                                    {!notif.is_read && (
                                        <div className="w-2 h-2 bg-indigo-600 rounded-full mt-1.5 flex-shrink-0"></div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                    
                    {/* Footer Dropdown */}
                    <div className="p-3 text-center border-t border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors">
                        <span className="text-xs font-semibold text-slate-500">View all activities</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Notification;