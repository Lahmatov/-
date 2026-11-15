import { useFocusEffect } from "expo-router";
import { useCallback, useRef } from "react";

/**
 * Перезагружает данные, когда экран снова становится видимым (вернулись из модального окна или с другого
 * экрана). Первый показ пропускается — его загружает useLoad.
 */
export function useReloadOnFocus(reload: () => unknown): void {
  const first = useRef(true);
  const reloadRef = useRef(reload);
  reloadRef.current = reload;
  useFocusEffect(
    useCallback(() => {
      if (first.current) {
        first.current = false;
        return;
      }
      void reloadRef.current();
    }, []),
  );
}
