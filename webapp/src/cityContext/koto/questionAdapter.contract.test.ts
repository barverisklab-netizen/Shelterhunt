import { describe, expect, it } from "vitest";
import { kotoQuestionAdapter } from "./questionAdapter";

describe("koto question adapter contracts", () => {
  it("has unique question ids in questionCatalog", () => {
    const ids = kotoQuestionAdapter.questionCatalog.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("keeps poiTypes linked to known question ids", () => {
    const questionIds = new Set(kotoQuestionAdapter.questionCatalog.map((item) => item.id));
    const unknown = kotoQuestionAdapter.poiTypes
      .map((poiType) => poiType.questionId)
      .filter((id) => !questionIds.has(id));
    expect(unknown).toEqual([]);
  });

  it("defines valid nearby picker bounds", () => {
    expect(kotoQuestionAdapter.nearbyQuestion.countMin).toBeGreaterThanOrEqual(0);
    expect(kotoQuestionAdapter.nearbyQuestion.countMax).toBeGreaterThanOrEqual(
      kotoQuestionAdapter.nearbyQuestion.countMin,
    );
    expect(kotoQuestionAdapter.nearbyQuestion.radiusKm).toBeGreaterThan(0);
  });
});
