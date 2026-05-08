import { useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext';

export const useRealtimeEvent = (topic: string, onMessage: () => void, delay = 300) => {
  const { subscribe, isConnected } = useSocket();
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isConnected || !topic) return;

    // Đăng ký qua module trung tâm
    const subscription = subscribe(topic, (message: any) => {
      // Logic "Phanh ABS" dùng chung
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      
      debounceTimer.current = setTimeout(() => {
        onMessage();
      }, delay);
    });

    return () => {
      if (subscription) subscription.unsubscribe();
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [topic, isConnected]);
};