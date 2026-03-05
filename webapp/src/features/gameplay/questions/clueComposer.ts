import type { Question } from "@/types/game";

const MIN_COUNT_IDS = new Set([
  "waterStation250m",
  "hospital250m",
  "aed250m",
  "emergencySupplyStorage250m",
  "communityCenter250m",
  "trainStation250m",
  "shrineTemple250m",
  "floodgate250m",
  "bridge250m",
  "shelterCapacity",
]);

export const isMinCountQuestion = (questionId: string) => MIN_COUNT_IDS.has(questionId);

export function buildClueText(
  question: Question & { clueTemplate?: string },
  guessedParam: string | number,
  expected: string | number | null,
): { text: string; value: string | number | null } {
  const clueTemplate = question.clueTemplate || question.text;
  const clueValue = isMinCountQuestion(question.id) && expected !== undefined && expected !== null
    ? expected
    : guessedParam ?? expected;

  return {
    text: clueTemplate.replace("{param}", `${clueValue ?? ""}`),
    value: clueValue,
  };
}
