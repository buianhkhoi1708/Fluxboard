export interface ISubtask {
  id: string;
  title: string;
  is_done: boolean;
}

export interface ICard {
  id: string;
  title: string;
  description: string;
  assignee: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical'; 
  start_date: string; 
  due_date: string | null; 
  estimated_days: number;
  story_points: number;
  ai_suggested_points: number;
  ai_estimation_reason: string;
  tags: string[];
  subtasks: ISubtask[];
}

export interface IList {
  id: string;
  list_name: string;
  order: number;
  wip_limit?: number; 
  cards: ICard[];
}

export interface IBoard {
  id: string;
  board_name: string;
  description: string;
  lists: IList[];
}