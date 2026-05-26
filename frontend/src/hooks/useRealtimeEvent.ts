import { useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext'; // Đường dẫn của sếp

// 🚀 Nâng cấp: Cho phép onMessage nhận data từ server truyền về
export const useRealtimeEvent = (topic: string, onMessage: (data?: any) => void, delay = 300) => {
  const { socket, isConnected } = useSocket();
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  
  // 🚀 BÍ KÍP TRÁNH RE-RENDER: Lưu onMessage vào ref để nó luôn là bản mới nhất
  // mà không làm kích hoạt lại cái useEffect của Socket
  const savedCallback = useRef(onMessage);

  useEffect(() => {
    savedCallback.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    // Nếu socket chưa có hoặc chưa kết nối, dừng lại
    if (!socket || !isConnected || !topic) return;

    // Hàm xử lý khi có message đến từ server
    const handleEvent = (data: any) => {
      // Logic "Phanh ABS" (Debounce) giúp app không bị lag khi nhận quá nhiều data
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      
      debounceTimer.current = setTimeout(() => {
        // 🚀 Gọi callback thông qua ref, truyền cả data vào cho sếp xài nếu cần
        savedCallback.current(data);
      }, delay);
    };

    // Đăng ký sự kiện
    socket.on(topic, handleEvent);
    console.log(`📡 Đã gắn phanh ABS lắng nghe kênh: [${topic}]`);

    // Dọn dẹp sự kiện
    return () => {
      socket.off(topic, handleEvent);
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      console.log(`🔇 Đã tắt lắng nghe kênh: [${topic}]`);
    };
  }, [topic, isConnected, socket, delay]); // 👈 Đã loại bỏ onMessage ra khỏi danh sách!
};