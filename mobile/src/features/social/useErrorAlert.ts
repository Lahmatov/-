import { useEffect } from "react";
import { showError } from "../../lib/alerts";

/**
 * Ошибка перезагрузки, когда на экране уже есть данные (pull-to-refresh): показываем алертом,
 * а данные оставляем. Без данных ошибку показывает сам экран (ErrorView).
 */
export function useErrorAlert(state: { data: unknown; error: string | null }): void {
  const hasData = state.data !== undefined;
  useEffect(() => {
    if (state.error && hasData) showError(state.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.error]);
}
