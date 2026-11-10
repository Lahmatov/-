import type { ListInput } from "../../api/models";
import { L, plural } from "../../i18n";

/** «12 книг · личный». */
export function listCountText(count: number, isPublic: boolean): string {
  return `${count} ${plural(count, "книга", "книги", "книг")}` + (isPublic ? "" : L(" · личный"));
}

export type ListFormValue = { title: string; description: string; isPublic: boolean };

export const emptyListForm: ListFormValue = { title: "", description: "", isPublic: true };

export function listFormFrom(list: { title: string; description: string | null; isPublic: boolean }): ListFormValue {
  return { title: list.title, description: list.description ?? "", isPublic: list.isPublic };
}

export function canSaveList(value: ListFormValue): boolean {
  return value.title.trim().length > 0;
}

/** То, что уходит на сервер: пробелы по краям обрезаны, пустое описание — null. */
export function listInput(value: ListFormValue): ListInput {
  const description = value.description.trim();
  return { title: value.title.trim(), description: description.length > 0 ? description : null, isPublic: value.isPublic };
}
