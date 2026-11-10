import { useFocusEffect } from "expo-router";
import { useCallback, useRef } from "react";

/**
 * Перезагрузка при возврате на экран (после редактора отзыва, смены статуса на карточке книги и т. п.).
 * Первое появление пропускается: его уже загрузил useLoad.
 */
export function useReloadOnFocus(reload: () => Promise<void>): void {
  const first = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (first.current) {
        first.current = false;
        return;
      }
      void reload();
    }, [reload]),
  );
}
