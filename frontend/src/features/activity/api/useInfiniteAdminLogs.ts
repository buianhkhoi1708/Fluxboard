import { useInfiniteQuery } from "@tanstack/react-query";
import {
  activityApi,
  ActivityFilters,
  ActivityListResponse,
} from "./activityApi";

const unwrapActivityResponse = (res: any): ActivityListResponse => {
  if (res?.success !== undefined && (Array.isArray(res?.data) || res?.meta)) {
    return res;
  }

  if (res?.data?.success !== undefined) {
    return res.data;
  }

  return res;
};

export function useInfiniteAdminLogs(filters: ActivityFilters) {
  return useInfiniteQuery({
    queryKey: ["adminLogs", "infinite", filters],

    queryFn: async ({ pageParam = 0 }) => {
      const res: any = await activityApi.getAdminLogs(pageParam, 20, filters);
      return unwrapActivityResponse(res);
    },

    initialPageParam: 0,

    getNextPageParam: (lastPage) => {
      if (lastPage?.meta?.has_next) {
        return Number(lastPage.meta.page || 0) + 1;
      }

      return undefined;
    },
  });
}
