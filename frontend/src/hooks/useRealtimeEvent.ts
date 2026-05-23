import { useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext';

export const useRealtimeEvent = (topic: string, onMessage: () => void, delay = 300) => {
  const { socket, isConnected } = useSocket();
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Nếu socket chưa có hoặc chưa kết nối, dừng lại
    if (!socket || !isConnected || !topic) return;

    // Hàm xử lý khi có message đến từ server
    const handleEvent = (data: any) => {
      // Logic "Phanh ABS" (Debounce) giúp app không bị lag khi nhận quá nhiều data
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      
      debounceTimer.current = setTimeout(() => {
        onMessage();
      }, delay);
    };

    // 🚀 Đăng ký sự kiện dùng .on() của Socket.io
    socket.on(topic, handleEvent);

    // Dọn dẹp sự kiện khi component bị unmount hoặc topic đổi
    return () => {
      socket.off(topic, handleEvent);
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [topic, isConnected, socket, onMessage, delay]);
};