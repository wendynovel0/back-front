export interface Filters {
  email?: string;
  dateFilter?: {
    dateType: 'created_at' | 'updated_at' | 'deleted_at';
    startDate: string;
    endDate: string;
  };
  is_active?: boolean;
  status?: 'pending',
}
