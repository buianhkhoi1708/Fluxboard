import React, { useEffect } from 'react';
import BoardView from '../features/board/components/BoardView';

const BoardPage = () => {
  useEffect(() => {
    document.title = "Fluxboard";
  }, []);

  return (
    <div className="flex-1 w-full h-full flex flex-col bg-gray-50 overflow-hidden">
      <BoardView />
    </div>
  );
};

export default BoardPage;