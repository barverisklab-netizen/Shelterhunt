import { describe, expect, it } from "vitest";
import { buildBaseQuestions, buildNearbyAmenityQuestion } from "./questionAssembler";
import { buildClueText } from "./clueComposer";
import { kotoQuestionAdapter } from "@/cityContext/koto/questionAdapter";

describe("question assembler", () => {
  const t = (key: string, options?: { fallback?: string }) => options?.fallback ?? key;
  const allAttributes = kotoQuestionAdapter.questionCatalog.map((item) => ({
    id: item.id,
    label: item.label,
    kind: item.kind,
    options: item.kind === "select" ? ["School"] : undefined,
  }));

  it("builds facility question using adapter fallback", () => {
    const questions = buildBaseQuestions({
      attributes: allAttributes,
      solvedQuestions: [],
      adapter: kotoQuestionAdapter,
      t,
      getSecretAnswer: (id) => (id === "facilityType" ? "School" : 1),
    });

    const facility = questions.find((question) => question.id === "facilityType");
    expect(facility).toBeTruthy();
    expect(facility?.category).toBe("facility");
    expect(facility?.text).toContain("Facility Type");
  });

  it("builds nearby amenity question and clue text", () => {
    const nearby = buildNearbyAmenityQuestion(t, kotoQuestionAdapter);
    expect(nearby.id).toBe("nearbyAmenity");

    const clue = buildClueText(
      { ...nearby, clueTemplate: "There are {param} nearby amenities", evaluationMode: "atMost" },
      2,
      4,
    );

    expect(clue.text).toContain("4");
    expect(clue.value).toBe(4);
  });
});
