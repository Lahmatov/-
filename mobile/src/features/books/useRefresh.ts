import { useCallback, useState } from "react";

/** Состояние pull-to-refresh: индикатор крутится, пока идёт перезагрузка. */
export function useRefresh(reload: () => Promise<void>): { refreshing: boolean; onRefresh: () => void } {
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void reload().finally(() => setRefreshing(false));
  }, [reload]);
  return { refreshing, onRefresh };
}
