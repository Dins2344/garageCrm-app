// Shared API response envelope shapes — see root .agents/AGENTS.md "Shared API contract".

export interface ApiListResponse<T> {
  success: boolean;
  count: number;
  total: number;
  pages: number;
  currentPage: number;
  data: T[];
}

export interface ApiItemResponse<T> {
  success: boolean;
  data: T;
}

export interface ApiMessageResponse {
  success: boolean;
  message: string;
}
