import { useEffect, useRef } from "react";
import { useSocket } from "../context/SocketContext";

export const useRealtimeEvent = (
  topic: string,
  onMessage: (data?: any) => void,
  delay = 300,
) => {
  const { socket, isConnected } = useSocket();
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  const savedCallback = useRef(onMessage);

  useEffect(() => {
    savedCallback.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    if (!socket || !isConnected || !topic) return;

    const handleEvent = (data: any) => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);

      debounceTimer.current = setTimeout(() => {
        savedCallback.current(data);
      }, delay);
    };

    socket.on(topic, handleEvent);
    console.log(`📡 Đã gắn phanh ABS lắng nghe kênh: [${topic}]`);

    return () => {
      socket.off(topic, handleEvent);
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      console.log(`🔇 Đã tắt lắng nghe kênh: [${topic}]`);
    };
  }, [topic, isConnected, socket, delay]);
};
