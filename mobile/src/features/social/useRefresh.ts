import { useCallback, useState } from "react";

/** Состояние pull-to-refresh: крутилка только пока идёт перезагрузка, начатая жестом. */
export function useRefresh(reload: () => Promise<unknown>): { refreshing: boolean; onRefresh: () => void } {
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void reload().finally(() => setRefreshing(false));
  }, [reload]);
  return { refreshing, onRefresh };
}
