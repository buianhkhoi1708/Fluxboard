export interface ApiResponse<T = any> {
  success: boolean;
  code: number;
  message: string;
  data: T;
}

export interface PaginatedData<T> {
  content: T[];
  pageable: { pageNumber: number; pageSize: number };
  totalElements: number;
  totalPages: number;
}
