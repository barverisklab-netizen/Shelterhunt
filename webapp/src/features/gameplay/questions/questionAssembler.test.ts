import { describe, expect, it } from "vitest";
import { buildBaseQuestions, buildNearbyAmenityQuestion } from "./questionAssembler";
import { buildClueText } from "./clueComposer";
import { kotoQuestionAdapter } from "@/cityContext/koto/questionAdapter";

describe("question assembler", () => {
  const t = (key: string, options?: { fallback?: string }) => options?.fallback ?? key;

  it("builds facility question using adapter fallback", () => {
    const questions = buildBaseQuestions({
      attributes: [{ id: "facilityType", label: "Facility Type", kind: "select", options: ["School"] }],
      solvedQuestions: [],
      adapter: kotoQuestionAdapter,
      t,
      getSecretAnswer: () => "School",
    });

    expect(questions).toHaveLength(1);
    expect(questions[0].category).toBe("facility");
    expect(questions[0].text).toContain("Facility Type");
  });

  it("builds nearby amenity question and clue text", () => {
    const nearby = buildNearbyAmenityQuestion(t, kotoQuestionAdapter);
    expect(nearby.id).toBe("nearbyAmenity");

    const clue = buildClueText(
      { ...nearby, clueTemplate: "There are {param} nearby amenities" },
      2,
      4,
    );

    expect(clue.text).toContain("4");
    expect(clue.value).toBe(4);
  });
});
