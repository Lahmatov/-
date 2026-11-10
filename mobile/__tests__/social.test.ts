import { Alert, Platform, type AlertButton } from "react-native";
import type { APIClient } from "../src/api/client";
import type { Feed, FeedItem } from "../src/api/models";
import { canSaveList, listCountText, listFormFrom, listInput } from "../src/features/lists/listValues";
import { appendPage, canDeleteComment, otherPeople } from "../src/features/social/feedPages";
import { reportContent } from "../src/features/social/report";

function item(id: string): FeedItem {
  return {
    id,
    type: "STATUS",
    status: "READING",
    rating: null,
    review: null,
    createdAt: "2026-10-01T10:00:00.000Z",
    user: { id: "u1", name: "Аня" },
    book: { id: "b1", title: "Книга", author: "Автор", year: null, isbn: null, coverUrl: null, pageCount: null },
    entryId: null,
  };
}

test("next feed page is appended without duplicates and takes the new cursor", () => {
  const first: Feed = { followingCount: 2, nextCursor: "c1", items: [item("a"), item("b")] };
  const next: Feed = { followingCount: 2, nextCursor: null, items: [item("b"), item("c")] };
  const merged = appendPage(first, next);
  expect(merged.items.map((i) => i.id)).toEqual(["a", "b", "c"]);
  expect(merged.nextCursor).toBeNull();
});

test("people search hides me", () => {
  const people = [{ id: "me", name: "Я" }, { id: "x", name: "Икс" }];
  expect(otherPeople(people, "me").map((p) => p.id)).toEqual(["x"]);
  expect(otherPeople(people, null)).toHaveLength(2);
});

test("comment can be deleted by its author and by the review author", () => {
  expect(canDeleteComment("me", "author", "me")).toBe(true);
  expect(canDeleteComment("other", "me", "me")).toBe(true);
  expect(canDeleteComment("other", "author", "me")).toBe(false);
  expect(canDeleteComment("me", "me", null)).toBe(false);
});

test("list form trims the title and sends an empty description as null", () => {
  expect(canSaveList({ title: "   ", description: "", isPublic: true })).toBe(false);
  expect(listInput({ title: "  Отпуск ", description: "  ", isPublic: false })).toEqual({
    title: "Отпуск",
    description: null,
    isPublic: false,
  });
  expect(listFormFrom({ title: "A", description: null, isPublic: true })).toEqual({ title: "A", description: "", isPublic: true });
});

test("list count text", () => {
  expect(listCountText(1, true)).toBe("1 книга");
  expect(listCountText(3, false)).toBe("3 книги · личный");
  expect(listCountText(5, true)).toBe("5 книг");
});

describe("reportContent", () => {
  const originalOS = Platform.OS;
  afterEach(() => {
    Object.defineProperty(Platform, "OS", { value: originalOS, configurable: true });
    jest.restoreAllMocks();
  });

  function fakeAPI() {
    const report = jest.fn().mockResolvedValue(undefined);
    return { api: { report } as unknown as APIClient, report };
  }

  test("on iOS all reasons are in one alert and the chosen one is sent", async () => {
    Object.defineProperty(Platform, "OS", { value: "ios", configurable: true });
    const alert = jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
    const { api, report } = fakeAPI();
    reportContent(api, { commentId: "c1" });
    const buttons = alert.mock.calls[0][2] as AlertButton[];
    expect(buttons.map((b) => b.text)).toEqual(["Спам или реклама", "Оскорбления", "Спойлер без предупреждения", "Другое", "Отмена"]);
    buttons[1].onPress?.();
    await new Promise((r) => setTimeout(r, 0));
    expect(report).toHaveBeenCalledWith("ABUSE", { commentId: "c1" });
    expect(alert.mock.calls[1][0]).toBe("Жалоба отправлена");
  });

  test("on Android no alert has more than three buttons", async () => {
    Object.defineProperty(Platform, "OS", { value: "android", configurable: true });
    const alert = jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
    const { api, report } = fakeAPI();
    reportContent(api, { entryId: "e1" });
    const first = alert.mock.calls[0][2] as AlertButton[];
    expect(first).toHaveLength(3);
    first[2].onPress?.();
    const second = alert.mock.calls[1][2] as AlertButton[];
    expect(second.length).toBeLessThanOrEqual(3);
    expect(second.map((b) => b.text)).toEqual(["Спойлер без предупреждения", "Другое", "Отмена"]);
    second[0].onPress?.();
    await new Promise((r) => setTimeout(r, 0));
    expect(report).toHaveBeenCalledWith("SPOILER", { entryId: "e1" });
  });
});
