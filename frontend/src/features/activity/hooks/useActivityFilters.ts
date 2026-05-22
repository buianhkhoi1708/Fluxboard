import { useSearchParams } from 'react-router-dom';
import { ActivityFilters } from '../api/activityApi'; // Trỏ đúng đường dẫn file API của bạn

export function useActivityFilters(): [ActivityFilters, (newFilters: ActivityFilters) => void] {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters: ActivityFilters = {
    sourceTypes: searchParams.get('sourceTypes') || undefined,
    actions: searchParams.get('actions') || undefined,
    from: searchParams.get('from') || undefined,
    to: searchParams.get('to') || undefined,
  };

  const setFilters = (newFilters: ActivityFilters) => {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      Object.entries(newFilters).forEach(([key, value]) => {
        if (!value) {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });
      return params;
    });
  };

  return [filters, setFilters];
}