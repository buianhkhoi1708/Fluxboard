// Tính tổng Story Points cho 1 cột cụ thể
export const getColumnTotalPoints = (column: any): number => {
  if (!column?.tasks || !Array.isArray(column.tasks)) return 0;
  
  return column.tasks.reduce((sum: number, task: any) => {
    const points = Number(task.story_points) || Number(task.story_point) || 0;
    return sum + points;
  }, 0);
};

// Tính tổng Story Points cho toàn bộ Board
export const getBoardTotalPoints = (board: any): number => {
  if (!board?.columns || !Array.isArray(board.columns)) return 0;
  
  return board.columns.reduce((totalSum: number, col: any) => {
    return totalSum + getColumnTotalPoints(col);
  }, 0);
};