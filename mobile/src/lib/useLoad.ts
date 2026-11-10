import { useCallback, useEffect, useRef, useState, type DependencyList } from "react";
import { errorMessage } from "../api/client";

export type LoadState<T> = {
  data: T | undefined;
  error: string | null;
  loading: boolean;
  /** Перезагрузить (pull-to-refresh, после изменения). */
  reload: () => Promise<void>;
  /** Локально заменить данные (оптимистичное обновление). */
  setData: (update: T | ((current: T | undefined) => T | undefined)) => void;
};

/** Загрузка данных экрана: состояние, ошибка, повтор. Ответ устаревшего запроса отбрасывается. */
export function useLoad<T>(loader: () => Promise<T>, deps: DependencyList): LoadState<T> {
  const [data, setDataState] = useState<T | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const generation = useRef(0);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const reload = useCallback(async () => {
    const current = ++generation.current;
    setLoading(true);
    try {
      const value = await loaderRef.current();
      if (current !== generation.current) return;
      setDataState(value);
      setError(null);
    } catch (e) {
      if (current !== generation.current) return;
      setError(errorMessage(e));
    } finally {
      if (current === generation.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const setData = useCallback((update: T | ((current: T | undefined) => T | undefined)) => {
    setDataState((current) =>
      typeof update === "function" ? (update as (c: T | undefined) => T | undefined)(current) : update,
    );
  }, []);

  return { data, error, loading, reload, setData };
}
