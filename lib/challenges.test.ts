import { test } from "node:test";
import assert from "node:assert/strict";
import { phaseOf } from "./challenges";
import { challengeSchema } from "./validation";

test("фаза челленджа", () => {
  const c = { startsAt: new Date("2026-06-01T00:00:00Z"), endsAt: new Date("2026-08-31T23:59:59.999Z") };
  assert.equal(phaseOf(c, new Date("2026-05-31T23:00:00Z")), "upcoming");
  assert.equal(phaseOf(c, new Date("2026-08-31T22:00:00Z")), "active");
  assert.equal(phaseOf(c, new Date("2026-09-01T00:00:00Z")), "finished");
});

test("даты челленджа: конец периода включительно, проверки", () => {
  const ok = challengeSchema.parse({ title: "Лето", goal: 10, startsAt: "2026-06-01", endsAt: "2026-08-31" });
  assert.equal(ok.endsAt.toISOString(), "2026-08-31T23:59:59.999Z");
  assert.equal(ok.isPublic, true);
  assert.equal(ok.genreSlug, null);
  assert.equal(challengeSchema.safeParse({ title: "x", goal: 1, startsAt: "2026-06-02", endsAt: "2026-06-01" }).success, false);
  assert.equal(challengeSchema.safeParse({ title: "x", goal: 1, startsAt: "2026-01-01", endsAt: "2029-01-01" }).success, false);
  assert.equal(challengeSchema.safeParse({ title: "x", goal: 0, startsAt: "2026-01-01", endsAt: "2026-02-01" }).success, false);
});
