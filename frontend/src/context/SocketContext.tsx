import React, {
  createContext,
  useContext,
  useEffect,
  useState
} from 'react';

import { io, Socket } from 'socket.io-client';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  joinBoard: (boardId: string) => void;
  leaveBoard: (boardId: string) => void;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  joinBoard: () => {},
  leaveBoard: () => {}
});

export const SocketProvider = ({
  children
}: {
  children: React.ReactNode;
}) => {

  const [socket, setSocket] = useState<Socket | null>(null);

  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // 🚀 BÍ KÍP: Tự động bắt link Render từ Vercel, hoặc dùng localhost khi code ở nhà
    const socketUrl = (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:8080';

    const socketInstance = io(socketUrl, {
      withCredentials: true,
      transports: ['websocket', 'polling']
    });

    // ====================================
    // CONNECT
    // ====================================
    socketInstance.on('connect', () => {
      console.log(`✅ [Socket]: Connected to ${socketUrl}`);
      console.log('Socket ID:', socketInstance.id);
      setIsConnected(true);
    });

    // ====================================
    // DISCONNECT
    // ====================================
    socketInstance.on('disconnect', () => {
      console.log('❌ [Socket]: Disconnected');
      setIsConnected(false);
    });

    // ====================================
    // ERROR
    // ====================================
    socketInstance.on('connect_error', (err) => {
      console.error('🚨 Socket Error:', err.message);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };

  }, []);

  // ====================================
  // JOIN BOARD ROOM
  // ====================================
  const joinBoard = (boardId: string) => {
    if (!socket) return;
    socket.emit('joinBoard', boardId);
    console.log(`📌 Joined board: ${boardId}`);
  };

  // ====================================
  // LEAVE BOARD ROOM
  // ====================================
  const leaveBoard = (boardId: string) => {
    if (!socket) return;
    socket.emit('leaveBoard', boardId);
    console.log(`🚪 Left board: ${boardId}`);
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        joinBoard,
        leaveBoard
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);