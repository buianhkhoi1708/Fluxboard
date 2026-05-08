// context/SocketContext.tsx
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import SockJS from 'sockjs-client';
import Stomp from 'stompjs';

const SocketContext = createContext<any>(null);

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const stompClient = useRef<any>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socket = new SockJS('http://localhost:8080/api/v1/ws-fluxboard');
    const client = Stomp.over(socket);
    client.debug = () => {}; 

    client.connect({}, () => {
      console.log("🔌 [Socket Module]: Đã thông kết nối tổng!");
      stompClient.current = client;
      setIsConnected(true); // Chỉ set true khi đã CONNECTED
    }, (err: any) => {
      console.error("❌ [Socket Module]: Lỗi kết nối:", err);
    });

    return () => {
      if (stompClient.current?.connected) {
        stompClient.current.disconnect();
      }
    };
  }, []);

  const subscribe = (topic: string, callback: (msg: any) => void) => {
    // Nếu chưa kết nối mà đòi subscribe thì báo lỗi nhẹ để debug
    if (!stompClient.current || !isConnected) {
      console.warn(`⚠️ Đang đợi kết nối để subscribe topic: ${topic}`);
      return null;
    }
    return stompClient.current.subscribe(topic, (msg: any) => {
      callback(msg.body);
    });
  };

  return (
    <SocketContext.Provider value={{ subscribe, isConnected }}>
      {/* 🚀 QUAN TRỌNG: Nếu chưa kết nối xong thì hiện Loading hoặc màn hình chờ,
         để tránh việc các Component con gọi subscribe lúc client đang null.
      */}
      {isConnected ? children : (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <p>Đang thiết lập kết nối Real-time...</p>
        </div>
      )}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);